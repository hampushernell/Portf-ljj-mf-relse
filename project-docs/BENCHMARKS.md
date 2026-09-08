# Benchmarks

## Översikt

Jämförelseindex är en valfri extra linje i grafen, aktiverad med indexchipet i grafkortets
kontrollrad. Syftet är att ge användaren en referenspunkt att göra sin egen bedömning mot —
inte att sajten ska tala om hur en fond eller portfölj har presterat.

Referensen är alltid ett **index**, aldrig en fond. En utpekad "jämförelsefond" hade svarat på
samma fråga som verktyget redan svarar på (vilken fond är bäst) och hade dessutom läst som en
rekommendation.

---

## Kritiska regler

- **Sajten fäller ingen dom.** Ingen text som ställer fond eller portfölj mot index får skrivas ut
  — ingen "slog inte index", ingen pp-differens mot index, ingen färgkodning som antyder ett utfall.
  Vinnarraden under grafen handlar om Portfölj A mot B och påverkas inte av att index visas.
  Motivering: OM_SIDAN.md slår fast att ingenting på sajten utgör finansiell rådgivning.
  "Du slog inte index" är en investeringsbedömning; att räkna ut skillnaden mellan två portföljer
  användaren själv satt ihop är det inte.
- **Endast totalavkastningsindex.** Prisindex utan utdelningar (`^OMX`, `^OMXSPI`) får aldrig
  användas. Fondernas NAV har återinvesterade utdelningar; svensk direktavkastning ligger kring
  3–3,5 % per år, vilket över tre år gör att i princip varje sverigefond "slår" ett prisindex.
  Det är ett systematiskt fel, inte en avrundning.
- **Endast SEK, eller dokumenterat omräknat till SEK.** Ett USD-noterat index jämfört med en
  SEK-noterad fond saknar fondens valutaeffekt. Omräkning sker med Yahoos `SEK=X` och ska anges
  i indexets `note`-fält.
- **Chipet gråas aldrig ut.** Vilket index som är relevant avgör användaren. Överlagringen påstår
  ingenting i sig — två märkta linjer är två märkta linjer.
- **Benchmarkserien går aldrig genom `blendPortfolio`.** Den är inte en del av portföljen.
- **Index-id fryses vid införandet**, precis som fondernas `slug`. De ligger i delningslänkar.

---

## Datakällor

Prisdata hämtas från Yahoo Finance, samma pipeline som fonderna. Ingen licensierad indexdata
används — det innebär att utbudet begränsas till index som finns fritt tillgängliga i
totalavkastningsform.

| Villkor | Varför |
|---|---|
| Totalavkastning (GI / TR / GR) | Jämförbart med fondernas NAV |
| SEK, eller omräkningsbar med `SEK=X` | Fondernas avkastning innehåller valutaeffekten |
| Minst lika lång historik som fonderna | Serien klipps ändå till fondens fönster |

---

## Register

Index ligger i `src/lib/benchmarks.js` — **inte** i `funds-registry.js`, som är enda stället att
redigera vid ny **fond** och inte ska innehålla annat.

```js
{
  id:       "sp500tr",             // fryst, används i URL — ändras aldrig
  ticker:   "^SP500TR",            // Yahoo-symbol
  name:     "S&P 500 TR (SEK)",    // visas i legenden
  currency: "USD",                 // kräver fxTicker
  fxTicker: "SEK=X",               // USD/SEK, null för SEK-index
  category: "USA-fond",            // kategorin indexet är mappat till
  note:     "Total Return — inkluderar återinvesterade utdelningar. Omräknad till SEK med Yahoos USD/SEK-kurs (SEK=X)",
  source:   "S&P Dow Jones Indices och Yahoo Finance (FX), båda via Yahoo Finance",
}
```

### Nuvarande täckning

| Kategori | Index | Id | Status |
|---|---|---|---|
| USA-fond | S&P 500 Total Return, omräknat till SEK | `sp500tr` | **V1 — pilot.** Verifierad |
| Sverigefond | OMX Stockholm GI | `omxsgi` | **Blockerad** — ingen historik hos Yahoo, se nedan |
| Europafond | STOXX Europe 600 Gross Return | `sxxr` | Ej verifierad |
| Globalfond | — | — | **Saknas.** MSCI World/ACWI TR är licensierad data |
| Tillväxtmarknadsfond | — | — | Saknas, samma skäl som global |
| Räntefond | — | — | Inget naturligt index |
| Blandfond | — | — | Kräver konstruerat komposit |
| Småbolagsfond | — | — | Ej utrett |
| Temafond | — | — | Ej utrett |

Globalfond är den största kategorin i registret och den som saknar referens. Det är den enskilt
största begränsningen i funktionen och ska inte döljas för användaren.

---

## Byggordning — två steg

Funktionen byggs i två steg. **Steg 1 får inte deployas.**

**Steg 1 — allt utom valutan.** Chip, indexlinje, legend, tooltip, URL-parameter och tester,
kört mot `^SP500TR` rakt av i USD. Syftet är att få maskineriet på plats och felsökt utan att
valutaomräkningen är en möjlig felkälla. Legendnamnet ska i det här steget stå som
**"S&P 500 TR (USD)"** — så att det syns direkt om bygget skulle råka nå produktion.

**Steg 2 — valutan.** `SEK=X` hämtas, `toSek()` kopplas in, legendnamnet blir
"S&P 500 TR (SEK)". Cirka trettio rader plus ett test. Först därefter deploy.

### Varför steg 1 inte får nå produktion

Uppmätt 2026-09-08, tre år tillbaka:

| | Start (okt 2023) | Nu | Utveckling |
|---|---|---|---|
| `^SP500TR` i USD | 9 052 | 17 198 | **+90,0 %** |
| `SEK=X` (USD/SEK) | 11,14 | 9,59 | kronan upp 14,0 % |
| Samma index i SEK | | | **+63,4 %** |

**26,6 procentenheters skillnad.** Valutaeffekten slår på hela uppgången, inte bara på insatsen.

En svensk USA-indexfond som faktiskt gav +63 % skulle ritas 27 punkter under en indexlinje som
visar +90 %, på samma axel och rebaserad till samma 100. Läsaren drar slutsatsen att fonden
misslyckats — utan att en enda mening skrivits ut. Regeln om att sajten inte fäller någon dom
skyddar inte mot det här, eftersom gapet är ritat och inte skrivet.

Att ett USD-index visas i USD hos Dagens Industri och andra är riktigt, men där står siffran för
sig själv. Missvisningen uppstår först när serien läggs på samma axel som en SEK-noterad fond.

Om USD-varianten ändå ska finnas kvar för den som vill ha den publicerade siffran: lägg den som
en **egen post** i registret med namnet "S&P 500 TR (USD)", vid sidan av SEK-varianten. Aldrig som
standardvalet.

**Repot deployar från GitHub till Vercel på `main`.** Steg 1 ska därför byggas på egen branch och
inte slås ihop förrän steg 2 är klart.

---

## Verifiering av tickrar (2026-09-08)

| Ticker | Valuta | `firstTradeDate` | `validRanges` | Slutsats |
|---|---|---|---|---|
| `^OMXSGI` | SEK | `null` | endast `1d`, `5d` | **Oanvändbar** — bara dagsnotering |
| `^OMXS30GI` | SEK | `null` | endast `1d`, `5d` | **Oanvändbar** — samma |
| `^OMXSPI` | SEK | 2013-03 | fullt urval | Historik finns, men prisindex — diskvalificerad |
| `^SP500TR` | USD | 1988-01 | fullt urval | **Användbar** |
| `SEK=X` | SEK | 2001-07 | fullt urval | **Användbar** (USD/SEK) |

Yahoo har GI-symbolerna som **livenotering utan historik**. Anrop med `range=10y` eller explicit
`period1`/`period2` returnerar ändå en enda datapunkt. Två tecken avslöjar det utan att man behöver
räkna punkter:

- `validRanges` innehåller bara `["1d","5d"]` i stället för hela urvalet upp till `max`
- `firstTradeDate` är `null`, och `fiftyTwoWeekHigh`/`fiftyTwoWeekLow` ligger inom en procent från
  varandra — omöjligt för ett verkligt index, och visar att Yahoo börjat registrera symbolen
  nyligen

### Så verifieras en ny ticker

```bash
node -e 'const s="^SP500TR";
fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?range=10y&interval=1mo`,
 {headers:{"User-Agent":"Mozilla/5.0"}}).then(r=>r.json()).then(d=>{
  const m=d.chart.result[0].meta, c=d.chart.result[0].indicators.quote[0].close.filter(v=>v!=null);
  console.log(m.symbol, m.currency, "punkter="+c.length,
              "firstTrade="+(m.firstTradeDate?new Date(m.firstTradeDate*1000).toISOString().slice(0,7):"null"),
              "ranges="+m.validRanges.join(","));
 });'
```

Godkänd ticker: `validRanges` går upp till `max`, `firstTradeDate` är satt, och antalet punkter
motsvarar det begärda intervallet.

---

## Ett index per kategori, inte fondens eget

Fonder har egna officiella jämförelseindex som skiljer sig åt även inom samma kategori. Sajten
använder medvetet **ett index per kategori** i stället, så att fonder i samma kategori går att
jämföra mot samma referens. Förenklingen ska stå utskriven i UI eller i Om-sidan, inte döljas.

---

## Datapipeline

Benchmarkserien följer fondernas pipeline fram till rebasering, men blandas aldrig in i portföljen:

```
Yahoo råpriser (index, USD)      Yahoo råpriser (SEK=X)
        ↓                                ↓
   normalizeToCalendar()          normalizeToCalendar()      båda med samma startTs/endTs
        └────────────┬───────────────────┘
                     ↓
              multiplicera punktvis          index_usd(d) × usdsek(d) på gemensam dagsaxel
                     ↓
              rebaseSeries()                 index 100 från portföljens startTs
                     ↓
              Komponenter                    egen linje i SVGChart / FundSVGChart
```

**Ordning vid valutaomräkning:** normalisera båda serierna till kalenderaxeln *först*, multiplicera
sedan. `normalizeToCalendar()` tar rådata och forward-fillar själv, så råserierna behöver inte ha
matchande tidsstämplar — vilket de inte har: indexet följer amerikanska handelsdagar, FX-kursen i
stort sett alla vardagar. Multiplicera aldrig råserier mot varandra; de saknar gemensam axel.

På en amerikansk helgdag forward-fillas indexet medan FX rör sig, så SEK-serien rör sig den dagen
utan att indexet gjort det. Det är korrekt beteende — det är vad ett SEK-noterat värde av en
USD-tillgång faktiskt gör — och det jämnar ut sig nästa handelsdag.

**Klippning:** indexserier går årtionden bakåt medan de flesta fonder saknar Yahoo-data före
mars 2022. Serien måste klippas till samma fönster som fonderna, annars ser det ut som att fonden
saknar data i en period där grafen ändå visar en linje.

**Rebasering:** benchmarken rebaseras till samma `startTs` som portföljen. Görs det inte startar
linjerna inte på 100 tillsammans och hela grafen blir felläst.

---

## UI

### Chipet
- Placering: fristående knapp till vänster om tidsspannen i grafkortets kontrollrad, speglar
  Dela-knappen. Finns i både `ReturnChart.jsx` och `FundReturnChart.jsx`.
- Etikett: **"Index"**. Inte "Jämför" — det ordet är upptaget av lägesväxlaren Fonder → Jämför.
  Indexets namn står i legenden, inte på knappen.
- Bygg som etikett + värde, inte som ren av/på-knapp, så att steget till flervalsdropdown blir
  att lägga till caret och panel i stället för att ersätta komponenten.

### Linjen
- Färg `COLOR.text.label` (`#a9b6cc`), streckad `5 4`, strokeWidth enligt `CHART.*.stroke`.
- Aldrig en accentfärg. Two-Accent Rule i DESIGN.md: kobolt och arctic är de enda mättade färgerna
  i systemet. Streckningen bär dessutom betydelse — det här är en referens, inte något användaren äger.
- Flera index samtidigt skiljs åt med **streckmönster**, inte färg (`5 4`, `2 3`, `9 3`).
  Tre mönster går att hålla isär, fyra gör det inte — det sätter taket för hur många index som
  får visas samtidigt.

### Legenden
- Samma swatch-bredd som A och B (22×10), tunnare stroke, streckad.
- Indexets avkastning visas som ren siffra i `COLOR.text.secondary` — **inte** i mint eller korall.
  Siffran är ett faktum och behövs för att kunna läsa av linjens slutpunkt, men semantisk färg
  skulle ge den samma tyngd som portföljerna har.

---

## URL-parameter

Valet av index följer med i delningslänken, hanteras i `hooks/useUrlSync.js`.

```
&idx=omxsgi              // v1
&idx=omxsgi,sp500tr      // vid flerval
```

Skrivs som lista av id:n från början, aldrig som boolesk flagga (`&idx=1`). Parsning med
`split(",")` fungerar i båda fallen; v1 råkar bara alltid ge en post. En flagga hade behövt bytas
ut den dagen flerval införs, och hade då brutit varje redan delad länk.

---

## Att lägga till ett nytt index

1. Verifiera i Yahoo att tickern finns, är **totalavkastning** och har tillräcklig historik —
   använd kommandot under "Verifiering av tickrar" och kontrollera `validRanges` och
   `firstTradeDate`, inte bara att anropet svarar
2. Lägg till posten i `src/lib/benchmarks.js` med fryst `id`
3. Fyll i raden i täckningstabellen ovan
4. Är indexet inte SEK-noterat: sätt `fxTicker` och skriv omräkningen i `note`
5. Kontrollera att inget nytt streckmönster behövs utöver de tre som finns
