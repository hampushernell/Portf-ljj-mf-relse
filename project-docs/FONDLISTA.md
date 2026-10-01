# Fondlista `/fonder/` — spec

Beslutad 2026-10-01. Visuell referens: `project-docs/mockups/fondlista.html` (öppna i webbläsare — sök, kategorier, sortering och jämförelsefält fungerar där med riktig data).

## Omfattning

Ersätt dagens `/fonder/` (renderFundsIndexPage i `scripts/build-seo-pages.mjs`) med den nya listan.
Kategorisidor, fondsidor och `/om` rörs inte i detta steg.

Sidan förblir **statisk HTML** genererad vid bygget. All interaktivitet är ett litet inline vanilla-skript, ingen React, inget nytt beroende. Datan bäddas in som JSON i sidan vid bygget.

## Data (per fond)

Hämtas med befintliga `buildFunds()` — ingen ny beräkning:

| Fält | Källa |
|---|---|
| id | registry (behövs för länken till verktyget) |
| namn, slug, ISIN, kategori | registry |
| avgift + källa (FI / Manuell) | fi-fees.json, annars `fallbackFee` |
| 1 år, 3 år | seo-snapshot.json (`oneYear.return`, `threeYear.return`) |

Antal fonder, datum (`asOf`) och FI-period injiceras alltid ur datan. Inga hårdkodade tal.

## Layout

1. **Nav**: logga, Jämför / Fonder (aktiv) / Om sajten, knapp "Börja jämföra".
2. **Rubrik** "Alla fonder" + stämpelrad: `{N} fonder · Avkastning per {asOf} · Avgifter från Finansinspektionen, {period}`.
3. **Sökfält** (placeholder "Sök fond eller ISIN") + knapp **Filter** till höger.
4. **Kategorichips** med antal: "Alla {N}" först, sedan kategorierna. Flerval; "Alla" nollställer.
5. **Resultatrad**: "Visar alla {N} fonder" eller "Visar {x} av {N} fonder · Rensa filter".
6. **Lista** — kolumner: Fond | 1 år | 3 år | Avgift | plusknapp.
   - Under fondnamnet: `ISIN · Kategori` (ISIN först).
   - Avgift med badge FI / Man.
   - Positiv avkastning mint, negativ coral, saknat värde "–" i label-färg.
   - Rubrikraden är sticky.
7. **Jämförelsefält** (sticky längst ned, visas när minst en fond är vald): valda fonder som chips med ×, "{x} av {max} valda", knapp "Jämför i verktyget →".

## Beteende

- **Standardsortering**: 3 år, högst först. Fonder utan värde hamnar alltid sist, oavsett riktning.
- **Sortering**: klick på kolumnrubrik sorterar, klick igen vänder. Fond sorterar A–Ö (sv-locale). Avgift sorterar lägst först.
- **Sök**: matchar namn och ISIN, okänsligt för versaler och å/ä/ö (NFD-normalisering).
- **Raden** länkar till `/fond/{slug}` (hela raden klickbar via stretched link — ingen `<button>` inuti `<a>`).
- **Plusknappen** lägger till/tar bort fonden i jämförelsefältet. Vald: bock i stället för plus, raden får svag blå ton.
- **Max antal valda**: använd det tak Fondläget i verktyget klarar. Mocken använder 5 — verifiera.
- **"Jämför i verktyget"** öppnar appen i Fondläget med de valda fonderna. Format enligt `useUrlSync.parseUrl()`: `?a={id}:100,{id}:100&mode=funds`. Verifiera att Fondläget läser flera fonder ur `a` så.
- **Filter-knappen**: innehållet byggs i ett senare steg. Rendera inte knappen i produktion förrän den gör något (flagga i generatorn), men lämna plats i layouten.
- Tomt resultat: "Inga fonder matchar" + "Prova ett annat sökord eller ta bort ett filter." + Rensa filter.

## Mobil (< 768 px)

- Sökfält och Filter på samma rad.
- Kategorichips scrollar horisontellt, kant i kant.
- Sorteringsknappar ovanför listan: 1 år / 3 år / Avgift (ersätter kolumnrubrikerna, som döljs).
- Rad: namn, `ISIN · Kategori`, ny rad `Avgift x,xx % [FI]`. Till höger 1 år och 3 år med små etiketter, sedan plusknappen.
- Listan går kant i kant utan sidoramar.
- Jämförelsefältet visar bara "{x} av {max} valda" + knappen.

## Färg och form

Alla tokens enligt `src/lib/tokens.js` / DESIGN.md. Avsteg som är beslutade för denna sida:

- **Accent = Electric Cobalt `#0018F5`**, aldrig Cobalt Mist, på interaktiva valda tillstånd.
- **"Börja jämföra" och "Jämför i verktyget"**: 1 px kant `#0018F5`, bakgrund `rgba(0,24,245,0.16)`, vit text. Hover: bakgrund `0.26`.
- **Valt kategorichip**: samma som ovan (kant `#0018F5`, bakgrund `0.16`, hover `0.26`).
- **Vald plusknapp**: kant `#0018F5`, transparent bakgrund, vit bock. Hover: bakgrund `0.16`.
- **Vald rad**: bakgrund `rgba(0,24,245,0.08)`.
- Kantkontrasten för `#0018F5` (~2:1) är medvetet accepterad här — det är små element och vald status bärs även av ton/ikon.

## Inte i detta steg

- Filterinnehåll.
- Sök/filter i URL:en (förslag finns, inte beslutat).
- Landningssidan och flytten av appen till `/jamfor`.
