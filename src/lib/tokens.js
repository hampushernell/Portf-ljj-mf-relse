// Design tokens — källa för alla färger, typografi, radier, skuggor och spacing.
// Ny kod ska alltid importera härifrån. Äldre kod använder fortfarande utils.js tills refactor sker.

// ── Färger ───────────────────────────────────────────────────────────────────
export const COLOR = {
  bg: {
    base:     "#010911",
    elevated: "#0d1120",
    overlay:  "rgba(0, 0, 0, 0)",
  },

  surface: {
    faint:  "rgba(255,255,255,0.03)",
    0:      "rgba(255,255,255,0.02)",
    1:      "rgba(255,255,255,0.04)",
    hover:  "rgba(255,255,255,0.055)",
    active: "rgba(255,255,255,0.1)",
    tab:    "rgba(255,255,255,0.05)",
    input:  "rgba(255,255,255,0.06)",
  },

  border: {
    subtle:  "rgba(255,255,255,0.07)",
    muted:   "rgba(255,255,255,0.08)",
    default: "rgba(255,255,255,0.12)",
    strong:  "rgba(255,255,255,0.13)",
    input:   "rgba(255,255,255,0.11)",
    circle:  "rgba(255,255,255,0.2)",
    card:    "rgba(255,255,255,0.1)",
  },

  text: {
    primary:   "#f0ede8",
    secondary: "#8494ad",
    muted:     "#94a3b8",
    ghost:     "#55617a",
    subtle:    "#94a3b8",
  },

  tint: {
    positive:       "rgba(110,231,183,0.1)",
    negative:       "rgba(248,113,113,0.1)",
    negativeStrong: "rgba(248,113,113,0.12)",
    warning:        "rgba(251,191,36,0.08)",
    fi:             "rgba(58,154,168,0.12)",
    fallback:       "rgba(148,163,184,0.12)",
  },

  accentA:      "#0018F5",
  accentALight: "#7891ff",
  accentB:      "#38bdf8",

  positive:     "#56ec8d",
  warning:      "#f59e0b",
  warningLight: "#fbbf24",
  negative:     "#f87171",

  fi:       "#3a9aa8",
  fallback: "#94a3b8",
};

// ── Typografi ─────────────────────────────────────────────────────────────────
export const FONT = {
  family: {
    display: "'Syne', sans-serif",
    body:    "'DM Sans', sans-serif",
  },

  size: {
    xxs:   "9px",
    xs:    "10px",
    sm:    "11px",
    md:    "12px",
    base:  "13px",
    lg:    "16px",
    xl:    "17px",
    "2xl": "18px",
    "3xl": "20px",
  },

  weight: {
    light:     300,
    regular:   400,
    medium:    500,
    semibold:  600,
    bold:      700,
    extrabold: 800,
  },

  tracking: {
    tight: "-0.02em",
    wide:  "0.05em",
    wider: "0.06em",
  },
};

// ── Border-radius ─────────────────────────────────────────────────────────────
export const RADIUS = {
  sm:    "4px",
  md:    "6px",
  lg:    "9px",
  xl:    "10px",
  "2xl": "14px",
  "3xl": "16px",
  pill:  "20px",
  full:  "50%",
};

// ── Skuggor ───────────────────────────────────────────────────────────────────
export const SHADOW = {
  card:      "0 2px 8px rgba(0,0,0,0.4)",
  cardHover: "0 0 0 1px rgba(255,255,255,0.07), 0 12px 40px rgba(0,0,0,0.3)",
  tooltip:   "0 4px 20px rgba(0,0,0,0.5)",
  subtle:    "0 2px 6px rgba(0,0,0,0.2)",
  medium:    "0 3px 10px rgba(0,0,0,0.35)",
};

// ── Spacing ───────────────────────────────────────────────────────────────────
export const SPACE = {
  0.5: "2px",
  1:   "4px",
  1.5: "6px",
  2:   "8px",
  2.5: "10px",
  3:   "12px",
  3.5: "14px",
  4:   "16px",
  5:   "20px",
  6:   "24px",
  7:   "26px",
  9:   "36px",
  10:  "40px",
};
