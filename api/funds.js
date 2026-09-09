import { FUNDS_REGISTRY } from "../src/lib/funds-registry.js";
import { BENCHMARKS } from "../src/lib/benchmarks.js";

async function fetchYahooSeries(ticker) {
  const yahooResp = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=5y`,
    { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } }
  );

  const data = await yahooResp.json();
  const result = data?.chart?.result?.[0];
  const meta = result?.meta;
  const rawPrices = result?.indicators?.quote?.[0]?.close || [];
  const rawTimestamps = result?.timestamp || [];
  const validData = rawPrices.reduce((acc, price, i) => {
    if (price !== null && price !== undefined) {
      acc.push({ timestamp: rawTimestamps[i], value: price });
    }
    return acc;
  }, []);

  return { meta, prices: validData };
}

export default async function handler(req, res) {
  try {
    const fundResults = await Promise.all(FUNDS_REGISTRY.map(async (fund) => {
      try {
        const { meta, prices } = await fetchYahooSeries(fund.ticker);
        return {
          id: fund.id,
          ticker: fund.ticker,
          name: fund.name,
          category: fund.category,
          currentPrice: meta?.regularMarketPrice,
          currency: meta?.currency,
          prices: prices.map(d => ({ timestamp: d.timestamp, value: d.value })),
        };
      } catch {
        return { id: fund.id, name: fund.name, error: true };
      }
    }));

    const benchmarkResults = await Promise.all(BENCHMARKS.map(async (benchmark) => {
      try {
        const { meta, prices } = await fetchYahooSeries(benchmark.ticker);
        return {
          id: benchmark.id,
          ticker: benchmark.ticker,
          name: benchmark.name,
          category: benchmark.category,
          currency: benchmark.currency,
          currentPrice: meta?.regularMarketPrice,
          prices: prices.map(d => ({ timestamp: d.timestamp, value: d.value })),
        };
      } catch {
        return { id: benchmark.id, name: benchmark.name, error: true };
      }
    }));

    const allowedOrigins = ["https://minportfolj.se", "http://localhost:5173"];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Cache-Control", "s-maxage=3600");
    res.status(200).json({ funds: fundResults, benchmarks: benchmarkResults });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch fund data" });
  }
}
