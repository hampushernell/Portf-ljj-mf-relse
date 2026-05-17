# Return System Rules

## 1Y Return

- Ska baseras på senaste tillgängliga NAV
- Inte dagens datum
- Närmaste historiska NAV används
- Om exakt datum saknas används närmaste tidigare handelsdag

## Charts

- Alla grafer använder samma referenslogik
- Alla procenttal använder samma return calculation

## Time periods

- 1M
- 3M
- 6M
- 1Y
- 3Y
- MAX

ska alla använda samma datumstrategi

---

## Kritiska regler — rör ej utan förståelse

### slice(-minLen) får inte användas för individuella fondlinjer

`computeReturnBundle` i `calculations.js` bygger `graphSeries` per fond.
Använd INTE `slice(-minLen)` här. `minLen` baseras på portföljseriens längd
och trimmar varje fonds startpunkt beroende på vilka andra fonder som finns
i portföljen — vilket ger fel avkastning per fond.

Varje fond ska rebaseras från sin egen `raw[0].value` utan trimning.

### blendPortfolioSeries får inte trimma från slutet

`aligned`-steget i `blendPortfolioSeries` ska INTE använda `slice(-minLen)`.
Portföljserien ska starta från den tidigaste gemensamma startpunkten.
Trimning bakifrån förskjuter startdatumet när fonder har marginellt olika
antal datapunkter.

### Tooltip vid slutpunkten använder returnValue direkt

I `FundSVGChart.jsx` används timestamp-matchning för att hitta rätt index
i varje fonds serie vid hover. Vid slutpunkten (`ci === refSeries.length - 1`)
används `l.returnValue` direkt istället för att indexera in i serien.
Detta garanterar att tooltip och legend alltid visar samma värde vid slutpunkten.