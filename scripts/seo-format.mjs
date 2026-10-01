/**
 * seo-format.mjs — Formattering som delas av build-seo-pages.mjs och seo-chart.mjs.
 * Ingen finansiell logik, bara presentation (svenskt decimalkomma, tecken, datum).
 */

const MONTHS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export function fmtSignedPct(v) {
  if (v === null || v === undefined) return "–";
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}${Math.abs(v).toFixed(1).replace(".", ",")} %`;
}

// "2022-03-07" → "7 mar 2022"
export function fmtDateSv(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// Datum (ms, UTC) → "sep 25", för grafens x-axel
export function fmtMonthYear(ms) {
  const d = new Date(ms);
  return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`;
}

// Obestämd plural med gemen begynnelsebokstav för löptext: "globalfonder", men
// "USA-fonder" (versalt egennamn i singularformen behålls).
export function categoryPlural(meta) {
  return meta.singular[0] === meta.singular[0].toUpperCase() ? meta.label : meta.label.toLowerCase();
}
