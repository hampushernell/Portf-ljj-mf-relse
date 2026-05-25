import { describe, it, expect } from 'vitest';
import { getDisplayRange } from './dateRange.js';

describe('getDisplayRange', () => {
  describe('Max', () => {
    it('returnerar startTs null och endTs oförändrat', () => {
      const endTs = Date.UTC(2024, 5, 15) / 1000;
      const result = getDisplayRange('Max', endTs);
      expect(result).toEqual({ startTs: null, endTs });
    });
  });

  describe('endTs passeras alltid igenom oförändrat', () => {
    const endTs = Date.UTC(2024, 5, 15) / 1000;

    it('"1 mån" bevarar endTs', () => expect(getDisplayRange('1 mån', endTs).endTs).toBe(endTs));
    it('"3 mån" bevarar endTs', () => expect(getDisplayRange('3 mån', endTs).endTs).toBe(endTs));
    it('"1 år" bevarar endTs',  () => expect(getDisplayRange('1 år',  endTs).endTs).toBe(endTs));
    it('"3 år" bevarar endTs',  () => expect(getDisplayRange('3 år',  endTs).endTs).toBe(endTs));
  });

  describe('Normalfall — exakt kalenderaritmetik', () => {
    it('"1 mån" − ger exakt 1 kalendermånad bakåt (15 mars → 15 feb)', () => {
      const endTs = Date.UTC(2024, 2, 15) / 1000;
      const result = getDisplayRange('1 mån', endTs);
      expect(result.startTs).toBe(Date.UTC(2024, 1, 15) / 1000);
    });

    it('"3 mån" − ger exakt 3 kalendermånader bakåt (15 jun → 15 mars)', () => {
      const endTs = Date.UTC(2024, 5, 15) / 1000;
      const result = getDisplayRange('3 mån', endTs);
      expect(result.startTs).toBe(Date.UTC(2024, 2, 15) / 1000);
    });

    it('"1 år" − ger exakt 1 kalenderår bakåt (15 jun 2024 → 15 jun 2023)', () => {
      const endTs = Date.UTC(2024, 5, 15) / 1000;
      const result = getDisplayRange('1 år', endTs);
      expect(result.startTs).toBe(Date.UTC(2023, 5, 15) / 1000);
    });

    it('"3 år" − ger exakt 3 kalenderår bakåt (15 jun 2024 → 15 jun 2021)', () => {
      const endTs = Date.UTC(2024, 5, 15) / 1000;
      const result = getDisplayRange('3 år', endTs);
      expect(result.startTs).toBe(Date.UTC(2021, 5, 15) / 1000);
    });
  });

  describe('Månadsslutskantfall — kritiska', () => {
    it('31 jan − 1 mån → 31 dec (förra året), inte 1 jan', () => {
      const endTs = Date.UTC(2024, 0, 31) / 1000;
      const result = getDisplayRange('1 mån', endTs);
      expect(result.startTs).toBe(Date.UTC(2023, 11, 31) / 1000);
    });

    it('31 mars − 1 mån → 29 feb (skottår 2024), inte 3 mars', () => {
      const endTs = Date.UTC(2024, 2, 31) / 1000;
      const result = getDisplayRange('1 mån', endTs);
      expect(result.startTs).toBe(Date.UTC(2024, 1, 29) / 1000);
    });

    it('31 mars − 1 mån → 28 feb (icke-skottår 2023), inte 3 mars', () => {
      const endTs = Date.UTC(2023, 2, 31) / 1000;
      const result = getDisplayRange('1 mån', endTs);
      expect(result.startTs).toBe(Date.UTC(2023, 1, 28) / 1000);
    });

    it('31 mars − 3 mån → 31 dec, inte overflow till jan', () => {
      const endTs = Date.UTC(2024, 2, 31) / 1000;
      const result = getDisplayRange('3 mån', endTs);
      expect(result.startTs).toBe(Date.UTC(2023, 11, 31) / 1000);
    });

    it('29 feb (skottår 2024) − 1 år → 28 feb (icke-skottår 2023)', () => {
      const endTs = Date.UTC(2024, 1, 29) / 1000;
      const result = getDisplayRange('1 år', endTs);
      expect(result.startTs).toBe(Date.UTC(2023, 1, 28) / 1000);
    });
  });
});
