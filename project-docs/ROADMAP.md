# Roadmap – MinPortfölj

## Syfte
Webbapp för att jämföra svenska fonder baserat på historisk avkastning och avgifter.
Användaren bygger en eller två portföljer, väljer tidsspan och ser utvecklingen i graf och legend.
Målgrupp: privatpersoner som vill fatta bättre fondbeslut och ha möjlighet till enkel men kraftfull jämförelse.

## Nuläge
Datapipelinen är stabil och vältestad. Mobilstöd, designsystem och avgiftstransparens är klart.
Fondutbudet utökas aktivt (Fas 5). Registret innehåller 21 fonder across 5 kategorier.

---

## Fas 1 – Stabilisering (aktiv)

Mål: trygg grund innan ny funktionalitet byggs.

- [x] Fyll i STACK.md med teknikstack och projektstruktur
- [x] Lägg till schemaVersion i localStorage för manualFunds med migrationsfunktion — hanterar tre äldre format: rå array, { version/funds }, samt saknad schemaVersion
- [x] Visa tydligt i UI vilka fonder som misslyckades att ladda från Yahoo Finance — visas som notis i FundSearch när sökfältet är tomt
- [x] Unit tests för dateRange.js och blend.js — 44 tester gröna (19 dateRange, 25 blend)

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
- [x] USA-fonder: LF USA Index, Handelsbanken USA Index Criteria, Avanza USA
- [x] Temafonder: Swedbank Robur Technology A, Swedbank Robur Ny Teknik A, LF Tillväxtmarknad Index A
- [x] FundSearch stängs vid klick utanför — ingen Esc-kunskap krävs
- [ ] Blandfonder — en balanserad per storbank (Nordea, Handelsbanken, LF, Swedbank, SEB)
- [ ] Kategorifilter i FundSearch — avskrivet tills fondlistan är tillräckligt stor för att motivera det
- [ ] Utvärdera ETF-stöd (annan prisdata och avgiftsstruktur)

---

## Teknisk skuld

~~- CompareBar.jsx i components/ är oanvänd sedan Snabb jämförelse togs bort — kan raderas~~ (raderad)
- AMF Räntefond Kort saknar Yahoo-ticker — lägg till när ticker blir tillgänglig (`npm run add-fund SE0001184961`)

---

## Regler för Claude Code

- Läs alltid AI_RULES.md innan du börjar
- Rör inte filer som inte är direkt relevanta för uppgiften
- Följ datapipelinen: normalize → dateRange → blend → calculations
- Mobilanpassning ska alltid beaktas