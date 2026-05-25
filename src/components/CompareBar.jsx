import { ACCENT_A, ACCENT_A_LIGHT, ACCENT_B, formatKr } from "../lib/utils";
import { COLOR, FONT } from "../lib/tokens";

export default function CompareBar({ label, val1, val2, unit = "", higherIsBetter = true }) {
  const max  = Math.max(Math.abs(val1), Math.abs(val2), 0.001);
  const w1   = (Math.abs(val1) / max) * 100;
  const w2   = (Math.abs(val2) / max) * 100;
  const b1   = higherIsBetter ? val1 >= val2 : val1 <= val2;
  const disp = v => Math.abs(v) > 999 ? formatKr(v) : `${v.toFixed(1)}${unit}`;
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ fontSize: "10px", color: COLOR.text.secondary, marginBottom: "5px", fontFamily: FONT.family.display, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 1fr", gap: "6px", alignItems: "center" }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ height: "7px", width: `${w1}%`, background: ACCENT_A, borderRadius: "4px", opacity: b1 ? 1 : 0.3, transition: "width 0.5s ease" }} />
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "10px", color: ACCENT_A_LIGHT, fontFamily: FONT.family.display }}>{disp(val1)}</div>
          <div style={{ fontSize: "10px", color: ACCENT_B, fontFamily: FONT.family.display }}>{disp(val2)}</div>
        </div>
        <div>
          <div style={{ height: "7px", width: `${w2}%`, background: ACCENT_B, borderRadius: "4px", opacity: !b1 ? 1 : 0.3, transition: "width 0.5s ease" }} />
        </div>
      </div>
    </div>
  );
}
