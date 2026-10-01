import { FUNDS_REGISTRY } from "../lib/funds-registry";
import { BENCHMARKS } from "../lib/benchmarks";

const SPAN_TO_URL = { "1 mån": "1m", "3 mån": "3m", "1 år": "1y", "3 år": "3y", "Max": "max" };
const URL_TO_SPAN = Object.fromEntries(Object.entries(SPAN_TO_URL).map(([k, v]) => [v, k]));
const REGISTRY_BY_ID = Object.fromEntries(FUNDS_REGISTRY.map(f => [String(f.id), f]));
const BENCHMARK_IDS = new Set(BENCHMARKS.map(b => b.id));
const URL_KEYS = ["a", "b", "span", "mode", "idx"];

// Senaste query-strängen sparas i sessionStorage så att jämförelsen finns kvar när
// användaren går till /fonder/ och tillbaka via "Jämför" i headern (utan parametrar).
export const LAST_QUERY_KEY = "lastCompareQuery";

const hasUrlParams = params => URL_KEYS.some(k => params.get(k));

// Lagring kan kasta (privat läge, blockerad site data) — då finns inget sparat läge.
function readSavedQuery() {
  try {
    return sessionStorage.getItem(LAST_QUERY_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeSavedQuery(query) {
  try {
    sessionStorage.setItem(LAST_QUERY_KEY, query);
  } catch {
    // Ignoreras — återställningen är en bekvämlighet, inte ett krav.
  }
}

// Returns { fundsA: [{id, pct}], fundsB: [{id, pct}], span, mode, idx: [id] } or null.
// Called once at mount — does not depend on allFunds (price data not yet loaded).
// URL-parametrar har alltid företräde; saknas alla läses sparat läge från sessionStorage
// och adressfältet uppdateras så att delningslänken matchar det som visas.
export function parseUrl() {
  let params = new URLSearchParams(window.location.search);
  if (!hasUrlParams(params)) {
    const saved = new URLSearchParams(readSavedQuery());
    if (!hasUrlParams(saved)) return null;
    params = saved;
    history.replaceState(null, "", `?${saved.toString()}`);
  }

  const aStr   = params.get("a");
  const bStr   = params.get("b");
  const spanStr = params.get("span");
  const modeStr = params.get("mode");
  const idxStr  = params.get("idx");

  const parseFundList = str => {
    if (!str) return [];
    return str.split(",").flatMap(part => {
      const [rawId, pctStr] = part.split(":");
      if (!rawId || rawId.startsWith("manual_")) return [];
      if (!REGISTRY_BY_ID[rawId]) return [];
      const pct = parseFloat(pctStr);
      if (isNaN(pct) || pct < 0 || pct > 100) return [];
      return [{ id: Number(rawId), pct }];
    });
  };

  // Kommaseparerad lista av benchmark-id:n, aldrig en boolesk flagga — se BENCHMARKS.md.
  // split(",") fungerar redan för flerval även om v1 bara ger en post.
  const parseIdxList = str => {
    if (!str) return [];
    return str.split(",").filter(id => BENCHMARK_IDS.has(id));
  };

  return {
    fundsA: parseFundList(aStr),
    fundsB: parseFundList(bStr),
    span:   URL_TO_SPAN[spanStr] ?? "Max",
    mode:   modeStr === "compare" ? "compare" : "fund",
    idx:    parseIdxList(idxStr),
  };
}

// Serializes current app state into the URL via replaceState.
export function serializeUrl(portfolioA, portfolioB, span, viewMode, activeIdx = []) {
  const spanParam = SPAN_TO_URL[span] ?? "max";

  const serializeFunds = (funds, allocs) => {
    const nonManual = funds.filter(f => typeof f.id !== "string" || !f.id.startsWith("manual_"));
    if (!nonManual.length) return "";
    return nonManual
      .map(f => `${f.id}:${Math.round(allocs[f.id]?.pct ?? 0)}`)
      .join(",");
  };

  const params = new URLSearchParams();
  const aStr = serializeFunds(portfolioA.funds, portfolioA.allocs);
  if (aStr) params.set("a", aStr);
  const bStr = serializeFunds(portfolioB.funds, portfolioB.allocs);
  if (bStr) params.set("b", bStr);
  if (spanParam !== "max") params.set("span", spanParam);
  if (viewMode !== "fund") params.set("mode", viewMode);
  if (activeIdx.length) params.set("idx", activeIdx.join(","));

  const query = params.toString();
  writeSavedQuery(query);
  history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
}
