function seededRng(seed) {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 0x100000000; };
}

function normalRandom(rng) {
  const u1 = Math.max(rng(), 1e-10);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * rng());
}

export function buildSeries(prices, months) {
  if (!prices || prices.length === 0) return [];
  let sliced;
  if (months === null) {
    sliced = prices;
  } else {
    const cutoffTs = Date.now() / 1000 - months * 30.44 * 24 * 3600;
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

  const startTs = refEnd - months * 30.44 * 24 * 3600;
  const dtSec   = (months * 30.44 * 24 * 3600) / steps;

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
  let refEndTs = null, refLen = null;
  for (const f of funds) {
    if (f.isManual || !f.prices?.length) continue;
    const s = buildSeries(f.prices, months);
    if (!s.length) continue;
    if (refLen === null || s.length < refLen) {
      refLen = s.length;
      refEndTs = s[s.length - 1].timestamp;
    }
  }
  return { refEndTs: refEndTs ?? Date.now() / 1000, refLen };
}

export function blendPortfolioSeries(funds, allocs, inputMode, portfolioTotal, months, spanLabel, externalRef = null) {
  if (!funds.length) return [];

  const { refEndTs, refLen } = externalRef ?? getYahooRef(funds, months);

  // Cache Yahoo Finance series (avoids rebuilding them twice).
  const yahooCache = {};
  for (const f of funds) {
    if (!f.isManual && f.prices?.length) {
      const s = buildSeries(f.prices, months);
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

  const minLen = Math.min(...seriesList.map(s => s.series.length));
  const totalWeight = seriesList.reduce((acc, s) => acc + s.pct, 0);

  // Align every series from the back so all share the same end date,
  // then pick the one whose last point is latest as the timestamp reference.
  const aligned = seriesList.map(s => ({ ...s, series: s.series.slice(-minLen) }));
  const tsSrc = aligned.reduce((best, s) =>
    s.series[s.series.length - 1].timestamp > best.series[best.series.length - 1].timestamp ? s : best
  );

  return Array.from({ length: minLen }, (_, i) => ({
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
