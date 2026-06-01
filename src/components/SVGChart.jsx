import { useState, useRef, useCallback } from "react";
import { ACCENT_A, ACCENT_B, formatKr, fmtPct } from "../lib/utils";
import { COLOR, FONT, SHADOW } from "../lib/tokens";
import useBreakpoint from "../hooks/useBreakpoint";

const getSVGX = (e, svgEl) => {
  const rect = svgEl.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  return clientX - rect.left;
};

export default function SVGChart({ seriesA, seriesB, showB, totalA, totalB }) {
  const { isMobile } = useBreakpoint();
  const W = 800, H = isMobile ? 400 : 330, PL = 0, PR = 0, PT = 10, PB = 28;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;

  const allVals = [...seriesA.map(d => d.value), ...(showB ? seriesB.map(d => d.value) : [])];
  if (!allVals.length) return null;

  const minV = Math.min(...allVals, 95);
  const maxV = Math.max(...allVals, 105);
  const pad  = (maxV - minV) * 0.12;
  const yMin = minV - pad;
  const yMax = maxV + pad;

  const toX = (i, len) => PL + (i / Math.max(len - 1, 1)) * chartW;
  const toY = v => PT + chartH - ((v - yMin) / (yMax - yMin)) * chartH;

  const makePath = series => series.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i, series.length).toFixed(1)},${toY(d.value).toFixed(1)}`).join(" ");

  const pathA = seriesA.length > 1 ? makePath(seriesA) : null;
  const pathB = showB && seriesB.length > 1 ? makePath(seriesB) : null;

  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const v = yMin + (i / 4) * (yMax - yMin);
    return { v, y: toY(v) };
  });

  const baselineY = toY(100);
  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef(null);

  const handleMouseMove = useCallback(e => {
    if (!svgRef.current || !seriesA.length) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = getSVGX(e, svgRef.current) * (W / rect.width);
    const idx = Math.round(((mx - PL) / chartW) * (seriesA.length - 1));
    const clamped = Math.max(0, Math.min(seriesA.length - 1, idx));
    const bIdx = showB && seriesB.length ? Math.min(clamped, seriesB.length - 1) : null;
    setTooltip({
      x: toX(clamped, seriesA.length),
      idx: clamped,
      timestamp: seriesA[clamped]?.timestamp,
      vA: seriesA[clamped]?.value,
      vB: bIdx !== null ? seriesB[bIdx]?.value : null,
    });
  }, [seriesA, seriesB, showB]);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", touchAction: "none" }}
        onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}
        onTouchMove={e => { e.preventDefault(); handleMouseMove(e); }}
        onTouchEnd={() => setTooltip(null)}>
        {yTicks.map(({ v, y }, i) => (
          <g key={i}>
            <line x1={0} y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
            <text x={8} y={y + (isMobile ? 18 : 14)} textAnchor="start" fill={COLOR.text.muted} fontSize={isMobile ? 16 : 10} fontFamily={FONT.family.body}>
              {`${(v - 100).toFixed(0)}%`}
            </text>
          </g>
        ))}
        <line x1={0} y1={baselineY} x2={W} y2={baselineY} stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="5 4"/>
        {pathA && <path d={pathA} fill="none" stroke={ACCENT_A} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
        {pathB && <path d={pathB} fill="none" stroke={ACCENT_B} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
        {tooltip && (
          <>
            <line x1={tooltip.x} y1={PT} x2={tooltip.x} y2={H - PB} stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
            {tooltip.vA && <circle cx={tooltip.x} cy={toY(tooltip.vA)} r="5" fill={ACCENT_A} stroke={COLOR.bg.base} strokeWidth="2"/>}
            {tooltip.vB && <circle cx={tooltip.x} cy={toY(tooltip.vB)} r="5" fill={ACCENT_B} stroke={COLOR.bg.base} strokeWidth="2"/>}
          </>
        )}
      </svg>
      {tooltip && (
        <div style={{
          position: "absolute", top: "10px",
          left: tooltip.x / W * 100 > 60 ? "auto" : `calc(${tooltip.x / W * 100}% + 10px)`,
          right: tooltip.x / W * 100 > 60 ? `calc(${(1 - tooltip.x / W) * 100}% + 10px)` : "auto",
          background: COLOR.bg.elevated, border: `1px solid ${COLOR.border.strong}`,
          borderRadius: "8px", padding: "8px 12px", fontSize: "12px",
          fontFamily: FONT.family.display, pointerEvents: "none", zIndex: 10,
          boxShadow: SHADOW.tooltip,
        }}>
          <div style={{ color: COLOR.text.secondary, fontSize: "10px", marginBottom: "4px" }}>
            {tooltip.timestamp
              ? new Date(tooltip.timestamp * 1000).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" })
              : `Dag ${tooltip.idx}`}
          </div>
          {tooltip.vA && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: tooltip.vB ? "3px" : 0 }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: ACCENT_A }} />
              <span style={{ color: COLOR.text.primary }}>A: <strong style={{ color: (tooltip.vA - 100) >= 0 ? COLOR.positive : COLOR.negative }}>{fmtPct(tooltip.vA - 100)}</strong></span>
              {totalA > 0 && <span style={{ color: COLOR.text.secondary, fontSize: "11px" }}>{formatKr(totalA * (tooltip.vA - 100) / 100)}</span>}
            </div>
          )}
          {tooltip.vB && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: ACCENT_B }} />
              <span style={{ color: COLOR.text.primary }}>B: <strong style={{ color: (tooltip.vB - 100) >= 0 ? COLOR.positive : COLOR.negative }}>{fmtPct(tooltip.vB - 100)}</strong></span>
              {totalB > 0 && <span style={{ color: COLOR.text.secondary, fontSize: "11px" }}>{formatKr(totalB * (tooltip.vB - 100) / 100)}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
