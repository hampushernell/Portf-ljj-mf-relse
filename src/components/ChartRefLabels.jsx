import { COLOR, FONT } from "../lib/tokens";
import { formatTickLabel } from "../lib/chartTicks";

// Y-axelns referensetiketter som HTML-overlay ovanpå grafens SVG — fast 11px
// oavsett viewBox-skalning. Förälder måste vara position: relative.
export default function ChartRefLabels({ ticks, height }) {
  return ticks.map(({ ret, y, side }) => (
    <div key={ret} style={{
      position: "absolute",
      left: "8px",
      top: `${y / height * 100}%`,
      transform: side === "above" ? "translateY(calc(-100% - 3px))" : "translateY(3px)",
      fontSize: FONT.size.xs,
      fontWeight: 400,
      color: COLOR.text.axis,
      fontFamily: FONT.family.body,
      fontVariantNumeric: "tabular-nums",
      lineHeight: 1,
      pointerEvents: "none",
      whiteSpace: "nowrap",
    }}>
      {formatTickLabel(ret)}
    </div>
  ));
}
