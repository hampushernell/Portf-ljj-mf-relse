const MS_TOKEN = process.env.MORNINGSTAR_TOKEN;

async function fetchMorningstarFee(msId) {
  try {
    const url =
      `https://lt.morningstar.com/api/rest.svc/${MS_TOKEN}/security/screener` +
      `?page=1&pageSize=1&sortOrder=LegalName+asc&outputType=json&version=1` +
      `&languageId=sv-SE&currencyId=SEK` +
      `&securityDataPoints=SecId%2COngoingCharge%2CTransactionCost` +
      `&filters=SecId%3AIN%3A${msId}`;
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://www.morningstar.se/",
      },
    });
    const data = await resp.json();
    const row = data?.rows?.[0];
    if (!row) return null;
    const ongoing = row.OngoingCharge ?? 0;
    const transaction = row.TransactionCost ?? 0;
    const total = ongoing + transaction;
    if (total === 0) return null;
    return parseFloat(total.toFixed(4));
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const tickers = [
    // Globalfonder
    { id: 1,  ticker: "0P0001ECQR.ST", name: "Avanza Global",                      category: "Globalfond" },
    { id: 2,  ticker: "0P0001CKSU.ST", name: "Nordea Global Enhanced Growth",       category: "Globalfond" },
    { id: 3,  ticker: "0P0000YVZ3.ST", name: "Länsförsäkringar Global Index",       category: "Globalfond" },
    { id: 4,  ticker: "0P0000XAIN.ST", name: "Nordea Global Index Select",          category: "Globalfond" },
    { id: 5,  ticker: "0P0001F3XN.ST", name: "Handelsbanken Global Index",          category: "Globalfond" },
    { id: 6,  ticker: "0P0001Q6FC.ST", name: "DNB Global Indeks S",                 category: "Globalfond" },
    { id: 7,  ticker: "0P00000LST.ST", name: "Storebrand Global All Countries",     category: "Globalfond" },
    // Sverigefonder
    { id: 8,  ticker: "0P00005U1J.ST", name: "Avanza Zero",                         category: "Sverigefond" },
    { id: 9,  ticker: "0P0001JF8S.ST", name: "Nordea Swedish Sustainable Enhanced", category: "Sverigefond" },
    { id: 10, ticker: "0P00000K12.ST", name: "AMF Aktiefond Sverige",               category: "Sverigefond" },
    { id: 11, ticker: "0P00001DF8.ST", name: "Handelsbanken Sverige Index",         category: "Sverigefond" },
    { id: 12, ticker: "0P0000ULAP.ST", name: "Spiltan Aktiefond Investmentbolag",  category: "Sverigefond" },
    { id: 13, ticker: "0P0000J1JM.ST", name: "Länsförsäkringar Sverige Index",     category: "Sverigefond" },
  ];

  try {
    const results = await Promise.all(tickers.map(async (fund) => {
      const msId = fund.ticker.replace(".ST", "");
      try {
        const [yahooResp, msFee] = await Promise.all([
          fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${fund.ticker}?interval=1d&range=5y`,
            { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } }
          ),
          fetchMorningstarFee(msId),
        ]);

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
          fee: msFee,
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
