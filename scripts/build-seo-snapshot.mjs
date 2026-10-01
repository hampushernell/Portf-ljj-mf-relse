/**
 * build-seo-snapshot.mjs — Bygger src/data/seo-snapshot.json för de statiska SEO-sidorna.
 *
 * Se project-docs/SEO.md avsnitt 6 och 6.2 för full specifikation.
 *
 * Hämtar prishistorik för alla fonder i FUNDS_REGISTRY sekventiellt (med paus mellan
 * anropen, samma försiktighet som scripts/add-fund.mjs), och räknar CAGR, max drawdown,
 * volatilitet och avkastning för fönstren 1 år / 3 år / sedan start.
 *
 * Absolut krav (SEO.md 6.2): skriptet innehåller ingen egen finansiell matematik. All
 * beräkning återanvänds från src/lib/calculations.js (computeCAGR, computeMaxDrawdown,
 * computeAnnualizedVolatility, seriesYears, portfolioReturn) och src/lib/normalize.js
 * (normalizeToCalendar). Två ytterligare lib-funktioner lånas in av nödvändighet, inte
 * som eget påhitt: rebaseSeries (src/lib/blend.js) är steget i pipelinen (se CLAUDE.md)
 * som indexerar en serie till 100 vid startpunkten — utan det skulle computeCAGR och
 * portfolioReturn räkna på råpriser i kronor i stället för procent. getDisplayRange
 * (src/lib/dateRange.js) är samma kalenderaritmetik som resten av appen använder för
 * "1 år"/"3 år" — dagapproximation (N*365 dagar) är en uttrycklig kritisk invariant att
 * aldrig göra (CLAUDE.md, AI_RULES.md).
 *
 * Modulerna i src/lib skrivs för Vites bundlerupplösning (extensionless imports, t.ex.
 * "./utils") och kan inte importeras direkt med vanlig Node-ESM. Vi lånar Vites egen
 * SSR-modulladdare (redan ett devDependency) för att läsa in dem exakt som appen gör,
 * utan att röra eller kopiera koden.
 *
 * Körning: npm run build-snapshot
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createServer } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, "..");
const OUT_FILE  = join(ROOT, "src", "data", "seo-snapshot.json");

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  "Accept": "application/json",
};

const FETCH_PAUSE_MS    = 350;   // paus mellan Yahoo-anrop
const STALE_TRADING_DAYS = 5;    // SEO.md 6.2: flaggas om data ligger mer än 5 handelsdagar efter/före asOf
const MAX_FAILURES      = 10;    // SEO.md 6.2: fler misslyckanden än detta → avbryt utan att skriva filen
const WINDOW_MARGIN_YEARS = 0.1; // samma marginal som App.jsx:s "y3 >= 2.9 ? computeCAGR(..., 3) : null"
const MIN_DATA_POINTS   = 30;    // samma tröskel som add-fund.mjs använder för en godkänd ticker
const SERIES_STEP_DAYS  = 7;     // veckoserie för fondsidans graf
const SERIES_TOLERANCE  = 0.05;  // invariant: sista punkten − 100 === return, med denna tolerans

// ─── Hjälpfunktioner utan finansiell betydelse (datum, avrundning, sömn) ───────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

function isoDate(ts) {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

function round(n, decimals) {
  if (n === null || n === undefined || Number.isNaN(n)) return null;
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

// Konverterar en andel (0.142) till procentenheter avrundat till 1 decimal (14.2).
// Ren enhetskonvertering av redan färdigräknade värden — ingen egen matematik.
function pct(fraction) {
  return fraction === null || fraction === undefined ? null : round(fraction * 100, 1);
}

// Antal vardagar strikt mellan två ISO-datum (kalenderdagar, ingen börskalender —
// samma enkla dagbaserade modell som normalizeToCalendar redan använder).
function tradingDaysBetween(fromIso, toIso) {
  if (!fromIso || !toIso) return Infinity;
  const from = new Date(`${fromIso}T00:00:00Z`);
  const to   = new Date(`${toIso}T00:00:00Z`);
  let count = 0;
  const cur = new Date(from);
  while (cur < to) {
    cur.setUTCDate(cur.getUTCDate() + 1);
    const day = cur.getUTCDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

// Vanligast förekommande senaste NAV-datum bland fonderna — inte varje fonds eget
// sista datum (SEO.md 6.2 "Gemensamt slutdatum"). Vid oavgjort: senaste datumet.
function computeAsOf(lastDates) {
  const freq = new Map();
  for (const d of lastDates) freq.set(d, (freq.get(d) ?? 0) + 1);
  let best = null, bestCount = -1;
  for (const [d, c] of freq.entries()) {
    if (c > bestCount || (c === bestCount && d > best)) { best = d; bestCount = c; }
  }
  return best;
}

// Veckosampling av en redan rebaserad serie för fondsidans graf. Ingen ny matematik:
// punkterna är värden ur `rebased`, bara utglesade och avrundade till 1 decimal.
// Samplas var 7:e kalenderdag räknat bakåt från seriens sista punkt (= asOf), så att
// sista punkten alltid är seriens sista värde. Första punkten är alltid rebased[0]
// (= 100), så avståndet mellan points[0] och points[1] kan vara 1–7 dagar; övriga
// punkter ligger exakt 7 dagar isär. Punkt k räknat bakifrån ligger alltså på
// asOf − 7·k dagar, och points[0] ligger på `start`.
//
// Avrundningen sker i avkastningsled (värde − 100), precis som `return` räknas via
// portfolioReturn. Annars kan t.ex. 123,05 bli 123,1 medan return 23,0499… blir 23,0.
function sampleWeekly(rebased) {
  const toPoint = v => round(100 + round(v - 100, 1), 1);
  const byTs = new Map(rebased.map(p => [p.timestamp, p.value]));
  const firstTs = rebased[0].timestamp;
  const stepSecs = SERIES_STEP_DAYS * 86400;
  const points = [];
  for (let ts = rebased[rebased.length - 1].timestamp; ts > firstTs; ts -= stepSecs) {
    if (!byTs.has(ts)) throw new Error(`lucka i kalenderserien ${isoDate(ts)}`);
    points.push(toPoint(byTs.get(ts)));
  }
  points.push(toPoint(rebased[0].value));
  points.reverse();
  return { start: isoDate(firstTs), points };
}

// Invariant (SEO.md 6.2): grafens sista punkt måste stämma med fönstrets `return`,
// annars visar grafen och siffrorna olika saker. Returnerar en lista med brott.
function checkSeriesInvariant(funds, registry) {
  const violations = [];
  for (const fund of registry) {
    const entry = funds[fund.id];
    for (const key of ["oneYear", "threeYear"]) {
      const win = entry?.[key];
      if (!win?.series) continue; // fönster saknas, eller äldre post utan serie (stale)
      const pts = win.series.points;
      const diff = Math.abs((pts[pts.length - 1] - 100) - win.return);
      if (pts[0] !== 100 || diff > SERIES_TOLERANCE) {
        violations.push(`${fund.name} ${key}: första ${pts[0]}, sista−100 ${round(pts[pts.length - 1] - 100, 2)}, return ${win.return}`);
      }
    }
  }
  return violations;
}

function loadPreviousSnapshot() {
  if (!existsSync(OUT_FILE)) return null;
  try {
    return JSON.parse(readFileSync(OUT_FILE, "utf8"));
  } catch {
    return null;
  }
}

// ─── Yahoo-hämtning — samma URL/headers-mönster som api/funds.js, men sekventiellt ─────

async function fetchPrices(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=5y`;
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error("tomt svar från Yahoo");

  const rawPrices     = result?.indicators?.quote?.[0]?.close ?? [];
  const rawTimestamps = result?.timestamp ?? [];
  const prices = [];
  for (let i = 0; i < rawPrices.length; i++) {
    if (rawPrices[i] !== null && rawPrices[i] !== undefined) {
      prices.push({ timestamp: rawTimestamps[i], value: rawPrices[i] });
    }
  }
  if (prices.length < MIN_DATA_POINTS) {
    throw new Error(`endast ${prices.length} datapunkter`);
  }
  return prices.sort((a, b) => a.timestamp - b.timestamp);
}

// ─── Main ───────────────────────────────────────────────────────────────────────────

async function main() {
  const server = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    configFile: false,
    root: ROOT,
  });

  try {
    const [{ FUNDS_REGISTRY }, { normalizeToCalendar }, { rebaseSeries }, { getDisplayRange }, calc] = await Promise.all([
      server.ssrLoadModule("/src/lib/funds-registry.js"),
      server.ssrLoadModule("/src/lib/normalize.js"),
      server.ssrLoadModule("/src/lib/blend.js"),
      server.ssrLoadModule("/src/lib/dateRange.js"),
      server.ssrLoadModule("/src/lib/calculations.js"),
    ]);
    const { computeCAGR, computeMaxDrawdown, computeAnnualizedVolatility, seriesYears, portfolioReturn } = calc;

    console.log(`\n🔍 Bygger SEO-snapshot för ${FUNDS_REGISTRY.length} fonder\n`);

    const previous = loadPreviousSnapshot();

    // ── Fas 1: sekventiell hämtning ─────────────────────────────────────────────────
    const fetched = new Map(); // id -> { prices } | { error }
    let fetchFailures = 0;

    for (const fund of FUNDS_REGISTRY) {
      process.stdout.write(`  ${fund.ticker.padEnd(20)} ${fund.name.slice(0, 42).padEnd(43)}`);
      try {
        const prices = await fetchPrices(fund.ticker);
        fetched.set(fund.id, { prices });
        console.log(`✓ ${prices.length} punkter`);
      } catch (e) {
        fetched.set(fund.id, { error: e.message });
        fetchFailures++;
        console.log(`✗ ${e.message}`);
      }
      await sleep(FETCH_PAUSE_MS);
    }

    if (fetchFailures > MAX_FAILURES) {
      console.error(`\n❌ ${fetchFailures} fonder misslyckades (gräns: ${MAX_FAILURES}). Avbryter utan att skriva filen.`);
      process.exitCode = 1;
      return;
    }

    const lastDates = [...fetched.values()]
      .filter(f => f.prices?.length)
      .map(f => isoDate(f.prices[f.prices.length - 1].timestamp));

    if (!lastDates.length) {
      console.error("\n❌ Ingen fond gick att hämta. Avbryter utan att skriva filen.");
      process.exitCode = 1;
      return;
    }

    const asOf   = computeAsOf(lastDates);
    const asOfTs = Date.parse(`${asOf}T12:00:00Z`) / 1000;

    // ── Fönsterbyggare — all matematik lånad från calculations.js/normalize.js/blend.js ──

    // nominalYears används som fast nämnare i computeCAGR (precis som App.jsx:s
    // computeCAGR(fl3.series, 3)) så att en marginellt kort eller lång faktisk period
    // inte förskjuter den annualiserade siffran. Fönstret byggs bara om den faktiska
    // historiken täcker nominalYears minus samma marginal som App.jsx redan använder.
    function buildWindow(prices, spanLabel, nominalYears) {
      const { startTs } = getDisplayRange(spanLabel, asOfTs);
      const normalized  = normalizeToCalendar(prices, startTs, asOfTs);
      const rebased      = rebaseSeries(normalized);
      if (rebased.length < 2) return null;

      const actualYears = seriesYears(rebased);
      if (actualYears < nominalYears - WINDOW_MARGIN_YEARS) return null; // för kort historik

      const cagr = computeCAGR(rebased, nominalYears);
      const { drawdown } = computeMaxDrawdown(rebased);
      const volatility = computeAnnualizedVolatility(rebased);

      return {
        return: round(portfolioReturn(rebased), 1),
        cagr: pct(cagr),
        maxDrawdown: pct(drawdown),
        volatility: pct(volatility),
        series: sampleWeekly(rebased),
      };
    }

    function buildSinceStart(prices) {
      const dataFromTs = prices[0].timestamp;
      const normalized = normalizeToCalendar(prices, dataFromTs, asOfTs);
      const rebased      = rebaseSeries(normalized);
      if (rebased.length < 2) return null;

      const years = seriesYears(rebased);
      const cagr  = computeCAGR(rebased, years); // computeCAGR guardar själv years < 0.5
      const { drawdown } = computeMaxDrawdown(rebased);

      return {
        return: round(portfolioReturn(rebased), 1),
        cagr: pct(cagr),
        maxDrawdown: pct(drawdown),
        years: round(years, 2),
      };
    }

    function buildFundEntry(prices) {
      const clipped = prices.filter(p => p.timestamp <= asOfTs);
      if (clipped.length < 2) return null; // fondens hela historik ligger efter asOf

      return {
        dataFrom: isoDate(prices[0].timestamp),
        dataTo: isoDate(clipped[clipped.length - 1].timestamp),
        oneYear: buildWindow(prices, "1 år", 1),
        threeYear: buildWindow(prices, "3 år", 3),
        sinceStart: buildSinceStart(prices),
      };
    }

    // ── Fas 2: bygg färdiga fondposter, med reservläge vid misslyckande ─────────────

    const funds = {};
    let fundsOk = 0, fundsStale = 0, fundsFailed = 0;
    const missingThreeYear = [];

    for (const fund of FUNDS_REGISTRY) {
      const rec = fetched.get(fund.id);
      const prevEntry = previous?.funds?.[String(fund.id)] ?? null;
      const built = rec?.prices ? buildFundEntry(rec.prices) : null;

      let entry;
      if (built) {
        const lag = tradingDaysBetween(built.dataTo, asOf);
        const stale = lag > STALE_TRADING_DAYS;
        entry = { isin: fund.isin, ...built, stale };
        if (stale) fundsStale++; else fundsOk++;
      } else if (prevEntry) {
        // Hämtning misslyckades (eller fondens data ligger helt efter asOf) — behåll
        // föregående värde och flagga stale, i stället för att låta sidan/sitemap-raden
        // försvinna tyst (SEO.md 6.2 "Robusthet").
        entry = { ...prevEntry, isin: fund.isin, stale: true };
        fundsStale++;
      } else {
        entry = {
          isin: fund.isin,
          dataFrom: null, dataTo: null,
          oneYear: null, threeYear: null, sinceStart: null,
          stale: true,
        };
        fundsFailed++;
      }

      funds[fund.id] = entry;
      if (entry.threeYear === null) {
        missingThreeYear.push({ name: fund.name, dataFrom: entry.dataFrom });
      }
    }

    const output = {
      _meta: {
        asOf,
        generatedAt: new Date().toISOString(),
        fundsTotal: FUNDS_REGISTRY.length,
        fundsOk,
        fundsStale,
        fundsFailed,
      },
      funds,
    };

    const violations = checkSeriesInvariant(funds, FUNDS_REGISTRY);
    if (violations.length) {
      console.error(`\n❌ ${violations.length} serier bryter mot invarianten sista punkt − 100 === return (±${SERIES_TOLERANCE}):`);
      violations.forEach(v => console.error(`   ${v}`));
      console.error("Avbryter utan att skriva filen.");
      process.exitCode = 1;
      return;
    }

    // Indenterat som tidigare, men varje points-array på en rad så att diffen
    // förblir läsbar och filen inte får en rad per veckopunkt.
    const json = JSON.stringify(output, null, 2)
      .replace(/"points": \[[^\]]*\]/g, m => m.replace(/\s+/g, " ").replace("[ ", "[").replace(" ]", "]"));
    writeFileSync(OUT_FILE, `${json}\n`);

    // ── Sammanfattning ───────────────────────────────────────────────────────────────
    console.log("\n─────────────────────────────────────────────────────");
    console.log(`📊 Sammanfattning (asOf ${asOf}):`);
    console.log(`   OK:      ${fundsOk}`);
    console.log(`   Stale:   ${fundsStale}`);
    console.log(`   Failed:  ${fundsFailed}`);
    console.log(`   Totalt:  ${FUNDS_REGISTRY.length}`);

    if (missingThreeYear.length) {
      console.log(`\n⚠️  ${missingThreeYear.length} fonder saknar tre års historik:`);
      missingThreeYear.forEach(f => {
        console.log(`   ${f.name.padEnd(45)} sedan ${f.dataFrom ?? "okänt"}`);
      });
    } else {
      console.log("\n✅ Alla fonder har minst tre års historik.");
    }

    console.log(`\nSkrivet till src/data/seo-snapshot.json\n`);
  } finally {
    await server.close();
  }
}

main().catch(err => {
  console.error("\n❌ Oväntat fel:", err.message);
  process.exitCode = 1;
});
