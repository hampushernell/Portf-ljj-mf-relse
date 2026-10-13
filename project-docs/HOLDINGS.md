# HOLDINGS.md: innehav på fondsidorna

Status: **Fas 1 beslutad 2026-10-12**. Gäller bara de statiska fondsidorna (`/fond/<slug>`).
Allt som rör jämförelsesidan (överlapp, portföljviktade sektorer) är **pausat**.
Mockup: designytan "Fondsida – Vad fonden äger" (claude.ai-artefakt, 2026-10-13) gäller. Källkoden finns i `project-docs/mockups/innehav-v2/` (`fondsida.dc.html`, `bolagsfarger.dc.html`, `tomlagen.dc.html`). Värden och färgregler läses ur `renderVals()` i dem. `project-docs/mockups/innehav.html` är den äldre versionen: del 1 och 3 är ersatta av artefakten, del 2 är pausad.

---

## 1. Beslut

- **Källa:** Finansinspektionens fondinnehav per kvartal. Det är samma ZIP-fil som `scripts/fetch-fi-fees.mjs` redan laddar ned varje månad. Yahoo används inte för innehav.
- **Placering:** en ny sektion "Vad fonden äger" direkt efter "Avkastning per period" och före "Finns det något bättre?".
- **Innehåll:** tillgångsfördelning, sektorer med kategorisnittets streck och de tio största innehaven.
- **Kategorisnittets streck** behålls och är en bärande detalj. Samma mönster ska användas för regionfördelning när den byggs (fas 2).
- **Datum och FI-märket** visas alltid i sektionens rubrikrad.
- **Ren sida, siffrorna talar** (Hampus, 2026-10-12). Förklaringar, metod och förbehåll står aldrig som löptext i sektionen. De ligger bakom ett "?" i respektive kort, samma mönster som CAGR- och Riskkorten i appen, eller på Om-sidan. Den som vill veta mer får söka sig dit.
- **Ingen dom:** ingen text som tolkar fördelningen, till exempel "tungt viktad mot tech" eller "mer koncentrerad än snittet". Siffrorna och strecket räcker.

## 2. Data i FI-filen (verifierat mot 2026Q2)

En XML-fil per fond, namespace `http://schemas.fi.se/publika/vardepappersfonder/20200331`.

Fondnivå: `Kvartalsslut`, `Fond_ISIN-kod`, `Fond_namn`, `Fondförmögenhet`, `Likvida_medel`, `Övriga_tillgångar_och_skulder` (samt `Jämförelseindex`, `Aktiv_risk` och `Standardavvikelse_24_månader`, som inte används nu).

Per `FinansielltInstrument`: `Tillgångsslag_enligt_LVF_5_kap`, `Instrumentnamn`, `ISIN-kod_instrument`, `Landkod_Emittent`, `Valuta`, `Antal`, `Nominellt_belopp`, `Marknadsvärde_instrument`, `Andel_av_fondförmögenhet_instrument`, `Bransch/Branschkod_instrument` och `Bransch/Bransch_namn_instrument`.

### Regler som följer av datan

1. **Räkna vikter som `Marknadsvärde_instrument / Fondförmögenhet`**, inte från `Andel_av_fondförmögenhet_instrument`, som är avrundad till två decimaler.
2. **Summera per `ISIN-kod_instrument`.** Samma värdepapper kan förekomma på flera rader. Saknas ISIN används instrumentnamnet som nyckel.
3. **Sektor = `Branschkod_instrument`** (GICS nivå 1: 10, 15, …, 60). `Bransch_namn_instrument` är fritext och blandar språk ("Financials", "Finans", "FINANCIALS"), så det fältet används aldrig. Kod `0` eller saknad kod betyder ingen sektor.
   Svenska namn: 10 Energi · 15 Material · 20 Industri · 25 Sällanköpsvaror · 30 Dagligvaror · 35 Hälsovård · 40 Finans · 45 Informationsteknik · 50 Kommunikationstjänster · 55 Kraftförsörjning · 60 Fastigheter.
4. **Tillgångsslag.** FI skiljer inte aktier från obligationer, eftersom båda heter `ÖverlåtbartVärdepapper`. Härledning:
   - `ÖverlåtbartVärdepapper` med `Antal` blir **Aktier**
   - `ÖverlåtbartVärdepapper` med `Nominellt_belopp` blir **Räntor**
   - `Penningmarknadsinstrument` blir **Räntor**
   - `Fondandel` blir **Fondandelar**
   - `DerivatinstrumentSamtTeknikerOchInstrument` visas inte separat utan ingår i "Övrigt netto"
   - `Likvida_medel` (fondnivå) blir **Likvida medel**
   - Övrigt netto = 100 − summan av ovanstående
5. **Instrumentnamn är inkonsekventa** ("APPLE INC", "Apple Inc", "APPLE"). Bygg en namnkarta per instrument-ISIN över **alla** fondfiler i ZIP:en. Välj den vanligaste stavningen som inte är bara versaler, och ta bort avslutande bolagsformer (Inc, Inc., Corp, Corp., Corporation, plc, Ltd, AB, ASA, SA, NV, AG). Testfall: Apple, Nvidia, Microsoft, Alphabet A och Alphabet C ska bli just så.

## 3. Status per fond (mekanisk, ingen manuell klassificering)

| Status | Regel | Visas |
|---|---|---|
| `ok` | finns i FI-filen, fondandelar ≤ 50 %, minst 90 % av aktievikten har sektorkod | allt |
| `no-sector` | som `ok` men under 90 % av aktievikten har sektorkod | fördelning och topp 10. Sektorkortet byts mot texten "Fondbolaget rapporterar inte sektor till Finansinspektionen." |
| `fund-of-funds` | fondandelar > 50 % | en mening: fonden placerar i X (de största fondandelarna med vikt). Inget sektorkort och ingen topp 10. |
| `foreign` | registrets ISIN börjar inte på `SE` | en mening: "<Fond> är registrerad i <land>. Finansinspektionen publicerar innehav bara för fonder registrerade i Sverige." |
| `missing` | svenskt ISIN men ingen fil i ZIP:en | en mening: "Innehav för perioden saknas hos Finansinspektionen." |

Matchning sker på `Fond_ISIN-kod` mot registrets `isin`. Om en fonds ISIN i FI skiljer sig från registret (till exempel en annan andelsklass) får registret ett **valfritt** fält `fiIsin`. Det fylls bara i när matchningen misslyckas.

Utfall 2026Q2 med 108 fonder: 63 ok, 5 no-sector, 7 fund-of-funds, 22 foreign och 8 missing. Kontrollera de 8 som saknas en och en. Det rör sig troligen om namnbyten eller uteblivna rapporter: Spiltan Aktiefond Investmentbolag, SEB Hållbarhetsfond Sverige Index, LF Småbolag Sverige, LF Bekväm Fond Balans, Avanza Auto 3, Avanza Auto 6, Handelsbanken AstraZeneca Allemansfond och Kvartil Investmentbolag+ Calculus.

## 4. Pipeline

**Återanvänd, bygg inte nytt** (AI_RULES):

1. Bryt ut nedladdning, uppackning och XML-parsning ur `fetch-fi-fees.mjs` till en delad modul, `scripts/lib/fi-zip.mjs`. Avgiftsskriptet ska fungera exakt som i dag efteråt. Kontrollera genom att diffa `fi-fees.json` före och efter.
2. Skriv ett nytt skript, `scripts/fetch-fi-holdings.mjs`, som använder modulen och skriver `src/data/fi-holdings.json`.
3. Körs i samma GitHub Action som avgifterna, `update-fi-data.yml` (tidigare `update-fi-fees.yml`), den 1:a varje månad, med en commit per datafil som ändrats. Den månatliga körningen fångar upp nya kvartal automatiskt. Skriptet skriver bara om filen när något annat än `retrievedAt` ändrats, så oförändrade månader ger ingen commit.
4. Skriptet ska också gå att köra mot en lokal ZIP-fil eller mapp: `node scripts/fetch-fi-holdings.mjs --from project-docs/fi-sample/...`, för utveckling.
5. Vid nätverksfel avslutar skriptet med exit 0 och lämnar den befintliga filen orörd, på samma sätt som avgiftsskriptet.

### `src/data/fi-holdings.json`

Bara fondfakta. **Kategoristatistik härleds i sidgeneratorn** (samma regel som för seo-snapshot: en sanning per uppgift).

```json
{
  "_meta": { "source": "Finansinspektionen, fondinnehav per kvartal", "asOf": "2026-06-30", "retrievedAt": "…" },
  "funds": {
    "avanza-global": {
      "status": "ok",
      "fiName": "Avanza Global",
      "holdingsCount": 976,
      "alloc": { "aktier": 98.93, "rantor": 0, "fondandelar": 0, "likvida": 1.23, "ovrigtNetto": -0.15 },
      "sectors": { "45": 38.06, "40": 15.84 },
      "top": [["Apple", 5.23], ["Nvidia", 5.18]],
      "countries": { "US": 72.1 }
    }
  }
}
```

- `holdingsCount` är antalet unika värdepapper (summerat per ISIN), **exklusive derivat**. Det är konsekvent med att derivaten inte heller syns i fördelningen. Avanza Global har 979 rader i FI-filen, varav tre indexterminer, och får därför 976.
- `sectors` är andel av **hela fonden** och räknas bara på aktier. Rubriken i UI blir därför "andel av fonden". Är aktierna under 5 % av fonden (räntefonder) lämnas `sectors` tomt, fonden får status `ok` och sektorkortet visas inte (beslut 2026-10-13).
- `top` innehåller de 25 största (för "Visa 25 största"). Fondandelsfonder får de största fondandelarna i stället.
- `countries` (emittentens land, andel av fonden) tas med redan nu men används inte i fas 1. Se avsnitt 7.1.
- Värden avrundas till två decimaler. Filen beräknas till cirka 200–300 KB.
- **Filen får aldrig importeras i appen (`src/`-bundlen).** Den läses bara av `build-seo-pages.mjs`. Fondsidorna är statisk HTML, så sektionen kostar inget vid sidladdning utöver sin egen markup.

## 5. Sidgeneratorn

I `renderFundPage()` läggs en ny sektion in mellan avsnitt 4 och 5.

- **Rubrikrad:** "Vad fonden äger" till vänster, och "Per 30 jun 2026" med FI-märke till höger (samma `badge fi` som avgiften).
- **Tillgångsfördelning:** en stapel med legend. Segment under 0,5 % utelämnas, men likvida medel visas alltid. Antal innehav står till höger.
- **Sektorer:** de sex största plus "Övriga N sektorer" och knappen "Visa alla 11". I statisk HTML byggs knappen med `<details>`/`<summary>` eller en checkbox-hack som graffliken, utan JS-beroende.
- **Kategorisnittets streck:** snittet av `sectors` för fonder i samma kategori med status `ok`. Fonder med `no-sector` räknas **inte** med, inte ens med sin ofullständiga sektordata. För globalfonder 2026Q2 blir det 15 fonder och informationsteknik 32,6 % (mockupens 32,2 % räknade med en fond för mycket). Härleds i generatorn. Under kortet står förklaringen: "▬ <fondnamn>  ▏ Snitt <kategori i plural>". Snittet räknas bara om minst 5 fonder i kategorin har status `ok`, annars utelämnas strecket.
- **Topp 10:** rang, namn, stapel och vikt. Under listan står "De tio största är X % av fonden" och "Visa 25 största" (statiskt, med `<details>`).
- **Ingen källrad eller förklarande text i sektionen.** Källan syns via datum och FI-märke i rubrikraden och i sidans befintliga fotrad ("… avgift och innehav från Finansinspektionens öppna register").
- **"?" i varje kort:** en 15 px cirkel bredvid kortets etikett, samma form som i `RiskPanel.jsx` och `CAGRTable.jsx`. På de statiska sidorna används HTML-attributet `popover` (`<button popovertarget="…">?</button>` + `<div popover>`), så det fungerar utan JS. Stilen följer appens infomodal: `bg.elevated`, radie 16 px, maxbredd 420 px, rubrik och 1–3 korta stycken. Innehåll:
  - *Tillgångsfördelning:* hur aktier, räntor och fondandelar härleds, att derivat ingår i övrigt netto och, om det är minst 0,5 %, fondens övrigt netto.
  - *Sektorer:* andel av hela fonden, sektorindelning enligt fondbolagens rapport till FI (GICS), och vad strecket är ("snitt för N <kategori> med sektordata").
  - *Största innehav:* andel av fonden per värdepapper, samma värdepapper summerat, att FI publicerar kvartalsvis två månader efter kvartalsslut och när nästa uppdatering väntas.
- **Strecket i sektorkortet** har en kort förklaring under staplarna som namnger kategorin: "▬ <fond>  ▏ Snitt <kategori i plural>", till exempel "Snitt globalfonder" (beslut 2026-10-12). Samma form används i regionkortet.
- **Inaktualitet:** om `asOf` är äldre än 7 månader när sidan byggs visas datumet i warning amber, med title-texten "Nyare innehav har inte publicerats ännu".
- **Färger (beslut 2026-10-13, ersätter tidigare "steel slate, inga accentfärger"):**
  - Alla staplar i sektionen (sektorer, regioner, största innehav) och förklaringsrutan "▬ <fond>" får **fondbolagets färg** från `getCompanyColor(fund)` (`src/lib/company-colors.js`), samma färg som fondlinjen i grafen. Det utvidgar beslutet från 2026-10-01 (bolagsfärg på fondsidan) från grafen till hela fondsidans innehållssektion. Kontrastundantaget gäller även här.
  - Bolag utan egen färg (`#FFFFFF`, samt Carnegies `#F3EDE2`) får staplar i steel slate `#8494ad`.
  - Snittstrecket är alltid warm chalk `#f0ede8`.
  - **Tillgångsfördelningen sorteras efter vikt.** Den största delen får full färg, nummer två 50 % opacitet och nummer tre och efterföljande 28 %, med 2 px mellanrum mellan delarna. Toningen görs med opacitet, inte med mörkare nyans, eftersom mörka bolagsfärger (SEB, Handelsbanken, AMF) annars försvinner mot bakgrunden. Basfärgen är bolagsfärgen, eller `#cbd5e6` för bolag utan färg. Förklaringen under stapeln följer samma ordning. Färgen hör alltså till storleken, inte till tillgångsslaget.
  - Text i sektionen är alltid neutral. Länkknapparna "Visa alla 11 sektorer" och "Visa 25 största" står i text primary `#f0ede8` med understrykning i `rgba(240,237,232,0.35)`, inte i appens cobalt, som krockar med flera bolagsfärger (Hampus, 2026-10-13). Accentfärger används inte någonstans i sektionen.
  - Känd risk, medvetet accepterad: röda bolagsfärger (Länsförsäkringar, Storebrand, Spiltan) och gröna (Avanza, SEB) kan läsas som minus och plus. Det är godtagbart eftersom inga värden i sektionen har tecken.
- **Mobil (under 768 px):** korten staplas. Topp 10 tappar stapeln och visar bara namn och vikt.
- **Inga hårdkodade tal** i meningar. Allt injiceras från data, precis som i SEO-texterna. Mallarna ska testas mot en fond med 22 innehav och en med 1 817.

## 6. Verifiering

- `verifyBuild()` utökas med fel som stoppar bygget: varje fondsida med status `ok` har sektionen, summan av `alloc` ligger inom 100 ± 0,5, och ingen fil i `src/` refererar till `fi-holdings.json`.
- `verifyBuild()` utökas också med **varningar som inte stoppar bygget**:
  - En fond i registret som saknas i `fi-holdings.json` (till exempel nyligen tillagd, före nästa körning) får status `missing` och visar missing-läget på fondsidan. En ny fond får aldrig stoppa bygget.
  - En fond med status `ok` där |övrigt netto| > 3 % listas. Det betyder att en stor del av fonden (derivat, skulder) inte syns i fördelningen och är värt en manuell kontroll. 2026Q2: inga fonder (högst Handelsbanken Hälsovård Tema, 2,57 %).
- Stickprov mot mockupen: Avanza Global ska visa informationsteknik 38,1 %, kategorisnitt 32,6 %, topp 10 summa 28,9 % och 976 innehav.
- Lighthouse före och efter på en fondsida. Sidvikten får öka med högst cirka 15 KB okomprimerat.

## 7. Senare (ej fas 1)

### 7.1 Regionfördelning (beslutad 2026-10-12, byggs i fas 2)

Samma kort och samma kategorisnittsstreck som sektorerna. Underlaget är `countries` i `fi-holdings.json` (landkoden `Landkod_Emittent`, som finns på 100 % av raderna i 2026Q2). Regionen är en ren geografisk gruppering av FI:s landkoder. Ingen egen klassificering, och ingen MSCI-indelning i utvecklade marknader och tillväxtmarknader.

**Regioner (i visningsordning):** Nordamerika · Europa · Sverige · Japan · Asien · Övrigt

| Region | Landkoder |
|---|---|
| Nordamerika | US, CA |
| Europa | alla europeiska länder **inklusive Storbritannien** (GB), Norge, Danmark, Finland, Island, Schweiz och Irland, men exklusive SE |
| Sverige | SE |
| Japan | JP |
| Asien | övriga Asien, inklusive CN, HK, TW, KR, IN, SG, ID, TH, MY och PH |
| Övrigt | allt annat: Australien och Nya Zeeland, Latinamerika, Mellanöstern, Afrika och **offshore-hemvister** (KY, BM, JE, GG, IM, VG, CW, PA, LR, MH) |

Mappningen ligger i en egen tabell (`lib/regions.js` eller i skriptet) och publiceras på Om-sidan.

**Varför:**
- Storbritannien hör till Europa. Med Storbritannien i Övrigt skulle en Europafond visa runt 19 % "Övrigt" (Avanza Europa 19,4 %, LF Europa Index 18,4 %).
- Offshorebolag går inte att placera ärligt utifrån landkoden, så Övrigt är korrekt. Men i Asienfonder är Övrigt i praktiken kinesiska bolag: Swedbank Robur Access Asien har 13,3 % offshore (Tencent, Alibaba, NetEase) och Lannebo Emerging Markets 11,8 %. Därför krävs förklaringen bakom "?" nedan.

**Förklaring bakom "?" i regionkortet** (inte som synlig text): "Region efter bolagets registreringsland. Övrigt omfattar bland annat bolag registrerade i Caymanöarna och Bermuda, ofta kinesiska bolag noterade i Hongkong eller USA." Hela landtabellen och de kända begränsningarna står på Om-sidan.

**Kända begränsningar** (står i Om-sidan, inte på varje fondsida):
- Landet är emittentens hemland, inte var bolaget gör affärer. Amerikanska bolag med irländsk hemvist (Linde, Medtronic, Seagate, Trane) räknas som Europa. I Avanza Global rör det sig om cirka 1,8 %.
- Fondbolagen fyller i fältet olika. Handelsbanken anger till exempel Alibaba som HK (Asien), andra som KY (Övrigt).

**Visningsregel:** kortet visas bara om den största regionen är under 90 %. Sverigefonder får därför inget regionkort, eftersom "Sverige 97 %" inte säger något. Kategorisnittet räknas på fonder i kategorin som visar kortet, och kräver minst 5 sådana, samma regel som för sektorer.

Exempel 2026Q2, andel av fonden med denna mappning: **Avanza Global** har Nordamerika 72,2 · Europa 16,5 · Japan 6,0 · Övrigt 2,2 · Sverige 1,1 · Asien 1,0. **Swedbank Robur Globalfond** har Nordamerika 61,7 · Europa 18,4 · Asien 9,3 · Japan 6,2 · Sverige 1,4 · Övrigt 1,0.

### 7.2 Övrigt

- Blandfonder: bättre uppdelning mellan räntor och aktier, och räntefondernas egen bild (löptid, kreditbetyg) finns inte i FI-datan.
- Jämförelsesidan: överlapp och viktade sektorer. **Pausat.**
