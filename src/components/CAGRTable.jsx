import { useState } from "react";
import { COLOR, FONT } from "../lib/tokens";
import useBreakpoint from "../hooks/useBreakpoint";

const fmtCAGR = v =>
  v == null ? "–" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;

const cagrColor = v =>
  v == null ? COLOR.text.secondary : v >= 0 ? COLOR.positive : COLOR.negative;

function Chevron({ open }) {
  return (
    <svg
      width="11" height="11" viewBox="0 0 11 11" fill="none"
      style={{
        transition: "transform 0.18s ease",
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
        flexShrink: 0,
      }}
    >
      <path d="M3.5 2l4 3.5-4 3.5" stroke={COLOR.text.secondary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function CAGRTable({ compareMode, portfolios }) {
  const [openSet, setOpenSet] = useState({});
  const toggle = i => setOpenSet(prev => ({ ...prev, [i]: !prev[i] }));
  const { isMobile } = useBreakpoint();

  if (!portfolios?.length) return null;

  const colW = isMobile ? "52px" : "64px";
  const grid = `1fr ${colW} ${colW}`;
  const pH = isMobile ? "16px" : "24px";

  const DotPortfolio = ({ color }) => (
    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, flexShrink: 0 }} />
  );
  const DotFund = ({ color }) => (
    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: color, flexShrink: 0 }} />
  );

  const ValCell = ({ v, size = "13px", muted = false }) => (
    <span style={{
      fontFamily: FONT.family.display,
      fontSize: size,
      fontWeight: v != null ? 600 : 400,
      color: muted ? COLOR.text.secondary : cagrColor(v),
      textAlign: "right",
    }}>
      {fmtCAGR(v)}
    </span>
  );

  return (
    <div style={{
      background: "transparent",
      border: `1px solid ${COLOR.border.card}`,
      borderRadius: isMobile ? "10px" : "14px",
      overflow: "hidden",
      animation: "scaleIn 0.3s ease",
    }}>
      {/* Header */}
      <div style={{ padding: isMobile ? "14px 16px 16px" : "22px 24px 16px" }}>
        <h3 style={{
          fontFamily: FONT.family.display, fontSize: "16px", fontWeight: 700,
          color: COLOR.text.primary, margin: "0 0 4px",
        }}>
          Historisk snittavkastning (CAGR)
        </h3>
        <p style={{
          fontFamily: FONT.family.body, fontSize: "11px",
          color: COLOR.text.secondary, margin: 0,
        }}>
          Annualiserad avkastning per period
        </p>
      </div>

      {/* Column labels */}
      <div style={{
        display: "grid", gridTemplateColumns: grid,
        padding: `0 ${pH} 8px`,
        borderBottom: `1px solid ${COLOR.border.subtle}`,
      }}>
        {["FOND", "3 ÅR", "MAX"].map((lbl, i) => (
          <span key={lbl} style={{
            fontFamily: FONT.family.display, fontSize: "9px", fontWeight: 600,
            color: COLOR.text.secondary, letterSpacing: "0.05em",
            textTransform: "uppercase",
            textAlign: i === 0 ? "left" : "right",
          }}>{lbl}</span>
        ))}
      </div>

      {/* Fund mode */}
      {!compareMode && (() => {
        const p = portfolios[0];
        return (
          <>
            <div style={{
              display: "grid", gridTemplateColumns: grid,
              padding: `10px ${pH}`, alignItems: "center",
              borderBottom: `1px solid ${COLOR.border.subtle}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                <DotPortfolio color={p.color} />
                <span style={{
                  fontFamily: FONT.family.display, fontSize: "13px", fontWeight: 700,
                  color: COLOR.text.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{p.name}</span>
              </div>
              <ValCell v={p.cagr3y} />
              <ValCell v={p.cagrMax} />
            </div>
            {p.funds.map(f => (
              <div key={f.name} style={{
                display: "grid", gridTemplateColumns: grid,
                padding: `8px ${pH}`, alignItems: "center",
                borderBottom: `1px solid ${COLOR.border.subtle}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "24px", minWidth: 0 }}>
                  <DotFund color={f.color} />
                  <span style={{
                    fontFamily: FONT.family.display, fontSize: "12px", fontWeight: 400,
                    color: COLOR.text.secondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{f.name}</span>
                </div>
                <ValCell v={f.cagr3y} size="12px" muted />
                <ValCell v={f.cagrMax} size="12px" muted />
              </div>
            ))}
          </>
        );
      })()}

      {/* Compare mode — accordion */}
      {compareMode && portfolios.map((p, i) => (
        <div key={p.name}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => toggle(i)}
            onKeyDown={e => e.key === "Enter" && toggle(i)}
            style={{
              display: "grid", gridTemplateColumns: grid,
              padding: `11px ${pH}`, alignItems: "center",
              borderBottom: `1px solid ${COLOR.border.subtle}`,
              cursor: "pointer", userSelect: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
              <DotPortfolio color={p.color} />
              <span style={{
                fontFamily: FONT.family.display, fontSize: "13px", fontWeight: 700,
                color: COLOR.text.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{p.name}</span>
              <Chevron open={!!openSet[i]} />
            </div>
            <span style={{
              fontFamily: FONT.family.display, fontSize: "13px",
              fontWeight: p.cagr3y != null ? 600 : 400,
              color: cagrColor(p.cagr3y), textAlign: "right",
            }}>{fmtCAGR(p.cagr3y)}</span>
            <span style={{
              fontFamily: FONT.family.display, fontSize: "13px",
              fontWeight: p.cagrMax != null ? 600 : 400,
              color: cagrColor(p.cagrMax), textAlign: "right",
            }}>{fmtCAGR(p.cagrMax)}</span>
          </div>
          {!!openSet[i] && p.funds.map(f => (
            <div key={f.name} style={{
              display: "grid", gridTemplateColumns: grid,
              padding: `8px ${pH}`, alignItems: "center",
              borderBottom: `1px solid ${COLOR.border.subtle}`,
              background: COLOR.surface.faint,
            }}>
              <div style={{ display: "flex", alignItems: "center", paddingLeft: "24px", minWidth: 0 }}>
                <span style={{
                  fontFamily: FONT.family.display, fontSize: "12px", fontWeight: 400,
                  color: COLOR.text.secondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{f.name}</span>
              </div>
              <ValCell v={f.cagr3y} size="12px" muted />
              <ValCell v={f.cagrMax} size="12px" muted />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
