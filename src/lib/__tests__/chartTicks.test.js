import { describe, it, expect } from "vitest";
import { referenceTicks, returnExtent, formatTickLabel } from "../chartTicks.js";
import { CHART } from "../tokens.js";

// Speglar y-domänen i SVGChart/FundSVGChart (desktop-geometri, 12 % padding).
function makeToY(values) {
  const { H } = CHART.desktop;
  const chartH = H - CHART.PT - CHART.PB;
  const minV = Math.min(...values, 95);
  const maxV = Math.max(...values, 105);
  const pad = (maxV - minV) * 0.12;
  const yMin = minV - pad, yMax = maxV + pad;
  return v => CHART.PT + chartH - ((v - yMin) / (yMax - yMin)) * chartH;
}

function ticksFor(values) {
  const { maxRet, minRet } = returnExtent(values);
  return referenceTicks(maxRet, minRet, makeToY(values)).map(t => t.ret);
}

describe("referenceTicks", () => {
  it("+14,6 % → [0, +10]", () => {
    expect(ticksFor([100, 104, 109, 114.6])).toEqual([0, 10]);
  });

  it("+183 % → [0, +150]", () => {
    expect(ticksFor([100, 140, 220, 283])).toEqual([0, 150]);
  });

  it("dipp till −31 % och slut +8 % → [0, −30] (+5 för nära nollan)", () => {
    expect(ticksFor([100, 85, 69, 90, 108])).toEqual([0, -30]);
  });

  it("allt negativt (max +2, min −12) → [0, −10]", () => {
    expect(ticksFor([100, 102, 95, 88, 92])).toEqual([0, -10]);
  });

  it("rörelse inom ±4 % → bara [0]", () => {
    expect(ticksFor([100, 104, 96, 101])).toEqual([0]);
  });

  it("nollan är alltid först och ligger på toY(100)", () => {
    const toY = makeToY([100, 150]);
    const [zero] = referenceTicks(50, 0, toY);
    expect(zero).toEqual({ ret: 0, y: toY(100), kind: "zero" });
  });
});

describe("formatTickLabel", () => {
  it("formaterar med tecken, riktigt minus och mellanslag före %", () => {
    expect(formatTickLabel(150)).toBe("+150 %");
    expect(formatTickLabel(0)).toBe("0 %");
    expect(formatTickLabel(-30)).toBe("−30 %");
  });
});
