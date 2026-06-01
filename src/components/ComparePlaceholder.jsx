import useBreakpoint from "../hooks/useBreakpoint";
import { ACCENT_B } from "../lib/utils";
import { COLOR, FONT } from "../lib/tokens";

export default function ComparePlaceholder({ onClick }) {
  const { isMobile } = useBreakpoint();

  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, minWidth: 0, minHeight: isMobile ? "120px" : "240px", alignSelf: isMobile ? "stretch" : "flex-start",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: "10px", padding: "28px 16px",
        background: "transparent",
        border: "1px dashed rgba(255,255,255,0.14)",
        borderRadius: "14px",
        cursor: "pointer",
        transition: "background 0.2s, border-color 0.2s",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(56,189,248,0.04)"; e.currentTarget.style.borderColor = "rgba(56,189,248,0.30)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"; }}
    >
      <div style={{
        width: "36px", height: "36px", borderRadius: "50%",
        background: "rgba(56,189,248,0.10)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "18px", color: ACCENT_B,
      }}>⇄</div>
      <span style={{ fontSize: "11px", fontWeight: 600, color: COLOR.text.secondary, fontFamily: FONT.family.display, letterSpacing: "0.02em" }}>
        Jämför portfölj
      </span>
    </button>
  );
}
