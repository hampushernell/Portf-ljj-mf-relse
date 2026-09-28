/**
 * add-fund.mjs — Hitta och validera nya fonder för FUNDS_REGISTRY
 *
 * Användning:
 *   node scripts/add-fund.mjs <ISIN>                      Lägg till en fond
 *   node scripts/add-fund.mjs <ISIN> <ISIN> <ISIN> ...     Lägg till flera fonder i en körning
 *   node scripts/add-fund.mjs kandidater.txt               Läs ISIN-lista från fil (en per rad, # för kommentar)
 *
 * Exempel:
 *   node scripts/add-fund.mjs SE0011527613
 *   node scripts/add-fund.mjs SE0011527613 FI4000261326 NO0010827280
 *   npm run add-fund -- kandidater.txt
 *
 * Gör, per ISIN:
 *   1. Söker Yahoo Finance efter tickers
 *   2. Testar varje träff och hämtar 5 år prisdata
 *   3. Kollar om ISIN täcks av fi-fees.json (FI-källa)
 *   4. Räknar ut nästa lediga ID i registret (unikt även inom samma körning)
 *   5. Skriver ut ett färdigt registry-objekt att klistra in i funds-registry.js
 *
 * Vid flera ISIN samlas alla lyckade träffar i ett gemensamt block på slutet,
 * redo att klistras in i ett svep. En kort paus (400ms) läggs mellan Yahoo-anrop
 * för att inte spamma API:t.
 */

import { readFileSync, existsSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ─── Läs befintligt register ────────────────────────────────────────────────

let existingIds = [];
let existingIsins = [];
let existingTickers = [];
try {
  const raw = readFileSync(join(ROOT, "src/lib/funds-registry.js"), "utf8");
  existingIds = [...raw.matchAll(/id:\s*(\d+)/g)].map(m => parseInt(m[1]));
  existingIsins = [...raw.matchAll(/isin:\s*["']([^"']+)["']/g)].map(m => m[1]);
  existingTickers = [...raw.matchAll(/ticker:\s*["']([^"']+)["']/g)].map(m => m[1]);
} catch (e) {
  console.warn("⚠️  Kunde inte läsa funds-registry.js:", e.message);
}

// ─── Läs fi-fees.json ───────────────────────────────────────────────────────

let fiFees = {};
let fiMeta = {};
try {
  const raw = JSON.parse(readFileSync(join(ROOT, "src/data/fi-fees.json"), "utf8"));
  const { _meta, ...fees } = raw;
  fiFees = fees;
  fiMeta = _meta ?? {};
} catch (e) {
  console.warn("⚠️  Kunde inte läsa fi-fees.json:", e.message);
}

// ─── Hjälpfunktioner ────────────────────────────────────────────────────────

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  "Accept": "application/json",
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function searchYahoo(query) {
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&enableFuzzyQuery=false&enableCb=false`;
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Yahoo search HTTP ${res.status}`);
  const data = await res.json();
  return data?.quotes ?? [];
}

async function fetchPriceData(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=5y`;
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) return null;
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) return null;

  const prices = result?.indicators?.quote?.[0]?.close ?? [];
  const timestamps = result?.timestamp ?? [];
  const valid = prices.filter(p => p !== null && p !== undefined);

  return {
    name: result.meta?.longName || result.meta?.shortName || ticker,
    currency: result.meta?.currency,
    dataPoints: valid.length,
    firstDate: timestamps.length ? new Date(timestamps[0] * 1000).toISOString().slice(0, 10) : null,
    lastDate: timestamps.length ? new Date(timestamps[timestamps.length - 1] * 1000).toISOString().slice(0, 10) : null,
    latestPrice: result.meta?.regularMarketPrice,
  };
}

function nextId(usedIds) {
  return usedIds.length ? Math.max(...usedIds) + 1 : 1;
}

// Samma regel som SEO.md avsnitt 4: gemener, å/ä→a, ö→o, mellanslag→bindestreck
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/å|ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/\s+/g, "-");
}

function formatEntry(id, ticker, isin, name, fee, feeSource) {
  const feeComment = feeSource === "fi"
    ? `// avgift från FI – uppdateras automatiskt`
    : `// avgift: verifiera mot Morningstar/fondbolaget`;
  const slug = slugify(name);
  return `  { id: ${id}, ticker: "${ticker}", isin: "${isin}", name: "${name}", category: "???", fallbackFee: ${fee}, slug: "${slug}" }, ${feeComment}`;
}

// ─── Input-parsning ─────────────────────────────────────────────────────────

function parseIsinList(args) {
  if (args.length === 0) return [];

  // Ett argument som pekar på en existerande fil → läs ISIN-lista från filen
  if (args.length === 1 && existsSync(args[0])) {
    try {
      if (statSync(args[0]).isFile()) {
        const raw = readFileSync(args[0], "utf8");
        return raw
          .split("\n")
          .map(line => line.split("#")[0].trim())   // tillåt kommentarer efter #
          .filter(Boolean);
      }
    } catch {
      // föll igenom till ISIN-tolkning nedan
    }
  }

  return args.map(a => a.trim()).filter(Boolean);
}

// ─── Bearbeta ett ISIN ──────────────────────────────────────────────────────

async function processIsin(isin, usedIds, seenIsins) {
  console.log(`\n🔍 Söker efter ISIN: ${isin}`);

  if (existingIsins.includes(isin) || seenIsins.has(isin)) {
    const dubblett = seenIsins.has(isin) ? " (angavs dubbelt i listan)" : "";
    console.log(`ℹ️  ISIN ${isin} finns redan i funds-registry.js${dubblett}`);
    return { status: "exists", isin };
  }
  seenIsins.add(isin);

  let quotes;
  try {
    quotes = await searchYahoo(isin);
  } catch (e) {
    console.error("❌ Yahoo search misslyckades:", e.message);
    return { status: "error", isin, message: e.message };
  }

  if (!quotes.length) {
    console.log("❌ Inga träffar på Yahoo Finance för detta ISIN.");
    console.log("   Tips: Kontrollera att ISIN är korrekt på morningstar.se");
    return { status: "not-found", isin };
  }

  console.log(`   Hittade ${quotes.length} Yahoo-träffar:`);
  quotes.forEach((q, i) => {
    const already = existingTickers.includes(q.symbol) ? " (redan i registret)" : "";
    console.log(`     [${i + 1}] ${q.symbol.padEnd(22)} ${(q.shortname || q.longname || "").slice(0, 50)}${already}`);
  });

  const candidates = [];
  for (const q of quotes) {
    if (existingTickers.includes(q.symbol)) continue;
    process.stdout.write(`     ${q.symbol.padEnd(22)}`);
    const data = await fetchPriceData(q.symbol);
    await sleep(400); // var snäll mot Yahoos API
    if (!data || data.dataPoints < 30) {
      console.log(`✗  (${data?.dataPoints ?? 0} datapunkter — för lite data)`);
      continue;
    }
    console.log(`✓  ${data.dataPoints} datapunkter  ${data.firstDate} → ${data.lastDate}  ${data.currency ?? "?"}`);
    candidates.push({ symbol: q.symbol, ...data });
  }

  if (!candidates.length) {
    console.log("\n❌ Ingen fungerande ticker hittades med tillräcklig prishistorik.");
    console.log("   Tips: Sök manuellt på finance.yahoo.com med ISIN eller fondnamn.");
    return { status: "no-data", isin };
  }

  const best = candidates.reduce((a, b) => (a.dataPoints >= b.dataPoints ? a : b));

  const inFi = isin in fiFees;
  const feeValue = inFi ? fiFees[isin] : null;
  const feeSource = inFi ? "fi" : "fallback";

  console.log("   ─────────────────────────────────────────");
  console.log("   📊 Rekommenderad ticker:", best.symbol);
  console.log("      Fondnamn (Yahoo):    ", best.name);
  console.log("      Valuta:              ", best.currency ?? "okänd");
  console.log("      Prishistorik:        ", `${best.dataPoints} datapunkter (${best.firstDate} → ${best.lastDate})`);

  if (inFi) {
    console.log(`      ✅ FI-täckning: JA — avgift ${feeValue}% (period: ${fiMeta.period ?? "?"})`);
  } else {
    console.log("      ⚠️  FI-täckning: NEJ — sätt fallbackFee manuellt.");
    console.log(`         https://www.morningstar.se/se/funds/snapshot/snapshot.aspx?id=${best.symbol.replace(".ST", "")}`);
  }

  const id = nextId(usedIds);
  usedIds.push(id);
  const fallbackFee = inFi ? feeValue : 0.00;

  const nameClean = best.name.replace(/\s*\(.*?\)/g, "").trim();
  const entry = formatEntry(id, best.symbol, isin, nameClean, fallbackFee, feeSource);

  return {
    status: "ok",
    isin,
    entry,
    inFi,
    ticker: best.symbol,
    name: nameClean,
    alternatives: candidates.filter(c => c.symbol !== best.symbol),
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const isins = parseIsinList(process.argv.slice(2));

  if (!isins.length) {
    console.error("Användning:");
    console.error("  node scripts/add-fund.mjs <ISIN>");
    console.error("  node scripts/add-fund.mjs <ISIN> <ISIN> ...");
    console.error("  node scripts/add-fund.mjs <fil-med-isin.txt>");
    process.exit(1);
  }

  console.log(`📋 ${isins.length} ISIN att bearbeta`);
  console.log("═".repeat(60));

  const usedIds = [...existingIds];
  const seenIsins = new Set();
  const results = [];

  for (const isin of isins) {
    const result = await processIsin(isin, usedIds, seenIsins);
    results.push(result);
  }

  // ── Sammanfattning ────────────────────────────────────────────────────────
  const ok = results.filter(r => r.status === "ok");
  const exists = results.filter(r => r.status === "exists");
  const failed = results.filter(r => !["ok", "exists"].includes(r.status));

  console.log("\n" + "═".repeat(60));
  console.log(`📊 Sammanfattning: ${ok.length} klara · ${exists.length} fanns redan · ${failed.length} misslyckades`);

  if (failed.length) {
    console.log("\n❌ Misslyckades:");
    failed.forEach(r => console.log(`   ${r.isin} — ${r.status}`));
  }

  if (ok.length) {
    console.log("\n📋 Klistra in i src/lib/funds-registry.js:\n");
    ok.forEach(r => console.log(r.entry));

    console.log("\n📝 Nästa steg:");
    console.log("   1. Byt ut category: \"???\" mot rätt kategori för varje ny rad");
    const needsFee = ok.some(r => !r.inFi);
    if (needsFee) {
      console.log("   2. Sätt rätt fallbackFee (avgift i %) för fonder utan FI-täckning, se länkar ovan");
    }
    console.log(`   ${needsFee ? "3" : "2"}. Verifiera fondnamnen — Yahoo-namn kan vara förkortade`);
    console.log(`   ${needsFee ? "4" : "3"}. Kör: npm run dev och testa att fonderna laddar korrekt\n`);

    const withAlts = ok.filter(r => r.alternatives.length);
    if (withAlts.length) {
      console.log("💡 Alternativa tickers (om vald ticker är fel):");
      withAlts.forEach(r => {
        console.log(`   ${r.isin} (${r.ticker}):`);
        r.alternatives.forEach(c => {
          console.log(`     ${c.symbol.padEnd(22)} ${c.dataPoints} datapunkter  ${c.firstDate} → ${c.lastDate}`);
        });
      });
      console.log();
    }
  }
}

main().catch(err => {
  console.error("\n❌ Oväntat fel:", err.message);
  process.exit(1);
});
