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
  capitaleEtfPuroLordo: number;
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
      if (guadagnoAnnoFp > 0) {
        capitaleFpLordo -= guadagnoAnnoFp * 0.2;
      }
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
  const nettoEtfRimborsoFinale = capitaleEtfRimborsoLordo - Math.max(0, plusvalenzaEtfRimborso) * 0.26;

  const totale1Netto = nettaFpFinale + nettoEtfRimborsoFinale;
  const totale1Lordo = capitaleFpLordo + capitaleEtfRimborsoLordo;

  const plusvalenzaEtfPuro = capitaleEtfPuroLordo - versamentoAnnuo * anni;
  const totale2Netto = capitaleEtfPuroLordo - Math.max(0, plusvalenzaEtfPuro) * 0.26;

  return {
    chartData,
    capitaleEtfPuroLordo,
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
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M €";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(0) + "k €";
  return n.toFixed(0) + " €";
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
            {p.name === "scenario1Lordo" ? "FP + ETF" : "Solo ETF"}: {fmtK(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function App() {
  const [anni, setAnni] = useState(30);
  const [versamento, setVersamento] = useState(5000);
  const [irpef, setIrpef] = useState(33);
  const [rendFp, setRendFp] = useState(6);
  const [rendEtf, setRendEtf] = useState(8.5);
  const [tassaFp, setTassaFp] = useState(9);

  const result = useMemo(
    () => simula(anni, versamento, irpef / 100, rendFp / 100, rendEtf / 100, tassaFp / 100),
    [anni, versamento, irpef, rendFp, rendEtf, tassaFp]
  );

  const scenario1Wins = result.vantaggio >= 0;

  return (
    <div className="app">
      <header className="header">
        <div className="header-tag">SIMULATORE FINANZIARIO</div>
        <h1>Fondo Pensione <span className="vs">vs</span> ETF</h1>
        <p className="subtitle">Confronta i due scenari di investimento nel lungo periodo</p>
      </header>

      <main className="main">
        <section className="panel controls-panel">
          <h2 className="panel-title">Parametri</h2>

          <div className="sliders">
            <Slider
              label="Anni di investimento"
              value={anni}
              min={5} max={45} step={1}
              display={`${anni} anni`}
              onChange={setAnni}
            />
            <Slider
              label="Versamento annuo"
              value={versamento}
              min={1000} max={30000} step={500}
              display={fmt(versamento)}
              onChange={setVersamento}
            />
            <Slider
              label="Aliquota IRPEF"
              value={irpef}
              min={23} max={43} step={1}
              display={`${irpef}%`}
              onChange={setIrpef}
            />
            <Slider
              label="Rendimento Fondo Pensione"
              value={rendFp}
              min={1} max={12} step={0.5}
              display={`${rendFp}%`}
              onChange={setRendFp}
            />
            <Slider
              label="Rendimento ETF"
              value={rendEtf}
              min={1} max={15} step={0.5}
              display={`${rendEtf}%`}
              onChange={setRendEtf}
            />
            <Slider
              label="Tassazione uscita FP"
              value={tassaFp}
              min={9} max={15} step={0.5}
              display={`${tassaFp}%`}
              onChange={setTassaFp}
            />
          </div>

          <div className="info-box">
            <span>📅 {fmt(result.versamentoMensile)}/mese</span>
            <span>💰 Totale versato: {fmt(result.versamentoTotale)}</span>
          </div>
        </section>

        <section className="panel results-panel">
          <h2 className="panel-title">Risultati dopo {anni} anni</h2>

          <div className="scenarios">
            <div className={`scenario-card ${scenario1Wins ? "winner" : ""}`}>
              <div className="scenario-header">
                <span className="scenario-num">Scenario 1</span>
                {scenario1Wins && <span className="badge">🏆 Migliore</span>}
              </div>
              <div className="scenario-title">Fondo Pensione + ETF rimborsi</div>
              <div className="amount-row">
                <span className="label">LORDO</span>
                <span className="amount lordo">{fmt(result.totale1Lordo)}</span>
              </div>
              <div className="amount-row">
                <span className="label">NETTO</span>
                <span className="amount netto">{fmt(result.totale1Netto)}</span>
              </div>
              <div className="sub-breakdown">
                <div>└ FP netto: {fmt(result.nettaFpFinale)}</div>
                <div>└ ETF rimborsi netto: {fmt(result.nettoEtfRimborsoFinale)}</div>
              </div>
            </div>

            <div className={`scenario-card ${!scenario1Wins ? "winner" : ""}`}>
              <div className="scenario-header">
                <span className="scenario-num">Scenario 2</span>
                {!scenario1Wins && <span className="badge">🏆 Migliore</span>}
              </div>
              <div className="scenario-title">Solo ETF</div>
              <div className="amount-row">
                <span className="label">LORDO</span>
                <span className="amount lordo">{fmt(result.totale2Lordo)}</span>
              </div>
              <div className="amount-row">
                <span className="label">NETTO</span>
                <span className="amount netto">{fmt(result.totale2Netto)}</span>
              </div>
            </div>
          </div>

          <div className={`vantaggio-box ${scenario1Wins ? "pos" : "neg"}`}>
            <span>Vantaggio Scenario {scenario1Wins ? "1" : "2"} sui netti:</span>
            <strong>{scenario1Wins ? "+" : ""}{fmt(result.vantaggio)}</strong>
          </div>
        </section>

        <section className="panel chart-panel">
          <h2 className="panel-title">Andamento del capitale (lordo)</h2>
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={result.chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
              <XAxis
                dataKey="anno"
                stroke="#6b7280"
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                label={{ value: "Anni", position: "insideBottomRight", offset: -5, fill: "#6b7280" }}
              />
              <YAxis
                stroke="#6b7280"
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                tickFormatter={fmtK}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) =>
                  value === "scenario1Lordo" ? "FP + ETF Rimborsi" : "Solo ETF"
                }
                wrapperStyle={{ color: "#9ca3af", fontSize: 13 }}
              />
              <Line
                type="monotone"
                dataKey="scenario1Lordo"
                stroke="#4ade80"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="scenario2Lordo"
                stroke="#fb923c"
                strokeWidth={2.5}
                strokeDasharray="6 3"
                dot={false}
                activeDot={{ r: 5 }}
              />
              <ReferenceDot
                x={anni}
                y={result.totale1Netto}
                r={6}
                fill="#4ade80"
                stroke="#fff"
                strokeWidth={2}
                label={{ value: "Netto 1", position: "top", fill: "#4ade80", fontSize: 11 }}
              />
              <ReferenceDot
                x={anni}
                y={result.totale2Netto}
                r={6}
                fill="#fb923c"
                stroke="#fff"
                strokeWidth={2}
                label={{ value: "Netto 2", position: "bottom", fill: "#fb923c", fontSize: 11 }}
              />
            </LineChart>
          </ResponsiveContainer>

          <p className="chart-note">
            I punti colorati indicano il capitale <strong>netto in tasca</strong> alla fine del periodo.
          </p>
        </section>
      </main>
    </div>
  );
}
