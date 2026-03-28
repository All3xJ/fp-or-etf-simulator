# Fondo Pensione vs ETF — Simulatore

🔗 **[fp-or-etf-simulator.vercel.app](https://fp-or-etf-simulator.vercel.app/)**

Simulatore interattivo per confrontare due strategie di investimento a lungo termine nel contesto fiscale italiano: versare in un **Fondo Pensione** (sfruttando la deducibilità IRPEF e reinvestendo i rimborsi in ETF) oppure investire tutto direttamente in **ETF** fin dall'inizio.

---

## ⚠️ Perché il contributo del datore di lavoro non è incluso

Molti dipendenti possono ottenere dal proprio datore di lavoro:
- il **2,2% della RAL** versato nel fondo, destinando il TFR al fondo pensione
- l'**1,1% della RAL** aggiuntivo, versando una quota minima propria prevista dal CCNL

Questi contributi, però, si ottengono **solo aderendo al fondo pensione di categoria**, che tipicamente ha rendimenti molto bassi e poco competitivi rispetto a un fondo aperto o a un ETF.

Questa simulazione **dà per scontato che si sfrutti già quel meccanismo** — conviene quasi sempre farlo, indipendentemente da tutto il resto, perché sono soldi gratuiti. Non ha quindi senso includerlo nel confronto.

Il focus qui è su una domanda diversa: una volta messo il TFR nel fondo di categoria e incassati i contributi datoriali, ha senso fare **versamenti volontari aggiuntivi** in **un altro** fondo pensione (tipicamente aperto, con rendimenti più competitivi) per sfruttare la **deducibilità IRPEF**, oppure conviene investire quella stessa cifra direttamente in ETF?

I versamenti al fondo pensione sono deducibili fino a un massimo di **5.164 € annui**. Il rimborso IRPEF che ne deriva viene in questa simulazione reinvestito ogni anno in un ETF.

---

## Come funziona

### Scenario 1 — Fondo Pensione + ETF rimborsi

Ogni mese viene versata una quota in un fondo pensione aperto. Il capitale cresce al rendimento scelto, con tassazione annua del **20% sui guadagni** maturati nell'anno. Una volta l'anno, il rimborso IRPEF viene reinvestito in un ETF separato. Alla fine del periodo, sul capitale del fondo pensione si applica la **tassazione agevolata sull'uscita** (configurabile tra il 9% e il 23% sul capitale versato); sull'ETF dei rimborsi si applica la **tassazione sulle plusvalenze al 26%**.

### Scenario 2 — Solo ETF

Lo stesso versamento mensile viene investito interamente in ETF dall'inizio. Alla fine del periodo si applica la **tassazione sulle plusvalenze al 26%** sull'intera plusvalenza maturata.

### Logica di calcolo

La simulazione è **mensile**: i versamenti entrano a inizio mese, il capitale cresce con capitalizzazione composta mensile. Il confronto finale avviene sempre sui valori **netti** (imposte già applicate).

---

## Parametri configurabili

| Parametro | Descrizione | Range |
|---|---|---|
| **Anni** | Durata dell'investimento | 1 – 60 |
| **Versamento annuo** | Importo totale versato ogni anno | 100 – 30.000 € |
| **Aliquota IRPEF** | Scaglione marginale per calcolo rimborso | 23% – 43% |
| **Rendimento FP** | Rendimento lordo annuo del fondo pensione aperto | 1% – 12% |
| **Rendimento ETF** | Rendimento lordo annuo dell'ETF | 1% – 15% |
| **Tassazione uscita FP** | Aliquota applicata al capitale versato in uscita | 9% – 23% |

---

## Stack tecnico

- **React 18** + **TypeScript**
- **Vite** — bundler e dev server
- **Recharts** — grafici interattivi

---

## Avvio locale

```bash
# Installa le dipendenze
npm install

# Avvia il dev server
npm run dev
```

Apri [http://localhost:5173](http://localhost:5173) nel browser.

```bash
# Build per la produzione
npm run build
```

---

## Deploy

Il progetto è configurato per il deploy su **Vercel**. Basta collegare il repository e Vercel rileverà automaticamente Vite come framework.

---

## Note

- I calcoli sono a scopo illustrativo e non costituiscono consulenza finanziaria.
- La tassazione del fondo pensione in uscita si applica in questo modello sul **capitale versato** (non sull'intero montante), come da regime fiscale agevolato dei fondi pensione italiani.
- I rendimenti sono lordi e costanti nel tempo: nella realtà variano anno per anno.
