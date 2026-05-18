export function rebaseSeries(series) {
  if (!series || series.length === 0) return [];
  const base = series[0].value;
  if (!base || base <= 0) return [];
  return series.map((p, i) => ({
    timestamp: p.timestamp,
    value: i === 0 ? 100 : parseFloat(((p.value / base) * 100).toFixed(2)),
  }));
}

export function blendPortfolio(fundSeries) {
  if (!fundSeries || fundSeries.length === 0) return [];

  const latestStart = Math.max(...fundSeries.map(f => f.series[0]?.timestamp ?? Infinity));
  if (!isFinite(latestStart)) return [];

  const totalWeight = fundSeries.reduce((sum, f) => sum + f.weight, 0);
  if (totalWeight <= 0) return [];

  const rebased = fundSeries.map(f => {
    const trimmed = f.series.filter(p => p.timestamp >= latestStart);
    return { series: rebaseSeries(trimmed), weight: f.weight };
  }).filter(f => f.series.length > 0);

  if (!rebased.length) return [];

  let sharedTs = new Set(rebased[0].series.map(p => p.timestamp));
  for (let i = 1; i < rebased.length; i++) {
    const other = new Set(rebased[i].series.map(p => p.timestamp));
    sharedTs = new Set([...sharedTs].filter(ts => other.has(ts)));
  }

  if (sharedTs.size === 0) return [];

  const lookups = rebased.map(f => ({
    map: new Map(f.series.map(p => [p.timestamp, p.value])),
    weight: f.weight,
  }));

  return [...sharedTs].sort((a, b) => a - b).map(ts => ({
    timestamp: ts,
    value: parseFloat(
      lookups.reduce((acc, { map, weight }) => acc + (weight / totalWeight) * map.get(ts), 0).toFixed(2)
    ),
  }));
}
