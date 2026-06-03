import { FUNDS_REGISTRY } from "./funds-registry.js";

export const ACCENT_A       = "#0018F5";
export const ACCENT_A_LIGHT = "#7b93ff";
export const ACCENT_B       = "#38bdf8";
export const BG             = "#080e15";

export const FUND_COLORS = ["#0018F5","#38bdf8","#6ee7b7","#f59e0b","#f87171","#a78bfa","#84cc16","#facc15","#f472b6","#e879f9"];

export const ALLOC_SHADES_A = [
  "#dce4ff","#b9c7ff","#96aaff","#7b93ff","#6070e0",
  "#4d5cc2","#3a48a4","#273486","#142068","#000c4a"
];

export const ALLOC_SHADES_B = [
  "#e0f7ff","#baeeff","#94e5ff","#6edcff","#48d3ff",
  "#38bdf8","#22a3da","#0c89bc","#006f9e","#005580"
];

export const FUND_ISINS = Object.fromEntries(FUNDS_REGISTRY.map(f => [f.ticker, f.isin]));

export const MONTH_SECS = 30.44 * 24 * 3600;

export const TIME_SPANS = [
  { label: "1 mån",  months: 1   },
  { label: "3 mån",  months: 3   },
  { label: "1 år",   months: 12  },
  { label: "3 år",   months: 36  },
  { label: "Max",    months: null },
];

export const formatKr = v => new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(v);
export const fmtFee   = v => `${v.toFixed(2)}%`;
export const fmtPct   = v => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
