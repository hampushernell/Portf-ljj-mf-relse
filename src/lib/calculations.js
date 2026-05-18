import { MONTH_SECS } from "./utils";

function seededRng(seed) {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 0x100000000; };
}

function normalRandom(rng) {
  const u1 = Math.max(rng(), 1e-10);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * rng());
}

export function getLatestNavTs(funds) {
  let latest = null;
  for (const f of funds) {
    if (f.isManual || !f.prices?.length) continue;
    const ts = f.prices[f.prices.length - 1].timestamp;
    if (latest === null || ts > latest) latest = ts;
  }
  return latest ?? Date.now() / 1000;
}

export function buildSeries(prices, months, refNow = null) {
  if (!prices || prices.length === 0) return [];
  let sliced;
  if (months === null) {
    sliced = prices;
  } else {
    const now = refNow ?? prices[prices.length - 1]?.timestamp ?? Date.now() / 1000;
    const cutoffTs = now - months * MONTH_SECS;
    let startIdx = prices.findIndex(p => p.timestamp >= cutoffTs);
    if (startIdx === -1) return [];
    if (startIdx > 0) startIdx--;
    sliced = prices.slice(startIdx);
  }
  const base = sliced[0]?.value;
  if (!base || base <= 0) return [];
  return sliced.map((p, i) => ({
    month: i,
    timestamp: p.timestamp,
    value: parseFloat(((p.value / base) * 100).toFixed(2)),
  }));
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

// Returns the reference end-timestamp and step-count derived from the SHORTEST
// Yahoo Finance series in `funds` for the given span.
// Using the minimum guarantees that every Yahoo Finance series in the blend has
// at least refLen points, so plain index-from-start blending stays correct and
// every caller that uses the same ref produces series of identical length.
export function getYahooRef(funds, months) {
  const latestNavTs = getLatestNavTs(funds);
  let refLen = null;
  for (const f of funds) {
    if (f.isManual || !f.prices?.length) continue;
    const s = buildSeries(f.prices, months, latestNavTs);
    if (!s.length) continue;
    if (refLen === null || s.length < refLen) {
      refLen = s.length;
    }
  }
  return { refEndTs: latestNavTs, refLen, latestNavTs };
}

export function blendPortfolioSeries(funds, allocs, inputMode, portfolioTotal, months, spanLabel, externalRef = null) {
  if (!funds.length) return [];

  const { refEndTs, refLen, latestNavTs } = externalRef ?? getYahooRef(funds, months);

  // Cache Yahoo Finance series (avoids rebuilding them twice).
  const yahooCache = {};
  for (const f of funds) {
    if (!f.isManual && f.prices?.length) {
      const s = buildSeries(f.prices, months, latestNavTs);
      if (s.length) yahooCache[f.id] = s;
    }
  }

  const seriesList = funds.map(f => {
    const pct = getFundPct(f, allocs, inputMode, portfolioTotal);
    if (pct <= 0) return null;
    if (f.isManual) {
      const ret = f.returns?.[spanLabel];
      if (!months || ret == null) return null;
      // Generate with refLen steps ending at refEndTs so the series has the same
      // length as the Yahoo Finance data and no truncation occurs.
      return { pct, isManual: true, series: generateSimulatedSeries(ret, months, f.id, refEndTs, refLen) };
    }
    const s = yahooCache[f.id];
    return s ? { pct, isManual: false, series: s } : null;
  }).filter(s => s && s.pct > 0 && s.series.length > 0);

  if (!seriesList.length) return [];

  const totalWeight = seriesList.reduce((acc, s) => acc + s.pct, 0);

  const aligned = seriesList.map(s => {
    const base = s.series[0].value;
    return { ...s, series: s.series.map((p, i) => ({
      ...p,
      value: i === 0 ? 100 : parseFloat((p.value / base * 100).toFixed(2)),
    })) };
  });
  const tsSrc = aligned.reduce((best, s) =>
    s.series[s.series.length - 1].timestamp > best.series[best.series.length - 1].timestamp ? s : best
  );

  const blendLen = Math.min(...aligned.map(s => s.series.length));
  return Array.from({ length: blendLen }, (_, i) => ({
    month: i,
    timestamp: tsSrc.series[i].timestamp,
    value: parseFloat(
      aligned.reduce((acc, s) => acc + (s.pct / totalWeight) * s.series[i].value, 0).toFixed(2)
    ),
  }));
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

export function computeReturnBundle({ funds, allocs, inputMode, portfolioTotal, spanMonths, spanLabel, colors, sharedRef }) {
  const ps = blendPortfolioSeries(funds, allocs, inputMode, portfolioTotal, spanMonths, spanLabel, sharedRef);
  const minLen = ps.length;

  const tss = funds.flatMap(f => f.prices?.length ? [f.prices[0].timestamp] : []);
  const oldestTs = tss.length ? Math.max(...tss) : null;

  const fundLines = minLen === 0 ? [] : funds.map((f, i) => {
    const color = colors[i % colors.length];
    let raw;
    if (f.isManual) {
      const ret = f.returns?.[spanLabel];
      if (!spanMonths || ret == null) return null;
      raw = generateSimulatedSeries(ret, spanMonths, f.id, sharedRef.refEndTs, sharedRef.refLen);
    } else {
      raw = buildSeries(f.prices, spanMonths, sharedRef.latestNavTs);
    }
    if (!raw?.length) return null;

    const base = raw[0]?.value;
    if (!base || base <= 0) return null;
    const graphSeries = raw.map((p, idx) => ({
      ...p,
      value: idx === 0 ? 100 : parseFloat((p.value / base * 100).toFixed(2)),
    }));

    const returnValue = graphSeries.length
      ? parseFloat((graphSeries[graphSeries.length - 1].value - 100).toFixed(2))
      : 0;

    return { name: f.name, color, series: graphSeries, returnValue };
  }).filter(Boolean);

  return { portfolioSeries: ps, fundLines, portfolioReturn: portfolioReturn(ps), oldestTs };
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
