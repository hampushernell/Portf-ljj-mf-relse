const response = await fetch('https://www.morningstar.se/se/funds/snapshot/snapshot.aspx?id=F00000YIK4', {
  headers: {
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'application/json',
  }
});
console.log('Status:', response.status);
const text = await response.text();
console.log(text.slice(0, 500));