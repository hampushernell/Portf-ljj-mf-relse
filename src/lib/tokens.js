// Design tokens — källa för alla färger, typografi, radier, skuggor och spacing.
// Ny kod ska alltid importera härifrån. Äldre kod använder fortfarande utils.js tills refactor sker.

// ── Färger ───────────────────────────────────────────────────────────────────
export const COLOR = {
  bg: {
    base:     "#0a0f1c",
    elevated: "#141a2b",
    overlay:  "rgba(0,0,0,0.45)",
  },

  surface: {
    faint:   "rgba(255,255,255,0.05)",
    0:       "rgba(255,255,255,0.04)",
    1:       "rgba(255,255,255,0.06)",
    hover:   "rgba(255,255,255,0.08)",
    active:  "rgba(255,255,255,0.13)",
    tab:     "rgba(255,255,255,0.07)",
    input:   "rgba(255,255,255,0.08)",
    // fas 5 — strukturerade ytor
    panel:   "rgba(255,255,255,0.04)",  // portföljpanelens bakgrund
    card:    "rgba(255,255,255,0.09)",  // fondkort i listor och modaler
    section: "rgba(255,255,255,0.055)", // sektionsrutor (Fördelning, Portföljsammanfattning)
    stat:    "rgba(255,255,255,0.11)",  // statistikkort inuti sektioner
    sunken:  "#080d19",                 // inmatningsfält (lägre än omgivande yta)
  },

  border: {
    subtle:  "rgba(255,255,255,0.10)",
    muted:   "rgba(255,255,255,0.11)",
    default: "rgba(255,255,255,0.16)",
    strong:  "rgba(255,255,255,0.18)",
    input:   "rgba(255,255,255,0.15)",
    circle:  "rgba(255,255,255,0.24)",
    card:    "rgba(255,255,255,0.14)",
    // fas 5 — fyra hierarkiska kantroller (WCAG 1.4.11, 3:1)
    edge:     "rgba(255,255,255,0.34)", // yttre panelkanter — ~3.07:1 mot bg.base
    inner:    "rgba(255,255,255,0.26)", // sektionskanter inuti paneler
    soft:     "rgba(255,255,255,0.20)", // mjuka separatorer, statkort
    hairline: "rgba(255,255,255,0.12)", // horisontella avdelare i modaler
    modal:    "rgba(255,255,255,0.40)", // modaldialogkanter
  },

  // tre nivåer — primary (värden/namn), secondary (subtext/brödtext), label (etiketter/axlar). Alla klarar 4.5:1 mot COLOR.bg.base.
  text: {
    primary:   "#f0ede8",   // 16,4:1
    secondary: "#cbd5e6",   // 12,9:1
    muted:     "#cbd5e6",   // 12,9:1 — alias för secondary
    subtle:    "#cbd5e6",   // 12,9:1 — alias för secondary
    label:     "#a9b6cc",   //  9,3:1 — versala 11px-etiketter
    axis:      "#a9b6cc",   //  9,3:1 — y-axeletiketter i graferna
    ghost:     "#a9b6cc",   //  9,3:1
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
    xxs:   "11px",
    xs:    "11px",
    sm:    "12px",
    md:    "13px",
    base:  "14px",
    lg:    "16px",
    xl:    "17px",
    "2xl": "19px",
    "3xl": "20px",
    "4xl": "22px",
    "5xl": "24px",
  },

  icon: {
    sm: "18px",
    md: "24px",
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
    wide:  "0.04em",
    wider: "0.05em",
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
