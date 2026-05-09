const response = await fetch(
  'https://query1.finance.yahoo.com/v8/finance/chart/0P0001ECQR.ST?interval=1d&range=1y',
  { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } }
);
const data = await response.json();
const result = data?.chart?.result?.[0];
const prices = result?.indicators?.adjclose?.[0]?.adjclose;
const timestamps = result?.timestamp;

// Visa första 5 och sista 5 datapunkter
timestamps.slice(0, 5).forEach((t, i) => {
  const date = new Date(t * 1000).toISOString().slice(0, 10);
  console.log(`${date}: ${prices[i]?.toFixed(2)}`);
});
console.log('...');
timestamps.slice(-5).forEach((t, i) => {
  const date = new Date(t * 1000).toISOString().slice(0, 10);
  const pi = prices.length - 5 + i;
  console.log(`${date}: ${prices[pi]?.toFixed(2)}`);
});