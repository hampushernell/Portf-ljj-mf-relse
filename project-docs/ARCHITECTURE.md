# Architecture

## Overview

Projektet är uppdelat i:
- lib/ för business logic, datapipeline och helpers
- hooks/ för state och datahämtning
- components/ för UI-rendering
- App.jsx för komposition och appflöde

App.jsx ska endast innehålla composition, state wiring och rendering flow.
Ingen business logic eller inline-komponenter ska ligga i App.jsx.

---

## Data pipeline
Yahoo råpriser
↓
normalizeToCalendar()     [normalize.js]
Daglig kalenderaxel, forward fill
↓
getDisplayRange()         [dateRange.js]
Kalenderbaserat fönster, startTs/endTs
↓
rebaseSeries()            [blend.js]
Index 100 från fondens första datapunkt
↓
blendPortfolio()          [blend.js]
Inner join, viktad blandning
↓
computeReturnBundle()     [calculations.js]
Portföljserie + individuella fondlinjer
↓
Komponenter               [components/charts]
Ren visning, ingen beräkningslogik
---

## Structure

src/

### lib/
Ansvarar för ren business logic och shared utilities.

- normalize.js
  - normalizeToCalendar() — forward-fillar råpriser till daglig kalenderaxel
  - getLatestNavTs() — senaste tillgängliga NAV bland fonderna

- dateRange.js
  - getDisplayRange() — kalenderbaserad spanberäkning, aldrig approximation

- blend.js
  - rebaseSeries() — rebaserar serie till index 100
  - blendPortfolio() — viktar fondserier via inner join på kalenderaxel

- calculations.js
  - computeReturnBundle() — orkestrerar pipeline, returnerar portföljserie och fondlinjer
  - computePortfolioContext() — kontextdata för visningslagret
  - getWeightedFee(), getFundPct(), portfolioKrTotal() — avgifts- och portföljlogik
  - generateSimulatedSeries() — simulerad kursutveckling för manuella fonder

- comparisons.js
  - formatCompareStats() — jämförelselogik mellan portföljer

- utils.js
  - formatteringsfunktioner
  - shared constants (TIME_SPANS, FUND_COLORS, accent-färger)

---

### hooks/
Ansvarar för state management och datahämtning.

- useFundData.js
  - hämtar fonddata från /api/funds
  - hanterar loading och error state

- usePortfolio.js
  - portfolio state och actions
  - allokering, inputMode, manualAmount

---

### components/
Ansvarar för all UI-rendering.

#### Fund Components
- FundRow.jsx
- FundSearch.jsx
- FundDetailsModal.jsx
- ManualFundModal.jsx

#### Portfolio Components
- PortfolioPanel.jsx
- CompareBar.jsx

#### Chart Components
- SVGChart.jsx
- FundSVGChart.jsx
- ReturnChart.jsx
- FundReturnChart.jsx

Varje komponent:
- har tydligt ansvar
- innehåller ingen beräkningslogik
- använder endast nödvändiga imports
- exporteras som default export

---

## Rules

- Business logic ska ligga i /lib
- Datapipeline följer alltid ordningen normalize → dateRange → blend → calculations
- State management ska ligga i hooks
- UI-komponenter ska vara modulära och återanvändbara
- Shared helpers och constants ska ligga i utils.js
- App.jsx ska hållas så ren som möjligt
- Reuse före ny implementation
- Legacy-funktioner (buildSeries, getYahooRef) får inte användas i ny kod
- Avgiftslogik och datakällor dokumenteras i FEE_ENGINE.md