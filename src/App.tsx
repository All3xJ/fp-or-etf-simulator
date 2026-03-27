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
  chartData: { anno: number; scenario1Lordo: number; scenario2Lordo: number }[];
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
  const rimborsoAnnuo = versamentoAnnuo * aliquotaIrpef;
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

    if (mese % 12 === 0) {
      const guadagnoAnnoFp = capitaleFpLordo - capitaleInizioAnnoFp - versamentoAnnuo;
      if (guadagnoAnnoFp > 0) capitaleFpLordo -= guadagnoAnnoFp * 0.2;
      capitaleInizioAnnoFp = capitaleFpLordo;
      capitaleEtfRimborsoLordo += rimborsoAnnuo;
      chartData.push({
        anno: mese / 12,
        scenario1Lordo: Math.round(capitaleFpLordo + capitaleEtfRimborsoLordo),
        scenario2Lordo: Math.round(capitaleEtfPuroLordo),
      });
    }
  }

  const tassaUscitaFpFinale = versamentoAnnuo * anni * tassazionePrelievoFp;
  const nettaFpFinale = capitaleFpLordo - tassaUscitaFpFinale;
  const plusvalenzaEtfRimborso = capitaleEtfRimborsoLordo - rimborsoAnnuo * anni;
  const nettoEtfRimborsoFinale =
    capitaleEtfRimborsoLordo - Math.max(0, plusvalenzaEtfRimborso) * 0.26;
  const totale1Netto = nettaFpFinale + nettoEtfRimborsoFinale;
  const totale1Lordo = capitaleFpLordo + capitaleEtfRimborsoLordo;
  const plusvalenzaEtfPuro = capitaleEtfPuroLordo - versamentoAnnuo * anni;
  const totale2Netto = capitaleEtfPuroLordo - Math.max(0, plusvalenzaEtfPuro) * 0.26;

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
  display: string;
  onChange: (v: number) => void;
}

function Slider({ label, value, min, max, step, display, onChange }: SliderProps) {
  return (
    <div className="slider-row">
      <div className="slider-label">
        <span>{label}</span>
        <span className="slider-value">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="tooltip-year">Anno {label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name === "scenario1Lordo" ? "FP + ETF" : "Solo ETF"}: {fmtK(p.value)} €
          </p>
        ))}
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
            <Slider label="Anni" value={anni} min={5} max={45} step={1}
              display={`${anni} anni`} onChange={setAnni} />
            <Slider label="Versamento annuo" value={versamento} min={1000} max={30000} step={500}
              display={fmt(versamento)} onChange={setVersamento} />
            <Slider label="Aliquota IRPEF" value={irpef} min={23} max={43} step={1}
              display={`${irpef}%`} onChange={setIrpef} />
            <Slider label="Rendimento FP" value={rendFp} min={1} max={12} step={0.5}
              display={`${rendFp}%`} onChange={setRendFp} />
            <Slider label="Rendimento ETF" value={rendEtf} min={1} max={15} step={0.5}
              display={`${rendEtf}%`} onChange={setRendEtf} />
            <Slider label="Tassazione uscita FP" value={tassaFp} min={9} max={15} step={0.5}
              display={`${tassaFp}%`} onChange={setTassaFp} />
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
            <strong>{scenario1Wins ? "+" : ""}{fmt(result.vantaggio)}</strong>
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
          <p className="chart-note">I punti indicano il capitale netto al termine del periodo.</p>
        </section>
      </main>
    </div>
  );
}
