export function normalizeToCalendar(prices, startTs, endTs) {
  if (!prices || prices.length === 0) return [];

  const sorted = [...prices].sort((a, b) => a.timestamp - b.timestamp);

  const startDay = dayFloor(startTs);
  const endDay   = dayFloor(endTs);
  const result   = [];
  let   cursor   = 0;
  let   lastVal  = null;

  for (let day = startDay; day <= endDay; day += 86400) {
    while (cursor < sorted.length && sorted[cursor].timestamp <= day + 86399) {
      lastVal = sorted[cursor].value;
      cursor++;
    }
    if (lastVal !== null) {
      result.push({ timestamp: day, value: lastVal });
    }
  }

  return result;
}

function dayFloor(ts) {
  return Math.floor(ts / 86400) * 86400;
}
