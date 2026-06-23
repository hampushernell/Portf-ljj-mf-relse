// ─────────────────────────────────────────────────────────────────────────────
// animations.js — Animation system for minportfölj.se
//
// USAGE
//   import { ANIM, DURATION, EASING, anim } from './animations';
//
//   style={{ animation: anim(ANIM.rowMount) }}
//   style={{ transition: anim(ANIM.tab) }}
//
// All animation strings go through anim() — it returns "none" when the user
// has prefers-reduced-motion: reduce set.
//
// KEYFRAMES (defined in src/index.css)
//   fadeSlideUp   — mount for large panels (translateY 12px → 0)
//   scaleIn       — mount for cards/modals (scale 0.985 → 1)
//   slideInLeft   — mount for list rows (translateX -8px → 0)
//   fadeIn        — simple opacity mount
//   fadeOut       — opacity exit (1 → 0)
//   scaleOut      — exit for modals (scale 1 → 0.985)
// ─────────────────────────────────────────────────────────────────────────────

// ── Durationer (ms) ──────────────────────────────────────────────────────────
// Skala: instant → slow. Välj baserat på elementets visuella vikt.
export const DURATION = {
  instant:  80,   // hover-tints, minimala state-changes (färg/opacity)
  fast:    150,   // knappar, badges, dropdown-rader, ikon-rotationer
  base:    220,   // fondkort mount, span-switch (grafdata)
  moderate: 300,  // grafkort, CAGR-tabell, modaldialog
  slow:    380,   // portföljpanel mount
};

// ── Easings ───────────────────────────────────────────────────────────────────
// Tre kurvor. Välj baserat på riktning.
export const EASING = {
  standard:   "ease",                           // hover/state — symmetrisk
  decelerate: "cubic-bezier(0.0, 0.0, 0.2, 1)", // element entering — mjuk inbromsning
  accelerate: "cubic-bezier(0.4, 0.0, 1, 1)",   // element leaving — snabb start
};

// ── Animation-strängar ────────────────────────────────────────────────────────
// Sammansatta strängar redo att användas i style={{ animation: anim(ANIM.x) }}
// eller style={{ transition: anim(ANIM.x) }}.
//
// Konvention:
//   *Mount  — keyframe animation för element som mountas
//   *Out    — keyframe animation för element som unmountas (exit)
//   övriga  — transition-värden för interaktiva state-changes
export const ANIM = {
  // Mount — enter animations
  panelMount:   `fadeSlideUp ${DURATION.slow}ms ${EASING.decelerate}`,       // PortfolioPanel
  cardMount:    `scaleIn ${DURATION.moderate}ms ${EASING.decelerate}`,        // ReturnChart, FundReturnChart, CAGRTable, RiskPanel
  rowMount:     `slideInLeft ${DURATION.base}ms ${EASING.decelerate}`,        // FundRow
  overlayMount: `fadeIn ${DURATION.fast}ms ${EASING.standard}`,               // Modal overlay
  dialogMount:  `scaleIn ${DURATION.moderate}ms ${EASING.decelerate}`,        // Modal dialog
  fadeMount:    `fadeIn ${DURATION.fast}ms ${EASING.standard}`,               // Inline sections (fee summary, etc.)

  // Exit — används med AnimatePresence-mönster eller delayed unmount
  overlayOut:   `fadeOut ${DURATION.fast}ms ${EASING.accelerate}`,            // Modal overlay close
  dialogOut:    `scaleOut ${DURATION.moderate}ms ${EASING.accelerate}`,       // Modal dialog close

  // State / interaktivitet — transition-värden
  hover:        `background ${DURATION.instant}ms ${EASING.standard}`,        // hover på rader, knappar
  hoverColor:   `color ${DURATION.instant}ms ${EASING.standard}`,             // hover på ikoner/text
  tab:          `all ${DURATION.fast}ms ${EASING.standard}`,                  // tab/mode-toggle
  border:       `border-color ${DURATION.fast}ms ${EASING.standard}`,         // panel border on hover
  allFast:      `all ${DURATION.fast}ms ${EASING.standard}`,                  // generisk snabb transition
  allBase:      `all ${DURATION.base}ms ${EASING.standard}`,                  // generisk måttlig transition
  spanSwitch:   `fadeIn ${DURATION.base}ms ${EASING.standard}`,               // graf byter tidsspan
  barWidth:     `width ${DURATION.moderate}ms ${EASING.decelerate}`,          // allokeringsbar
  iconRotate:   `transform ${DURATION.fast}ms ${EASING.standard}`,            // expand/collapse-pilar
};

// ── Reduced-motion helper ─────────────────────────────────────────────────────
// Slå alltid in animation/transition-strängar med anim().
// Returnerar "none" om användaren har prefers-reduced-motion: reduce.
//
// OBS: resultatet cachar sig inte — varje anrop läser om media query.
// Det är avsiktligt: användaren kan ändra inställningen utan reload.
export function anim(token) {
  if (typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return "none";
  }
  return token;
}
