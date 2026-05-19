import { describe, it, expect } from "vitest";
import { rebaseSeries, blendPortfolio } from "../blend.js";

describe("rebaseSeries", () => {
  it("tom array returnerar tom array", () => {
    expect(rebaseSeries([])).toEqual([]);
  });

  it("första värdet är alltid 100", () => {
    const result = rebaseSeries([
      { timestamp: 1, value: 250 },
      { timestamp: 2, value: 500 },
    ]);
    expect(result[0].value).toBe(100);
  });

  it("värden rebaseras korrekt relativt första", () => {
    const result = rebaseSeries([
      { timestamp: 1, value: 200 },
      { timestamp: 2, value: 400 },
      { timestamp: 3, value: 100 },
    ]);
    expect(result[1].value).toBe(200);
    expect(result[2].value).toBe(50);
  });
});

describe("blendPortfolio", () => {
  it("tom array returnerar tom array", () => {
    expect(blendPortfolio([])).toEqual([]);
  });

  it("en fond med vikt 100 returnerar samma serie som rebaseSeries", () => {
    const series = [
      { timestamp: 1, value: 100 },
      { timestamp: 2, value: 200 },
    ];
    const blended = blendPortfolio([{ series, weight: 100 }]);
    const rebased = rebaseSeries(series);
    expect(blended).toEqual(rebased);
  });

  it("två fonder med lika vikt ger medelvärdet av deras rebased-serier", () => {
    const fund1 = [{ timestamp: 1, value: 100 }, { timestamp: 2, value: 200 }];
    const fund2 = [{ timestamp: 1, value: 100 }, { timestamp: 2, value: 300 }];
    const blended = blendPortfolio([
      { series: fund1, weight: 50 },
      { series: fund2, weight: 50 },
    ]);
    expect(blended[0].value).toBe(100);
    expect(blended[1].value).toBe(250);
  });

  it("inner join — dagar som saknas i en fond inkluderas inte i resultatet", () => {
    const fund1 = [
      { timestamp: 1, value: 100 },
      { timestamp: 2, value: 200 },
      { timestamp: 3, value: 300 },
    ];
    const fund2 = [
      { timestamp: 1, value: 100 },
      { timestamp: 3, value: 300 },
    ];
    const blended = blendPortfolio([
      { series: fund1, weight: 50 },
      { series: fund2, weight: 50 },
    ]);
    expect(blended.length).toBe(2);
    expect(blended.map(p => p.timestamp)).toEqual([1, 3]);
  });
});
