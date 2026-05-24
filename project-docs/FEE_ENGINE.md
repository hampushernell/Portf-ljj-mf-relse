# Fee Engine

## Översikt

Avgiftsmotorn hämtar fondavgifter från två källor i prioritetsordning och exponerar
källan transparent i UI:t. Målet är att alltid visa reglerad data när den finns
tillgänglig och aldrig visa en avgift utan att ange varifrån den kommer.

---

## Datakällor och prioritetsordning

1. **Finansinspektionen** (`feeSource: "fi"`)
   Förvaltningsavgift_fast rapporterad av fondbolagen till FI kvartalsvis.
   Juridiskt bindande rapportering under Lag (2004:46) om värdepappersfonder.
   Lagras i `src/data/fi-fees.json` och uppdateras automatiskt månadsvis.

2. **Fallback-tabell** (`feeSource: "fallback"`)
   Hårdkodade avgifter i `src/lib/funds-registry.js` (fältet `fallbackFee`).
   Används om FI saknar data för fonden.
   Manuellt underhållen — uppdatera vid fondernas årliga avgiftsrevision.

---

## Automatisk uppdatering

**Fil:** `.github/workflows/update-fi-fees.yml`
**Schema:** 1:a varje månad, 06:00 UTC
**Trigger:** Kan köras manuellt via workflow_dispatch i GitHub Actions

Flöde:
1. Skrapar fi.se dynamiskt för senaste ZIP-filnamn
2. Laddar ner och packar upp ZIP i minnet
3. Parsar XML och extraherar Förvaltningsavgift_fast per ISIN
4. Matchar mot FUND_ISINS (deriverat från funds-registry.js via utils.js)
5. Skriver till src/data/fi-fees.json om data ändrats
6. Committar med meddelandet `chore: update FI fund fees [PERIOD]`

Vid nätverksfel: befintlig fi-fees.json bevaras, varning loggas, exit 0.

---

## fi-fees.json — format

```json
{
  "_meta": {
    "source": "Finansinspektionen fondinnehav",
    "period": "2025Q4",
    "published": "2026-04-15",
    "retrievedAt": "2026-05-19T10:00:00Z",
    "field": "Förvaltningsavgift_fast"
  },
  "SE0011527613": 0.08,
  "SE0005188836": 0.20
}
```

---

## Fondtäckning

| Fond | ISIN | Källa | Anmärkning |
|------|------|-------|------------|
| Avanza Global | SE0011527613 | fi | |
| Länsförsäkringar Global Index | SE0005188836 | fi | |
| Länsförsäkringar Sverige Index | SE0002656611 | fi | |
| Storebrand Global All Countries | SE0000671919 | fi | |
| AMF Aktiefond Sverige | SE0000739195 | fi | |
| Handelsbanken Global Index | SE0011309707 | fi | |
| Handelsbanken Sverige Index | SE0001466368 | fi | |
| Avanza Zero | SE0001718388 | fi | |
| Spiltan Aktiefond Investmentbolag | SE0004297927 | fallback | Rapporterar sporadiskt till FI |
| Nordea Global Enhanced Growth | FI4000261326 | fallback | Finländsk fond |
| Nordea Global Index Select | FI4000046685 | fallback | Finländsk fond |
| DNB Global Indeks S | NO0010827280 | fallback | Norsk fond |
| Nordea Swedish Sustainable Enhanced | LU2122930915 | fallback | Luxemburgfond |

---

## Kritiska regler

- Rör aldrig prioritetsordningen i useFundData.js utan att uppdatera denna fil
- Fallback-fältet `fallbackFee` i `src/lib/funds-registry.js` ska uppdateras manuellt vid fondernas årliga avgiftsrevision (typiskt januari–mars)
- Skriptet scripts/fetch-fi-fees.mjs ska aldrig hårdkoda ZIP-URL:en — den scrapar alltid fi.se dynamiskt
- feeSource och feePeriod ska alltid följa med fondobjektet genom hela datapipelinen
- feeUpdatedAt ska alltid följa med fondobjektet — sätts automatiskt vid sparande/redigering av manuella fonder i ManualFundModal, används i FeeBadge-tooltip

---

## UI-exponering av avgiftskälla

### Badge i FundRow och FundDetailsModal
Varje fond visar en källbadge bredvid avgiften:
- `fi` → badge "FI", färg #3a9aa8 (FI:s profilfärg). Tooltip visar period och publiceringsdatum från fi-fees.json _meta.
- `fallback` på registrerad fond → badge "Manuell", färg #94a3b8. Tooltip visar att avgiften saknar FI-data och är manuellt angiven i fondregistret, samt feeUpdatedAt om det finns.
- `fallback` på manuellt tillagd fond (fund.isManual) → badge "Manuell", samma färg. Tooltip visar att avgiften är angiven av användaren samt feeUpdatedAt.

### Avgiftsmodal i PortfolioPanel
?-knapp i avgift/år-kortets rubrikrad öppnar en modal med:
- Förklaring av viktad portföljavgift
- Beskrivning av FI- och manuell-källorna
- Morningstar-länkar per fond:
  - Registrerad fond (oavsett feeSource) → direktlänk via ticker utan .ST
  - Manuellt tillagd fond (fund.isManual) → generisk söklänk till morningstar.se

### Distinktion: manuell avgift vs manuell fond
Dessa är två separata koncept:
- Manuell avgift: feeSource === "fallback" på en registrerad fond — har ticker, kan länkas direkt till Morningstar
- Manuell fond: fund.isManual === true — tillagd av användaren, saknar ticker, får generisk Morningstar-länk
