import { useState, useRef, useCallback, useEffect } from "react";
import { ACCENT_A, ACCENT_B, formatKr, fmtPct } from "../lib/utils";
import { COLOR, FONT, SHADOW, CHART } from "../lib/tokens";
import useBreakpoint from "../hooks/useBreakpoint";

const getSVGX = (e, svgEl) => {
  const rect = svgEl.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  return clientX - rect.left;
};

function downsampleForRender(series) {
  const n = series.length;
  const step = n <= 252 ? 1 : n <= 504 ? 2 : n <= 1008 ? 5 : 10;
  if (step === 1) return series;
  const out = [];
  for (let i = 0; i < n; i += step) out.push(series[i]);
  if (out[out.length - 1] !== series[n - 1]) out.push(series[n - 1]);
  return out;
}

export default function SVGChart({ seriesA, seriesB, showB, totalA, totalB }) {
  const { isMobile } = useBreakpoint();
  const C = isMobile ? CHART.mobile : CHART.desktop;
  const { W, H } = C;
  const { PL, PR, PT, PB } = CHART;
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

  const pathA = seriesA.length > 1 ? makePath(downsampleForRender(seriesA)) : null;
  const pathB = showB && seriesB.length > 1 ? makePath(downsampleForRender(seriesB)) : null;

  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const v = yMin + (i / 4) * (yMax - yMin);
    return { v, y: toY(v) };
  });

  const baselineY = toY(100);
  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef(null);
  const GRACE = isMobile ? 0 : 32;

  useEffect(() => {
    if (isMobile) return;
    const handleGlobalMove = e => {
      if (!svgRef.current || !seriesA.length) return;
      const rect = svgRef.current.getBoundingClientRect();
      const outside =
        e.clientX < rect.left - GRACE ||
        e.clientX > rect.right + GRACE ||
        e.clientY < rect.top - GRACE ||
        e.clientY > rect.bottom + GRACE;
      if (outside) { setTooltip(null); return; }
      const mx = Math.max(0, Math.min(rect.width, e.clientX - rect.left)) * (W / rect.width);
      const pyPct = Math.max(0, Math.min(rect.height, e.clientY - rect.top)) / rect.height * 100;
      const idx = Math.round((mx / chartW) * (seriesA.length - 1));
      const clamped = Math.max(0, Math.min(seriesA.length - 1, idx));
      const bIdx = showB && seriesB.length ? Math.min(clamped, seriesB.length - 1) : null;
      setTooltip({
        x: toX(clamped, seriesA.length),
        yPct: pyPct,
        idx: clamped,
        timestamp: seriesA[clamped]?.timestamp,
        vA: seriesA[clamped]?.value,
        vB: bIdx !== null ? seriesB[bIdx]?.value : null,
      });
    };
    window.addEventListener("mousemove", handleGlobalMove);
    return () => window.removeEventListener("mousemove", handleGlobalMove);
  }, [isMobile, seriesA, seriesB, showB]);

  const handleMouseMove = useCallback(e => {
    if (isMobile) {
      if (!svgRef.current || !seriesA.length) return;
      const rect = svgRef.current.getBoundingClientRect();
      const mx = getSVGX(e, svgRef.current) * (W / rect.width);
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const pyPct = (clientY - rect.top) / rect.height * 100;
      const idx = Math.round(((mx - PL) / chartW) * (seriesA.length - 1));
      const clamped = Math.max(0, Math.min(seriesA.length - 1, idx));
      const bIdx = showB && seriesB.length ? Math.min(clamped, seriesB.length - 1) : null;
      setTooltip({
        x: toX(clamped, seriesA.length),
        yPct: pyPct,
        idx: clamped,
        timestamp: seriesA[clamped]?.timestamp,
        vA: seriesA[clamped]?.value,
        vB: bIdx !== null ? seriesB[bIdx]?.value : null,
      });
    }
  }, [isMobile, seriesA, seriesB, showB]);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", touchAction: "none" }}
        onMouseMove={handleMouseMove} onMouseLeave={isMobile ? () => setTooltip(null) : undefined}
        onTouchMove={e => { e.preventDefault(); handleMouseMove(e); }}
        onTouchEnd={() => setTooltip(null)}>
        {yTicks.map(({ y }, i) => (
          <line key={i} x1={0} y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth={C.grid}/>
        ))}
        <line x1={0} y1={baselineY} x2={W} y2={baselineY} stroke="rgba(255,255,255,0.24)" strokeWidth={C.grid} strokeDasharray={C.dash}/>
        {pathA && <path d={pathA} fill="none" stroke={ACCENT_A} strokeWidth={C.stroke} strokeLinecap="round" strokeLinejoin="round"/>}
        {pathB && <path d={pathB} fill="none" stroke={ACCENT_B} strokeWidth={C.stroke} strokeLinecap="round" strokeLinejoin="round"/>}
        {yTicks.map(({ v, y }, i) => (
          <text key={i} x={8} y={y + C.axisDy} textAnchor="start" fill={COLOR.text.axis} fontSize={C.axis} fontFamily={FONT.family.body}>
            {`${(v - 100).toFixed(0)}%`}
          </text>
        ))}
        {tooltip && (
          <line x1={tooltip.x} y1={PT} x2={tooltip.x} y2={H - PB} stroke="rgba(255,255,255,0.15)" strokeWidth={C.grid}/>
        )}
      </svg>
      {tooltip && (
        <div style={{
          position: "absolute",
          top: `calc(${Math.min(tooltip.yPct, 70)}% - 10px)`,
          left: tooltip.x / W * 100 > 60 ? "auto" : `calc(${tooltip.x / W * 100}% + 14px)`,
          right: tooltip.x / W * 100 > 60 ? `calc(${(1 - tooltip.x / W) * 100}% + 14px)` : "auto",
          background: COLOR.bg.elevated, border: `1px solid ${COLOR.border.strong}`,
          borderRadius: "8px", padding: "8px 12px", fontSize: FONT.size.md,
          fontFamily: FONT.family.display, pointerEvents: "none", zIndex: 10,
          boxShadow: SHADOW.tooltip,
        }}>
          <div style={{ color: COLOR.text.secondary, fontSize: FONT.size.xs, marginBottom: "4px" }}>
            {tooltip.timestamp
              ? new Date(tooltip.timestamp * 1000).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" })
              : `Dag ${tooltip.idx}`}
          </div>
          {tooltip.vA && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: tooltip.vB ? "3px" : 0 }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: ACCENT_A }} />
              <span style={{ color: COLOR.text.primary }}>A: <strong style={{ color: (tooltip.vA - 100) >= 0 ? COLOR.positive : COLOR.negative }}>{fmtPct(tooltip.vA - 100)}</strong></span>
              {totalA > 0 && <span style={{ color: COLOR.text.secondary, fontSize: FONT.size.sm }}>{formatKr(totalA * (tooltip.vA - 100) / 100)}</span>}
            </div>
          )}
          {tooltip.vB && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: ACCENT_B }} />
              <span style={{ color: COLOR.text.primary }}>B: <strong style={{ color: (tooltip.vB - 100) >= 0 ? COLOR.positive : COLOR.negative }}>{fmtPct(tooltip.vB - 100)}</strong></span>
              {totalB > 0 && <span style={{ color: COLOR.text.secondary, fontSize: FONT.size.sm }}>{formatKr(totalB * (tooltip.vB - 100) / 100)}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
