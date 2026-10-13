// Delad hantering av FI:s kvartals-ZIP (fondinnehav per kvartal):
// hitta senaste ZIP på fi.se, ladda ner, lista XML-filer och parsa dem.
// Används av fetch-fi-fees.mjs och fetch-fi-holdings.mjs. Funktionerna kastar
// vid fel — anropande skript avgör hur felet hanteras (exit 0 i Actions).
import { XMLParser } from "fast-xml-parser";
import AdmZip from "adm-zip";
import { readFileSync, readdirSync, statSync } from "fs";
import { basename, join } from "path";

export const FI_PAGE = "https://www.fi.se/sv/vara-register/fondinnehav-per-kvartal/";

// Scrapar FI-sidan och returnerar senaste ZIP-filnamn och nedladdnings-URL.
// Filnamnsmönster: Fondinnehav_2025Q4_2026-04-15 12.35.zip (mellanslag i filnamnet)
export async function findLatestZip() {
  const html = await fetch(FI_PAGE, { signal: AbortSignal.timeout(30_000) }).then(r => r.text());
  const match = html.match(/FondInnehavLista\/download\?filnamn=(Fondinnehav_[^"]+\.zip)/i);
  if (!match) throw new Error("Hittade ingen ZIP-länk på FI-sidan");
  const filename = match[1];
  const url = `https://www.fi.se/FondInnehavLista/download?filnamn=${encodeURIComponent(filename)}`;
  return { filename, url };
}

export async function downloadZip(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// Returnerar alla XML-filer i ZIP:en som [{ name, read() }] — en per fond.
export function listXmlEntries(zipBuffer) {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries()
    .filter(e => e.entryName.toLowerCase().endsWith(".xml"))
    .map(e => ({ name: e.entryName, read: () => e.getData().toString("utf8") }));
  if (!entries.length) throw new Error("Inga XML-filer i ZIP");
  return entries;
}

// Lokal källa för utveckling: en ZIP-fil eller en uppackad mapp.
// Returnerar { filename, entries } i samma form som nedladdningsflödet.
export function loadLocalSource(path) {
  if (statSync(path).isDirectory()) {
    const entries = readdirSync(path)
      .filter(f => f.toLowerCase().endsWith(".xml"))
      .sort()
      .map(f => ({ name: f, read: () => readFileSync(join(path, f), "utf8") }));
    if (!entries.length) throw new Error(`Inga XML-filer i ${path}`);
    return { filename: basename(path), entries };
  }
  return { filename: basename(path), entries: listXmlEntries(readFileSync(path)) };
}

// Sista delen av ett entry-namn (FI använder bakstreck som katalogavgränsare).
export function entryBasename(name) {
  return name.split(/[\\/]/).pop();
}

// Tolkar period och publiceringsdatum ur råfilnamnet,
// t.ex. "Fondinnehav_2025Q4_2026-04-15 12.35.zip" → { period: "2025Q4", published: "2026-04-15" }
export function parseZipFilename(filename) {
  const periodMatch = filename.match(/(\d{4})Q(\d)/i);
  const dateMatch   = filename.match(/(\d{4}-\d{2}-\d{2})/);
  return {
    period:    periodMatch ? `${periodMatch[1]}Q${periodMatch[2]}` : null,
    published: dateMatch ? dateMatch[1] : null,
  };
}

const defaultParser = new XMLParser({ ignoreAttributes: false, parseTagValue: true });

// Parsar en FI-XML. Utan options används standardparsern (taggvärden tolkas som tal).
export function parseFiXml(xml, options) {
  const parser = options
    ? new XMLParser({ ignoreAttributes: false, parseTagValue: true, ...options })
    : defaultParser;
  return parser.parse(xml);
}

// Traverserar ett parserat XML-träd och returnerar det första objektet som
// innehåller ett fält vars namn matchar /isin/i — det är Fondinformation-noden.
export function findFondInfo(node) {
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
export function extractNumber(val) {
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
