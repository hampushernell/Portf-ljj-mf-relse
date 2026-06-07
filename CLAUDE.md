# CLAUDE.md – minportfölj.se

Läs alltid den här filen först. Den innehåller allt du behöver för att arbeta med projektet.
Läs sedan bara de filer som är direkt relevanta för uppgiften — aldrig hela kodbasen.

**Läs dessa projektdokument när relevant:**
- `project-docs/DESIGN.md` — läs alltid vid UI-ändringar, nya komponenter eller designbeslut
- `project-docs/PRODUCT.md` — läs vid produktbeslut, ny funktionalitet eller copy-ändringar
- `project-docs/ARCHITECTURE.md` — läs vid arkitektur- eller datapipelineändringar
- `project-docs/FEE_ENGINE.md` — läs vid avgiftsrelaterade ändringar
- `project-docs/RETURN_SYSTEM_SPEC.md` — läs vid avkastningsberäkningar

---

## Projekt

**minportfölj.se** — webbapp för att jämföra svenska fonder baserat på historisk avkastning och avgifter.
Användaren bygger en eller två portföljer, väljer tidsspan och ser utvecklingen i graf och legend.
Målgrupp: privatpersoner som vill fatta bättre fondbeslut.

**Live:** https://minportfolj.se (Vercel)
**Repo:** fondportfolj (GitHub → Vercel CI/CD)

---

## Regler för Claude (AI_RULES.md)

- Läs **endast** relevanta filer — aldrig hela projektet
- Ingen duplicerad logik — reuse före ny implementation
- Business logic ska ligga i `/lib`
- UI-komponenter ska vara reusable och innehålla ingen beräkningslogik
- Rör inte orelaterade filer
- Refactor före workaround
- Mobil först — `useBreakpoint()` hook, bryter vid 768px
- TypeScript är **inte** aktivt — projektet är ren JS/JSX trots att @types/react finns

---

## Tech Stack

| Del | Teknik |
|-----|--------|
| Frontend | React 19, Vite 8, ren JS/JSX |
| Backend | Vercel Serverless Functions (`api/funds.js`) |
| Pakethanterare | npm |
| Testramverk | Vitest |
| Linting | ESLint |
| Datakällor | Yahoo Finance (historik), Finansinspektionen (avgifter) |
| Fonts | Syne (rubriker), DM Sans (brödtext) — laddas via Google Fonts i App.jsx |

---

## Projektstruktur

```
src/
  lib/          All business logic och datapipeline — inga UI-imports
  hooks/        State och datahämtning
  components/   All UI-rendering — ingen beräkningslogik
  data/         fi-fees.json (avgifter från FI)
  App.jsx       Komposition och state wiring — ingen business logic
  main.jsx      Entry point

api/
  funds.js      Vercel serverless function — hämtar prisdata + avgifter

scripts/
  fetch-fi-fees.mjs   Skrapar fi.se och uppdaterar fi-fees.json
  add-fund.mjs        Halvautomatiserat fondläggningsflöde — tar ISIN, slår upp Yahoo-ticker, validerar prisdata, kollar FI-täckning och skriver ut färdigt registry-objekt

project-docs/
  ARCHITECTURE.md      Detaljerad arkitektur och datapipeline
  AI_RULES.md          Regler för Claude
  DESIGN.md            Design system — färger, typografi, komponenter, do's/don'ts
  FEE_ENGINE.md        Avgiftskällor, prioritetsordning, UI-exponering
  PRODUCT.md           Produktsyfte, användare, varumärke och designprinciper
  RETURN_SYSTEM_SPEC.md  Specifikation för avkastningsberäkning
  ROADMAP.md           Fas 1–5 och teknisk skuld
  STACK.md             Tech stack
```

---

## Datapipeline (strikt ordning — bryts aldrig)

```
Yahoo råpriser
↓ normalizeToCalendar()    [normalize.js]   — daglig kalenderaxel, forward fill
↓ getDisplayRange()        [dateRange.js]   — spanberäkning med UTC-kalenderaritmetik
↓ rebaseSeries()           [blend.js]       — index 100 från fondens första datapunkt
↓ blendPortfolio()         [blend.js]       — inner join, viktad blandning
↓ computeReturnBundle()    [calculations.js] — portföljserie + individuella fondlinjer
↓ Komponenter              [components/charts] — ren visning, noll beräkningslogik
```

---

## Nyckelansvar per fil

### lib/
| Fil | Ansvar |
|-----|--------|
| `normalize.js` | `normalizeToCalendar()`, `getLatestNavTs()` |
| `dateRange.js` | `getDisplayRange()` — aldrig approximation, alltid kalenderaritmetik |
| `blend.js` | `rebaseSeries()`, `blendPortfolio()` — inner join, muterar aldrig input |
| `calculations.js` | `computeReturnBundle()`, `computePortfolioContext()`, `getWeightedFee()`, `generateSimulatedSeries()` |
| `comparisons.js` | `formatCompareStats()` — jämförelselogik |
| `funds-registry.js` | Central fonddefinition — **enda stället** att redigera vid ny fond |
| `utils.js` | Formatteringsfunktioner, `TIME_SPANS`, `FUND_COLORS`, accent-färger, `FUND_ISINS` |
| `storage.js` | localStorage för manuella fonder (med schemaVersion och migration) |

### hooks/
| Fil | Ansvar |
|-----|--------|
| `useFundData.js` | Hämtar fonddata från `/api/funds`, hanterar loading/error |
| `usePortfolio.js` | Portfolio state — fonder, allokeringar, inputMode, manualAmount |

### components/
| Fil | Ansvar |
|-----|--------|
| `PortfolioPanel.jsx` | Fondlista + allokeringshantering per portfölj |
| `ComparePlaceholder.jsx` | Klickbar placeholder som aktiverar jämförelseläget (visas istället för Portfölj B tills jämförelse aktiveras) |
| `ReturnChart.jsx` | Portföljgraf (Jämför-läge) |
| `FundReturnChart.jsx` | Fondgraf (Fondläge) |
| `SVGChart.jsx` | SVG-baserad grafkomponent (portfölj) |
| `FundSVGChart.jsx` | SVG-baserad grafkomponent (fonder) |
| `FundRow.jsx` | En fondrad med badge, avgift och allokeringsslider |
| `FundSearch.jsx` | Sökfunktion för fonder |
| `FundDetailsModal.jsx` | Detaljvy per fond |
| `ManualFundModal.jsx` | Skapa/redigera manuell fond |

---

## Avgiftssystem

**Prioritetsordning:**
1. `feeSource: "fi"` — Finansinspektionen, juridiskt bindande, uppdateras månadsvis via GitHub Actions
2. `feeSource: "fallback"` — hårdkodad i `funds-registry.js` (fältet `fallbackFee`)

**Automatisk uppdatering:** `.github/workflows/update-fi-fees.yml` — körs 1:a varje månad 06:00 UTC.
**Format:** `src/data/fi-fees.json` med `_meta`-objekt (source, period, published, retrievedAt).

**Fondsupport (21 fonder, 5 kategorier):**
- 16 fonder täcks av FI (alla svenska SE-ISIN)
- 5 fonder använder fallback (Spiltan Aktiefond, Nordea FI/Global, DNB, Nordea Lux)
- Kategorier: Globalfond, Sverigefond, USA-fond, Räntefond, Temafond, Tillväxtmarknadsfond

Se `FEE_ENGINE.md` för fullständig tabell och UI-exponeringsregler.

---

## Viktiga regler och legacy-kod

### Får ALDRIG användas i ny kod:
- `MONTH_SECS` — finns i `utils.js` men används inte för spanberäkning

### Kritiska invarianter:
- `endTs` är alltid `latestNavTs` — aldrig `Date.now()`
- Inner join i `blendPortfolio` får **aldrig** ersättas med index-baserad blandning
- Avkastning = sista värdet i serien − 100 (aldrig separat beräkning)
- Tooltip vid slutpunkten använder `returnValue` direkt — garanterar att tooltip och legend alltid stämmer överens
- Spanberäkning: alltid `getDisplayRange()`, aldrig dagapproximation

---

## Nuläge och prioriteringar (Roadmap)

### Fas 1 – Stabilisering (aktiv)
- [x] STACK.md
- [x] schemaVersion i localStorage med migration
- [x] Tydlig UI-notis för fonder som misslyckades att ladda
- [x] Unit tests för `dateRange.js` och `blend.js` — 44 tester gröna

### Fas 2 – Avgifter ✓
- [x] Avgiftsaudit för alla 13 fonder
- [x] Källbadge (FI/Manuell) i FundRow och FundDetailsModal
- [x] Avgiftsmodal i PortfolioPanel

### Fas 3 – Mobildesign ✓
- [x] useBreakpoint-hook — bryter vid 768px
- [x] Responsiv layout, touch-tooltips, span-knappar på 375px
- [x] FundRow 3-radsmodell på mobil — badge på rad 3 bredvid avgiften

### Fas 4 – Designöversyn
- [x] Design tokens i `src/lib/tokens.js` — alla komponenter migrerade
- [x] Kontrastfixar, typografisk hierarki (headline 16px), spacing 4px-grid
- [x] Snabb jämförelse borttagen
- [x] Accenttint-bakgrund på fondkort — `rgba(accentRgb, 0.045)`, A cobalt / B arctic sky
- [x] Glow borttaget från fondkort — ersatt av accenttint
- [x] Grafkort transparent — `background: transparent`, border `1px solid rgba(255,255,255,0.10)`
- [ ] Animationskonsistens, tydligare skillnad Jämför/Fondläge

### Fas 5 – Fondutbud (aktiv)
- [x] `scripts/add-fund.mjs` — halvautomatiserat flöde för nya fonder via ISIN
- [x] 8 nya fonder: räntefonder, USA-fonder, temafonder (totalt 21)
- [x] FundSearch stängs vid klick utanför
- [ ] Blandfonder — en balanserad per storbank (Nordea, Handelsbanken, LF, Swedbank, SEB)
- [ ] Kategorifilter — avskrivet tills fondlistan motiverar det
- [ ] ETF-stöd

### Teknisk skuld
~~- `CompareBar.jsx` är oanvänd — kan raderas~~ (raderad)
- AMF Räntefond Kort saknar Yahoo-ticker — kör `npm run add-fund SE0001184961` för att dubbelkolla

---

## Kommandon

```bash
npm run dev              # Dev-server (Vite)
npm run build            # Produktionsbygg
npm run test             # Vitest
npm run lint             # ESLint
npm run preview          # Förhandsgranska dist
npm run add-fund <ISIN>  # Slå upp Yahoo-ticker och validera ny fond
```

---

## Manuell fondvalidering (när add-fund.mjs inte kan nå Yahoo)

Om `npm run add-fund` misslyckas med nätverksfel, verifiera **enbart** dessa tre källor — i den ordningen:

1. **Yahoo Finance** — `https://finance.yahoo.com/quote/<ticker>.ST/` — bekräfta ticker och prishistorik
2. **Morningstar** — `https://www.fondinfo.se/fonder/<fondnamn>` eller `global.morningstar.com` — bekräfta ISIN och avgift
3. **Fondbolagets egen sida** — Avanza, Nordnet, Nordea, Handelsbanken etc. — bekräfta fondnamn, avgift och domicil (SE vs IE)

Sök inte på borskollen, placera, privata bloggar, Bloomberg eller andra aggregatorer. Tre källor räcker.
