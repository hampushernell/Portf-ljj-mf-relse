import { COLOR, FONT } from "../lib/tokens";
import fiFees from "../data/fi-fees.json";

const FI_PUBLISHED = fiFees._meta?.published
  ? new Date(fiFees._meta.published).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" })
  : null;

const FEE_BADGE = {
  fi:       { color: COLOR.fi,       bg: COLOR.tint.fi },
  fallback: { color: COLOR.fallback, bg: COLOR.tint.fallback },
};

export function FeeBadge({ source, period, isManual, updatedAt }) {
  if (!source) return null;
  const style = FEE_BADGE[source];
  if (!style) return null;
  const label = source === "fi" ? "FI" : "Manuell";
  let tooltip;
  if (source === "fi") {
    tooltip = `Förvaltningsavgift från Finansinspektionen · Period: ${period ?? ""}${FI_PUBLISHED ? ` · Publicerad: ${FI_PUBLISHED}` : ""}`;
  } else if (isManual) {
    const dateStr = updatedAt
      ? new Date(updatedAt).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" })
      : null;
    tooltip = `Manuellt tillagd fond · Avgiften är angiven av dig${dateStr ? ` · Senast ändrad: ${dateStr}` : ""}`;
  } else {
    tooltip = "Avgiften saknar FI-data och är manuellt angiven i fondregistret";
  }
  return (
    <span title={tooltip} style={{
      fontSize: FONT.size.xxs, fontFamily: FONT.family.display, fontWeight: 600,
      color: style.color, background: style.bg,
      padding: "1px 5px", borderRadius: "4px", lineHeight: "14px",
      whiteSpace: "nowrap", cursor: "default",
    }}>{label}</span>
  );
}
