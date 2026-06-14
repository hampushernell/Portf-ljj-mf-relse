import { useState, useEffect, useRef } from "react";
import { computeCAGR, seriesYears } from "../lib/calculations";
import { COLOR, FONT, RADIUS } from "../lib/tokens";
import useBreakpoint from "../hooks/useBreakpoint";

function calcFV(annualRate, years, pv, pmt) {
  if (years <= 0) return pv;
  const n = years * 12;
  if (Math.abs(annualRate) < 1e-9) return pv + pmt * n;
  const r = annualRate / 12;
  const factor = Math.pow(1 + r, n);
  return pv * factor + pmt * (factor - 1) / r;
}

const fmtKr  = v => Math.round(v).toLocaleString("sv-SE") + " kr";
const fmtPct = v => (v * 100).toFixed(1).replace(".", ",") + "%";
const fmtFee = v => Number(v).toFixed(2).replace(".", ",") + "%";

const LABEL = {
  display: "block",
  fontFamily: FONT.family.display,
  fontSize: "9px",
  fontWeight: 600,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: COLOR.text.secondary,
  marginBottom: "5px",
};

function PortfolioCard({ label, accent, netCAGR, fee, netFV, grossFV, feeCost, isMobile }) {
  const border = accent === COLOR.accentALight
    ? "rgba(0,24,245,0.33)"
    : "rgba(56,189,248,0.33)";
  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: "transparent",
      border: `1px solid ${border}`,
      borderRadius: "14px",
      padding: isMobile ? "16px" : "20px 22px",
    }}>
      <div style={{ marginBottom: "16px" }}>
        <div style={{
          fontFamily: FONT.family.display, fontSize: "11px", fontWeight: 700,
          letterSpacing: "0.05em", textTransform: "uppercase",
          color: accent, marginBottom: "4px",
        }}>{label}</div>
        <div style={{ fontFamily: FONT.family.body, fontSize: "11px", color: COLOR.text.muted }}>
          CAGR · {fmtPct(netCAGR)} | Avgift {fmtFee(fee)}
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <span style={LABEL}>Slutvärde netto</span>
        <div style={{
          fontFamily: FONT.family.display, fontSize: "22px", fontWeight: 700,
          color: accent, letterSpacing: "-0.01em",
        }}>{fmtKr(netFV)}</div>
      </div>

      <div style={{ borderTop: `1px solid ${COLOR.border.subtle}`, paddingTop: "12px" }}>
        <div style={{ marginBottom: "10px" }}>
          <span style={LABEL}>Utan avgift (uppskattning)</span>
          <div style={{
            fontFamily: FONT.family.display, fontSize: "15px", fontWeight: 600,
            color: COLOR.text.primary,
          }}>{fmtKr(grossFV)}</div>
        </div>
        <div>
          <span style={LABEL}>Avgift</span>
          <div style={{
            fontFamily: FONT.family.display, fontSize: "13px", fontWeight: 600,
            color: COLOR.negative,
          }}>−{fmtKr(feeCost)}</div>
        </div>
      </div>
    </div>
  );
}

export default function FutureValueCalculator({ bundleA, bundleB, feeA, feeB }) {
  const { isMobile } = useBreakpoint();
  const [startAmount, setStartAmount]   = useState("100000");
  const [monthlyAmount, setMonthlyAmount] = useState("2000");
  const [years, setYears]               = useState(20);
  const [showTooltip, setShowTooltip]   = useState(false);
  const tooltipRef = useRef(null);

  const netCAGR_A = computeCAGR(bundleA?.portfolioSeries, seriesYears(bundleA?.portfolioSeries));
  const netCAGR_B = computeCAGR(bundleB?.portfolioSeries, seriesYears(bundleB?.portfolioSeries));

  useEffect(() => {
    if (!showTooltip) return;
    const handler = e => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target))
        setShowTooltip(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTooltip]);

  if (netCAGR_A === null || netCAGR_B === null) return null;

  const pv  = Math.max(0, Number(startAmount)   || 0);
  const pmt = Math.max(0, Number(monthlyAmount) || 0);

  const grossCAGR_A = netCAGR_A + (feeA || 0) / 100;
  const grossCAGR_B = netCAGR_B + (feeB || 0) / 100;

  const netFV_A   = calcFV(netCAGR_A,   years, pv, pmt);
  const netFV_B   = calcFV(netCAGR_B,   years, pv, pmt);
  const grossFV_A = calcFV(grossCAGR_A, years, pv, pmt);
  const grossFV_B = calcFV(grossCAGR_B, years, pv, pmt);
  const feeCost_A = grossFV_A - netFV_A;
  const feeCost_B = grossFV_B - netFV_B;

  const winner     = netFV_A >= netFV_B ? "A" : "B";
  const winnerCol  = winner === "A" ? COLOR.accentA : COLOR.accentB;
  const diff       = Math.abs(netFV_A - netFV_B);

  const inputStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.11)",
    borderRadius: "8px",
    color: COLOR.text.primary,
    fontFamily: FONT.family.display,
    fontSize: "13px",
    fontWeight: 600,
    padding: "9px 14px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div style={{
      background: "transparent",
      border: `1px solid ${COLOR.border.card}`,
      borderRadius: isMobile ? "10px" : "14px",
      padding: isMobile ? "16px" : "22px 24px",
    }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <span style={{ fontFamily: FONT.family.display, fontSize: "9px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: COLOR.text.muted }}>
          Framtidsvärde
        </span>
        <div style={{ position: "relative" }} ref={tooltipRef}>
          <button
            onClick={() => setShowTooltip(v => !v)}
            style={{
              width: "20px", height: "20px",
              borderRadius: "50%",
              background: COLOR.surface[1],
              border: `1px solid ${COLOR.border.subtle}`,
              color: COLOR.text.secondary,
              cursor: "pointer",
              fontFamily: FONT.family.display,
              fontSize: "11px", fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 0,
            }}
          >?</button>
          {showTooltip && (
            <div style={{
              position: "absolute", top: "28px", right: 0, zIndex: 200,
              background: COLOR.bg.elevated,
              border: `1px solid ${COLOR.border.default}`,
              borderRadius: RADIUS.xl,
              padding: "12px 14px",
              width: "min(300px, calc(100vw - 48px))",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
              fontFamily: FONT.family.body,
              fontSize: "12px",
              color: COLOR.text.muted,
              lineHeight: 1.6,
            }}>
              Slutvärde netto beräknas på historisk CAGR efter avgifter — det är alltid så fondutveckling redovisas och branschstandard. Utan avgift är en uppskattning där den viktade avgiften adderats tillbaka till CAGR för att synliggöra avgiftens påverkan. Notera att detta är en förenkling; i praktiken dras avgiften dagligen ur fondvärdet.
            </div>
          )}
        </div>
      </div>

      {/* Inputs */}
      <style>{`
        .fvc-input::-webkit-inner-spin-button,
        .fvc-input::-webkit-outer-spin-button { display: none; -webkit-appearance: none; }
        .fvc-input { -moz-appearance: textfield; }
      `}</style>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "22px", alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 120px", minWidth: "100px" }}>
          <input
            type="number"
            className="fvc-input"
            value={startAmount}
            onChange={e => setStartAmount(e.target.value)}
            placeholder="100 000 kr"
            style={inputStyle}
            min={0}
          />
        </div>
        <div style={{ flex: "1 1 120px", minWidth: "100px" }}>
          <input
            type="number"
            className="fvc-input"
            value={monthlyAmount}
            onChange={e => setMonthlyAmount(e.target.value)}
            placeholder="2 000 kr"
            style={inputStyle}
            min={0}
          />
        </div>
        <div style={{ flex: "2 1 180px", minWidth: "140px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "6px" }}>
            <span style={{ fontFamily: FONT.family.display, fontSize: "9px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: COLOR.text.secondary }}>Tidshorisont</span>
            <span style={{ fontFamily: FONT.family.display, fontSize: "14px", fontWeight: 700, color: COLOR.text.primary }}>{years} år</span>
          </div>
          <input
            type="range"
            min={5} max={30}
            value={years}
            onChange={e => setYears(Number(e.target.value))}
            style={{ width: "100%", accentColor: "rgba(255,255,255,0.3)", cursor: "pointer", height: "4px" }}
          />
        </div>
      </div>

      {/* Portfolio cards */}
      <div style={{ display: "flex", gap: "12px", flexDirection: isMobile ? "column" : "row", marginBottom: "14px" }}>
        <PortfolioCard
          label="Portfölj A" accent={COLOR.accentA}
          netCAGR={netCAGR_A} fee={feeA}
          netFV={netFV_A} grossFV={grossFV_A} feeCost={feeCost_A}
          isMobile={isMobile}
        />
        <PortfolioCard
          label="Portfölj B" accent={COLOR.accentB}
          netCAGR={netCAGR_B} fee={feeB}
          netFV={netFV_B} grossFV={grossFV_B} feeCost={feeCost_B}
          isMobile={isMobile}
        />
      </div>

      {/* Summary row */}
      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.04)",
        borderRadius: "8px",
        padding: "11px 14px",
        fontFamily: FONT.family.body,
        fontSize: "13px",
        color: COLOR.text.muted,
        lineHeight: 1.5,
      }}>
        Portfölj{" "}
        <span style={{ color: winnerCol, fontWeight: 700 }}>{winner}</span>
        {" "}har gett{" "}
        <span style={{ color: COLOR.positive, fontWeight: 700 }}>+{fmtKr(diff)}</span>
        {" "}mer efter {years} år.
      </div>
    </div>
  );
}
