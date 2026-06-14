import { FUNDS_REGISTRY } from "../lib/funds-registry";

const SPAN_TO_URL = { "1 mån": "1m", "3 mån": "3m", "1 år": "1y", "3 år": "3y", "Max": "max" };
const URL_TO_SPAN = Object.fromEntries(Object.entries(SPAN_TO_URL).map(([k, v]) => [v, k]));
const REGISTRY_BY_ID = Object.fromEntries(FUNDS_REGISTRY.map(f => [String(f.id), f]));

// Returns { fundsA: [{id, pct}], fundsB: [{id, pct}], span, mode } or null.
// Called once at mount — does not depend on allFunds (price data not yet loaded).
export function parseUrl() {
  const params = new URLSearchParams(window.location.search);
  const aStr   = params.get("a");
  const bStr   = params.get("b");
  const spanStr = params.get("span");
  const modeStr = params.get("mode");

  if (!aStr && !bStr && !spanStr && !modeStr) return null;

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

  return {
    fundsA: parseFundList(aStr),
    fundsB: parseFundList(bStr),
    span:   URL_TO_SPAN[spanStr] ?? "Max",
    mode:   modeStr === "compare" ? "compare" : "fund",
  };
}

// Serializes current app state into the URL via replaceState.
export function serializeUrl(portfolioA, portfolioB, span, viewMode) {
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

  const query = params.toString();
  history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
}
