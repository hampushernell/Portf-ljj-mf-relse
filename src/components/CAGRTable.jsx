import { useState } from "react";
import { COLOR, FONT } from "../lib/tokens";
import { ANIM, anim } from "../lib/animations";
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
        transition: anim(ANIM.iconRotate),
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
  const [showInfo, setShowInfo] = useState(false);
  const { isMobile } = useBreakpoint();

  if (!portfolios?.length) return null;

  const colW = "64px";
  const grid = `1fr ${colW} ${colW}`;
  const pH = isMobile ? "16px" : "24px";

  const DotPortfolio = ({ color }) => (
    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, flexShrink: 0 }} />
  );
  const DotFund = ({ color }) => (
    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: color, flexShrink: 0 }} />
  );

  const ValCell = ({ v, size = FONT.size.base, muted = false }) => (
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
      animation: anim(ANIM.cardMount),
    }}>
      {/* Header */}
      <div style={{ padding: isMobile ? "14px 16px 16px" : "22px 24px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h3 style={{
            fontFamily: FONT.family.display, fontSize: FONT.size.xl, fontWeight: 700, lineHeight: 1.3,
            color: COLOR.text.primary, margin: "0 0 4px",
          }}>
            Historisk snittavkastning (CAGR)
          </h3>
          <p style={{
            fontFamily: FONT.family.body, fontSize: FONT.size.sm,
            color: COLOR.text.secondary, margin: 0,
          }}>
            Annualiserad avkastning per period
          </p>
        </div>
        <button
          onClick={() => setShowInfo(true)}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: "15px", height: "15px", borderRadius: "50%",
            border: `1px solid ${COLOR.border.circle}`, background: "none",
            color: COLOR.text.secondary, fontSize: FONT.size.xxs, cursor: "pointer", lineHeight: 1,
            fontFamily: FONT.family.display, flexShrink: 0, padding: 0,
          }}
        >?</button>
      </div>

      {showInfo && (
        <div
          onClick={() => setShowInfo(false)}
          style={{
            position: "fixed", inset: 0, background: COLOR.bg.overlay, backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px",
            animation: anim(ANIM.overlayMount),
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: COLOR.bg.elevated, border: `1px solid ${COLOR.border.default}`,
              borderRadius: "16px", padding: "24px", maxWidth: "420px", width: "100%",
              fontFamily: FONT.family.display,
            }}
          >
            <div style={{ fontSize: FONT.size.xl, fontWeight: 700, lineHeight: 1.3, color: COLOR.text.primary, marginBottom: "12px" }}>Vad är CAGR?</div>
            <p style={{ fontSize: FONT.size.base, fontFamily: FONT.family.body, color: COLOR.text.subtle, lineHeight: 1.6, margin: "0 0 16px 0" }}>
              CAGR visar den genomsnittliga årliga avkastningen under en vald period. Beräkningen baseras på dagliga kurser med 100 som startvärde vid periodens början. Om en investering vuxit från 100 kr till 150 kr på 5 år motsvarar det ~8,4% per år i genomsnitt.
            </p>
            <div style={{ height: "1px", background: COLOR.border.muted, margin: "0 0 12px 0" }} />
            <div style={{ fontSize: FONT.size.md, fontFamily: FONT.family.body, color: COLOR.text.subtle, lineHeight: 1.6 }}>
              Formel: (slutvärde / startvärde)^(1 / antal år) − 1
            </div>
          </div>
        </div>
      )}

      {/* Column labels */}
      <div style={{
        display: "grid", gridTemplateColumns: grid,
        padding: `0 ${pH} 8px`,
        borderBottom: `1px solid ${COLOR.border.subtle}`,
      }}>
        {["FOND", "3 ÅR", "MAX"].map((lbl, i) => (
          <span key={lbl} style={{
            fontFamily: FONT.family.display, fontSize: FONT.size.xxs, fontWeight: 600,
            color: COLOR.text.secondary, letterSpacing: "0.04em",
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
                  fontFamily: FONT.family.display, fontSize: FONT.size.base, fontWeight: 700,
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
                    fontFamily: FONT.family.display, fontSize: FONT.size.md, fontWeight: 400,
                    color: COLOR.text.secondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{f.name}</span>
                </div>
                <ValCell v={f.cagr3y} size={FONT.size.md} muted />
                <ValCell v={f.cagrMax} size={FONT.size.md} muted />
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
                fontFamily: FONT.family.display, fontSize: FONT.size.base, fontWeight: 700,
                color: COLOR.text.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{p.name}</span>
              <Chevron open={!!openSet[i]} />
            </div>
            <span style={{
              fontFamily: FONT.family.display, fontSize: FONT.size.base,
              fontWeight: p.cagr3y != null ? 600 : 400,
              color: cagrColor(p.cagr3y), textAlign: "right",
            }}>{fmtCAGR(p.cagr3y)}</span>
            <span style={{
              fontFamily: FONT.family.display, fontSize: FONT.size.base,
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
                  fontFamily: FONT.family.display, fontSize: FONT.size.md, fontWeight: 400,
                  color: COLOR.text.secondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{f.name}</span>
              </div>
              <ValCell v={f.cagr3y} size={FONT.size.md} muted />
              <ValCell v={f.cagrMax} size={FONT.size.md} muted />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
