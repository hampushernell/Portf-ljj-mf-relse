import { describe, it, expect } from 'vitest';
import { rebaseSeries, blendPortfolio } from './blend.js';

describe('rebaseSeries', () => {
  it('tom array → returnerar []', () => {
    expect(rebaseSeries([])).toEqual([]);
  });

  it('null → returnerar []', () => {
    expect(rebaseSeries(null)).toEqual([]);
  });

  it('första värdet blir alltid 100', () => {
    const series = [
      { timestamp: 1, value: 250 },
      { timestamp: 2, value: 500 },
    ];
    expect(rebaseSeries(series)[0].value).toBe(100);
  });

  it('efterföljande värden är relativa till första — [200, 400] → [100, 200]', () => {
    const series = [
      { timestamp: 1, value: 200 },
      { timestamp: 2, value: 400 },
    ];
    const result = rebaseSeries(series);
    expect(result[0].value).toBe(100);
    expect(result[1].value).toBe(200);
  });

  it('base === 0 → returnerar [] (skyddar mot division med noll)', () => {
    const series = [
      { timestamp: 1, value: 0 },
      { timestamp: 2, value: 100 },
    ];
    expect(rebaseSeries(series)).toEqual([]);
  });

  it('muterar aldrig input-arrayen', () => {
    const series = [
      { timestamp: 1, value: 200 },
      { timestamp: 2, value: 400 },
    ];
    const snapshot = JSON.parse(JSON.stringify(series));
    rebaseSeries(series);
    expect(series).toEqual(snapshot);
  });
});

describe('blendPortfolio', () => {
  it('tom array → returnerar []', () => {
    expect(blendPortfolio([])).toEqual([]);
  });

  it('null → returnerar []', () => {
    expect(blendPortfolio(null)).toEqual([]);
  });

  it('en fond, vikt 1.0 → resultatet är identiskt med rebaseSeries på fondens serie', () => {
    const series = [
      { timestamp: 1, value: 100 },
      { timestamp: 2, value: 200 },
      { timestamp: 3, value: 150 },
    ];
    const result = blendPortfolio([{ series, weight: 1.0 }]);
    expect(result).toEqual(rebaseSeries(series));
  });

  it('två fonder med lika vikter och identiska serier → identiskt med endera fondens rebaserade serie', () => {
    const series = [
      { timestamp: 1, value: 100 },
      { timestamp: 2, value: 200 },
    ];
    const result = blendPortfolio([
      { series: [...series], weight: 1.0 },
      { series: [...series], weight: 1.0 },
    ]);
    expect(result).toEqual(rebaseSeries(series));
  });

  describe('Inner join — kritisk invariant', () => {
    it('bara timestamps som finns i ALLA fonder inkluderas', () => {
      // A: ts=[1,2,3], B: ts=[2,3,4] → resultat ska bara ha ts=[2,3]
      const seriesA = [
        { timestamp: 1, value: 100 },
        { timestamp: 2, value: 110 },
        { timestamp: 3, value: 120 },
      ];
      const seriesB = [
        { timestamp: 2, value: 100 },
        { timestamp: 3, value: 110 },
        { timestamp: 4, value: 120 },
      ];
      const result = blendPortfolio([
        { series: seriesA, weight: 1 },
        { series: seriesB, weight: 1 },
      ]);
      const timestamps = result.map(p => p.timestamp);
      expect(timestamps).toEqual([2, 3]);
    });

    it('ts=1 exkluderas av latestStart-trimmning, ts=4 av inner join', () => {
      const seriesA = [
        { timestamp: 1, value: 100 },
        { timestamp: 2, value: 110 },
        { timestamp: 3, value: 120 },
      ];
      const seriesB = [
        { timestamp: 2, value: 100 },
        { timestamp: 3, value: 110 },
        { timestamp: 4, value: 120 },
      ];
      const result = blendPortfolio([
        { series: seriesA, weight: 1 },
        { series: seriesB, weight: 1 },
      ]);
      const timestamps = result.map(p => p.timestamp);
      expect(timestamps).not.toContain(1);
      expect(timestamps).not.toContain(4);
    });

    it('ingen överlappande timestamp → returnerar []', () => {
      // latestStart = max(1, 2) = 2
      // A trimmas till [{ts:3}], B behåller [{ts:2}] — ingen overlap i inner join
      const seriesA = [
        { timestamp: 1, value: 100 },
        { timestamp: 3, value: 110 },
      ];
      const seriesB = [{ timestamp: 2, value: 100 }];
      const result = blendPortfolio([
        { series: seriesA, weight: 1 },
        { series: seriesB, weight: 1 },
      ]);
      expect(result).toEqual([]);
    });
  });

  describe('Viktnormalisering', () => {
    it('vikter 1 och 3 → 25%/75%, inte 50%/50%', () => {
      // ts=2: 0.25 * 200 + 0.75 * 100 = 125
      const seriesA = [
        { timestamp: 1, value: 100 },
        { timestamp: 2, value: 200 },
      ];
      const seriesB = [
        { timestamp: 1, value: 100 },
        { timestamp: 2, value: 100 },
      ];
      const result = blendPortfolio([
        { series: seriesA, weight: 1 },
        { series: seriesB, weight: 3 },
      ]);
      expect(result[0].value).toBe(100);
      expect(result[1].value).toBe(125);
    });
  });

  describe('latestStart', () => {
    it('latestStart = max av alla fonders första timestamp — trimmar bort tidigare punkter', () => {
      // A börjar vid ts=1, B vid ts=3 → ts=1 ska trimmats bort från A
      const seriesA = [
        { timestamp: 1, value: 100 },
        { timestamp: 3, value: 110 },
        { timestamp: 5, value: 120 },
      ];
      const seriesB = [
        { timestamp: 3, value: 100 },
        { timestamp: 5, value: 110 },
      ];
      const result = blendPortfolio([
        { series: seriesA, weight: 1 },
        { series: seriesB, weight: 1 },
      ]);
      const timestamps = result.map(p => p.timestamp);
      expect(timestamps).not.toContain(1);
      expect(timestamps).toContain(3);
      expect(timestamps).toContain(5);
    });
  });

  it('resultatet är sorterat stigande på timestamp', () => {
    const series = [
      { timestamp: 1, value: 100 },
      { timestamp: 3, value: 110 },
      { timestamp: 2, value: 120 },
    ];
    const result = blendPortfolio([{ series, weight: 1 }]);
    const timestamps = result.map(p => p.timestamp);
    expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
  });

  it('muterar aldrig input', () => {
    const series = [
      { timestamp: 1, value: 100 },
      { timestamp: 2, value: 200 },
    ];
    const snapshot = JSON.parse(JSON.stringify(series));
    blendPortfolio([{ series, weight: 1 }]);
    expect(series).toEqual(snapshot);
  });
});
