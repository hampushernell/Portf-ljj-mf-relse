// Referenslinjer för grafernas y-axel: alltid 0 %, plus en "jämn" stödlinje
// uppåt och (vid tydlig nedgång) en nedåt. Ren logik — inga UI-imports.
import { CHART } from "./tokens.js";

const NICE = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75,
              100, 125, 150, 200, 250, 300, 400, 500, 750, 1000];
const MIN_REF = 5;
const MIN_GAP_PX = CHART.refMinGap;

const floorNice = x => NICE.filter(n => n <= x).at(-1) ?? null;

// Högsta/lägsta avkastning (värde − 100) bland indexerade värden.
export function returnExtent(values) {
  let max = -Infinity, min = Infinity;
  for (const v of values) {
    if (v > max) max = v;
    if (v < min) min = v;
  }
  return values.length ? { maxRet: max - 100, minRet: min - 100 } : { maxRet: 0, minRet: 0 };
}

export function referenceTicks(maxRet, minRet, toY) {
  const y0 = toY(100);
  const ticks = [{ ret: 0, y: y0, kind: "zero" }];
  const up   = maxRet >=  MIN_REF ? floorNice(maxRet)  : null;
  const down = minRet <= -MIN_REF ? floorNice(-minRet) : null;
  if (up && Math.abs(toY(100 + up) - y0) >= MIN_GAP_PX)
    ticks.push({ ret: up, y: toY(100 + up), kind: "ref" });
  if (down && Math.abs(toY(100 - down) - y0) >= MIN_GAP_PX)
    ticks.push({ ret: -down, y: toY(100 - down), kind: "ref" });
  return ticks;
}

// Var ska 0 %-etiketten stå? Tittar på de första 10 % av varje synlig serie
// (där etiketten ligger). Ligger majoriteten av punkterna under 100 → "above".
// seriesList: arrayer av { value } (indexvärden, start 100).
export function zeroLabelSide(seriesList, window = 0.10) {
  let below = 0, total = 0;
  for (const s of seriesList) {
    const n = Math.max(2, Math.ceil(s.length * window));
    for (let i = 1; i < Math.min(n, s.length); i++) {
      total++;
      if (s[i].value < 100) below++;
    }
  }
  return total && below / total > 0.5 ? "above" : "below";
}

// Lägger till etikettsida per tick: stödlinjen uppåt får etiketten under linjen,
// stödlinjen nedåt ovanför — båda hamnar mellan linjen och nollan.
export function withLabelSides(ticks, zeroSide) {
  return ticks.map(t => ({
    ...t,
    side: t.kind === "zero" ? zeroSide : t.ret > 0 ? "below" : "above",
  }));
}

// "+150 %", "0 %", "−30 %" (riktigt minustecken).
export function formatTickLabel(ret) {
  if (ret === 0) return "0 %";
  return `${ret > 0 ? "+" : "−"}${Math.abs(ret)} %`;
}
