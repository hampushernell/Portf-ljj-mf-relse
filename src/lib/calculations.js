import { MONTH_SECS } from "./utils";
import { getLatestNavTs, normalizeToCalendar } from "./normalize";
import { blendPortfolio, rebaseSeries } from "./blend";
import { getDisplayRange } from "./dateRange";

export { getLatestNavTs };

function seededRng(seed) {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 0x100000000; };
}

function normalRandom(rng) {
  const u1 = Math.max(rng(), 1e-10);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * rng());
}


export function generateSimulatedSeries(totalReturnPct, months, fundId, endTs = null, nSteps = null) {
  const refEnd     = endTs ?? Date.now() / 1000;
  const steps      = nSteps ?? Math.round(months * 21);
  const years      = months / 12;
  const annualRet  = Math.pow(1 + totalReturnPct / 100, 1 / years) - 1;
  const vol        = 0.15;
  const dt         = 1 / 252;
  const mu         = annualRet - 0.5 * vol * vol;
  const sigma      = vol * Math.sqrt(dt);

  let hash = 0;
  for (const c of String(fundId)) hash = ((Math.imul(31, hash) + c.charCodeAt(0)) | 0) >>> 0;
  const rng = seededRng(hash);

  const startTs = refEnd - months * MONTH_SECS;
  const dtSec   = (months * MONTH_SECS) / steps;

  let logPrice = 0;
  const pts = [{ ts: startTs, v: 100 }];
  for (let i = 1; i < steps; i++) {
    logPrice += mu * dt + sigma * normalRandom(rng);
    pts.push({ ts: startTs + i * dtSec, v: Math.exp(logPrice) * 100 });
  }

  const scale = (100 + totalReturnPct) / pts[pts.length - 1].v;
  return pts.map((p, i) => ({
    month: i,
    timestamp: p.ts,
    value: i === 0 ? 100 : parseFloat((p.v * scale).toFixed(2)),
  }));
}

export function getFundPct(fund, allocs, inputMode, portfolioTotal) {
  if (inputMode === "pct") return allocs[fund.id]?.pct || 0;
  if (portfolioTotal <= 0) return 0;
  return ((allocs[fund.id]?.kr || 0) / portfolioTotal) * 100;
}

export function getWeightedFee(funds, allocs, inputMode, portfolioTotal) {
  return funds.reduce((acc, f) => {
    const pct = getFundPct(f, allocs, inputMode, portfolioTotal);
    return acc + (pct / 100) * (f.fee || 0);
  }, 0);
}


export function computeReturnBundle({ funds, allocs, inputMode, portfolioTotal, spanMonths, spanLabel, colors }) {
  const latestNavTs = getLatestNavTs(funds);
  const { startTs: rangeStart, endTs } = getDisplayRange(spanLabel, latestNavTs);

  const tss = funds.flatMap(f => f.prices?.length ? [f.prices[0].timestamp] : []);
  const oldestTs = tss.length ? Math.max(...tss) : null;

  const fundData = funds.map((f, i) => {
    const pct = getFundPct(f, allocs, inputMode, portfolioTotal);
    if (pct <= 0) return null;
    const color = colors[i % colors.length];

    if (f.isManual) {
      const ret = f.returns?.[spanLabel];
      if (!spanMonths || ret == null) return null;
      const raw = generateSimulatedSeries(ret, spanMonths, f.id, latestNavTs, null);
      if (!raw.length) return null;
      const normalized = normalizeToCalendar(raw, raw[0].timestamp, endTs);
      const series = rebaseSeries(normalized);
      if (!series.length) return null;
      return { fund: f, pct, series, color };
    }

    if (!f.prices?.length) return null;
    const fundStart = rangeStart ?? f.prices[0].timestamp;
    const normalized = normalizeToCalendar(f.prices, fundStart, endTs);
    if (!normalized.length) return null;
    const series = rebaseSeries(normalized);
    if (!series.length) return null;
    return { fund: f, pct, series, color };
  }).filter(Boolean);

  const portfolioSeries = blendPortfolio(
    fundData.map(d => ({ series: d.series, weight: d.pct }))
  );

  const fundLines = fundData.map(d => {
    const returnValue = d.series.length
      ? parseFloat((d.series[d.series.length - 1].value - 100).toFixed(2))
      : 0;
    return { name: d.fund.name, color: d.color, series: d.series, returnValue };
  });

  return { portfolioSeries, fundLines, portfolioReturn: portfolioReturn(portfolioSeries), oldestTs };
}

export function portfolioKrTotal(funds, allocs) {
  return funds.reduce((acc, f) => acc + (allocs[f.id]?.kr || 0), 0);
}

export const portfolioReturn = series => series.length ? series[series.length - 1].value - 100 : 0;

export function computeSpanMeta({ spanMonths, refNow, oldestTs, actualFromTs }) {
  const requestedCutoffTs = spanMonths !== null ? refNow - spanMonths * MONTH_SECS : -Infinity;
  const spanHasFullData = ts => ts.months === null || !oldestTs || oldestTs <= refNow - ts.months * MONTH_SECS + 30 * 86400;
  const isIncomplete = spanMonths !== null && !!actualFromTs && actualFromTs > requestedCutoffTs + 30 * 86400;
  const actualFromStr = actualFromTs
    ? new Date(actualFromTs * 1000).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" })
    : null;
  return { requestedCutoffTs, spanHasFullData, isIncomplete, actualFromStr };
}

export function computePortfolioContext({ latestNavTs, spanMonths, oldestTs, allSeries }) {
  const valid = allSeries.filter(s => s?.length > 0);
  const latestSeriesTs = valid.length ? Math.max(...valid.map(s => s[s.length - 1].timestamp)) : null;
  const refNow = latestNavTs ?? latestSeriesTs ?? Date.now() / 1000;
  const actualFromTs = valid.length ? Math.min(...valid.map(s => s[0].timestamp)) : null;
  const endTs = latestSeriesTs ?? refNow;
  const startTs = actualFromTs ?? (spanMonths === null ? refNow : refNow - spanMonths * MONTH_SECS);
  const { spanHasFullData, isIncomplete, actualFromStr } = computeSpanMeta({ spanMonths, refNow, oldestTs, actualFromTs });
  return { refNow, startTs, endTs, spanHasFullData, isIncomplete, actualFromStr };
}
