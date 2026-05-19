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

- [ ] Fyll i STACK.md med teknikstack och projektstruktur
- [ ] Flytta ms_token från funds.js till miljövariabel
- [ ] Lägg till schemaVersion i localStorage för manualFunds med migrationsfunktion
- [ ] Visa tydligt i UI vilka fonder som misslyckades att ladda från Yahoo Finance
- [ ] Unit tests för dateRange.js och blend.js

## Fas 2 – Avgifter och datakvalitet

Mål: avgiften är en kärnfunktion och måste vara korrekt och transparent.

- [ ] Audit av alla 13 fonders avgifter mot Morningstar
- [ ] Varning i UI när fondens avgift kommer från hårdkodad fallback (FUND_FEES) istället för Morningstar
- [ ] Visa avgiftskälla i FundDetailsModal

## Fas 3 – Mobildesign

Mål: appen ska fungera och kännas bra på 375px. Mobil först enligt AI_RULES.md.

- [ ] Responsiv layout för PortfolioPanel – stapla vertikalt på mobil
- [ ] FundRow-grid anpassad för små skärmar
- [ ] Touch-vänliga tooltips i SVGChart och FundSVGChart
- [ ] Span-knappar i ReturnChart och FundReturnChart ska fungera på 375px

## Fas 4 – Designöversyn

Mål: konsekvent och skalbart designsystem.

- [ ] Centralisera design tokens – spacing, typsnitt, radier – i utils.js eller separat tokens-fil
- [ ] Konsekvent animationsanvändning genom hela appen
- [ ] Förtydliga skillnaden mellan Jämför-läge och Fondläge visuellt

## Fas 5 – Fondutbud

Mål: bredare fondutbud med bibehållen datakvalitet.

- [ ] Lägg till fler fonder – räntefonder, blandfonder, råvarufonder
- [ ] Kategorifilter i FundSearch
- [ ] Utvärdera ETF-stöd (annan prisdata och avgiftsstruktur)

---

## Teknisk skuld

- ms_token ligger i klartext i funds.js – ska till miljövariabel (Fas 1)
- Avgifter hanteras på två ställen: Morningstar-fetch i funds.js och FUND_FEES i useFundData.js – ska konsolideras (Fas 2)
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