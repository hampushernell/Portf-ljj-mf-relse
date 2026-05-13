export function getWinner(val1, val2, higherIsBetter) {
  return higherIsBetter ? (val1 >= val2 ? "A" : "B") : (val1 <= val2 ? "A" : "B");
}

export function formatCompareStats(retA, retB, fee1, fee2, totalA, totalB) {
  return {
    feeDiff:  fee1 - fee2,
    retDiff:  retA - retB,
    feeWinner: getWinner(fee1, fee2, false),
    retWinner: getWinner(retA, retB, true),
    feeKrA: totalA * fee1 / 100,
    feeKrB: totalB * fee2 / 100,
    retKrA: totalA * retA / 100,
    retKrB: totalB * retB / 100,
  };
}
