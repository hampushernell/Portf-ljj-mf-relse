// Temporary integration test for computeReturnBundle using the new lib pipeline.
// Run: node scripts/diff-test.js

import { computeReturnBundle } from '../src/lib/calculations.js';
import { FUND_COLORS } from '../src/lib/utils.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function dayTs(year, month, day) {
  return Date.UTC(year, month - 1, day) / 1000;
}

function fmtDate(ts) {
  return ts == null ? 'null' : new Date(ts * 1000).toISOString().slice(0, 10);
}

// Generates daily prices for weekdays only, using a deterministic sine-based walk.
function genPrices(startTs, endTs) {
  const prices = [];
  let value = 100;
  for (let ts = startTs; ts <= endTs; ts += 86400) {
    if (new Date(ts * 1000).getUTCDay() % 6 !== 0) { // skip Sat(6) and Sun(0)
      value *= 1 + Math.sin(ts * 1.3e-5) * 0.008 + 0.0004;
      prices.push({ timestamp: ts, value: Math.round(value * 1000) / 1000 });
    }
  }
  return prices;
}

// ── test data ─────────────────────────────────────────────────────────────────

// Fund A: starts 2024-01-02 (Tuesday)
// Fund B: starts 2024-01-07 (Sunday) → first actual price 2024-01-08 (Monday)
//         That is 5 calendar days after Fund A.
// Both end 2026-05-12 (Tuesday). ~570 trading days each.

const END_TS      = dayTs(2026, 5, 12);
const A_START_TS  = dayTs(2024, 1, 2);
const B_START_TS  = dayTs(2024, 1, 7); // 5 calendar days later

const pricesA = genPrices(A_START_TS, END_TS);
const pricesB = genPrices(B_START_TS, END_TS);

console.log(`Fund A: ${pricesA.length} prices  (${fmtDate(pricesA[0].timestamp)} → ${fmtDate(pricesA.at(-1).timestamp)})`);
console.log(`Fund B: ${pricesB.length} prices  (${fmtDate(pricesB[0].timestamp)} → ${fmtDate(pricesB.at(-1).timestamp)})`);
console.log();

const funds = [
  { id: 'a', name: 'Fund A', prices: pricesA, isManual: false },
  { id: 'b', name: 'Fund B', prices: pricesB, isManual: false },
];
const allocs = { a: { pct: 50 }, b: { pct: 50 } };

// ── run ───────────────────────────────────────────────────────────────────────

const { portfolioSeries, fundLines } = computeReturnBundle({
  funds,
  allocs,
  inputMode:      'pct',
  portfolioTotal: 0,
  spanMonths:     12,
  spanLabel:      '1 år',
  colors:         FUND_COLORS,
});

// ── results ───────────────────────────────────────────────────────────────────

const portStart  = portfolioSeries[0]?.timestamp ?? null;
const portEnd    = portfolioSeries.at(-1)?.timestamp ?? null;
const portReturn = portfolioSeries.length ? portfolioSeries.at(-1).value - 100 : NaN;

console.log('=== Portfolio ===');
console.log(`  Start:   ${fmtDate(portStart)}`);
console.log(`  End:     ${fmtDate(portEnd)}`);
console.log(`  Return:  ${portReturn.toFixed(2)}%`);
console.log(`  Points:  ${portfolioSeries.length}`);
console.log();

console.log('=== Fund lines ===');
for (const fl of fundLines) {
  const s = fl.series;
  console.log(`  ${fl.name}:  start=${fmtDate(s[0]?.timestamp)}  end=${fmtDate(s.at(-1)?.timestamp)}  return=${fl.returnValue.toFixed(2)}%  points=${s.length}`);
}
console.log();

// ── assertions ────────────────────────────────────────────────────────────────

// latestNavTs is the max last-price timestamp across both funds.
// Both end on END_TS, so latestNavTs = END_TS.
const latestNavTs = Math.max(pricesA.at(-1).timestamp, pricesB.at(-1).timestamp);

// "Later fund" = Fund B (later raw start date). Its first date in the windowed
// normalized series equals dayFloor(rangeStart), since Fund B has prices well
// before the 1-year window opens. That date is the same as portStart.
const laterFundFirstDate = fundLines[1].series[0]?.timestamp ?? null;

const failures = [];

// 1. Portfolio start = later fund's first date in the windowed series.
if (portStart !== laterFundFirstDate) {
  failures.push(`Portfolio start (${fmtDate(portStart)}) ≠ later fund first date (${fmtDate(laterFundFirstDate)})`);
}

// 2. Portfolio end = latestNavTs (getDisplayRange sets endTs = latestNavTs and
//    normalizeToCalendar runs up to dayFloor(endTs) which equals END_TS exactly
//    since END_TS is already a midnight timestamp).
if (portEnd !== latestNavTs) {
  failures.push(`Portfolio end (${fmtDate(portEnd)}) ≠ latestNavTs (${fmtDate(latestNavTs)})`);
}

// 3 & 4. Both fund lines end on the same date as the portfolio.
for (const fl of fundLines) {
  const fundEnd = fl.series.at(-1)?.timestamp ?? null;
  if (fundEnd !== portEnd) {
    failures.push(`${fl.name} end (${fmtDate(fundEnd)}) ≠ portfolio end (${fmtDate(portEnd)})`);
  }
}

// 5. Sanity: both funds have ≥ 400 raw price points.
if (pricesA.length < 400) failures.push(`Fund A has only ${pricesA.length} price points (need ≥ 400)`);
if (pricesB.length < 400) failures.push(`Fund B has only ${pricesB.length} price points (need ≥ 400)`);

// ── verdict ───────────────────────────────────────────────────────────────────

if (failures.length === 0) {
  console.log('PASS');
} else {
  console.log('FAIL');
  for (const f of failures) console.log('  ✗', f);
}
