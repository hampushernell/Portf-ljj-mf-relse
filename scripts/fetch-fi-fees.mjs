// Hämtar förvaltningsavgifter från FI:s fondinnehavsregister och skriver till src/data/fi-fees.json.
// Avslutar alltid med exit 0 vid nätverksfel för att inte bryta GitHub Action.
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { FUND_ISINS } from "../src/lib/utils.js";
import {
  findLatestZip, downloadZip, listXmlEntries, parseZipFilename,
  parseFiXml, findFondInfo, extractNumber, entryBasename,
} from "./lib/fi-zip.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE  = join(__dirname, "..", "src", "data", "fi-fees.json");

const ISIN_TO_TICKER = Object.fromEntries(
  Object.entries(FUND_ISINS).map(([ticker, isin]) => [isin, ticker])
);
const TARGET_ISINS = new Set(Object.values(FUND_ISINS));

async function main() {
  // 1. Scrapa FI-sidan för senaste ZIP-URL
  let zipUrl, filename;
  try {
    ({ url: zipUrl, filename } = await findLatestZip());
    console.log(`Hittade ZIP: ${filename}`);
  } catch (err) {
    console.warn(`VARNING: Kunde inte nå FI-sidan – ${err.message}`);
    console.warn("Behåller befintlig fi-fees.json oförändrad.");
    process.exit(0);
  }

  // 2. Ladda ner ZIP
  let zipBuffer;
  try {
    zipBuffer = await downloadZip(zipUrl);
    console.log(`ZIP-fil hämtad: ${(zipBuffer.length / 1024 / 1024).toFixed(1)} MB`);
  } catch (err) {
    console.warn(`VARNING: Kunde inte ladda ner ZIP – ${err.message}`);
    process.exit(0);
  }

  // 3. Lista alla XML-filer i ZIP (en per fond)
  let xmlEntries;
  try {
    xmlEntries = listXmlEntries(zipBuffer);
    console.log(`ZIP innehåller ${xmlEntries.length} XML-filer`);
  } catch (err) {
    console.warn(`VARNING: Kunde inte lista ZIP-innehåll – ${err.message}`);
    process.exit(0);
  }

  // 4. Logga fältnamn och avgiftsstruktur från första XML-filen
  let isinField, feeField;
  {
    const first  = parseFiXml(xmlEntries[0].read());
    const fund   = findFondInfo(first);
    if (fund) {
      const fields = Object.keys(fund);
      console.log(`\nFältnamn i Fondinformation (${entryBasename(xmlEntries[0].name)}):\n  ${fields.join(", ")}\n`);
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
      const fund = findFondInfo(parseFiXml(entry.read()));
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
  const { period, published } = parseZipFilename(filename);

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
