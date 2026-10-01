import { describe, it, expect } from "vitest";
import { FUNDS_REGISTRY } from "../funds-registry.js";
import { COMPANY_COLORS, getCompanyColor } from "../company-colors.js";

describe("COMPANY_COLORS", () => {
  it.each(FUNDS_REGISTRY.map(f => [f.name, f]))("%s har ett company med färg", (_, fund) => {
    expect(Object.keys(COMPANY_COLORS)).toContain(fund.company);
  });

  it("getCompanyColor kastar för fond utan bolag", () => {
    expect(() => getCompanyColor({ id: 999, name: "Ny fond" })).toThrow();
  });
});
