import { FUNDS_REGISTRY } from "../src/lib/funds-registry.js";

export default async function handler(req, res) {
  const tickers = FUNDS_REGISTRY;

  try {
    const results = await Promise.all(tickers.map(async (fund) => {
      try {
        const yahooResp = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${fund.ticker}?interval=1d&range=5y`,
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

        return {
          id: fund.id,
          ticker: fund.ticker,
          name: fund.name,
          category: fund.category,
          currentPrice: meta?.regularMarketPrice,
          currency: meta?.currency,
          prices: validData.map(d => ({ timestamp: d.timestamp, value: d.value })),
        };
      } catch (e) {
        return { id: fund.id, name: fund.name, error: true };
      }
    }));

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "s-maxage=3600");
    res.status(200).json({ funds: results });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch fund data" });
  }
}
