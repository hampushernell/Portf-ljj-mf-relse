/**
 * add-fund.mjs — Hitta och validera en ny fond för FUNDS_REGISTRY
 *
 * Användning:
 *   node scripts/add-fund.mjs <ISIN>
 *   node scripts/add-fund.mjs SE0011527613
 *
 * Gör:
 *   1. Söker Yahoo Finance efter tickers för angiven ISIN
 *   2. Testar varje träff och hämtar 5 år prisdata
 *   3. Kollar om ISIN täcks av fi-fees.json (FI-källa)
 *   4. Räknar ut nästa lediga ID i registret
 *   5. Skriver ut ett färdigt registry-objekt att klistra in i funds-registry.js
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createRequire } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ─── Läs befintligt register ────────────────────────────────────────────────

const require = createRequire(import.meta.url);
let existingFunds = [];
try {
  // Läs filen som text och parsa manuellt (undviker ESM/CJS-konflikter)
  const raw = readFileSync(join(ROOT, "src/lib/funds-registry.js"), "utf8");
  const ids = [...raw.matchAll(/id:\s*(\d+)/g)].map(m => parseInt(m[1]));
  existingFunds = ids;

  // Kolla om ISIN redan finns
  const isins = [...raw.matchAll(/isin:\s*["']([^"']+)["']/g)].map(m => m[1]);
  const tickers = [...raw.matchAll(/ticker:\s*["']([^"']+)["']/g)].map(m => m[1]);
  globalThis._existingIsins = isins;
  globalThis._existingTickers = tickers;
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

function nextId(ids) {
  return ids.length ? Math.max(...ids) + 1 : 1;
}

function formatEntry(id, ticker, isin, name, fee, feeSource) {
  const feeComment = feeSource === "fi"
    ? `// avgift från FI – uppdateras automatiskt`
    : `// avgift: verifiera mot Morningstar/fondbolaget`;
  return `  { id: ${id}, ticker: "${ticker}", isin: "${isin}", name: "${name}", category: "???", fallbackFee: ${fee} }, ${feeComment}`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const isin = process.argv[2]?.trim();

  if (!isin) {
    console.error("Användning: node scripts/add-fund.mjs <ISIN>");
    console.error("Exempel:   node scripts/add-fund.mjs SE0011527613");
    process.exit(1);
  }

  console.log(`\n🔍 Söker efter ISIN: ${isin}\n`);

  // Kolla om den redan finns i registret
  if (globalThis._existingIsins?.includes(isin)) {
    console.log(`ℹ️  ISIN ${isin} finns redan i funds-registry.js`);
    process.exit(0);
  }

  // ── 1. Sök Yahoo Finance ──────────────────────────────────────────────────
  let quotes;
  try {
    quotes = await searchYahoo(isin);
  } catch (e) {
    console.error("❌ Yahoo search misslyckades:", e.message);
    process.exit(1);
  }

  if (!quotes.length) {
    console.log("❌ Inga träffar på Yahoo Finance för detta ISIN.");
    console.log("   Tips: Kontrollera att ISIN är korrekt på morningstar.se");
    process.exit(1);
  }

  console.log(`Hittade ${quotes.length} Yahoo-träffar:`);
  quotes.forEach((q, i) => {
    const already = globalThis._existingTickers?.includes(q.symbol) ? " (redan i registret)" : "";
    console.log(`  [${i + 1}] ${q.symbol.padEnd(22)} ${(q.shortname || q.longname || "").slice(0, 50)}${already}`);
  });

  // ── 2. Testa varje ticker och hitta bästa träff ───────────────────────────
  console.log("\n⏳ Hämtar prisdata för varje ticker...\n");

  const candidates = [];
  for (const q of quotes) {
    if (globalThis._existingTickers?.includes(q.symbol)) continue;
    process.stdout.write(`  ${q.symbol.padEnd(22)}`);
    const data = await fetchPriceData(q.symbol);
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
    process.exit(1);
  }

  // Välj bäst (flest datapunkter)
  const best = candidates.reduce((a, b) => (a.dataPoints >= b.dataPoints ? a : b));

  // ── 3. Kolla FI-täckning ─────────────────────────────────────────────────
  const inFi = isin in fiFees;
  const feeValue = inFi ? fiFees[isin] : null;
  const feeSource = inFi ? "fi" : "fallback";

  console.log("\n─────────────────────────────────────────────────────");
  console.log("📊 Rekommenderad ticker:", best.symbol);
  console.log("   Fondnamn (Yahoo):    ", best.name);
  console.log("   Valuta:              ", best.currency ?? "okänd");
  console.log("   Prishistorik:        ", `${best.dataPoints} datapunkter (${best.firstDate} → ${best.lastDate})`);
  console.log("   Senaste NAV:         ", best.latestPrice ?? "okänt");

  if (inFi) {
    console.log(`\n✅ FI-täckning:         JA — avgift ${feeValue}% (period: ${fiMeta.period ?? "?"}, publicerat: ${fiMeta.published ?? "?"})`);
    console.log("   Avgiften hämtas automatiskt varje månad. fallbackFee används bara som reserv.");
  } else {
    console.log("\n⚠️  FI-täckning:         NEJ — fonden rapporterar inte till Finansinspektionen");
    console.log("   Du behöver ange fallbackFee manuellt. Kontrollera avgiften på:");
    console.log(`   https://www.morningstar.se/se/funds/snapshot/snapshot.aspx?id=${best.symbol.replace(".ST", "")}`);
  }

  // ── 4. Bygg registry-objekt ──────────────────────────────────────────────
  const id = nextId(existingFunds);
  const fallbackFee = inFi ? feeValue : 0.00; // 0.00 som placeholder om FI saknas

  console.log("\n─────────────────────────────────────────────────────");
  console.log("📋 Klistra in i src/lib/funds-registry.js:\n");

  const nameClean = best.name
    .replace(/\s*\(.*?\)/g, "")  // ta bort parenteser
    .trim();

  console.log(formatEntry(id, best.symbol, isin, nameClean, fallbackFee, feeSource));

  console.log("\n─────────────────────────────────────────────────────");
  console.log("📝 Nästa steg:");
  console.log("   1. Byt ut category: \"???\" mot rätt kategori");
  if (!inFi) {
    console.log("   2. Sätt rätt fallbackFee (avgift i %) från Morningstar");
  }
  console.log(`   ${inFi ? "2" : "3"}. Verifiera fondnamnet — Yahoo-namn kan vara förkortade`);
  console.log(`   ${inFi ? "3" : "4"}. Kör: npm run dev och testa att fonden laddar korrekt\n`);

  // Visa alla kandidater om det finns alternativ
  if (candidates.length > 1) {
    console.log("💡 Alternativa tickers med prisdata:");
    candidates.filter(c => c.symbol !== best.symbol).forEach(c => {
      console.log(`   ${c.symbol.padEnd(22)} ${c.dataPoints} datapunkter  ${c.firstDate} → ${c.lastDate}`);
    });
    console.log();
  }
}

main().catch(err => {
  console.error("\n❌ Oväntat fel:", err.message);
  process.exit(1);
});
