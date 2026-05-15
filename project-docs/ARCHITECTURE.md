# Architecture

## Overview

Projektet är uppdelat i:
- lib/ för business logic och helpers
- hooks/ för state och datahantering
- components/ för UI-komponenter
- App.jsx för komposition och appflöde

App.jsx ska endast innehålla:
- composition
- state wiring
- rendering flow

Ingen större business logic eller inline-komponenter ska ligga i App.jsx.

---

## Structure

src/

### lib/
Ansvarar för ren business logic och shared utilities.

- calculations.js
  - matematiska beräkningar
  - avgifter
  - avkastning
  - procent/logik

- comparisons.js
  - sorting
  - filtering
  - jämförelselogik

- utils.js
  - formatteringsfunktioner
  - shared constants
  - helper functions

---

### hooks/
Ansvarar för state management och datahämtning.

- useFundData.js
  - hämtar och hanterar fonddata

- usePortfolio.js
  - portfolio state
  - portfolio actions

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
- använder endast nödvändiga imports
- exporteras som default export

---

## Rules

- Business logic ska ligga i /lib
- State management ska ligga i hooks
- UI-komponenter ska vara modulära och återanvändbara
- Shared helpers och constants ska ligga i utils.js
- App.jsx ska hållas så ren som möjligt
- Reuse före ny implementation