import { describe, it, expect } from "vitest";
import {
  MAX_FUNDS_PER_PORTFOLIO, equalWeights, isEvenWeights,
  addFundToSelection, removeFundFromSelection, readSelectionParam, writeSelectionParam,
} from "../compareSelection.js";

const sum = list => list.reduce((s, x) => s + x.pct, 0);

describe("equalWeights / isEvenWeights", () => {
  it("ger heltal som summerar till 100", () => {
    expect(equalWeights(3)).toEqual([34, 33, 33]);
    expect(equalWeights(7).reduce((a, b) => a + b, 0)).toBe(100);
  });
  it("jämnt = max − min ≤ 1", () => {
    expect(isEvenWeights([34, 33, 33])).toBe(true);
    expect(isEvenWeights([33.33, 33.33, 33.34])).toBe(true);
    expect(isEvenWeights([])).toBe(true);
    expect(isEvenWeights([60, 40])).toBe(false);
  });
});

describe("addFundToSelection", () => {
  it("fördelar om jämnt när vikterna är jämna", () => {
    expect(addFundToSelection([], 1)).toEqual([{ id: 1, pct: 100 }]);
    const two = addFundToSelection([{ id: 1, pct: 100 }], 2);
    expect(two).toEqual([{ id: 1, pct: 50 }, { id: 2, pct: 50 }]);
    const three = addFundToSelection(two, 3);
    expect(three.map(x => x.pct)).toEqual([34, 33, 33]);
    expect(sum(three)).toBe(100);
  });

  it("behåller egna vikter och ger nya fonden resten", () => {
    const list = [{ id: 1, pct: 50 }, { id: 2, pct: 30 }, { id: 3, pct: 10 }];
    expect(addFundToSelection(list, 4)).toEqual([...list, { id: 4, pct: 10 }]);
  });

  it("ger 0 när egna vikter redan är 100 eller mer", () => {
    const list = [{ id: 1, pct: 70 }, { id: 2, pct: 30 }];
    expect(addFundToSelection(list, 3).at(-1)).toEqual({ id: 3, pct: 0 });
  });

  it("muterar inte input och lägger inte till dubbletter", () => {
    const list = [{ id: 1, pct: 100 }];
    addFundToSelection(list, 2);
    expect(list).toEqual([{ id: 1, pct: 100 }]);
    expect(addFundToSelection(list, 1)).toBe(list);
  });

  it("stannar vid taket på 10", () => {
    expect(MAX_FUNDS_PER_PORTFOLIO).toBe(10);
    let list = [];
    for (let id = 1; id <= 10; id++) list = addFundToSelection(list, id);
    expect(list).toHaveLength(10);
    expect(sum(list)).toBe(100);
    expect(addFundToSelection(list, 11)).toBe(list);
  });
});

describe("removeFundFromSelection", () => {
  it("lämnar övriga vikter orörda", () => {
    const list = [{ id: 1, pct: 50 }, { id: 2, pct: 30 }, { id: 3, pct: 20 }];
    expect(removeFundFromSelection(list, 2)).toEqual([{ id: 1, pct: 50 }, { id: 3, pct: 20 }]);
    expect(list).toHaveLength(3);
  });
});

describe("readSelectionParam", () => {
  it("läser a ur en query-sträng från URLSearchParams", () => {
    const q = new URLSearchParams({ a: "5:60,7:40", b: "9:100", span: "3y" }).toString();
    expect(readSelectionParam(q)).toEqual([{ id: 5, pct: 60 }, { id: 7, pct: 40 }]);
    expect(readSelectionParam("?a=5:100&mode=fund")).toEqual([{ id: 5, pct: 100 }]);
  });

  it("tål trasiga och tomma query-strängar", () => {
    expect(readSelectionParam(null)).toEqual([]);
    expect(readSelectionParam("")).toEqual([]);
    expect(readSelectionParam("b=1:100")).toEqual([]);
    expect(readSelectionParam("a=%E0%A4%A")).toEqual([]);
    expect(readSelectionParam("a=x:50,3,4:abc,5:150,6:-1,manual_1:50,7:40,7:60,,8:")).toEqual([{ id: 7, pct: 40 }]);
  });
});

describe("writeSelectionParam", () => {
  it("bevarar övriga parametrar oförändrade och i ordning", () => {
    const q = "a=1%3A100&b=2%3A50%2C3%3A50&span=3y&mode=compare&idx=omxs30";
    const out = writeSelectionParam(q, [{ id: 1, pct: 60 }, { id: 4, pct: 40 }]);
    expect(out).toBe("a=1%3A60%2C4%3A40&b=2%3A50%2C3%3A50&span=3y&mode=compare&idx=omxs30");
    const p = new URLSearchParams(out);
    expect(p.get("a")).toBe("1:60,4:40");
    expect(p.get("b")).toBe("2:50,3:50");
  });

  it("lägger till a först när den saknas och tar bort den vid tom lista", () => {
    expect(writeSelectionParam("mode=fund", [{ id: 1, pct: 100 }])).toBe("a=1%3A100&mode=fund");
    expect(writeSelectionParam("a=1%3A100&span=1y", [])).toBe("span=1y");
    expect(writeSelectionParam(null, [])).toBe("");
  });

  it("går runt med readSelectionParam", () => {
    const list = [{ id: 3, pct: 25 }, { id: 9, pct: 75 }];
    expect(readSelectionParam(writeSelectionParam("span=max", list))).toEqual(list);
  });
});
