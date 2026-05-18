export function getDisplayRange(spanLabel, endTs) {
  if (spanLabel === "Max") return { startTs: null, endTs };

  const end = new Date(endTs * 1000);
  const y = end.getUTCFullYear();
  const m = end.getUTCMonth(); // 0-indexed
  const d = end.getUTCDate();

  let startDate;
  if (spanLabel === "1 mån") {
    startDate = new Date(Date.UTC(y, m - 1, d));
    if (startDate.getUTCDate() !== d) startDate = new Date(Date.UTC(y, m, 0));
  } else if (spanLabel === "3 mån") {
    startDate = new Date(Date.UTC(y, m - 3, d));
    if (startDate.getUTCDate() !== d) startDate = new Date(Date.UTC(y, m - 2, 0));
  } else if (spanLabel === "1 år") {
    startDate = new Date(Date.UTC(y - 1, m, d));
    if (startDate.getUTCDate() !== d) startDate = new Date(Date.UTC(y - 1, m + 1, 0));
  } else if (spanLabel === "3 år") {
    startDate = new Date(Date.UTC(y - 3, m, d));
    if (startDate.getUTCDate() !== d) startDate = new Date(Date.UTC(y - 3, m + 1, 0));
  }

  return { startTs: startDate.getTime() / 1000, endTs };
}
