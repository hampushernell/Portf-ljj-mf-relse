import { describe, it, expect } from "vitest";
import { computeBenchmarkSeries } from "../calculations.js";

const DAY = 86400;

describe("computeBenchmarkSeries", () => {
  it("rebaseras till 100 på exakt samma startTs som portföljen", () => {
    // Indexet har historik långt innan portföljens fönster.
    const prices = [];
    for (let d = -50; d <= 10; d++) {
      prices.push({ timestamp: d * DAY, value: 1000 + d * 5 });
    }
    const portfolioStartTs = 0;
    const portfolioEndTs = 10 * DAY;

    const series = computeBenchmarkSeries({ prices }, portfolioStartTs, portfolioEndTs);

    expect(series[0].timestamp).toBe(portfolioStartTs);
    expect(series[0].value).toBe(100);
  });

  it("klipps till samma fönster som fonderna trots att indexet har mycket längre historik", () => {
    // 30 år av dagliga punkter, men portföljens fönster är bara 5 dagar.
    const prices = [];
    for (let d = -30 * 365; d <= 30 * 365; d++) {
      prices.push({ timestamp: d * DAY, value: 5000 + d });
    }
    const portfolioStartTs = 100 * DAY;
    const portfolioEndTs = 105 * DAY;

    const series = computeBenchmarkSeries({ prices }, portfolioStartTs, portfolioEndTs);

    expect(series.length).toBe(6); // dag 100..105 inklusive
    expect(series[0].timestamp).toBe(portfolioStartTs);
    expect(series[series.length - 1].timestamp).toBe(portfolioEndTs);
    expect(series.every(p => p.timestamp >= portfolioStartTs && p.timestamp <= portfolioEndTs)).toBe(true);
  });

  it("returnerar tom array om startTs eller endTs saknas", () => {
    const prices = [{ timestamp: 0, value: 100 }];
    expect(computeBenchmarkSeries({ prices }, null, 10 * DAY)).toEqual([]);
    expect(computeBenchmarkSeries({ prices }, 0, null)).toEqual([]);
  });

  it("returnerar tom array om benchmarken saknar prisdata", () => {
    expect(computeBenchmarkSeries({ prices: [] }, 0, 10 * DAY)).toEqual([]);
    expect(computeBenchmarkSeries(null, 0, 10 * DAY)).toEqual([]);
  });

  it("går aldrig genom blendPortfolio — en enskild serie in ger en enskild serie ut, ingen viktning", () => {
    const prices = [
      { timestamp: 0, value: 100 },
      { timestamp: DAY, value: 200 },
      { timestamp: 2 * DAY, value: 300 },
    ];
    const series = computeBenchmarkSeries({ prices }, 0, 2 * DAY);
    expect(series).toEqual([
      { timestamp: 0, value: 100 },
      { timestamp: DAY, value: 200 },
      { timestamp: 2 * DAY, value: 300 },
    ]);
  });
});
