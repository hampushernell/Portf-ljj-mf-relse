# Roadmap – MinPortfölj

## Syfte
Webbapp för att jämföra svenska fonder baserat på historisk avkastning och avgifter.
Användaren bygger en eller två portföljer, väljer tidsspan och ser utvecklingen i graf och legend.
Målgrupp: privatpersoner som vill fatta bättre fondbeslut och ha möjlighet till enkel men kraftfull jämförelse.

## Nuläge
Fas 1–5 är klara. Datapipelinen är stabil och vältestad. Mobilstöd, designsystem, avgiftstransparens och fondutbud är på plats.
Registret innehåller 41 fonder, 9 kategorier. FundSearchModal med kategorifilter och CAGRTable är implementerade.

Nästa fas fokuserar på beslutskvalitet (risk, tydligare utfall), delbarhet (URL-serialisering) och distribution (SEO/prerendering).

---

## Fas 1 – Stabilisering (aktiv)

Mål: trygg grund innan ny funktionalitet byggs.

- [x] Fyll i STACK.md med teknikstack och projektstruktur
- [x] Lägg till schemaVersion i localStorage för manualFunds med migrationsfunktion — hanterar tre äldre format: rå array, { version/funds }, samt saknad schemaVersion
- [x] Visa tydligt i UI vilka fonder som misslyckades att ladda från Yahoo Finance — visas som notis i FundSearch när sökfältet är tomt
- [x] Unit tests för dateRange.js och blend.js — tester i både src/lib/ och src/lib/__tests__/

## Fas 2 – Avgifter och datakvalitet

Mål: avgiften är en kärnfunktion och måste vara korrekt och transparent.

- [x] Audit av alla 13 fonders avgifter — 8 fonder täcks av FI, 5 av fallback-tabell, dokumenterat i FEE_ENGINE.md
- [x] Källbadge i UI för alla fonder — "FI" (turkos) eller "Manuell" (grå) med tooltip, visas i FundRow och FundDetailsModal
- [x] Avgiftsmodal i PortfolioPanel med förklaring av viktad avgift, källbeskrivning och Morningstar-verifieringslänkar

## Fas 3 – Mobildesign ✓

Mål: appen ska fungera och kännas bra på 375px. Mobil först enligt AI_RULES.md.

- [x] useBreakpoint-hook i hooks/ — bryter vid 768px, isMobile-flagga i alla komponenter
- [x] Responsiv layout för PortfolioPanel – staplar vertikalt på mobil (A ovanför B)
- [x] FundRow-grid anpassad för små skärmar — 3-radsmodell: namn/×, input/beräknat, kategori·avgift·badge
- [x] Touch-vänliga tooltips i SVGChart och FundSVGChart
- [x] Span-knappar i ReturnChart och FundReturnChart scrollar horisontellt på 375px
- [x] I fondläge döljs Portfölj B (oförändrat beteende via compareMode)

## Fas 4 – Designöversyn

Mål: konsekvent och skalbart designsystem.

- [x] Design tokens centraliserade i src/lib/tokens.js (COLOR, FONT, RADIUS, SHADOW, SPACE, TRANSITION) — alla komponenter migrerade, inga hårdkodade färger eller fontsträngar kvar
- [x] Kontrastfixar: ACCENT_A_LIGHT (#7b93ff) används som textfärg istället för ACCENT_A (#0018f5) — kritisk kontrastbugg åtgärdad
- [x] text.muted-token ändrad från #444 till #94a3b8 — läsbar på mörk bakgrund
- [x] Google Fonts flyttade från JSX-body till index.html head med preconnect — eliminerar FOUF
- [x] Typografisk hierarki skärpt: headline 15px → 16px, innehållstext konsoliderad från 12px → 13px, DM Sans explicit på prosatext i modaler
- [x] Spacing normaliserat till 4px-grid — FundRow, PortfolioPanel summary och avgiftsmodal
- [x] Snabb jämförelse-blocket borttaget — graferna kommunicerar samma data utan push-moment-design
- [ ] Konsekvent animationsanvändning genom hela appen
- [x] Förtydliga skillnaden mellan Jämför-läge och Fondläge visuellt — lägesväxlare flyttad till ovanför panelerna (Fonder → Jämför), ComparePlaceholder visar tydlig ingång till jämförelseläget
- [x] Grafdesign: kant-till-kant SVG (PL=PR=0, overflow:hidden), responsiv höjd (330 desktop / 400 mobil), y-axeletiketter inuti grafen, enhetlig strokewidth 1.5, tooltip följer cursor vertikalt med 32px grace-zon på desktop

## Fas 5 – Fondutbud

Mål: bredare fondutbud med bibehållen datakvalitet.

- [x] Halvautomatiserat flöde för fondläggning — `scripts/add-fund.mjs` tar ISIN, slår upp Yahoo-ticker, validerar prisdata och kollar FI-täckning
- [x] Räntefonder: Spiltan Räntefond Sverige, AMF Räntefond Lång
- [x] USA-fonder: LF USA Index, Handelsbanken USA Index Criteria, Avanza USA, Nordnet USA Index, Swedbank Robur Access USA
- [x] Temafonder: Swedbank Robur Technology A, Swedbank Robur Ny Teknik A
- [x] Tillväxtmarknadsfonder: LF Tillväxtmarknad Index A, Avanza Emerging Markets
- [x] Europafonder: Avanza Europa
- [x] Småbolagsfonder: AMF Aktiefond Småbolag, LF Småbolag Sverige, Swedbank Robur Småbolagsfond Sverige, Nordea Småbolagsfond Norden, Carnegie Småbolagsfond
- [x] Blandfonder: Nordea Stratega 50, Swedbank Robur Access Mix, SEB Blandfond Sverige, Handelsbanken Multi Asset 50, AMF Balansfond, LF Bekväm Fond Balans
- [x] Globalfonder: Nordnet Global Index, Swedbank Robur Access Global, DNB Global Indeks S (totalt 9 globalfonder)
- [x] Sverigefonder: Nordnet Sverige Index, SEB Hållbarhetsfond Sverige Index, Swedbank Robur Access Sverige (totalt 9 sverigefonder)
- [x] FundSearch stängs vid klick utanför — ingen Esc-kunskap krävs
- [x] Kategorifilter i FundSearchModal — dropdown med multi-select per kategori, tillgängliga kategorier filtreras dynamiskt
- [x] FundSearchModal — ny sökmodal med kategorifilter ersätter enklare FundSearch
- [x] CAGRTable — CAGR-tabell per portfölj med per-fond breakdown och expand/collapse
- [ ] Utvärdera ETF-stöd (annan prisdata och avgiftsstruktur)
- [ ] AMF Räntefond Kort — ticker saknas, kör `npm run add-fund SE0001184961` när tillgänglig

---

## Fas 6 – Beslutskvalitet (aktiv)

Mål: produkten ska namnge vinnaren och ge risk-kontext — inte bara visa grafen.

- [ ] **Sammanfattningsrad ovanför grafen** — tydlig klartext i jämförelseläge: "Portfölj A +114% · Portfölj B +67% · Skillnad +47 pp" med mint/coral-färgning. Ingen tolkning krävs av användaren
- [ ] **Max drawdown** — det viktigaste riskmåttet för privatpersoner. Beräknas ur befintlig prisdata i `calculations.js`. Visas per portfölj och per fond i CAGRTable eller ny riskrad under grafen: "Portfölj A tappade som mest −38% (mars 2020)"
- [ ] **Volatilitet (standardavvikelse årsvis)** — komplement till max drawdown. Ger användaren ett mått på hur ryckig resan var, inte bara slutresultatet
- [ ] **Benchmark-linje i grafen** — OMXS30 eller MSCI World som valfri referenslinje. Möjliggör frågan "slog din portfölj index?". Kräver ny fond i registret eller separat benchmarkdata

## Fas 7 – Delning och reach

Mål: varje jämförelse ska kunna delas med en URL. Produkten ska hittas via Google.

- [ ] **URL-serialisering** — portföljens fonder, allokeringar och valt span kodas i URL-parametrar (`?a=id:pct,id:pct&b=...&span=3y`). Ren frontend, ingen backend. Gör varje jämförelse delbar och bokmärkbar. Implementeras i `usePortfolio.js` + `App.jsx`
- [ ] **Kopiera länk-knapp** — enkelt UI-element i grafkortet som kopierar aktuell URL till clipboard
- [ ] **SSR/prerendering** — Vite SSG eller `vite-plugin-ssr` för statiska sidor per fondkategori. Ger Google något att indexera på termer som "jämför globalfonder avgift", "bästa sverigefond historik". Kräver arkitekturellt beslut — utvärderas separat

## Fas 8 – Onboarding och startläge

Mål: en ny användare ska förstå produkten och nå ett aha-moment utan friktion.

- [ ] **Förifyllda startexempel** — tre snabbvalsknappar på tom startskärm: "Jämför indexfonder", "Hög vs låg avgift", "Sverige vs Global". Klick fyller portföljerna direkt med relevanta fonder
- [ ] **Tom-portfölj-state** — tydligare visuell guide i tomma PortfolioPanel: "Lägg till fonder för att se avkastning" med pil mot sökknappen, inte bara en tom yta
- [ ] **Laddningshint** — medan fonddata hämtas: visa en kort hint om vad man kan göra, inte bara spinner

## Fas 9 – Breddat fonduniversum

Mål: täcka de fondtyper som saknas för en komplett bild av den svenska fondmarknaden.

- [ ] **ETF-stöd** — annan prisstruktur (realtid vs NAV), annan avgiftsmodell (TER). Kräver ny datakälla eller anpassad Yahoo-hämtning. Öppnar för iShares, Vanguard och Avanza-ETF:er
- [ ] **Nordiska fonder** — danska och finska indexfonder med Yahoo-täckning (t.ex. Storebrand, Sparinvest)
- [ ] **AMF Räntefond Kort** — ticker saknas, kör `npm run add-fund SE0001184961` när tillgänglig

---

## Teknisk skuld

~~- CompareBar.jsx i components/ är oanvänd sedan Snabb jämförelse togs bort — kan raderas~~ (raderad)
~~- AMF Räntefond Kort saknar Yahoo-ticker~~ — fortfarande ej löst, se Fas 9 ovan
- ARCHITECTURE.md refererar fortfarande CompareBar.jsx — uppdatera vid nästa genomgång

---

## Regler för Claude Code

- Läs alltid AI_RULES.md innan du börjar
- Rör inte filer som inte är direkt relevanta för uppgiften
- Följ datapipelinen: normalize → dateRange → blend → calculations
- Mobilanpassning ska alltid beaktas