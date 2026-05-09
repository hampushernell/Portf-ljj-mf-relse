const response = await fetch(
  'https://query1.finance.yahoo.com/v8/finance/chart/0P0001ECQR.ST?interval=1mo&range=10y',
  { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } }
);
const data = await response.json();
const result = data?.chart?.result?.[0];
const rawPrices = result?.indicators?.quote?.[0]?.close || [];
const rawTimestamps = result?.timestamp || [];

const validData = rawPrices.reduce((acc, price, i) => {
  if (price !== null && price !== undefined) {
    acc.push({ timestamp: rawTimestamps[i], value: price });
  }
  return acc;
}, []);

console.log('Antal datapunkter:', validData.length);
console.log('Första:', new Date(validData[0].timestamp * 1000).toISOString().slice(0,10), validData[0].value.toFixed(2));
console.log('Sista:', new Date(validData[validData.length-1].timestamp * 1000).toISOString().slice(0,10), validData[validData.length-1].value.toFixed(2));

const first = validData[0].value;
const last = validData[validData.length-1].value;
console.log('Avkastning 10 år:', (((last/first)-1)*100).toFixed(2) + '%');

// Sista 12 månader
const last12 = validData.slice(-13);
console.log('Avkastning 1 år:', (((last12[last12.length-1].value/last12[0].value)-1)*100).toFixed(2) + '%');