# SEO – MinPortfölj

Status: **Fas A och B levererade 2026-09-08.** 64 sidor i produktion, sitemap inskickad till
Search Console. Fas C och D återstår.
Ersätter den ensamma raden om SEO/prerendering i ROADMAP.md Fas 7.

---

## 1. Utgångsläge

| Del | Status |
|---|---|
| `index.html` metataggar | Title, description, keywords, canonical, OG, Twitter, GSC-verifiering |
| `robots.txt` | Öppen, pekar på sitemap |
| `sitemap.xml` | **En (1) URL** – `/` |
| Rendering | Ren CSR (Vite + React 19, ingen router) |
| Strukturerad data | Saknas helt |
| `og:image` | Saknas |
| Indexerbart innehåll | Noll ord i HTML-källan |

Registret innehåller **52 fonder i 9 kategorier**. Allt det innehållet är osynligt för Google.

## 2. Grundproblem

Sajten konkurrerar om ett fåtal breda huvudtermer (`jämför fonder`, `fondavgifter`) från en enda
sida, mot Avanza, Nordnet, Morningstar och Compricer. Den striden går inte att vinna som
hobbyprojekt.

Däremot: 52 fonder × frågor som "vad kostar X", "X eller Y", "historisk avkastning X" är
hundratals long tail-sökningar där konkurrensen är fondbolagets egen produktsida plus
Morningstar. Där finns en verklig lucka — ingen svensk sajt svarar rakt på *"Avanza Global eller
Länsförsäkringar Global Index?"* med graf, avgift och CAGR i samma vy.

**Strategin är därför: bygg en statisk innehållsyta ovanpå appen, inte SEO på appen.**

## 2.1 Ramverk för budskapet: nettoutfall dömer, avgiften förklarar

Avkastningen i produkten visas alltid efter avgift (branschstandard, se Fas 6.5 i ROADMAP.md).
Därför får de statiska sidorna **inte** presentera avgiften i kronor som en egen stor siffra —
läsaren drar då av den två gånger, och en dyrare fond som faktiskt levererat mer nettoavkastning
framstår felaktigt som ett sämre val.

Frågan sidorna ska svara på är: *"finns en liknande fond som gett mer efter avgift?"*
Inte: *"vilken fond är billigast?"*

Konsekvenser genom hela innehållet:

- Tabeller sorteras på avkastning efter avgift, inte på avgift. Avgiftskolumnen står kvar bredvid.
- Kronbelopp visar **slutvärde**, aldrig ackumulerad avgift.
- Avgiften motiveras med att den är det enda som är känt i förväg — inte med att den är det viktigaste.
- **Ingen egen klassificering av fonder.** Ett Index/Aktiv-fält övervägdes och valdes bort: allt
  annat på sajten är källhänvisat (FI, Yahoo), och en handgjord etikett hade varit den enda
  uppgiften som bara är ett påstående. Jämförelser sker inom kategori, och siffrorna får tala.
  En mening i kategoriprosan påminner om att kategorin rymmer olika förvaltningsstrategier.
- Trailing femårsavkastning är brusig och belönar den stil som råkat fungera. Sidorna ska säga det
  rakt ut i minst en mening per mall, inte låta rankingen framstå som en prognos.

## 2.2 Datafönster: 1 och 3 år, aldrig 5

Prisdatan från Yahoo Finance börjar för de flesta svenska fonder i **mars 2022** (se OM_SIDAN.md).
En femårskolumn vore alltså påhittad för merparten av registret.

Viktigare: fonderna har **olika startdatum** i datan. En ranking "sedan start" jämför därmed olika
tidsperioder med varandra och är inte en ärlig ranking. Kategoritabeller får därför bara innehålla
fönster som samtliga fonder i kategorin täcker helt — i praktiken 1 och 3 år.

- **Kategorisidor:** 1 år och 3 år, båda synliga samtidigt. Default-sortering på 3 år fallande.
  Att båda står bredvid varandra gör bruset synligt — en fond kan toppa på tre år och ligga sist
  på ett — och hindrar att en enskild kolumn läses som en prognos.
- **Fondsidor:** 1 år, 3 år, plus en märkt rad "Sedan <faktiskt startdatum>". Där jämförs ingenting
  mellan fonder, så det faktiska fönstret är ärligt att visa.
- **Fonder yngre än 3 år:** visa "–" i 3-årskolumnen, sortera sist, skriv ut startdatumet. Aldrig
  tomt fält, aldrig med i rankingen.
- **CTA:n ska inte lova "längre historik".** Appen har bara några månader mer data än sidan, så det
  är en tunn morot. Det appen kan och de statiska sidorna inte kan är att blanda flera fonder till
  en portfölj, sätta egna andelar och ställa två portföljer mot varandra. Det är den ärliga kroken.

## 3. Arkitekturbeslut: prerendra INTE SPA:n

Det naturliga första förslaget är SSR/SSG av själva appen (vite-react-ssg, vite-plugin-ssr).
Rekommendationen är att inte göra det. Skäl:

- Appen är interaktiv per definition — allokeringar, span, jämförelselägen. Att SSR:a den ger
  hydration-komplexitet utan att lösa indexeringsproblemet, eftersom sidans *innehåll* fortfarande
  är beroende av användarens val.
- Prisdata hämtas runtime från Yahoo via `api/funds.js`. SSR skulle antingen göra bygget beroende
  av Yahoo eller lämna sidorna tomma ändå.
- Det kräver react-router, ny routingmodell och ombyggnad av `useUrlSync` — stor risk mot befintlig
  fungerande kod.

**I stället:** ett byggskript som genererar rena statiska HTML-sidor från `funds-registry.js`,
`fi-fees.json` och en cachad prissnapshot. Sidorna är ren HTML + inline CSS, ingen React, ingen
hydration. De innehåller riktig text och tabeller, och länkar in i appen med befintliga
query-parametrar från `useUrlSync`.

Fördelar: appen rörs inte alls · sidorna laddar på ~20 kB · perfekt Core Web Vitals ·
inget nytt runtime-beroende · ingen router behövs.

## 4. URL-struktur

```
/                                  Appen (oförändrad, CSR)
/fonder/                           Index: alla 52 fonder, sorterbar tabell
/fonder/globalfonder               Kategorisida (9 st)
/fonder/sverigefonder
/fonder/rantefonder
/fonder/usa-fonder
/fonder/smabolagsfonder
/fonder/tillvaxtmarknadsfonder
/fonder/temafonder
/fonder/blandfonder
/fonder/europafonder
/fond/avanza-global                Fondsida (52 st)
/fond/lansforsakringar-global-index
/jamfor/avanza-global-vs-lansforsakringar-global-index   Duellsida (kurerad, ~30 st)
/om                               OM_SIDAN.md som HTML
```

Slug: gemener, `å/ä→a`, `ö→o`, mellanslag→bindestreck, från `fund.name`. Lägg slug som fält i
`funds-registry.js` så den är stabil och inte kan ändras av ett namnbyte.

Duellsidor genereras **inte** kombinatoriskt (52² = 2 652 sidor thin content = doorway-varning).
Kurera en lista på ~30 par som folk faktiskt googlar: de stora globalfonderna mot varandra,
Avanza Zero mot Sverigeindexfonderna, de billigaste mot de dyraste i varje kategori.

## 5. Sidmallar

### 5.1 Fondsida `/fond/[slug]`

- `<h1>` Fondnamn
- Faktaruta: ISIN, kategori, avgift, avgiftskälla (FI/Manuell), datumstämpel
- Avkastningstabell: 1 år / 3 år, plus en tydligt märkt rad "Sedan <faktiskt startdatum>"
  (endast här — se avsnitt 2.2)
- Utfallsblock "Finns det något bättre?": fondens placering i kategorin efter avgift, namn och
  länk till närmaste bättre alternativ, samt slutvärde i kr för 100 000 kr — denna fond, bästa,
  sämsta. **Aldrig avgiften i kronor** (se avsnitt 2.1)
- Jämförelseblock: 4 fonder ur samma kategori sorterade på avkastning efter avgift, länkade,
  med länk vidare till hela kategorisidan
- Primär CTA → `/?a=<id>:100&span=5y&mode=funds` (öppnar fonden i appen)
- 150–250 ord unik prosa per fond, genererad från datan men varierad i formulering
- JSON-LD: `FinancialProduct` + `BreadcrumbList`

Title: `Avanza Global – avgift 0,08 % och historisk avkastning | MinPortfölj`
Description: `Avanza Global kostar 0,08 % i årlig avgift. Se historisk avkastning 1, 3 och 5 år och jämför mot 11 andra globalfonder.`

### 5.2 Kategorisida `/fonder/[kategori]`

- `<h1>` t.ex. "Globalfonder – jämför avgifter och avkastning"
- Sorterbar tabell (vanilla JS, ~30 rader), default på **avkastning efter avgift fallande**:
  namn, 1 år, 3 år, avgift, källa
- 300–400 ord: vad kategorin är, vad avgiftsspannet betyder i kronor, hur man väljer
- CTA → appen förladdad med kategorins tre billigaste
- JSON-LD: `ItemList` + `FAQPage` (3–4 frågor: "Vilken globalfond har gett mest?", "Vilken är billigast?", "Ska jag välja fonden med lägst avgift?")

Detta är de sidor som ska ranka. `billigaste globalfonden` och `jämför sverigefonder` har volym
och är vinnbara.

### 5.3 Duellsida `/jamfor/[a]-vs-[b]`

- `<h1>` "Avanza Global eller Länsförsäkringar Global Index?"
- Tabell sida vid sida: avgift, CAGR, max drawdown, volatilitet (data finns redan i RiskPanel)
- **Namnge vinnaren i klartext** — matchar Design Principle 2 i PRODUCT.md
- Avgiftsskillnad i kronor över 10 och 20 år
- CTA → appen med båda fonderna förladdade i jämförelseläge

## 6. Data för statiska sidor

Sidorna behöver avkastningssiffror vid byggtid. Lös det med en snapshot:

1. Nytt skript `scripts/build-seo-snapshot.mjs` — hämtar prishistorik för alla 52 fonder,
   beräknar CAGR/drawdown/volatilitet via befintliga funktioner i `src/lib/calculations.js`,
   skriver `src/data/seo-snapshot.json`.
2. GitHub Action kör det veckovis (samma mönster som `update-fi-fees.yml`) och committar.
3. `scripts/build-seo-pages.mjs` läser registry + fi-fees + snapshot och skriver HTML till `dist/`.
4. `package.json`: `"build": "vite build && node scripts/build-seo-pages.mjs"`.
5. Sitemap genereras i samma skript, med `lastmod` från snapshotens datum.

Sidorna ska visa datumstämpel ("Avkastning per 2026-09-07") — både för trovärdighet och för att
Google värderar färskhet.

## 6.1 Vad som händer när en fond läggs till

Grundregeln: **sidorna genereras ur registret, så registret är sanningen.** Lägger du till en fond
i `funds-registry.js` finns den på sajten vid nästa build. Men tre fält måste fyllas i för hand,
och två saker kan gå sönder tyst.

### Sker automatiskt vid nästa build

- Fondsidan `/fond/<slug>` skapas
- Fonden dyker upp i sin kategoritabell, på rätt plats i sorteringen
- Fonden dyker upp i peers-listan på varje annan fondsida av samma typ i kategorin
- Kategorisidans räknare ("12 fonder"), avgiftsspann och verdict-rad räknas om
- `sitemap.xml` får den nya URL:en med färskt `lastmod`

Inget av detta ska behöva röras manuellt. Om något av det kräver handpåläggning är generatorn
felbyggd.

### Måste fyllas i för hand — samma klistra-in-steg som redan finns

`add-fund.mjs` skriver redan ut objektet med `category: "???"`. Utöka utskriften med ett fält till:

- `category` — som idag
- `slug` — kan genereras ur namnet, men **skrivs en gång och fryses därefter**

### Slug-regeln är den viktigaste

Slugen får aldrig regenereras ur `name`. Rättar du ett stavfel i ett fondnamn två år senare och
slugen räknas om, byter sidan URL, tappar sin indexering och alla interna länkar pekar fel.
Slug är en identitet, inte en härledning. Generatorn ska läsa fältet, aldrig beräkna det.

### Två saker som går sönder tyst

**1. Hårdkodade siffror i kategoriprosan.** Texten innehåller påståenden som "spannet är
0,08 % till 1,29 %" och "3,9 procentenheter". Skrivs de som fast text blir de fel i samma sekund
en fond läggs till. Varje sådan siffra ska injiceras från datan vid byggtid, i meningsmallar med
hål i. Ingen sifferuppgift i prosan får vara en literal.

**2. Snapshotten släpar.** En ny fond har inga avkastningssiffror förrän
`build-seo-snapshot.mjs` körts. Antingen kör du det manuellt efter `add-fund`, eller så dyker
fonden upp med siffror först vid veckokörningen. Gör det första — lägg till en rad i
`add-fund.mjs` som påminner om det.

### Nya fonder träffar 3-årsregeln direkt

En nyligen startad fond har ofta kortare historik än tre år. Då gäller regeln från avsnitt 2.2
automatiskt: "–" i 3-årskolumnen, sorteras sist, startdatumet utskrivet, utanför rankingen.
Sidan finns ändå, så någon som googlar fondens namn hittar den.

### Ny kategori = det enda riktiga skrivjobbet

Introducerar fonden en tionde kategori skapas kategorisidan automatiskt, men den behöver
300–400 ord unik prosa som ingen generator kan skriva. Räkna med en halvtimme. Det händer
sällan — nio kategorier täcker den svenska fondmarknaden.

### Google

Nya sidor indexeras inte direkt. Sitemap med korrekt `lastmod` hjälper, men räkna med dagar till
veckor innan en ny fondsida syns i sökresultaten.

## 6.2 Specifikation: seo-snapshot.json

### Grundregel

Snapshotten får **aldrig** innehålla egen matematik. Den anropar befintliga funktioner i
`src/lib/calculations.js` (`computeCAGR`, `computeMaxDrawdown`, `computeAnnualizedVolatility`,
`seriesYears`, `portfolioReturn`) och `src/lib/normalize.js` (`normalizeToCalendar`). Räknar
skriptet själv kommer de statiska sidorna förr eller senare att visa andra siffror än appen, och
då är trovärdigheten borta. Hämtningen mot Yahoo återanvänder mönstret i `api/funds.js`.

### Gemensamt slutdatum

Alla fönster ankras till ett enda `asOf`-datum — det vanligast förekommande senaste NAV-datumet i
registret — inte till varje fonds eget sista datum. Annars mäts fonderna till olika slutdatum och
rankingen blir skev. Per fond används sista punkten på eller före `asOf`. En fond vars data ligger
mer än fem handelsdagar efter `asOf` flaggas.

### Filformat

```json
{
  "_meta": {
    "asOf": "2026-09-07",
    "generatedAt": "2026-09-07T04:12:00.000Z",
    "fundsTotal": 52, "fundsOk": 51, "fundsStale": 1, "fundsFailed": 0
  },
  "funds": {
    "1": {
      "isin": "SE0011527613",
      "dataFrom": "2022-03-14",
      "dataTo": "2026-09-05",
      "oneYear":    { "return": 14.2, "cagr": 14.2, "maxDrawdown": -7.1,  "volatility": 11.4 },
      "threeYear":  { "return": 47.4, "cagr": 13.8, "maxDrawdown": -12.3, "volatility": 13.1 },
      "sinceStart": { "return": 79.0, "cagr": 13.7, "maxDrawdown": -18.4, "years": 4.48 },
      "stale": false
    }
  }
}
```

- `threeYear` är `null` för fonder med kortare historik än tre år. Aldrig 0, aldrig utelämnad
  nyckel — sidgeneratorn ska kunna skilja "saknas" från "noll".
- Avrundning sker **här**, en gång. Sidorna formaterar men räknar inte om.
- Endast fondfakta. Kategoristatistik (spann, snitt, antal, vinnare) härleds i sidgeneratorn, så
  det finns exakt en sanning per uppgift.

### Robusthet

Misslyckas hämtningen för en fond: **behåll föregående värde ur den befintliga snapshotten och
sätt `stale: true`.** Skriv aldrig en snapshot där fonden saknas — då försvinner dess sida och
dess rad ur sitemap vid nästa build, och Google ser en 404 på en sida som fanns förra veckan.
Misslyckas fler än tio fonder: avbryt utan att skriva filen alls och avsluta med felkod, så att
GitHub-jobbet blir rött i stället för att tyst committa skräp.

Hämtningen sker sekventiellt med kort paus mellan anropen (samma försiktighet som
`add-fund.mjs`), inte 52 parallella requests.

### Körning

- `npm run build-snapshot` för manuell körning
- GitHub Action veckovis efter mönstret i `.github/workflows/update-fi-fees.yml`, committar filen
- Filen committas till repot, så bygget aldrig är beroende av att Yahoo svarar

## 7. Teknisk hygien i `index.html`

- Ta bort `meta keywords` (död sedan 2009, ger noll)
- Lägg till `og:image` — 1200×630 PNG, genererad från grafen eller en enkel märkesbild.
  Utan den ser varje delning i Slack/LinkedIn/X tom ut. Byt `twitter:card` till `summary_large_image`.
- JSON-LD `WebApplication` på startsidan
- `og:site_name`, `og:image:alt`

## 8. Vad som medvetet väljs bort

- **Blogg / guider.** Kräver löpande skrivande. Datadrivna sidor uppdaterar sig själva.
- **Kombinatoriska duellsidor.** Thin content, doorway-risk.
- **SSR av appen.** Se avsnitt 3.
- **Backlinkarbete.** Passar inte ett hobbyprojekt. Trafik får komma från long tail och
  eventuellt organiska omnämnanden i Reddit/Flashback-trådar om fondval.

## 9. Faser

**Fas A – hygien. ✓ Klar.** `og:image`, JSON-LD `WebApplication`, ta bort `meta keywords`,
`summary_large_image`. Oberoende av allt annat, ingen trafikeffekt, men fixar delningsutseendet.
Gör den först för att den är klar samma kväll.

**Fas B1 – registerfältet. ✓ Klar.** `slug` för alla 52 fonder i `funds-registry.js`, plus utökad utskrift
i `add-fund.mjs`. Blockerar allt annat. Slugs genereras ur namnen men skrivs in en gång och fryses.

**Fas B2 – snapshotten. ✓ Klar.** Alla 52 fonder har minst tre års historik, så
3-årsfönstret håller och regeln för yngre fonder är vilande tills nästa tillägg. `scripts/build-seo-snapshot.mjs` + veckovis GitHub Action.
Kör och läs igenom resultatet **innan** någon sidmall byggs — annars byggs mallar på data som
inte finns. Här upptäcks vilka fonder som saknar 3 års historik.

**Fas B3 – en sida av varje. ✓ Klar.** Generatorn byggs för exakt en kategorisida och en fondsida.
Öppna dem i webbläsaren, kontrollera mot mocken. Först när de stämmer skalas det till alla 61.

**Fas B4 – skala och publicera. ✓ Klar 2026-09-08.** 64 URL:er: startsidan, 9 kategorisidor,
52 fondsidor, `/fonder/` och `/om`. Alla kategorier och fonder, sitemap-generering, `/om`,
build-steget i `package.json`, deploy. Verifiera i Search Console att sidorna hittas.

**Fas C – duellsidor.** Först när Fas B är indexerad. Då visar GSC vilka par folk faktiskt söker
på, i stället för att listan gissas fram.

**Fas D – mät och iterera.** Se avsnitt 11.

### Beslut som är stängda

- Statiska sidor, inte SSR av appen (avsnitt 3)
- Ingen Index/Aktiv-klassificering — sajten påstår inget den inte kan källhänvisa (avsnitt 2.1)
- Nettoutfall dömer, avgiften förklarar (avsnitt 2.1)
- 1 och 3 år, aldrig 5 (avsnitt 2.2)
- Sortering med vanilla JS, ~30 rader — besökaren ska kunna byta mellan 1 år, 3 år och avgift
- Grafen behålls på fondsidan — den är sidans enda visuella koppling till produkten
- "Sedan <startdatum>"-raden behålls på fondsidan, aldrig i kategoritabellen
- Fonder yngre än 3 år: "–", sorteras sist, startdatum utskrivet, utanför rankingen

## 10. Realistisk förväntan

Indexering av 60+ nya sidor tar 4–8 veckor. Long tail-trafik börjar synas efter 2–3 månader.
Storleksordning första halvåret: några hundra besök i månaden, inte tusentals. Det är normalt och
tillräckligt — målgruppen är smal och köpintentionen (dvs. beslutsintentionen) är hög.

Nyckeltal att följa i GSC: antal indexerade sidor, visningar per kategorisida, CTR per fondsida.
Inte total trafik.

---

## 11. Fas D — vad som mäts och när

Utgångsläge: 64 sidor publicerade 2026-09-08, sitemap inskickad, ett par sidor manuellt köade
för indexering.

### Tidslinje

**Vecka 1–2 — titta bara på om Google kan läsa sajten.**
Sitemaps-rapporten (upptäckta URL:er, senast läst) och Indexering → Sidor (fel). Ingenting annat.
Prestandarapporten är tom eller missvisande så här tidigt. Noll trafik är förväntat, inte ett
problem.

**Vecka 3–4 — ett enda nyckeltal: antal indexerade sidor.**
Mål: klar majoritet av de 64. Diagnosen som betyder något är statusen
*"Genomsökt – för närvarande inte indexerad"*:

- Ligger **kategorisidor** där är prosan för tunn. Åtgärd: bygg ut till 500+ ord med innehåll som
  inte går att generera — hur kategorin skiljer sig från närliggande, vad man faktiskt bör titta på.
- Ligger **fondsidor** där är mallarna för lika varandra. Åtgärd: öka variationen i title och
  description, t.ex. genom att väva in placering och avgiftsläge i stället för bara fondnamnet.

**Vecka 6–8 — prestandarapporten blir läsbar.**

| Mätvärde | Var | Vad det betyder |
|---|---|---|
| Visningar per sidtyp | Sidor-fliken | Kategorisidor ska slå fondsidor per sida. Gör de inte det fungerar inte kategoriprosan |
| Frågor med visningar men ~0 klick | Frågor-fliken | Title/description matchar inte avsikten. Skriv om dem — snabbaste vinsten som finns |
| Genomsnittlig position 5–20 | Frågor-fliken | Sidor värda att förbättra. Där ger små ändringar utslag |
| Position > 50 | Frågor-fliken | Rör inte. Där hjälper inte copy, bara tid eller mer innehåll |

### Vad som är brus

Dagliga variationer. Totala klick första månaden. Att en enskild sida rör sig några placeringar.
Frågor som innehåller "minportfölj" — den trafiken hade kommit ändå och säger inget om SEO-arbetet.

### Ingång till Fas C

Duellsidorna byggs när Frågor-fliken visar vad folk faktiskt söker på. Leta efter frågor som
innehåller "eller", "vs", "jämför" plus två fondnamn. Kurera ~30 par ur den listan i stället för
att gissa. Finns inga sådana frågor efter åtta veckor är duellsidor fel satsning — lägg kraften på
att fördjupa de kategorisidor som redan får visningar.

### Underhåll som rullar av sig självt

Snapshotten uppdateras veckovis av GitHub-jobbet och sidorna byggs om vid deploy. Enda manuella
momentet är `slug` när en ny fond läggs till, plus 300–400 ord om en ny kategori någonsin dyker upp.
