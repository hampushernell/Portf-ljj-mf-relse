# Roadmap – MinPortfölj

## Syfte
Webbapp för att jämföra svenska fonder baserat på historisk avkastning och avgifter.
Användaren bygger en eller två portföljer, väljer tidsspan och ser utvecklingen i graf och legend.
Målgrupp: privatpersoner som vill fatta bättre fondbeslut och ha möjlighet till enkel men kraftfull jämförelse.

## Nuläge
Datapipelinen (normalize → dateRange → blend → calculations) är stabil och vältestad manuellt.
Appen saknar mobilstöd, automatiska tester och har ett antal kända tekniska skulder som ska åtgärdas innan vidare utveckling.

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

## Fas 3 – Mobildesign

Mål: appen ska fungera och kännas bra på 375px. Mobil först enligt AI_RULES.md.

- [ ] Responsiv layout för PortfolioPanel – stapla vertikalt på mobil
- [ ] FundRow-grid anpassad för små skärmar
- [ ] Touch-vänliga tooltips i SVGChart och FundSVGChart
- [ ] Span-knappar i ReturnChart och FundReturnChart ska fungera på 375px

## Fas 4 – Designöversyn

Mål: konsekvent och skalbart designsystem.

- [x] Design tokens centraliserade i src/lib/tokens.js (COLOR, FONT, RADIUS, SHADOW, SPACE, TRANSITION) — alla komponenter migrerade, inga hårdkodade färger eller fontsträngar kvar
- [ ] Konsekvent animationsanvändning genom hela appen
- [ ] Förtydliga skillnaden mellan Jämför-läge och Fondläge visuellt

## Fas 5 – Fondutbud

Mål: bredare fondutbud med bibehållen datakvalitet.

- [ ] Lägg till fler fonder – räntefonder, blandfonder, råvarufonder
- [ ] Kategorifilter i FundSearch
- [ ] Utvärdera ETF-stöd (annan prisdata och avgiftsstruktur)

---

## Teknisk skuld

- buildSeries i calculations.js är legacy – används endast av FundDetailsModal, ska fasas ut
- getYahooRef i calculations.js är en stub för bakåtkompatibilitet – ska fasas ut när App.jsx refaktoreras
- Ingen mobilanpassning trots "mobil först" i AI_RULES.md (Fas 3)

---

## Regler för Claude Code

- Läs alltid AI_RULES.md innan du börjar
- Rör inte filer som inte är direkt relevanta för uppgiften
- Följ datapipelinen: normalize → dateRange → blend → calculations
- Använd aldrig buildSeries eller getYahooRef i ny kod
- Mobilanpassning ska alltid beaktas