export const ACCENT_A       = "#0018F5";
export const ACCENT_A_LIGHT = "#7b93ff";
export const ACCENT_B       = "#38bdf8";
export const BG             = "#090d1a";

export const FUND_COLORS = ["#0018F5","#38bdf8","#6ee7b7","#f59e0b","#f87171","#a78bfa","#84cc16","#facc15","#f472b6","#e879f9"];

export const FUND_ISINS = {
  "0P0001ECQR.ST": "SE0011527613",
  "0P0001CKSU.ST": "FI4000261326",
  "0P0000YVZ3.ST": "SE0005188836",
  "0P0000XAIN.ST": "FI4000046685",
  "0P0001F3XN.ST": "SE0011309707",
  "0P0001Q6FC.ST": "NO0010827280",
  "0P00000LST.ST": "SE0000671919",
  "0P00005U1J.ST": "SE0001718388",
  "0P0001JF8S.ST": "LU2122930915",
  "0P00000K12.ST": "SE0000739195",
  "0P00001DF8.ST": "SE0001466368",
  "0P0000ULAP.ST": "SE0004297927",
  "0P0000J1JM.ST": "SE0002656611",
};

export const TIME_SPANS = [
  { label: "1 mån",  months: 1   },
  { label: "3 mån",  months: 3   },
  { label: "6 mån",  months: 6   },
  { label: "1 år",   months: 12  },
  { label: "3 år",   months: 36  },
  { label: "Max",    months: null },
];

export const formatKr = v => new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(v);
export const fmtFee   = v => `${v.toFixed(2)}%`;
export const fmtPct   = v => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
