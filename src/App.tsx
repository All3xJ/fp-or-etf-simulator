import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";

interface SimResult {
  chartData: { anno: number; scenario1Lordo: number; scenario2Lordo: number; scenario1Netto: number | null; scenario2Netto: number | null }[];
  capitaleFpLordo: number;
  capitaleEtfRimborsoLordo: number;
  totale1Lordo: number;
  nettaFpFinale: number;
  nettoEtfRimborsoFinale: number;
  totale1Netto: number;
  totale2Lordo: number;
  totale2Netto: number;
  vantaggio: number;
  versamentoMensile: number;
  versamentoTotale: number;
}

const LIMITE_DEDUCIBILITA = 5164.57;

function simula(
  anni: number,
  versamentoAnnuo: number,
  aliquotaIrpef: number,
  rendimentoFp: number,
  rendimentoEtf: number,
  tassazionePrelievoFp: number
): SimResult {
  const chartData: SimResult["chartData"] = [];
  const mesiTotali = anni * 12;
  const versamentoMensile = versamentoAnnuo / 12;

  // FIX 1: rimborso calcolato solo sulla quota deducibile (max 5.164,57 €/anno)
  const versamentoDeducibile = Math.min(versamentoAnnuo, LIMITE_DEDUCIBILITA);
  const rimborsoAnnuo = versamentoDeducibile * aliquotaIrpef;

  const tassoFpM = Math.pow(1 + rendimentoFp, 1 / 12) - 1;
  const tassoEtfM = Math.pow(1 + rendimentoEtf, 1 / 12) - 1;

  let capitaleFpLordo = 0;
  let capitaleInizioAnnoFp = 0;
  let capitaleEtfRimborsoLordo = 0;
  let capitaleEtfPuroLordo = 0;

  for (let mese = 1; mese <= mesiTotali; mese++) {
    capitaleFpLordo = (capitaleFpLordo + versamentoMensile) * (1 + tassoFpM);
    capitaleEtfRimborsoLordo = capitaleEtfRimborsoLordo * (1 + tassoEtfM);
    capitaleEtfPuroLordo = (capitaleEtfPuroLordo + versamentoMensile) * (1 + tassoEtfM);

    // FIX 3: rimborso IRPEF arriva a luglio (mese 7) dell'anno successivo
    if (mese > 12 && mese % 12 === 7) {
      capitaleEtfRimborsoLordo += rimborsoAnnuo;
    }

    if (mese % 12 === 0) {
      const guadagnoAnnoFp = capitaleFpLordo - capitaleInizioAnnoFp - versamentoAnnuo;
      if (guadagnoAnnoFp > 0) capitaleFpLordo -= guadagnoAnnoFp * 0.2;
      capitaleInizioAnnoFp = capitaleFpLordo;
      chartData.push({
        anno: mese / 12,
        scenario1Lordo: Math.round(capitaleFpLordo + capitaleEtfRimborsoLordo),
        scenario2Lordo: Math.round(capitaleEtfPuroLordo),
        scenario1Netto: null,
        scenario2Netto: null,
      });
    }
  }

  // FIX 2: tassa uscita FP solo sulla quota effettivamente dedotta
  const tassaUscitaFpFinale = versamentoDeducibile * anni * tassazionePrelievoFp;
  const nettaFpFinale = capitaleFpLordo - tassaUscitaFpFinale;

  // Rimborso ultimo anno: arriverà dopo la simulazione, lo aggiungiamo cash senza plusvalenze
  const capitaleInvestitoEtfRimborsi = rimborsoAnnuo * (anni - 1);
  const plusvalenzaEtfRimborso = capitaleEtfRimborsoLordo - capitaleInvestitoEtfRimborsi;
  const nettoEtfRimborsoFinale =
    capitaleEtfRimborsoLordo - Math.max(0, plusvalenzaEtfRimborso) * 0.26 + rimborsoAnnuo;

  const totale1Netto = nettaFpFinale + nettoEtfRimborsoFinale;
  const totale1Lordo = capitaleFpLordo + capitaleEtfRimborsoLordo;
  const plusvalenzaEtfPuro = capitaleEtfPuroLordo - versamentoAnnuo * anni;
  const totale2Netto = capitaleEtfPuroLordo - Math.max(0, plusvalenzaEtfPuro) * 0.26;

  // patch last data point with netto values so tooltip can show them
  chartData[chartData.length - 1].scenario1Netto = Math.round(totale1Netto);
  chartData[chartData.length - 1].scenario2Netto = Math.round(totale2Netto);

  return {
    chartData,
    capitaleFpLordo,
    capitaleEtfRimborsoLordo,
    totale1Lordo,
    nettaFpFinale,
    nettoEtfRimborsoFinale,
    totale1Netto,
    totale2Lordo: capitaleEtfPuroLordo,
    totale2Netto,
    vantaggio: totale1Netto - totale2Netto,
    versamentoMensile,
    versamentoTotale: versamentoAnnuo * anni,
  };
}

const fmt = (n: number) =>
  new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 }).format(n) + " €";

const fmtK = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(0) + "k";
  return n.toFixed(0);
};

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
}

function Slider({ label, value, min, max, step, suffix = "", onChange }: SliderProps) {
  const [inputVal, setInputVal] = useState(String(value));
  const [focused, setFocused] = useState(false);

  if (!focused && inputVal !== String(value)) {
    setInputVal(String(value));
  }

  const commit = (raw: string) => {
    const n = parseFloat(raw.replace(",", "."));
    if (!isNaN(n)) {
      const clamped = Math.min(max, Math.max(min, Math.round(n / step) * step));
      onChange(clamped);
      setInputVal(String(clamped));
    } else {
      setInputVal(String(value));
    }
  };

  return (
    <div className="slider-row">
      <div className="slider-label">
        <span>{label}</span>
        <div className="slider-input-wrap">
          <input
            className="slider-text-input"
            type="text"
            inputMode="decimal"
            value={focused ? inputVal : inputVal + (suffix ? " " + suffix : "")}
            onFocus={() => { setFocused(true); setInputVal(String(value)); }}
            onBlur={(e) => { setFocused(false); commit(e.target.value); }}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          />
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => { onChange(Number(e.target.value)); setInputVal(String(e.target.value)); }}
      />
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0]?.payload;
    const hasNetto = d?.scenario1Netto != null;
    return (
      <div className="custom-tooltip">
        <p className="tooltip-year">Anno {label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name === "scenario1Lordo" ? "FP + ETF" : "Solo ETF"}{" "}
            <span className="tt-tag">lordo</span>: {fmtK(p.value)} €
          </p>
        ))}
        {hasNetto && (
          <div className="tt-netto-block">
            <p className="tt-netto-title">netto finale</p>
            <p style={{ color: "#c06878" }}>
              FP + ETF <span className="tt-tag">netto</span>: {fmtK(d.scenario1Netto)} €
            </p>
            <p style={{ color: "#1a1a1a" }}>
              Solo ETF <span className="tt-tag">netto</span>: {fmtK(d.scenario2Netto)} €
            </p>
          </div>
        )}
      </div>
    );
  }
  return null;
};

// Label positioned to the left of the reference dot
const LeftLabel = ({
  viewBox,
  value,
  color,
  text,
}: {
  viewBox?: { cx: number; cy: number };
  value?: number;
  color: string;
  text: string;
}) => {
  if (!viewBox) return null;
  const { cx, cy } = viewBox;
  return (
    <text
      x={cx - 10}
      y={cy + 1}
      textAnchor="end"
      dominantBaseline="middle"
      fontSize={10.5}
      fontFamily="'DM Mono', monospace"
      fill={color}
    >
      {text} {fmtK(value ?? 0)} €
    </text>
  );
};

export default function App() {
  const [anni, setAnni] = useState(30);
  const [versamento, setVersamento] = useState(5000);
  const [irpef, setIrpef] = useState(33);
  const [rendFp, setRendFp] = useState(6);
  const [rendEtf, setRendEtf] = useState(8.5);
  const [tassaFp, setTassaFp] = useState(9);

  const result = useMemo(
    () =>
      simula(anni, versamento, irpef / 100, rendFp / 100, rendEtf / 100, tassaFp / 100),
    [anni, versamento, irpef, rendFp, rendEtf, tassaFp]
  );

  const scenario1Wins = result.vantaggio >= 0;

  return (
    <div className="app">
      <header className="header">
        <p className="eyebrow">simulatore di investimento</p>
        <h1>Fondo Pensione <em>vs</em> ETF</h1>
        <p className="subtitle">Confronta i due scenari nel lungo periodo</p>
      </header>

      <main className="main">
        {/* Parameters */}
        <aside className="card controls-card">
          <p className="card-label">parametri</p>
          <div className="sliders">
            <Slider label="Anni" value={anni} min={1} max={60} step={1}
              suffix="anni" onChange={setAnni} />
            <Slider label="Versamento annuo" value={versamento} min={100} max={30000} step={100}
              suffix="€" onChange={setVersamento} />
            <Slider label="Aliquota IRPEF" value={irpef} min={23} max={43} step={1}
              suffix="%" onChange={setIrpef} />
            <Slider label="Rendimento FP" value={rendFp} min={1} max={12} step={0.5}
              suffix="%" onChange={setRendFp} />
            <Slider label="Rendimento ETF" value={rendEtf} min={1} max={15} step={0.5}
              suffix="%" onChange={setRendEtf} />
            <Slider label="Tassazione uscita FP" value={tassaFp} min={9} max={23} step={0.5}
              suffix="%" onChange={setTassaFp} />
          </div>
          <div className="chips">
            <div className="chip">
              <span className="chip-val">{fmt(result.versamentoMensile)}</span>
              <span className="chip-lbl">al mese</span>
            </div>
            <div className="chip">
              <span className="chip-val">{fmt(result.versamentoTotale)}</span>
              <span className="chip-lbl">totale versato</span>
            </div>
          </div>
        </aside>

        {/* Results */}
        <div className="results-col">
          <div className="scenarios">
            <div className={`scenario-card ${scenario1Wins ? "best" : ""}`}>
              <div className="sc-top">
                <span className="sc-num">Scenario 1</span>
                {scenario1Wins && <span className="best-badge">migliore ✦</span>}
              </div>
              <p className="sc-name">Fondo Pensione<br />+ ETF rimborsi</p>
              <div className="sc-amounts">
                <div className="sc-row muted">
                  <span>Lordo</span><span>{fmt(result.totale1Lordo)}</span>
                </div>
                <div className="sc-row main">
                  <span>Netto</span><span>{fmt(result.totale1Netto)}</span>
                </div>
              </div>
              <div className="sc-detail">
                <span>FP: {fmt(result.nettaFpFinale)}</span>
                <span>ETF: {fmt(result.nettoEtfRimborsoFinale)}</span>
              </div>
            </div>

            <div className={`scenario-card ${!scenario1Wins ? "best" : ""}`}>
              <div className="sc-top">
                <span className="sc-num">Scenario 2</span>
                {!scenario1Wins && <span className="best-badge">migliore ✦</span>}
              </div>
              <p className="sc-name">Solo ETF</p>
              <div className="sc-amounts">
                <div className="sc-row muted">
                  <span>Lordo</span><span>{fmt(result.totale2Lordo)}</span>
                </div>
                <div className="sc-row main">
                  <span>Netto</span><span>{fmt(result.totale2Netto)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={`vantaggio ${scenario1Wins ? "pos" : "neg"}`}>
            <span>Vantaggio scenario {scenario1Wins ? "1" : "2"}</span>
            <strong>+{fmt(Math.abs(result.vantaggio))}</strong>
          </div>
        </div>

        {/* Chart */}
        <section className="card chart-card">
          <p className="card-label">andamento del capitale</p>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart
              data={result.chartData}
              margin={{ top: 16, right: 24, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(180,100,120,0.1)" />
              <XAxis
                dataKey="anno"
                tick={{ fill: "#b8909a", fontSize: 11, fontFamily: "'DM Mono',monospace" }}
                axisLine={{ stroke: "#e8d0d8" }}
                tickLine={false}
                label={{ value: "anni", position: "insideBottomRight", offset: -2, fill: "#c4a0aa", fontSize: 11 }}
              />
              <YAxis
                tick={{ fill: "#b8909a", fontSize: 11, fontFamily: "'DM Mono',monospace" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmtK}
                width={46}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(v) =>
                  v === "scenario1Lordo" ? "FP + ETF Rimborsi" : "Solo ETF"
                }
                wrapperStyle={{
                  fontSize: 12,
                  color: "#a07888",
                  fontFamily: "'DM Mono',monospace",
                  paddingTop: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="scenario1Lordo"
                stroke="#c06878"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#c06878" }}
              />
              <Line
                type="monotone"
                dataKey="scenario2Lordo"
                stroke="#1a1a1a"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                activeDot={{ r: 4, fill: "#1a1a1a" }}
              />
              <ReferenceDot
                x={anni}
                y={result.totale1Netto}
                r={5}
                fill="#c06878"
                stroke="#fff"
                strokeWidth={2}
                label={
                  <LeftLabel
                    color="#c06878"
                    text="netto 1 ←"
                    value={result.totale1Netto}
                  />
                }
              />
              <ReferenceDot
                x={anni}
                y={result.totale2Netto}
                r={5}
                fill="#1a1a1a"
                stroke="#fff"
                strokeWidth={2}
                label={
                  <LeftLabel
                    color="#333"
                    text="netto 2 ←"
                    value={result.totale2Netto}
                  />
                }
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            <div className="legend-item">
              <svg width="32" height="14" viewBox="0 0 32 14">
                <line x1="0" y1="5" x2="32" y2="5" stroke="#c06878" strokeWidth="2"/>
                <line x1="0" y1="10" x2="32" y2="10" stroke="#1a1a1a" strokeWidth="2" strokeDasharray="5 4"/>
              </svg>
              <span>curve &mdash; capitale <em>lordo</em> nel tempo</span>
            </div>
            <div className="legend-item">
              <svg width="32" height="14" viewBox="0 0 32 14">
                <circle cx="9" cy="7" r="5" fill="#c06878" stroke="#fff" strokeWidth="2"/>
                <circle cx="23" cy="7" r="5" fill="#1a1a1a" stroke="#fff" strokeWidth="2"/>
              </svg>
              <span>pallini &mdash; capitale <em>netto</em> finale (imposte applicate)</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
