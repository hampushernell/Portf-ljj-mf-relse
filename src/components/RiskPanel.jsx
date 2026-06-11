import { useState } from "react";
import { COLOR, FONT } from "../lib/tokens";
import useBreakpoint from "../hooks/useBreakpoint";

const fmtDd = v => v == null ? "–" : `−${Math.abs(v * 100).toFixed(1)}%`;
const fmtVol = v => v == null ? "–" : `${(v * 100).toFixed(1)}%`;

const ddColor = v => {
  if (v == null) return COLOR.text.secondary;
  if (v > -0.20) return COLOR.positive;
  if (v > -0.35) return COLOR.warning;
  return COLOR.negative;
};

const volColor = v => {
  if (v == null) return COLOR.text.secondary;
  if (v < 0.12) return COLOR.positive;
  if (v < 0.20) return COLOR.warning;
  return COLOR.negative;
};

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

export default function RiskPanel({ compareMode, portfolios }) {
  const [openSet, setOpenSet] = useState({});
  const toggle = i => setOpenSet(prev => ({ ...prev, [i]: !prev[i] }));
  const [showInfo, setShowInfo] = useState(false);
  const { isMobile } = useBreakpoint();

  if (!portfolios?.length) return null;

  const colW = isMobile ? "76px" : "88px";
  const grid = `1fr ${colW} ${colW}`;
  const pH = isMobile ? "16px" : "24px";

  const DotPortfolio = ({ color }) => (
    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, flexShrink: 0 }} />
  );
  const DotFund = ({ color }) => (
    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: color, flexShrink: 0 }} />
  );

  const DdCell = ({ dd, size = "13px", muted = false }) => {
    const { drawdown, timestamp } = dd ?? {};
    if (drawdown == null) {
      return (
        <span style={{ fontFamily: FONT.family.display, fontSize: size, fontWeight: 400, color: COLOR.text.secondary, textAlign: "right", display: "block" }}>–</span>
      );
    }
    const dateStr = timestamp
      ? new Date(timestamp * 1000).toLocaleDateString("sv-SE", { month: "long", year: "numeric" })
      : null;
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <span style={{ fontFamily: FONT.family.display, fontSize: size, fontWeight: 600, color: muted ? COLOR.text.secondary : ddColor(drawdown) }}>
          {fmtDd(drawdown)}
        </span>
        {dateStr && (
          <span style={{ fontSize: "10px", color: COLOR.text.muted, fontFamily: FONT.family.display, marginTop: "1px" }}>
            {dateStr}
          </span>
        )}
      </div>
    );
  };

  const VolCell = ({ vol, size = "13px", muted = false }) => (
    <span style={{
      fontFamily: FONT.family.display, fontSize: size,
      fontWeight: vol != null ? 600 : 400,
      color: muted ? COLOR.text.secondary : volColor(vol),
      textAlign: "right", display: "block",
    }}>
      {fmtVol(vol)}
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
      <div style={{ padding: isMobile ? "14px 16px 16px" : "22px 24px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h3 style={{
            fontFamily: FONT.family.display, fontSize: "16px", fontWeight: 700,
            color: COLOR.text.primary, margin: "0 0 4px",
          }}>
            Riskprofil
          </h3>
          <p style={{
            fontFamily: FONT.family.body, fontSize: "11px",
            color: COLOR.text.secondary, margin: 0,
          }}>
            Max nedgång &amp; volatilitet
          </p>
        </div>
        <button
          onClick={() => setShowInfo(true)}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: "15px", height: "15px", borderRadius: "50%",
            border: `1px solid ${COLOR.border.circle}`, background: "none",
            color: COLOR.text.secondary, fontSize: "9px", cursor: "pointer", lineHeight: 1,
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
            animation: "fadeIn 0.2s ease",
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
            <div style={{ fontSize: "16px", fontWeight: 700, color: COLOR.text.primary, marginBottom: "12px" }}>Riskprofil</div>
            <p style={{ fontSize: "13px", fontFamily: FONT.family.body, color: COLOR.text.subtle, lineHeight: 1.6, margin: "0 0 16px 0" }}>
              <strong style={{ color: COLOR.text.primary }}>Max nedgång</strong> är den största förlusten från en topp till en botten under perioden. Datum anger när botten nåddes. En portfölj som tappade som mest −33% under mars 2020 (covid-kraschen) hade det som sin max nedgång.
            </p>
            <div style={{ height: "1px", background: COLOR.border.muted, margin: "0 0 12px 0" }} />
            <p style={{ fontSize: "13px", fontFamily: FONT.family.body, color: COLOR.text.subtle, lineHeight: 1.6, margin: 0 }}>
              <strong style={{ color: COLOR.text.primary }}>Volatilitet</strong> mäter hur mycket portföljens dagliga avkastning varierar, annualiserad till ett helårsvärde. Hög volatilitet (≥ 20%) innebär stora svängningar — bra och dåliga. Låg volatilitet (&lt; 12%) innebär en jämnare resa.
            </p>
          </div>
        </div>
      )}

      {/* Column labels */}
      <div style={{
        display: "grid", gridTemplateColumns: grid,
        padding: `0 ${pH} 8px`,
        borderBottom: `1px solid ${COLOR.border.subtle}`,
      }}>
        {["FOND", "MAX NEDGÅNG", "VOLATILITET"].map((lbl, i) => (
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
              <DdCell dd={p.maxDrawdown} />
              <VolCell vol={p.volatility} />
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
                <DdCell dd={f.maxDrawdown} size="12px" muted />
                <VolCell vol={f.volatility} size="12px" muted />
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
            <DdCell dd={p.maxDrawdown} />
            <VolCell vol={p.volatility} />
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
              <DdCell dd={f.maxDrawdown} size="12px" muted />
              <VolCell vol={f.volatility} size="12px" muted />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
