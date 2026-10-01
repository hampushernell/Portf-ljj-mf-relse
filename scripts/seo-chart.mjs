/**
 * seo-chart.mjs — Statisk kategorigraf för fondsidan (/fond/<slug>), renderad vid byggtid.
 *
 * renderCategoryChart() är en ren funktion: samma indata ger samma HTML-sträng, och den
 * läser inget annat än argumenten. Ingen JS på sidan.
 *
 * Indata är snapshotens veckoserier (seo-snapshot.json, fönster.series = { start, points }).
 * points[0] ligger på `start`. Övriga punkter ligger var 7:e dag räknat bakåt från asOf,
 * så punkt k från slutet ligger på asOf − 7·k dagar (se sampleWeekly i
 * build-seo-snapshot.mjs). Grafen placerar punkterna efter datum, inte efter index.
 *
 * SVG:n innehåller bara linjer. Den har fast viewBox-bredd, preserveAspectRatio="none"
 * och höjd satt i CSS, så den sträcks olika i x och y beroende på skärm. All text och
 * slutpunktens prick ligger därför som HTML-overlay positionerad i %, så att de inte
 * skalas med SVG:n (samma princip som ChartRefLabels.jsx i appen). Linjerna har
 * vector-effect="non-scaling-stroke" och behåller sin bredd.
 */

import { fmtSignedPct, fmtMonthYear, categoryPlural } from "./seo-format.mjs";
import { getCompanyColor } from "../src/lib/company-colors.js";

const VB_W = 800;
const VB_H = 280;
const PAD_Y = 12;          // luft över/under extremvärdena, i viewBox-enheter
const DAY_MS = 86400000;

const OTHER_STROKE = "rgba(203,213,230,0.20)";
const GRID_STROKE = "rgba(255,255,255,0.08)";
const ZERO_STROKE = "rgba(255,255,255,0.34)";

const SPANS = {
  "1y": { key: "oneYear", years: 1, tickMonths: [12, 9, 6, 3, 0] },
  "3y": { key: "threeYear", years: 3, tickMonths: [36, 24, 12, 0] },
};

const isoMs = iso => Date.parse(`${iso}T00:00:00Z`);

// Datum (ms) för varje punkt i en snapshotserie, enligt samplingsregeln ovan.
function pointDates(series, endMs) {
  const n = series.points.length;
  return series.points.map((_, j) => (j === 0 ? isoMs(series.start) : endMs - 7 * DAY_MS * (n - 1 - j)));
}

// Steg för y-etiketterna efter hur stort avkastningsspann grafen visar.
function yStep(range) {
  if (range > 80) return 50;
  if (range > 40) return 20;
  return 10;
}

function fmtTick(v) {
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)} %`;
}

// Polyline som relativa kommandon i tiondels enheter, för att hålla HTML:en liten.
// Avrundningen görs på absoluta koordinater så att felet inte ackumuleras.
function pathData(xs, ys) {
  let d = "";
  let px = 0, py = 0;
  for (let i = 0; i < xs.length; i++) {
    const x = Math.round(xs[i] * 10), y = Math.round(ys[i] * 10);
    d += i === 0 ? `M${x / 10} ${y / 10}` : `l${(x - px) / 10} ${(y - py) / 10}`.replace(/ -/g, "-");
    px = x; py = y;
  }
  return d;
}

const pct = (v, of) => `${((v / of) * 100).toFixed(2)}%`;

/**
 * @param fund           fondobjekt från buildFunds (har oneYear/threeYear med series)
 * @param categoryFunds  alla fonder i fondens kategori, fonden själv inräknad
 * @param span           "1y" | "3y"
 * @param asOf           snapshotens gemensamma slutdatum, "YYYY-MM-DD"
 * @returns HTML-sträng, eller "" om fonden saknar serie för spannet
 */
export function renderCategoryChart(fund, categoryFunds, span, asOf) {
  const { key, years, tickMonths } = SPANS[span];
  if (!fund[key]?.series) return "";

  const endMs = isoMs(asOf);
  const others = categoryFunds.filter(f => f.id !== fund.id && f[key]?.series);
  const skipped = categoryFunds.filter(f => f.id !== fund.id && !f[key]?.series).length;
  const drawn = [...others, fund]; // fonden sist, så att den hamnar överst

  const lines = drawn.map(f => ({ dates: pointDates(f[key].series, endMs), values: f[key].series.points }));
  const startMs = Math.min(...lines.map(l => l.dates[0]));

  // y-domän i avkastningsled (värde − 100), alltid med 0 % inom bild.
  let lo = 0, hi = 0;
  for (const l of lines) for (const v of l.values) { lo = Math.min(lo, v - 100); hi = Math.max(hi, v - 100); }
  const step = yStep(hi - lo);
  const toX = ms => ((ms - startMs) / (endMs - startMs)) * VB_W;
  const toY = ret => PAD_Y + ((hi - ret) / (hi - lo || 1)) * (VB_H - 2 * PAD_Y);

  const yTicks = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) yTicks.push(v);

  const grid = yTicks.map(v => {
    const y = toY(v).toFixed(1);
    return `<line x1="0" x2="${VB_W}" y1="${y}" y2="${y}" stroke="${v === 0 ? ZERO_STROKE : GRID_STROKE}" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
  }).join("");

  const toPath = l => pathData(l.dates.map(toX), l.values.map(v => toY(v - 100)));
  const otherPaths = lines.slice(0, -1).map(toPath).join("");
  const fundLine = lines[lines.length - 1];
  const fundColor = getCompanyColor(fund); // bolagsfärg, se DESIGN.md

  const svg = `<svg viewBox="0 0 ${VB_W} ${VB_H}" preserveAspectRatio="none" aria-hidden="true" focusable="false">`
    + grid
    + (otherPaths ? `<path d="${otherPaths}" fill="none" stroke="${OTHER_STROKE}" stroke-width="1" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>` : "")
    + `<path d="${toPath(fundLine)}" fill="none" stroke="${fundColor}" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`
    + `</svg>`;

  // ── HTML-overlay: etiketter och slutpunkt, positionerade i % av plottytan ──
  const yLabels = yTicks.map(v => `<span class="sc-y" style="top:${pct(toY(v), VB_H)}">${fmtTick(v)}</span>`).join("");

  const xLabels = tickMonths.map((m, i) => {
    const d = new Date(endMs);
    d.setUTCMonth(d.getUTCMonth() - m);
    const ms = d.getTime();
    if (ms < startMs - DAY_MS) return "";
    const edge = i === 0 ? " sc-x-first" : i === tickMonths.length - 1 ? " sc-x-last" : "";
    return `<span class="sc-x${edge}" style="left:${pct(toX(Math.max(ms, startMs)), VB_W)}">${fmtMonthYear(ms)}</span>`;
  }).join("");

  // Slutetiketten tar värdet direkt från snapshotten, inte från seriens sista punkt.
  const endReturn = fund[key].return;
  const endTop = pct(toY(fundLine.values[fundLine.values.length - 1] - 100), VB_H);
  const yearsLabel = years === 1 ? "1 år" : `${years} år`;
  const label = `${fund.name} ${fmtSignedPct(endReturn)} på ${yearsLabel}, bland ${drawn.length} ${categoryPlural(fund.categoryMeta)}`;

  const note = skipped
    ? `<p class="sc-note">${skipped === 1 ? "En fond" : `${skipped} fonder`} i kategorin saknar ${yearsLabel}s historik och visas inte här.</p>`
    : "";

  return `<div class="sc sc-${span}">
      <div class="sc-plot" role="img" aria-label="${label.replace(/"/g, "&quot;")}">
        ${svg}
        <div aria-hidden="true">${yLabels}${xLabels}<span class="sc-dot" style="top:${endTop};background:${fundColor}"></span><span class="sc-end" style="top:${endTop}">${fmtSignedPct(endReturn)}</span></div>
      </div>${note}
    </div>`;
}

export const CHART_CSS = `
  .sc-plot { position: relative; height: 280px; margin: 8px 70px 26px 44px; }
  .sc-plot svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; overflow: visible; }
  .sc-y, .sc-x, .sc-end { position: absolute; font-family: var(--font-display); font-size: 11px; line-height: 1; color: var(--text-label); font-variant-numeric: tabular-nums; white-space: nowrap; pointer-events: none; }
  .sc-y { right: calc(100% + 8px); transform: translateY(-50%); }
  .sc-x { top: calc(100% + 9px); transform: translateX(-50%); }
  .sc-x-first { transform: none; }
  .sc-x-last { transform: translateX(-100%); }
  .sc-end { left: calc(100% + 12px); transform: translateY(-50%); font-size: 12px; font-weight: 700; color: var(--text-primary); }
  .sc-dot { position: absolute; left: 100%; width: 9px; height: 9px; border-radius: 50%; box-shadow: 0 0 0 2px var(--bg-base); transform: translate(-50%, -50%); }
  .sc-note { margin: 0; font-size: 12px; color: var(--text-label); }
  @media (max-width: 767px) {
    .sc-plot { height: 220px; margin: 8px 58px 26px 38px; }
  }
`;
