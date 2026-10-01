import { describe, it, expect } from "vitest";
import { referenceTicks, returnExtent, formatTickLabel, zeroLabelSide, withLabelSides } from "../chartTicks.js";
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

const series = values => values.map(value => ({ value }));
const ramp = (n, step) => series(Array.from({ length: n }, (_, i) => 100 + i * step));

describe("zeroLabelSide", () => {
  it("serie som stiger direkt → below", () => {
    expect(zeroLabelSide([ramp(100, 0.5)])).toBe("below");
  });

  it("serie som faller direkt → above", () => {
    expect(zeroLabelSide([ramp(100, -0.5)])).toBe("above");
  });

  it("A stiger och B faller lika mycket → below", () => {
    expect(zeroLabelSide([ramp(100, 0.5), ramp(100, -0.5)])).toBe("below");
  });

  it("tom lista → below", () => {
    expect(zeroLabelSide([])).toBe("below");
  });
});

describe("withLabelSides", () => {
  it("nollan följer zeroSide, uppåt-linje under, nedåt-linje över", () => {
    const ticks = [
      { ret: 0, y: 200, kind: "zero" },
      { ret: 50, y: 80, kind: "ref" },
      { ret: -20, y: 280, kind: "ref" },
    ];
    expect(withLabelSides(ticks, "above").map(t => t.side)).toEqual(["above", "below", "above"]);
  });
});
