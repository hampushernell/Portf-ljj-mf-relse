// Hämtar fondinnehav från FI:s kvartals-ZIP och skriver src/data/fi-holdings.json.
// Filen läses bara av build-seo-pages.mjs — den får aldrig importeras i src/-bundlen.
// Avslutar alltid med exit 0 vid nätverksfel och lämnar befintlig fil orörd.
//
// Användning:
//   node scripts/fetch-fi-holdings.mjs                      # senaste ZIP från fi.se
//   node scripts/fetch-fi-holdings.mjs --from <zip|mapp>    # lokal källa (utveckling)
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { FUNDS_REGISTRY } from "../src/lib/funds-registry.js";
import {
  findLatestZip, downloadZip, listXmlEntries, loadLocalSource,
  parseFiXml, findFondInfo, parseZipFilename,
} from "./lib/fi-zip.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE  = join(__dirname, "..", "src", "data", "fi-holdings.json");

const TOP_N               = 25;
const FOF_THRESHOLD       = 50;   // fondandelar > 50 % → fund-of-funds
const SECTOR_COVERAGE_MIN = 0.9;  // andel av aktievikten med sektorkod för status ok
const SECTOR_MIN_STOCKS   = 5;    // under 5 % aktier visas inget sektorkort (räntefonder)

// Taggvärden läses som strängar — ISIN och instrumentnamn får aldrig tolkas som tal.
const XML_OPTIONS = {
  parseTagValue: false,
  isArray: (name) => name === "FinansielltInstrument",
};

const round2 = (n) => Math.round(n * 100) / 100;

function num(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function str(v) {
  return v === undefined || v === null ? "" : String(v).trim();
}

// ── Tillgångsslag (HOLDINGS.md §2 regel 4) ───────────────────────────────────
function assetClass(row) {
  switch (str(row["Tillgångsslag_enligt_LVF_5_kap"])) {
    case "ÖverlåtbartVärdepapper":
      return num(row.Antal) !== null ? "aktier" : num(row.Nominellt_belopp) !== null ? "rantor" : "aktier";
    case "Penningmarknadsinstrument": return "rantor";
    case "Fondandel":                 return "fondandelar";
    default:                          return "derivat"; // ingår i övrigt netto
  }
}

// ── Instrumentnamn (HOLDINGS.md §2 regel 5) ─────────────────────────────────
// "Alphabet Inc Class A", "ALPHABET INC-CL A", "Alphabet Inc (A)" → "Alphabet A"
const COMPANY_FORMS = /[\s,]+(?:inc\.?|corp\.?|corporation|plc|ltd\.?|ab|asa|sa|nv|ag|\(publ\))$/i;
const REG_SUFFIX    = /[\s-]+(?:reg|rg|registered(?:\s+shares)?|ord(?:inary)?(?:\s+sh(?:s|ares?)?)?|shs)\.?$/i;
const DOMICILE_TAG  = /\s+(?:inc|corp|ltd|lp|plc)\/[^/]+$/i; // "Inc/The", "Corp/DE", "Ltd/Cayman Islands"
const CO_SUFFIX     = /(?<!&)\s+co\.?$/i;                   // "… Wires & Cables Co", men inte "KKR & Co"
const SHARE_CLASS   = /[\s-]+(?:(?:class|cl|ser|series)\.?\s*)?\(?([A-Za-z])\)?(?:[\s-]*shares)?$/i;

function stripForms(name) {
  let prev;
  do {
    prev = name;
    name = name.replace(DOMICILE_TAG, "").replace(REG_SUFFIX, "").replace(COMPANY_FORMS, "")
      .replace(CO_SUFFIX, "").replace(/[\s,.-]+$/, "");
  } while (name !== prev);
  return name;
}

function normalizeName(raw) {
  let name = stripForms(raw.replace(/\s+/g, " ").trim());
  let shareClass = "";
  const m = name.match(SHARE_CLASS);
  // Klassbokstaven måste vara versal i originalet ("Inc-A", "Class C"), annars är det del av namnet
  if (m && /[A-Z]/.test(m[1]) && m.index > 0) {
    shareClass = ` ${m[1]}`;
    name = stripForms(name.slice(0, m.index));
  }
  return (name || raw.trim()) + shareClass;
}

const isAllCaps = (s) => /[A-ZÅÄÖ]/.test(s) && s === s.toUpperCase();

// Fallback när bara versala stavningar finns: "3I GROUP" → "3i Group", korta ord (ABB, SEB) behålls.
const KEEP_LOWER = new Set(["OF", "AND", "THE", "DE", "LA", "DU", "ET", "OCH"]);
function titleCase(s) {
  return s.split(" ").map((w, i) => {
    if (i > 0 && KEEP_LOWER.has(w)) return w.toLowerCase();
    if (/^[A-ZÅÄÖ&]{2,3}$/.test(w)) return w;
    return w.charAt(0) + w.slice(1).toLowerCase();
  }).join(" ");
}

// Namnkarta per instrument-ISIN över alla fondfiler: vanligaste normaliserade
// stavningen som inte är bara versaler.
function buildNameMap(spellingsByIsin) {
  const map = new Map();
  for (const [isin, spellings] of spellingsByIsin) {
    const mixed = new Map();
    const caps  = new Map();
    for (const [raw, count] of spellings) {
      const target = isAllCaps(raw) ? caps : mixed;
      const norm = normalizeName(raw);
      target.set(norm, (target.get(norm) ?? 0) + count);
    }
    const pick = (m) => [...m].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length || a[0].localeCompare(b[0]))[0][0];
    map.set(isin, mixed.size ? pick(mixed) : titleCase(pick(caps)));
  }
  return map;
}

// ── Inläsning ────────────────────────────────────────────────────────────────
async function loadSource() {
  const fromIdx = process.argv.indexOf("--from");
  if (fromIdx !== -1) {
    const path = process.argv[fromIdx + 1];
    if (!path) throw new Error("--from kräver en sökväg");
    console.log(`Läser lokal källa: ${path}`);
    return loadLocalSource(path);
  }
  const { filename, url } = await findLatestZip();
  console.log(`Hittade ZIP: ${filename}`);
  const buffer = await downloadZip(url);
  console.log(`ZIP-fil hämtad: ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);
  return { filename, entries: listXmlEntries(buffer) };
}

function readReport(xml) {
  const doc  = parseFiXml(xml, XML_OPTIONS);
  const info = findFondInfo(doc);
  if (!info) return null;
  const root = Object.values(doc).find(v => v && typeof v === "object" && v.Rapportinformation);
  return {
    isin:  str(info["Fond_ISIN-kod"]),
    name:  str(info.Fond_namn),
    asOf:  str(root?.Rapportinformation?.Kvartalsslut) || null,
    nav:   num(info["Fondförmögenhet"]),
    cash:  num(info.Likvida_medel) ?? 0,
    rows:  info.FinansiellaInstrument?.FinansielltInstrument ?? [],
  };
}

// ── Beräkning per fond ───────────────────────────────────────────────────────
function computeFund(report, nameMap) {
  const { nav } = report;
  const pct = (mv) => (mv / nav) * 100;

  const classMv   = { aktier: 0, rantor: 0, fondandelar: 0 };
  const sectorMv  = {};
  const countryMv = {};
  const holdings  = new Map(); // nyckel: ISIN, annars instrumentnamn — derivat ingår inte
  let sectorCovered = 0;

  const keyOf = (row) => str(row["ISIN-kod_instrument"]) || `name:${str(row.Instrumentnamn)}`;

  for (const row of report.rows) {
    const cls = assetClass(row);
    if (cls === "derivat") continue;
    const mv = num(row["Marknadsvärde_instrument"]);
    if (mv === null) continue;

    classMv[cls] += mv;

    if (cls === "aktier") {
      const code = num(row.Bransch?.Branschkod_instrument);
      if (code) {
        sectorMv[code] = (sectorMv[code] ?? 0) + mv;
        sectorCovered += mv;
      }
    }

    const country = str(row.Landkod_Emittent).toUpperCase();
    if (country) countryMv[country] = (countryMv[country] ?? 0) + mv;

    const isin    = str(row["ISIN-kod_instrument"]);
    const rawName = str(row.Instrumentnamn);
    const key     = keyOf(row);
    const h = holdings.get(key) ?? { name: (isin && nameMap.get(isin)) || normalizeName(rawName), mv: 0, cls };
    h.mv += mv;
    holdings.set(key, h);
  }

  const alloc = {
    aktier:      round2(pct(classMv.aktier)),
    rantor:      round2(pct(classMv.rantor)),
    fondandelar: round2(pct(classMv.fondandelar)),
    likvida:     round2(pct(report.cash)),
  };
  alloc.ovrigtNetto = round2(100 - pct(classMv.aktier + classMv.rantor + classMv.fondandelar + report.cash));

  const fundOfFunds    = pct(classMv.fondandelar) > FOF_THRESHOLD;
  const hasStocks      = pct(classMv.aktier) >= SECTOR_MIN_STOCKS;
  const sectorCoverage = hasStocks ? sectorCovered / classMv.aktier : 1;
  const status = fundOfFunds ? "fund-of-funds" : sectorCoverage >= SECTOR_COVERAGE_MIN ? "ok" : "no-sector";

  const sortedObj = (mvMap) => Object.fromEntries(
    Object.entries(mvMap)
      .map(([k, mv]) => [k, round2(pct(mv))])
      .filter(([, w]) => w !== 0)
      .sort((a, b) => b[1] - a[1])
  );

  const topPool = [...holdings.values()].filter(h => !fundOfFunds || h.cls === "fondandelar");
  const top = topPool
    .sort((a, b) => b.mv - a.mv)
    .slice(0, TOP_N)
    .map(h => [h.name, round2(pct(h.mv))]);

  return {
    status,
    fiName: report.name,
    holdingsCount: holdings.size, // värdepapper, exklusive derivat
    alloc,
    sectors: status === "ok" && hasStocks ? sortedObj(sectorMv) : {},
    top,
    countries: sortedObj(countryMv),
  };
}

// Kompakt JSON: en rad per fond så att kvartalsdiffar går att läsa.
function serialize(output) {
  const lines = Object.entries(output.funds).map(([slug, f]) => `    ${JSON.stringify(slug)}: ${JSON.stringify(f)}`);
  return `{\n  "_meta": ${JSON.stringify(output._meta, null, 2).replace(/\n/g, "\n  ")},\n  "funds": {\n${lines.join(",\n")}\n  }\n}\n`;
}

async function main() {
  let source;
  try {
    source = await loadSource();
  } catch (err) {
    console.warn(`VARNING: Kunde inte hämta FI-data – ${err.message}`);
    console.warn("Behåller befintlig fi-holdings.json oförändrad.");
    process.exit(0);
  }
  console.log(`${source.entries.length} XML-filer`);

  // Pass 1: läs alla rapporter, samla stavningar per instrument-ISIN och rapporter per fond-ISIN
  const targetIsins = new Set(FUNDS_REGISTRY.map(f => f.fiIsin ?? f.isin));
  const spellings   = new Map();
  const reports     = new Map();
  for (const entry of source.entries) {
    let report;
    try {
      report = readReport(entry.read());
    } catch {
      continue; // hoppa över korrupta filer
    }
    if (!report) continue;
    for (const row of report.rows) {
      const isin = str(row["ISIN-kod_instrument"]);
      const name = str(row.Instrumentnamn);
      if (!isin || !name) continue;
      if (!spellings.has(isin)) spellings.set(isin, new Map());
      const m = spellings.get(isin);
      m.set(name, (m.get(name) ?? 0) + 1);
    }
    if (targetIsins.has(report.isin) && report.nav > 0) {
      const prev = reports.get(report.isin);
      if (!prev || (report.asOf ?? "") > (prev.asOf ?? "")) reports.set(report.isin, report);
    }
  }
  const nameMap = buildNameMap(spellings);

  if (!reports.size) {
    console.warn("VARNING: Inga registerfonder hittades i FI-datan – behåller befintlig fil.");
    process.exit(0);
  }

  // Pass 2: status och beräkning per registerfond
  const funds = {};
  const asOfCounts = {};
  for (const fund of FUNDS_REGISTRY) {
    const isin = fund.fiIsin ?? fund.isin;
    if (!fund.isin.startsWith("SE")) {
      funds[fund.slug] = { status: "foreign", country: fund.isin.slice(0, 2) };
      continue;
    }
    const report = reports.get(isin);
    if (!report) {
      funds[fund.slug] = { status: "missing" };
      continue;
    }
    funds[fund.slug] = computeFund(report, nameMap);
    if (report.asOf) asOfCounts[report.asOf] = (asOfCounts[report.asOf] ?? 0) + 1;
  }

  const asOf = Object.entries(asOfCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const { period, published } = parseZipFilename(source.filename);
  const output = {
    _meta: {
      source: "Finansinspektionen, fondinnehav per kvartal",
      asOf,
      period,
      published,
      retrievedAt: new Date().toISOString(),
    },
    funds,
  };

  // Skriv bara om något annat än retrievedAt ändrats, så att den månatliga
  // workflowen inte committar en oförändrad fil.
  const comparable = (o) => JSON.stringify({ ...o._meta, retrievedAt: null, funds: o.funds });
  let previous = null;
  try { previous = JSON.parse(readFileSync(OUT_FILE, "utf8")); } catch { /* ingen fil än */ }
  if (previous && comparable(previous) === comparable(output)) {
    console.log("\nInnehaven är oförändrade – behåller befintlig fi-holdings.json");
    return;
  }
  writeFileSync(OUT_FILE, serialize(output));

  const counts = {};
  for (const f of Object.values(funds)) counts[f.status] = (counts[f.status] ?? 0) + 1;
  console.log(`\nSkrivet ${Object.keys(funds).length} fonder till src/data/fi-holdings.json (per ${asOf})`);
  console.log(Object.entries(counts).map(([s, n]) => `  ${s}: ${n}`).join("\n"));
}

main().catch(err => {
  console.error("Oväntat fel:", err.message);
  process.exit(0);
});
