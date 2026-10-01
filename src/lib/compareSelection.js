// Delat val mellan fondlistan (/fonder/) och verktyget. Fondlistan speglar Portfölj A
// i det sparade läget (sessionStorage "lastCompareQuery", se src/hooks/useUrlSync.js).
//
// Funktionerna inlinas i fondlistans skript via .toString() (scripts/build-seo-pages.mjs),
// så de får bara referera till varandra och till MAX_FUNDS_PER_PORTFOLIO — inga imports,
// inga andra moduler.

// Tak per portfölj — gäller både fondlistan och verktyget.
export const MAX_FUNDS_PER_PORTFOLIO = 10;

// n heltalsvikter som summerar till 100, de första får +1 vid rest.
export function equalWeights(n) {
  const base = Math.floor(100 / n);
  const remainder = 100 - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

// Jämna vikter = ingen har ändrat dem för hand (max − min ≤ 1 procentenhet).
export function isEvenWeights(pcts) {
  if (!pcts.length) return true;
  return Math.max(...pcts) - Math.min(...pcts) <= 1;
}

// list: [{id, pct}]. Returnerar en ny lista, muterar aldrig input. Samma regel som
// usePortfolio.addFund: jämna vikter fördelas om jämnt, egna vikter behålls och den
// nya fonden får det som är kvar upp till 100.
export function addFundToSelection(list, id) {
  if (list.some(x => x.id === id) || list.length >= MAX_FUNDS_PER_PORTFOLIO) return list;
  const pcts = list.map(x => x.pct);
  if (isEvenWeights(pcts)) {
    const weights = equalWeights(list.length + 1);
    return [...list, { id, pct: 0 }].map((x, i) => ({ id: x.id, pct: weights[i] }));
  }
  const sum = pcts.reduce((a, b) => a + b, 0);
  return [...list.map(x => ({ ...x })), { id, pct: Math.max(0, 100 - sum) }];
}

// En borttagen fond lämnar övriga vikter orörda.
export function removeFundFromSelection(list, id) {
  return list.filter(x => x.id !== id).map(x => ({ ...x }));
}

// a-parametern ur en query-sträng → [{id, pct}]. Trasiga delar hoppas över.
export function readSelectionParam(query) {
  const parts = String(query ?? "").replace(/^\?/, "").split("&");
  const raw = parts.find(p => p === "a" || p.startsWith("a="));
  if (!raw) return [];
  let value;
  try {
    value = decodeURIComponent(raw.slice(2).replace(/\+/g, " "));
  } catch {
    return [];
  }
  const seen = new Set();
  return value.split(",").flatMap(part => {
    const [rawId, rawPct] = part.split(":");
    const id = Number(rawId);
    const pct = Number(rawPct);
    if (!rawId || !Number.isInteger(id) || id <= 0 || seen.has(id)) return [];
    if (rawPct === undefined || rawPct === "" || !Number.isFinite(pct) || pct < 0 || pct > 100) return [];
    seen.add(id);
    return [{ id, pct }];
  });
}

// Skriver in a-parametern i query-strängen. Övriga parametrar (b, span, mode, idx)
// lämnas byte för byte oförändrade och i samma ordning; tom lista tar bort a.
export function writeSelectionParam(query, list) {
  const parts = String(query ?? "").replace(/^\?/, "").split("&").filter(Boolean);
  const value = list.map(x => x.id + ":" + Math.round(x.pct)).join(",");
  const next = value ? "a=" + encodeURIComponent(value) : null;
  const i = parts.findIndex(p => p === "a" || p.startsWith("a="));
  if (i >= 0) {
    if (next) parts[i] = next; else parts.splice(i, 1);
  } else if (next) {
    parts.unshift(next);
  }
  return parts.join("&");
}
