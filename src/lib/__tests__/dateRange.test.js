import { describe, it, expect } from "vitest";
import { getDisplayRange } from "../dateRange.js";

// 2024-03-31 00:00:00 UTC
const END_TS = Date.UTC(2024, 2, 31) / 1000;

describe("getDisplayRange", () => {
  it("Max returnerar { startTs: null, endTs }", () => {
    const result = getDisplayRange("Max", END_TS);
    expect(result).toEqual({ startTs: null, endTs: END_TS });
  });

  it("1 mån räknar korrekt bakåt en månad", () => {
    const { startTs } = getDisplayRange("1 mån", END_TS);
    const start = new Date(startTs * 1000);
    expect(start.getUTCFullYear()).toBe(2024);
    expect(start.getUTCMonth()).toBe(1); // februari
    expect(start.getUTCDate()).toBe(29); // 2024 är skottår
  });

  it("3 mån räknar korrekt bakåt tre månader", () => {
    const { startTs } = getDisplayRange("3 mån", END_TS);
    const start = new Date(startTs * 1000);
    expect(start.getUTCFullYear()).toBe(2023);
    expect(start.getUTCMonth()).toBe(11); // december
    expect(start.getUTCDate()).toBe(31);
  });

  it("1 år räknar korrekt bakåt ett år", () => {
    const { startTs } = getDisplayRange("1 år", END_TS);
    const start = new Date(startTs * 1000);
    expect(start.getUTCFullYear()).toBe(2023);
    expect(start.getUTCMonth()).toBe(2); // mars
    expect(start.getUTCDate()).toBe(31);
  });

  it("3 år räknar korrekt bakåt tre år", () => {
    const { startTs } = getDisplayRange("3 år", END_TS);
    const start = new Date(startTs * 1000);
    expect(start.getUTCFullYear()).toBe(2021);
    expect(start.getUTCMonth()).toBe(2); // mars
    expect(start.getUTCDate()).toBe(31);
  });

  it("månadsslutskantfall: 31 jan − 1 mån ger sista dagen i december", () => {
    const endTs = Date.UTC(2024, 0, 31) / 1000; // 2024-01-31
    const { startTs } = getDisplayRange("1 mån", endTs);
    const start = new Date(startTs * 1000);
    expect(start.getUTCMonth()).toBe(11); // december
    expect(start.getUTCDate()).toBe(31);
  });
});
