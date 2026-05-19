# Fee Engine

## Översikt

Avgiftsmotorn hämtar fondavgifter från tre källor i prioritetsordning och exponerar
källan transparent i UI:t. Målet är att alltid visa reglerad data när den finns
tillgänglig och aldrig visa en avgift utan att ange varifrån den kommer.

---

## Datakällor och prioritetsordning

1. **Finansinspektionen** (`feeSource: "fi"`)
   Förvaltningsavgift_fast rapporterad av fondbolagen till FI kvartalsvis.
   Juridiskt bindande rapportering under Lag (2004:46) om värdepappersfonder.
   Lagras i `src/data/fi-fees.json` och uppdateras automatiskt månadsvis.

2. **Morningstar** (`feeSource: "morningstar"`)
   OngoingCharge hämtat live via Morningstar-API i `api/funds.js`.
   Används för utländska fonder (FI, NO, LU) som inte rapporterar till FI.
   Inofficiellt API — kan sluta fungera utan varsel.

3. **Fallback-tabell** (`feeSource: "fallback"`)
   Hårdkodade avgifter i `useFundData.js` (FUND_FEES).
   Används om både FI och Morningstar saknar data.
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
4. Matchar mot FUND_ISINS i utils.js
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
| Spiltan Aktiefond Investmentbolag | SE0004297927 | morningstar | Rapporterar sporadiskt till FI |
| Nordea Global Enhanced Growth | FI4000261326 | morningstar | Finländsk fond |
| Nordea Global Index Select | FI4000046685 | morningstar | Finländsk fond |
| DNB Global Indeks S | NO0010827280 | morningstar | Norsk fond |
| Nordea Swedish Sustainable Enhanced | LU2122930915 | morningstar | Luxemburgfond |

---

## Kritiska regler

- Rör aldrig prioritetsordningen i useFundData.js utan att uppdatera denna fil
- Fallback-tabellen FUND_FEES ska uppdateras manuellt vid fondernas årliga avgiftsrevision (typiskt januari–mars)
- Skriptet scripts/fetch-fi-fees.mjs ska aldrig hårdkoda ZIP-URL:en — den scrapar alltid fi.se dynamiskt
- feeSource och feePeriod ska alltid följa med fondobjektet genom hela datapipelinen
