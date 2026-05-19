// Hämtar förvaltningsavgifter från FI:s fondinnehavsregister och skriver till src/data/fi-fees.json.
// Avslutar alltid med exit 0 vid nätverksfel för att inte bryta GitHub Action.
import { XMLParser } from "fast-xml-parser";
import AdmZip from "adm-zip";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { FUND_ISINS } from "../src/lib/utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE  = join(__dirname, "..", "src", "data", "fi-fees.json");
const FI_PAGE   = "https://www.fi.se/sv/vara-register/fondinnehav-per-kvartal/";

const ISIN_TO_TICKER = Object.fromEntries(
  Object.entries(FUND_ISINS).map(([ticker, isin]) => [isin, ticker])
);
const TARGET_ISINS = new Set(Object.values(FUND_ISINS));

// Traverserar ett parserat XML-träd och returnerar det första objektet som
// innehåller ett fält vars namn matchar /isin/i — det är Fondinformation-noden.
function findFondInfo(node) {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const r = findFondInfo(item);
      if (r) return r;
    }
    return null;
  }
  if (Object.keys(node).some(k => /isin/i.test(k))) return node;
  for (const val of Object.values(node)) {
    const r = findFondInfo(val);
    if (r) return r;
  }
  return null;
}

// Extraherar ett tal ur ett eventuellt nästlat värde.
// Strukturen för Förvaltningsavgift: { UtanAndelsklasser: { Förvaltningsavgift_fast: 0.15 } }
function extractNumber(val) {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = parseFloat(val.replace(",", "."));
    return isNaN(n) ? null : n;
  }
  if (val && typeof val === "object") {
    for (const v of Object.values(val)) {
      const n = extractNumber(v);
      if (n !== null) return n;
    }
  }
  return null;
}

const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: true });

async function main() {
  // 1. Scrapa FI-sidan för senaste ZIP-URL
  // Filnamnsmönster: Fondinnehav_2025Q4_2026-04-15 12.35.zip (mellanslag i filnamnet)
  let zipUrl, filename;
  try {
    const html = await fetch(FI_PAGE, { signal: AbortSignal.timeout(30_000) }).then(r => r.text());
    const match = html.match(/FondInnehavLista\/download\?filnamn=(Fondinnehav_[^"]+\.zip)/i);
    if (!match) throw new Error("Hittade ingen ZIP-länk på FI-sidan");
    filename = match[1];
    zipUrl   = `https://www.fi.se/FondInnehavLista/download?filnamn=${encodeURIComponent(filename)}`;
    console.log(`Hittade ZIP: ${filename}`);
  } catch (err) {
    console.warn(`VARNING: Kunde inte nå FI-sidan – ${err.message}`);
    console.warn("Behåller befintlig fi-fees.json oförändrad.");
    process.exit(0);
  }

  // 2. Ladda ner ZIP
  let zipBuffer;
  try {
    const res = await fetch(zipUrl, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    zipBuffer = Buffer.from(await res.arrayBuffer());
    console.log(`ZIP-fil hämtad: ${(zipBuffer.length / 1024 / 1024).toFixed(1)} MB`);
  } catch (err) {
    console.warn(`VARNING: Kunde inte ladda ner ZIP – ${err.message}`);
    process.exit(0);
  }

  // 3. Lista alla XML-filer i ZIP (en per fond)
  let xmlEntries;
  try {
    const zip = new AdmZip(zipBuffer);
    xmlEntries = zip.getEntries().filter(e => e.entryName.toLowerCase().endsWith(".xml"));
    if (!xmlEntries.length) throw new Error("Inga XML-filer i ZIP");
    console.log(`ZIP innehåller ${xmlEntries.length} XML-filer`);
  } catch (err) {
    console.warn(`VARNING: Kunde inte lista ZIP-innehåll – ${err.message}`);
    process.exit(0);
  }

  // 4. Logga fältnamn och avgiftsstruktur från första XML-filen
  let isinField, feeField;
  {
    const first  = parser.parse(xmlEntries[0].getData().toString("utf8"));
    const fund   = findFondInfo(first);
    if (fund) {
      const fields = Object.keys(fund);
      console.log(`\nFältnamn i Fondinformation (${xmlEntries[0].entryName.split("\\").pop()}):\n  ${fields.join(", ")}\n`);
      isinField = fields.find(f => /isin/i.test(f));
      feeField  = fields.find(f => /förvaltning/i.test(f));
      if (feeField) {
        console.log(`ISIN-fält: ${isinField}`);
        console.log(`Avgiftsfält: ${feeField}`);
        console.log(`Avgiftsstruktur: ${JSON.stringify(fund[feeField])}`);
        console.log(`Extraherat värde: ${extractNumber(fund[feeField])}`);
      }
    }
  }

  if (!isinField || !feeField) {
    console.warn("VARNING: Kan inte identifiera ISIN- eller avgiftsfält – avbryter");
    process.exit(0);
  }

  // 5. Iterera alla XML-filer och samla avgifter för de 13 målfonderna
  const fees = {};
  let processed = 0;
  for (const entry of xmlEntries) {
    if (Object.keys(fees).length === TARGET_ISINS.size) break;
    try {
      const fund = findFondInfo(parser.parse(entry.getData().toString("utf8")));
      if (!fund) continue;
      const isin = String(fund[isinField] ?? "").trim();
      if (!TARGET_ISINS.has(isin) || isin in fees) continue;
      const fee = extractNumber(fund[feeField]);
      if (fee !== null) {
        fees[isin] = fee;
        console.log(`  Hittade ${isin} (${ISIN_TO_TICKER[isin]}): ${fee}`);
      } else {
        console.warn(`VARNING: Ogiltigt avgiftsvärde för ${isin}: ${JSON.stringify(fund[feeField])}`);
      }
    } catch {
      // Hoppa över korrupta filer
    }
    processed++;
    if (processed % 500 === 0) console.log(`  ...${processed}/${xmlEntries.length} processerade`);
  }

  for (const isin of TARGET_ISINS) {
    if (!(isin in fees)) {
      // SE0004297927 (Spiltan) rapporterar sporadiskt till FI — faller tillbaka på Morningstar
      console.warn(`VARNING: ISIN ${isin} (${ISIN_TO_TICKER[isin] ?? "okänd"}) saknas i FI-data`);
    }
  }

  // 6. Tolka period och datum ur råfilnamnet (t.ex. "Fondinnehav_2025Q4_2026-04-15 12.35.zip")
  const periodMatch = filename.match(/(\d{4})Q(\d)/i);
  const period      = periodMatch ? `${periodMatch[1]}Q${periodMatch[2]}` : null;
  const dateMatch   = filename.match(/(\d{4}-\d{2}-\d{2})/);
  const published   = dateMatch ? dateMatch[1] : null;

  // 7. Skriv resultat
  const output = {
    _meta: {
      source:      "Finansinspektionen fondinnehav",
      period,
      published,
      retrievedAt: new Date().toISOString(),
      field:       feeField,
    },
    ...fees,
  };

  writeFileSync(OUT_FILE, JSON.stringify(output, null, 2) + "\n");
  console.log(`\nSkrivet ${Object.keys(fees).length}/${TARGET_ISINS.size} avgifter till src/data/fi-fees.json`);
  if (period)    console.log(`Period: ${period}`);
  if (published) console.log(`Publicerat: ${published}`);
}

main().catch(err => {
  console.error("Oväntat fel:", err.message);
  process.exit(0);
});
