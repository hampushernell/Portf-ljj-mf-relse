---
name: minportfölj.se
description: Jämför avgifter och historisk avkastning för svenska fonder.
colors:
  abyss-navy: "#090d1a"
  surface-night: "#0d1120"
  electric-cobalt: "#0018f5"
  cobalt-mist: "#7b93ff"
  arctic-sky: "#38bdf8"
  warm-chalk: "#f0ede8"
  steel-slate: "#8494ad"
  neutral-slate: "#94a3b8"
  ghost-ink: "#55617a"
  positive-mint: "#6ee7b7"
  alert-coral: "#f87171"
  warning-amber: "#f59e0b"
  authority-teal: "#3a9aa8"
typography:
  display:
    fontFamily: "'Syne', sans-serif"
    fontSize: "20px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "'Syne', sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "'Syne', sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "'DM Sans', sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "'Syne', sans-serif"
    fontSize: "9px"
    fontWeight: 600
    letterSpacing: "0.05em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "9px"
  xl: "10px"
  "2xl": "14px"
  "3xl": "16px"
  pill: "20px"
  full: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  "2xl": "24px"
components:
  fund-row:
    backgroundColor: "rgba(255,255,255,0.03)"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
  fund-row-hover:
    backgroundColor: "rgba(255,255,255,0.055)"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
  input-default:
    backgroundColor: "rgba(255,255,255,0.06)"
    textColor: "{colors.warm-chalk}"
    rounded: "{rounded.md}"
    padding: "9px 14px"
  button-accent:
    backgroundColor: "rgba(0,24,245,0.07)"
    textColor: "{colors.electric-cobalt}"
    rounded: "{rounded.md}"
    padding: "9px 14px"
  button-accent-hover:
    backgroundColor: "rgba(0,24,245,0.15)"
    textColor: "{colors.electric-cobalt}"
    rounded: "{rounded.md}"
    padding: "9px 14px"
  tab-active:
    backgroundColor: "rgba(255,255,255,0.10)"
    textColor: "{colors.warm-chalk}"
    rounded: "5px"
    padding: "5px 12px"
  tab-default:
    backgroundColor: "transparent"
    textColor: "{colors.steel-slate}"
    rounded: "5px"
    padding: "5px 12px"
  badge-fi:
    backgroundColor: "rgba(58,154,168,0.12)"
    textColor: "{colors.authority-teal}"
    rounded: "{rounded.sm}"
    padding: "1px 5px"
  badge-fallback:
    backgroundColor: "rgba(148,163,184,0.12)"
    textColor: "{colors.neutral-slate}"
    rounded: "{rounded.sm}"
    padding: "1px 5px"
---

# Design System: minportfölj.se

## 1. Overview

**Creative North Star: "The Clarity Terminal"**

minportfölj.se feels like a precision instrument someone built for themselves — dark, fast, zero decorative noise. Every surface is purposefully dim so the data can speak at full volume. The interface doesn't try to impress; it tries to answer. When a user opens the tool, the question is already posed. The design's job is to get out of the way and let the numbers close it.

The palette is almost exclusively dark navy with restrained semi-transparent layering. Two accent colors — Electric Cobalt for Portfolio A, Arctic Sky for Portfolio B — do the only chromatic work. They appear on interactive elements, chart lines, and accent glows. Nothing else competes. Positive returns are Mint, negative are Coral — semantic, not decorative.

Typography pairs Syne (sharp, confident, slightly angular) for all UI chrome, labels, and headings with DM Sans (warm, readable, humanist) for body copy. The combination avoids both the bank-heaviness of pure serif and the sterile genericness of pure geometric sans. Syne carries the interface's voice; DM Sans carries its content.

This system explicitly rejects: storbankernas tunga byråkratidesign, generiska SaaS-dashboards med blå gradienter och hero-metrics, gamifierade fintech-appar med confetti och streaks, reklamtunga jämförelsesajter med sponsrade placeringar.

**Key Characteristics:**
- Dark by mission: dim surfaces reduce cognitive load so numerical differences read clearly
- Two-voice typography: Syne for chrome, DM Sans for content — never reversed
- Accent restraint: Electric Cobalt and Arctic Sky appear on ≤20% of any surface; their rarity is the signal
- Functional elevation: depth is communicated through tonal layering and selective accent glow, not structural shadow stacking
- Uppercase labels with wide tracking (0.05–0.06em) anchor every data section

## 2. Colors: The Terminal Palette

A near-monochromatic dark field interrupted only by two precise accent signals.

### Primary
- **Electric Cobalt** (`#0018f5`): Portfolio A accent. Chart line, active tab glow, action buttons for the primary portfolio. Used at reduced opacity (7–18%) as tinted surface backgrounds. Never used decoratively.
- **Cobalt Mist** (`#7b93ff`): Electric Cobalt's readable lighter form. Used for Portfolio A value display, labels that need to read against dark surfaces without full cobalt saturation.

### Secondary
- **Arctic Sky** (`#38bdf8`): Portfolio B accent. Chart line, compare-mode tab glow. Semantically opposed to Electric Cobalt; the two never appear in the same role on the same surface.

### Tertiary
- **Authority Teal** (`#3a9aa8`): FI (Finansinspektionen) source badge. Communicates institutional verification. Used exclusively in fee provenance contexts.
- **Positive Mint** (`#6ee7b7`): Positive return values in tooltips and legends.
- **Alert Coral** (`#f87171`): Negative return values, error states.
- **Warning Amber** (`#f59e0b`): Data quality warnings, stale-data indicators.

### Neutral
- **Abyss Navy** (`#090d1a`): The page background. Never used as a component background — only the canvas itself.
- **Surface Night** (`#0d1120`): Elevated surfaces: modals, dropdown menus, tooltip panels. The step above Abyss Navy.
- **Warm Chalk** (`#f0ede8`): Primary text. Slightly warm to avoid clinical harshness against the navy field.
- **Steel Slate** (`#8494ad`): Secondary text: labels, captions, subordinate metadata. The most-used neutral after Warm Chalk.
- **Neutral Slate** (`#94a3b8`): Tertiary text: modal body copy, Manuell badge color. One step lighter than Steel Slate.
- **Ghost Ink** (`#55617a`): Disclaimer text at the page bottom. Intentionally subdued — present for compliance, not prominence.

### Named Rules
**The Two-Accent Rule.** Electric Cobalt and Arctic Sky are the only saturated colors in the system. Every other chromatic touch (Positive Mint, Alert Coral, Authority Teal) is semantic, not decorative. Adding a third decorative accent is forbidden.

**The Opacity Stack Rule.** Component backgrounds are never solid colors — they are semi-transparent white layers on top of the dark field (`rgba(255,255,255,0.02–0.10)`). This ensures surfaces remain coherent at any depth without maintaining a parallel set of background color tokens.

**The Contrast Floor Rule.** All text under 18px måste nå minst 4.5:1 mot bg.base. Nya textfärger valideras innan de läggs till.

## 3. Typography

**Display Font:** Syne (Google Fonts, wght 400–800)
**Body Font:** DM Sans (Google Fonts, wght 300–500)

**Character:** Syne's slightly angular letterforms read as deliberate and confident without tipping into aggressive. DM Sans is warm and legible at small sizes — the two together read as "a sharp tool built by someone who cares about the details."

### Hierarchy
- **Display** (800, 20px, line-height 1.1, tracking -0.02em): Page title "MinPortfölj". One instance per page.
- **Headline** (700, 16px, line-height 1.3): Panel headers ("Portfölj A", "Historisk avkastning"). Section anchors.
- **Title** (600–700, 13px, line-height 1.4): Fund names in rows, modal section headers, stat values. The workhorse of UI text.
- **Body** (DM Sans 400, 13px, line-height 1.6): Modal explanatory copy. Never used for UI chrome. Max line length 65ch.
- **Label** (600, 9px, uppercase, tracking 0.05–0.06em): All data labels ("Avgift/år", "Andel %", section labels in summaries). Syne uppercase at 9px with wide tracking functions as a unit marker, not a heading.

### Named Rules
**The Chrome/Content Split Rule.** Syne carries all interface chrome: buttons, tabs, labels, headings, fund names, badges, tooltips. DM Sans carries all explanatory prose: modal body text, fee source descriptions. Swapping this — DM Sans on a tab label, Syne on a paragraph — breaks the system's voice.

**The Label Contract.** Every data field is preceded by an uppercase Syne label at 9px with letter-spacing 0.05em and color Steel Slate. The label names the unit; the value below it names the number. This pattern is non-negotiable — unlabelled data fields are prohibited.

## 4. Elevation

The system uses **hybrid tonal elevation**: surfaces stack via dark opacity layers, not via background-color steps. Shadows exist but are ambient and restrained — they signal interactivity rather than announcing architectural hierarchy. The exception is the portfolio panel's accent glow, which is the one structural elevation tool that carries meaning.

No surface in this system uses a raised white-background card on a light page. All elevation happens in the dark direction: the base is `#090d1a`; the first elevated tier is `#0d1120` (modals, dropdowns, tooltips); interactive components float above the page surface via semi-transparent white overlays (`rgba(255,255,255,0.02–0.10)`).

### Shadow Vocabulary
- **Ambient micro** (`0 2px 6px rgba(0,0,0,0.2)`): Fund rows. Whisper-level. Separates list items from the background without weight.
- **Ambient low** (`0 2px 8px rgba(0,0,0,0.4)`): Panel cards. Positions the panel in the visual hierarchy.
- **Ambient mid** (`0 3px 10px rgba(0,0,0,0.35)`): Stat cards inside panel summaries.
- **Ambient high** (`0 4px 20px rgba(0,0,0,0.5)`): Tooltip. The highest-priority floating element; shadow communicates urgency.
- **Deep lift** (`0 6px 24px rgba(0,0,0,0.5)`): Fee summary section. Heavier shadow for the heaviest content card.
~~**Cobalt glow** — removed. The accent glow on portfolio panels has been replaced by accent-tinted backgrounds (see Portfolio Panel).~~

### Named Rules
**The Tint-Is-Identity Rule.** Portfolio panels use an accent-tinted background (`rgba(accentRgb, 0.045)`) instead of colored glows. The tint is barely perceptible but sufficient to establish identity between A and B. Colored box-shadows on panels are forbidden — elevation is handled by ambient shadows only.

**The Flat-by-Default Rule.** Elements are flat at rest unless elevation is necessary for layering context (tooltips, modals, dropdowns). Shadows and glows are a response to state or depth — not a default styling choice.

## 5. Components

### Inputs / Search
Restrained and functional. The field signals availability through a barely-visible semi-transparent fill and a thin border. Focus state is owned by the application (outline: none), making focus ring treatment a future accessibility debt to address.
- **Shape:** Gently curved (8px radius)
- **Background:** `rgba(255,255,255,0.05–0.06)` — almost invisible fill
- **Border:** `1px solid rgba(255,255,255,0.11–0.13)` — visible but dim
- **Text:** Warm Chalk (13px Syne); placeholder in Steel Slate
- **Disabled:** Text color shifts to Steel Slate; no fill change

### Tabs / Mode Toggles
Grouped inside a pill-shaped container (`rgba(255,255,255,0.05)`, 7px radius). Individual tabs use 5px radius. Active tab gets `rgba(255,255,255,0.10)` background and Warm Chalk text. Inactive tabs are transparent with Steel Slate text. Transition: `all 0.2s`.

### Buttons (accent-tinted)
Not filled buttons — opacity-tinted with accent border. The accent color bleeds through at 7% fill, border at 25% opacity. On hover, the fill deepens to 15%. Font: Syne 600 12px. Shape: 8px radius. Used for secondary CTA ("Visa fullständig historik").

**The Ghost-Over-Filled Rule.** Fully filled buttons (solid Electric Cobalt background) do not exist in this system. Buttons are always tinted ghosts. The accent is strong enough at partial opacity; a filled button would overpower the dark surface.

### Fund Row
The signature component. A grid row (`1fr 100px 90px 26px`) with a semi-transparent card feel.
- **Background at rest:** `rgba(255,255,255,0.03)`
- **Background on hover:** `rgba(255,255,255,0.055)`
- **Border:** `1px solid rgba(255,255,255,0.07)`
- **Radius:** 9px — slightly rounder than inputs to read as a "card" not a "field"
- **Shadow:** ambient micro (`0 2px 6px rgba(0,0,0,0.2)`)
- **Entrance animation:** `slideInLeft 0.22s ease` — translates from -8px on mount
- Contains: color dot (fund identifier), fund name (Syne 600 13px Warm Chalk), subtitle (DM Sans or Syne 11px Steel Slate), input field, calculated value field, remove button

### Source Badges (FI / Manuell)
Inline pill badges at 9px Syne 600 uppercase.
- **FI:** Authority Teal text on `rgba(58,154,168,0.12)` background, 4px radius
- **Manuell:** Neutral Slate text on `rgba(148,163,184,0.12)` background, 4px radius
- Appear inline with fund subtitle. Tappable (has tooltip via `title` attribute).

### Dropdown (Search Results)
Elevated to Surface Night (`#0d1120`), 8px radius, `rgba(255,255,255,0.13)` border, `z-index: 200`. Each result row: 9px 14px padding, `1px solid rgba(255,255,255,0.06)` bottom border, hover at `rgba(255,255,255,0.09)`. `transition: background 0.12s`. The "add manually" action row sits at the bottom separated by a muted divider.

### Tooltip (Chart)
Elevated card on Surface Night, 8px radius, `rgba(255,255,255,0.13)` border, shadow ambient-high. Följer muspekaren/fingret vertikalt (klämt till max 70% av höjden). Flips left/right vid 60% x-axelmark. På desktop stängs via globalt `window` mousemove-lyssnare med 32px grace-zon — möjliggör att slutpunkten nås vid kant-till-kant-design. På mobil stängs via `touchEnd`. Innehåller: datum (10px Steel Slate), en rad per portfölj med färgpunkt (7px), label, returvärde (Mint/Coral), kr-värde (Steel Slate 11px). Inga cirkelmarkörer på graflinjen.

### Portfolio Panel
The primary structural container. Accent-tinted background (`rgba(accentRgb, 0.045)`) — A gets Electric Cobalt tint, B gets Arctic Sky tint — accent-colored border (`{accent}33` — accent at 20% opacity), 14px radius, ambient-low shadow. On mouse enter, border brightens slightly; no glow. Animation: `fadeSlideUp 0.35s ease` on mount.

### Modal Overlay
All modals share a consistent overlay pattern: `position: fixed`, `inset: 0`, `z-index: 1000`, `background: rgba(0,0,0,0.3)` (COLOR.bg.overlay), `backdropFilter: "blur(4px)"`, centered content via flex, `padding: "20px"` (edge clearance on mobile), `animation: "fadeIn 0.2s ease"`. Clicking the overlay closes the modal; the inner dialog stops propagation. This pattern applies to FundDetailsModal, ManualFundModal, and the fee info overlay in PortfolioPanel — every modal in the system.

### Chart Card (ReturnChart / FundReturnChart)
Transparent background, `1px solid rgba(255,255,255,0.10)` border, 14px radius, `overflow: hidden`. Header (titel, legend, span-knappar) har intern padding `22px 24px 16px` desktop / `14px 16px 16px` mobil. SVG-grafen blöder kant-till-kant utan horisontell padding. Footer (datumrad, jämförelsebar) har padding `10px 24px 22px` desktop. Animation: `scaleIn 0.3s ease` on mount.

**SVG:** `viewBox="0 0 800 H"`, `H=330` desktop / `H=400` mobil. `PL=PR=0` — linjer och gridlinjer löper från x=0 till x=W. Y-axeletiketter inuti grafen (`x=8`, under gridlinjen), fontSize `10` desktop / `16` mobil. Strokewidth `1.5` i båda lägena.

## 6. Animation System

All animation and transition values are defined in `src/lib/animations.js`. **Never hardcode duration strings or keyframe names in component files.**

### Tokens

**DURATION (ms):**
- `instant` (80): hover-tints, färg/opacity state-changes
- `fast` (150): knappar, badges, dropdown-rader, ikon-rotationer
- `base` (220): fondkort mount, span-switch
- `moderate` (300): grafkort, CAGR-tabell, modaldialog
- `slow` (380): portföljpanel mount

**EASING:**
- `standard` — `ease` — hover/state, symmetrisk
- `decelerate` — `cubic-bezier(0.0, 0.0, 0.2, 1)` — entering, mjuk inbromsning
- `accelerate` — `cubic-bezier(0.4, 0.0, 1, 1)` — leaving, snabb start

### Keyframes (src/index.css)

| Keyframe | Används för |
|----------|-------------|
| `fadeSlideUp` | PortfolioPanel mount |
| `scaleIn` | ReturnChart, FundReturnChart, CAGRTable, RiskPanel, modaldialog |
| `slideInLeft` | FundRow mount |
| `fadeIn` | Modal overlay, inline sections |
| `fadeOut` | Modal overlay close (exit) |
| `scaleOut` | Modal dialog close (exit) |

### ANIM tokens → komponentmapping

| Token | Komponent |
|-------|-----------|
| `ANIM.panelMount` | PortfolioPanel |
| `ANIM.cardMount` | ReturnChart, FundReturnChart, CAGRTable, RiskPanel |
| `ANIM.rowMount` | FundRow |
| `ANIM.overlayMount` | Alla modal overlays |
| `ANIM.dialogMount` | Alla modal dialogs |
| `ANIM.fadeMount` | Inline sections (fee summary, header-elements) |
| `ANIM.overlayOut` | Modal overlay close |
| `ANIM.dialogOut` | Modal dialog close |
| `ANIM.hover` | Hover background på rader/knappar |
| `ANIM.hoverColor` | Hover på ikoner/text |
| `ANIM.tab` | Tab/mode-toggle |
| `ANIM.spanSwitch` | Graf byter tidsspan |
| `ANIM.barWidth` | Allokeringsbar width |
| `ANIM.iconRotate` | Expand/collapse-pilar |

### Reduced-motion regel

**The Motion-Is-Optional Rule.** Alla animation/transition-strängar slås in med `anim()` från `animations.js`. `anim()` returnerar `"none"` om `prefers-reduced-motion: reduce` är satt. Ingen animation i systemet är obligatorisk för funktionalitet — de är alla visuell feedback, aldrig bärare av information.

### Named Rules

**The Token-First Rule.** Hårdkodade animation-strängar (`"0.2s ease"`, `"fadeIn 0.3s"` etc.) är förbjudna i komponentfiler. Använd alltid `ANIM.*`, `DURATION.*` eller `EASING.*`.

**The Decelerate-on-Enter Rule.** Alla mount-animationer använder `EASING.decelerate`. Ingenting enters med `ease-in` (det läser som en kollision). Exit-animationer använder `EASING.accelerate`.

**The No-Spring Rule.** Spring-easing (overshoot-kurvor) används inte. De bryter mot "The Clarity Terminal"-känslan. Alla rörelser är avsiktliga och stannar exakt vid sin målposition.

## 7. Do's and Don'ts

### Do:
- **Do** use uppercase Syne labels (9px, 0.05em tracking, Steel Slate) above every data field. This is the universal anchoring pattern.
- **Do** use `rgba(255,255,255, N)` for all surface backgrounds. Components layer above `#090d1a`, never replace it.
- **Do** color positive return values `#6ee7b7` (Positive Mint) and negative return values `#f87171` (Alert Coral) — everywhere, consistently.
- **Do** use `slideInLeft 0.22s ease` for list items that mount dynamically. Motion confirms that something was added, not just appeared.
- **Do** keep Syne on all UI chrome (buttons, tabs, labels, tooltips, fund names). DM Sans belongs only in explanatory prose.
- **Do** limit saturated color to Electric Cobalt and Arctic Sky. Every other hue in the system is semantic (Mint = positive, Coral = error, Teal = verified).

### Don't:
- **Don't** use storbankernas tunga byråkratidesign: compliance banners, legal-text overflow, multiple competing CTAs, heavy borders that demarcate sections rather than let content breathe.
- **Don't** use generiska SaaS-dashboards: blå gradienter, hero-metrics with large isolated numbers, identical card grids with icon + heading + text.
- **Don't** use gamifierade fintech-appar patterns: confetti, progress streaks, push-moment celebrations, engagement-loop design.
- **Don't** use reklamtunga jämförelsesajter patterns: sponsored slots, badge proliferation, promotional color in data contexts.
- **Don't** use `border-left` greater than 1px as a colored stripe accent on any card, row, or callout. Use full borders or background tints instead.
- **Don't** use gradient text (`background-clip: text`). Return values use Mint and Coral as solid colors. Emphasis via weight, not gradient.
- **Don't** add a third decorative accent color. The Two-Accent Rule is structural.
- **Don't** fill a button with solid Electric Cobalt. Buttons are always tinted ghosts. The Ghost-Over-Filled Rule applies system-wide.
- **Don't** put DM Sans on a tab, badge, label, or button — only Syne. The Chrome/Content Split Rule has no exceptions.
- **Don't** show a number without an uppercase label naming the unit. Unlabelled data is ambiguous and breaks the Label Contract.
