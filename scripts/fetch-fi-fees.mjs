// Hämtar löpande kostnader från FI:s fondinnehavsregister och skriver till src/data/fi-fees.json.
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

async function main() {
  // 1. Scrapa FI-sidan för senaste ZIP-URL
  let zipUrl;
  try {
    const html = await fetch(FI_PAGE, { signal: AbortSignal.timeout(30_000) }).then(r => r.text());
    // Matcha URL-mönster: /FondInnehavLista/download?filnamn=Fondinnehav_2025Q4_20260115.zip
    const match = html.match(/FondInnehavLista\/download\?filnamn=(Fondinnehav_[^"'&\s]+\.zip)/i);
    if (!match) throw new Error("Hittade ingen ZIP-länk på FI-sidan");
    const filename = decodeURIComponent(match[1]);
    zipUrl = `https://www.fi.se/FondInnehavLista/download?filnamn=${filename}`;
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

  // 3. Extrahera XML ur ZIP
  let xmlContent;
  let zipFilename = "";
  try {
    const zip = new AdmZip(zipBuffer);
    const xmlEntry = zip.getEntries().find(e => e.entryName.toLowerCase().endsWith(".xml"));
    if (!xmlEntry) throw new Error("Ingen XML-fil i ZIP");
    zipFilename = xmlEntry.entryName;
    xmlContent = xmlEntry.getData().toString("utf8");
    console.log(`Extraherade ${zipFilename}: ${(xmlContent.length / 1024 / 1024).toFixed(1)} MB`);
  } catch (err) {
    console.warn(`VARNING: Kunde inte extrahera XML – ${err.message}`);
    process.exit(0);
  }

  // 4. Parsa XML
  let parsed;
  try {
    parsed = new XMLParser({ ignoreAttributes: false, parseTagValue: true }).parse(xmlContent);
  } catch (err) {
    console.warn(`VARNING: Kunde inte parsa XML – ${err.message}`);
    process.exit(0);
  }

  // 5. Hitta fond-arrayen (prova rot och ett nivå ned)
  let funds = null;
  const candidates = [parsed, ...Object.values(parsed).filter(v => v && typeof v === "object")];
  for (const node of candidates) {
    for (const val of Object.values(node)) {
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object") {
        funds = val;
        break;
      }
    }
    if (funds) break;
  }

  if (!funds?.length) {
    // fast-xml-parser returnerar objekt (inte array) vid enstaka element – normalisera
    const flat = Object.values(parsed).flatMap(v =>
      v && typeof v === "object" ? Object.values(v) : []
    );
    const obj = flat.find(v => v && typeof v === "object" && !Array.isArray(v));
    if (obj) funds = [obj];
  }

  if (!funds?.length) {
    console.warn("VARNING: Hittade inga fondobjekt i XML. Topp-nycklar:", Object.keys(parsed).join(", "));
    process.exit(0);
  }

  // 6. Logga fältnamn från första fondobjektet
  const firstFund = funds[0];
  const fieldNames = Object.keys(firstFund);
  console.log(`\nFältnamn i fondobjekt[0] (${funds.length} fonder totalt):\n  ${fieldNames.join(", ")}\n`);

  // 7. Identifiera ISIN-fält och avgiftsfält
  const isinField = fieldNames.find(f => /isin/i.test(f));
  const feeField  = fieldNames.find(f => /lopande|ongoing|kostnadskvot/i.test(f));

  if (!isinField) {
    console.warn("VARNING: Hittade inget ISIN-fält. Fältnamn:", fieldNames);
    process.exit(0);
  }
  if (!feeField) {
    console.warn("VARNING: Hittade inget avgiftsfält. Fältnamn:", fieldNames);
    process.exit(0);
  }
  console.log(`ISIN-fält: ${isinField} | Avgiftsfält: ${feeField}`);
  console.log(`Råvärde avgift för fond 0: ${firstFund[feeField]}`);

  // 8. Extrahera avgifter för de 13 målfondera
  const fees = {};
  for (const fund of funds) {
    const isin = String(fund[isinField] ?? "").trim();
    if (!TARGET_ISINS.has(isin)) continue;
    const raw = fund[feeField];
    const fee = typeof raw === "number" ? raw : parseFloat(String(raw).replace(",", "."));
    if (isNaN(fee)) {
      console.warn(`VARNING: Ogiltigt avgiftsvärde för ISIN ${isin}: ${raw}`);
    } else {
      fees[isin] = fee;
    }
  }

  for (const isin of TARGET_ISINS) {
    if (!(isin in fees)) {
      console.warn(`VARNING: ISIN ${isin} (${ISIN_TO_TICKER[isin] ?? "okänd"}) saknas i FI-data`);
    }
  }

  // 9. Tolka period och publiceringsdatum ur filnamnet
  const periodMatch = (zipFilename + zipUrl).match(/(\d{4})Q(\d)/i);
  const period      = periodMatch ? `${periodMatch[1]}Q${periodMatch[2]}` : null;
  const dateMatch   = (zipFilename + zipUrl).match(/(\d{8})/);
  const published   = dateMatch
    ? `${dateMatch[1].slice(0,4)}-${dateMatch[1].slice(4,6)}-${dateMatch[1].slice(6,8)}`
    : null;

  // 10. Skriv resultat
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
  if (period)  console.log(`Period: ${period}`);
  if (published) console.log(`Publicerat: ${published}`);
}

main().catch(err => {
  console.error("Oväntat fel:", err.message);
  process.exit(0);
});
