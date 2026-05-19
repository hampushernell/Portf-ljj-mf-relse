# Return System Spec

## Dataflöde

All avkastningsberäkning följer en strikt pipeline:
normalize → dateRange → blend → calculations → komponenter.
Ingen komponent får beräkna eller transformera avkastning själv.

---

## Tidsspan

Hanteras uteslutande av `getDisplayRange(spanLabel, endTs)` i `dateRange.js`.

Tillgängliga span: `"1 mån"`, `"3 mån"`, `"1 år"`, `"3 år"`, `"Max"`

- Beräkning sker med exakt UTC-kalenderaritmetik bakåt från `endTs`
- Aldrig approximation med dagar eller sekunder (MONTH_SECS används inte)
- Månadsslutskantfall hanteras — om måldagen inte existerar används sista dagen i målmånaden
- `endTs` är alltid `latestNavTs` — senaste tillgängliga NAV bland fonderna, aldrig `Date.now()`
- Max returnerar `{ startTs: null, endTs }` — null signalerar "använd all tillgänglig data"

---

## Normalisering

Hanteras av `normalizeToCalendar(prices, startTs, endTs)` i `normalize.js`.

- En datapunkt per kalenderdag
- Forward fill från senaste handelsdag för helger och helgdagar
- Dagar innan fondens första datapunkt utelämnas — aldrig null eller noll
- Alla fonder delar samma kalenderaxel efter normalisering

---

## Rebasering och blandning

Hanteras av `rebaseSeries` och `blendPortfolio` i `blend.js`.

**Rebasering:**
- Varje fond rebaseras individuellt från sin egen första tillgängliga datapunkt = 100
- Sker alltid före blandning
- Muterar aldrig input

**Portföljblandning:**
- Startpunkt = senaste av alla fonders första datum (inner join)
- Fonder med kortare historik påverkar inte andra fonders individuella startpunkt
- Vikter normaliseras alltid till 100% i blandningen
- Dagar som saknas i någon fond inkluderas inte i portföljserien

**Individuella fondlinjer:**
- Varje fond börjar från sin egen första datapunkt oberoende av portföljens startpunkt
- Slutpunkt är alltid `latestNavTs` för alla linjer

---

## Avkastningsberäkning

- Avkastning = sista värdet i serien − 100
- Legend och tooltip använder alltid samma serie och samma beräkning
- Ingen separat avkastningsberäkning får göras utanför `blend.js` och `calculations.js`

---

## Visning

- Slutdatum i tidslinje = `latestNavTs`, alltid
- Startdatum i tidslinje = portföljens faktiska startpunkt (inner join)
- Fond med kortare historik: linjen börjar senare i grafen med visuell startmarkör
- Varning i legend för fonder som inte täcker hela det valda spannet

---

## Kritiska regler

**Rör aldrig dessa utan att förstå konsekvensen:**

`MONTH_SECS` används inte för spanberäkning — all tidslogik går via `getDisplayRange`.
Konstanten finns kvar i `utils.js` som legacy men ska inte användas i ny kod.

`buildSeries` är legacy — används endast av `FundDetailsModal`.
Ny kod ska aldrig anropa den.

`getYahooRef` är en stub som endast exponerar `latestNavTs` för bakåtkompatibilitet.
Ska fasas ut när `App.jsx` refaktoreras.

Inner join i `blendPortfolio` får aldrig ersättas med index-baserad blandning —
det är grundorsaken till det ursprungliga datumproblemet.

Tooltip vid slutpunkten använder `returnValue` direkt — inte index-uppslag i serien.
Detta garanterar att tooltip och legend alltid visar samma värde.