import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { parseUrl, LAST_QUERY_KEY } from "../useUrlSync.js";

// Vitest kör i node — window, history och sessionStorage stubbas per test.
function setup(search, stored = {}) {
  const store = { ...stored };
  const replaceState = vi.fn();
  vi.stubGlobal("window", { location: { search, pathname: "/" } });
  vi.stubGlobal("history", { replaceState });
  vi.stubGlobal("sessionStorage", {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
  });
  return { replaceState };
}

describe("parseUrl med sparat läge", () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it("återställer sparat läge när URL:en saknar parametrar", () => {
    const { replaceState } = setup("", { [LAST_QUERY_KEY]: "a=1:60,8:40&b=3:100&span=3y&mode=compare" });
    const state = parseUrl();
    expect(state.fundsA).toEqual([{ id: 1, pct: 60 }, { id: 8, pct: 40 }]);
    expect(state.fundsB).toEqual([{ id: 3, pct: 100 }]);
    expect(state.span).toBe("3 år");
    expect(state.mode).toBe("compare");
    expect(replaceState).toHaveBeenCalledWith(null, "", "?a=1%3A60%2C8%3A40&b=3%3A100&span=3y&mode=compare");
  });

  it("URL-parametrar vinner över sparat läge", () => {
    const { replaceState } = setup("?a=5:100", { [LAST_QUERY_KEY]: "a=1:100&mode=compare" });
    const state = parseUrl();
    expect(state.fundsA).toEqual([{ id: 5, pct: 100 }]);
    expect(state.mode).toBe("fund");
    expect(replaceState).not.toHaveBeenCalled();
  });

  it("tom lagring ger null", () => {
    setup("", { [LAST_QUERY_KEY]: "" });
    expect(parseUrl()).toBeNull();
  });

  it("saknad nyckel ger null", () => {
    setup("");
    expect(parseUrl()).toBeNull();
  });

  it("trasigt innehåll ger null", () => {
    const { replaceState } = setup("", { [LAST_QUERY_KEY]: "%%%{inte en query" });
    expect(parseUrl()).toBeNull();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it("lagring som kastar ger null", () => {
    setup("");
    vi.stubGlobal("sessionStorage", { getItem: () => { throw new Error("SecurityError"); } });
    expect(parseUrl()).toBeNull();
  });
});
