import { useState, useRef, useCallback, useEffect } from "react";
import { fmtPct } from "../lib/utils";
import { COLOR, FONT, SHADOW } from "../lib/tokens";
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

export default function FundSVGChart({ lines, portfolioSeries, showPortfolioLine = true }) {
  const { isMobile } = useBreakpoint();
  const W = 800, H = isMobile ? 400 : 330, PL = 0, PR = 0, PT = 10, PB = 28;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;

  const allVals = [...lines.flatMap(l => l.series.map(d => d.value)), ...portfolioSeries.map(d => d.value)];
  if (!allVals.length) return null;

  const minV = Math.min(...allVals, 95);
  const maxV = Math.max(...allVals, 105);
  const pad  = (maxV - minV) * 0.12;
  const yMin = minV - pad;
  const yMax = maxV + pad;

  const toX = (i, len) => PL + (i / Math.max(len - 1, 1)) * chartW;
  const toY = v => PT + chartH - ((v - yMin) / (yMax - yMin)) * chartH;
  const makePath = s => s.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i, s.length).toFixed(1)},${toY(d.value).toFixed(1)}`).join(" ");

  const baselineY = toY(100);
  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef(null);
  const GRACE = isMobile ? 0 : 32;

  const refSeries = portfolioSeries.length ? portfolioSeries : lines[0]?.series ?? [];

  useEffect(() => {
    if (isMobile) return;
    const handleGlobalMove = e => {
      if (!svgRef.current || !refSeries.length) return;
      const rect = svgRef.current.getBoundingClientRect();
      const outside =
        e.clientX < rect.left - GRACE ||
        e.clientX > rect.right + GRACE ||
        e.clientY < rect.top - GRACE ||
        e.clientY > rect.bottom + GRACE;
      if (outside) { setTooltip(null); return; }
      const mx = Math.max(0, Math.min(rect.width, e.clientX - rect.left)) * (W / rect.width);
      const pyPct = Math.max(0, Math.min(rect.height, e.clientY - rect.top)) / rect.height * 100;
      const idx = Math.round((mx / chartW) * (refSeries.length - 1));
      const ci = Math.max(0, Math.min(refSeries.length - 1, idx));
      const isLast = ci === refSeries.length - 1;
      setTooltip({
        x: toX(ci, refSeries.length),
        yPct: pyPct,
        timestamp: refSeries[ci]?.timestamp,
        portfolio: portfolioSeries[ci]?.value,
        funds: lines.map(l => {
          const s = l.series;
          const ts = refSeries[ci]?.timestamp;
          const fi = ts != null
            ? s.reduce((best, p, i) => Math.abs(p.timestamp - ts) < Math.abs(s[best].timestamp - ts) ? i : best, 0)
            : Math.min(ci, s.length - 1);
          const value = isLast ? (100 + l.returnValue) : s[fi]?.value;
          return { name: l.name, color: l.color, value };
        }),
      });
    };
    window.addEventListener("mousemove", handleGlobalMove);
    return () => window.removeEventListener("mousemove", handleGlobalMove);
  }, [isMobile, refSeries, portfolioSeries, lines]);

  const handleMouseMove = useCallback(e => {
    if (!isMobile || !svgRef.current || !refSeries.length) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx   = getSVGX(e, svgRef.current) * (W / rect.width);
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const pyPct = (clientY - rect.top) / rect.height * 100;
    const idx  = Math.round(((mx - PL) / chartW) * (refSeries.length - 1));
    const ci   = Math.max(0, Math.min(refSeries.length - 1, idx));
    const isLast = ci === refSeries.length - 1;
    setTooltip({
      x: toX(ci, refSeries.length),
      yPct: pyPct,
      timestamp: refSeries[ci]?.timestamp,
      portfolio: portfolioSeries[ci]?.value,
      funds: lines.map(l => {
        const s = l.series;
        const ts = refSeries[ci]?.timestamp;
        const idx = ts != null
          ? s.reduce((best, p, i) => Math.abs(p.timestamp - ts) < Math.abs(s[best].timestamp - ts) ? i : best, 0)
          : Math.min(ci, s.length - 1);
        const value = isLast ? (100 + l.returnValue) : s[idx]?.value;
        return { name: l.name, color: l.color, value };
      }),
    });
  }, [refSeries, portfolioSeries, lines]);

  const yTicks = Array.from({ length: 5 }, (_, i) => ({ v: yMin + (i / 4) * (yMax - yMin) })).map(t => ({ ...t, y: toY(t.v) }));

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", touchAction: "none" }}
        onMouseMove={handleMouseMove} onMouseLeave={isMobile ? () => setTooltip(null) : undefined}
        onTouchMove={e => { e.preventDefault(); handleMouseMove(e); }}
        onTouchEnd={() => setTooltip(null)}>

        {yTicks.map(({ y }, i) => (
          <line key={i} x1={0} y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
        ))}
        <line x1={0} y1={baselineY} x2={W} y2={baselineY} stroke="rgba(255,255,255,0.24)" strokeWidth="1" strokeDasharray="5 4"/>
        {lines.map(l => {
          if (l.series.length <= 1) return null;
          return (
            <path key={l.color + l.name}
              d={makePath(downsampleForRender(l.series))} fill="none" stroke={l.color}
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              opacity="0.80"
            />
          );
        })}
        {showPortfolioLine && portfolioSeries.length > 1 && (
          <path d={makePath(downsampleForRender(portfolioSeries))} fill="none" stroke="rgba(255,255,255,0.88)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            opacity="1"
          />
        )}
        {yTicks.map(({ v, y }, i) => (
          <text key={i} x={8} y={y + (isMobile ? 18 : 14)} textAnchor="start" fill={COLOR.text.axis} fontSize={isMobile ? 18 : 12} fontFamily={FONT.family.body}>{`${(v - 100).toFixed(0)}%`}</text>
        ))}
        {tooltip && (
          <line x1={tooltip.x} y1={PT} x2={tooltip.x} y2={H - PB} stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
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
          boxShadow: SHADOW.tooltip, maxWidth: "220px",
        }}>
          <div style={{ color: COLOR.text.secondary, fontSize: FONT.size.xs, marginBottom: "6px" }}>
            {tooltip.timestamp ? new Date(tooltip.timestamp * 1000).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" }) : ""}
          </div>
          {tooltip.portfolio != null && showPortfolioLine && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "white", flexShrink: 0 }} />
              <span style={{ color: COLOR.text.primary, fontSize: FONT.size.sm }}>Portfölj: <strong style={{ color: (tooltip.portfolio - 100) >= 0 ? COLOR.positive : COLOR.negative }}>{fmtPct(tooltip.portfolio - 100)}</strong></span>
            </div>
          )}
          {tooltip.funds.map(f => f.value != null && (
            <div key={f.name} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: f.color, flexShrink: 0 }} />
              <span style={{ color: COLOR.text.subtle, fontSize: FONT.size.xs, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {f.name.split(" ").slice(0, 2).join(" ")}: <strong style={{ color: (f.value - 100) >= 0 ? COLOR.positive : COLOR.negative }}>{fmtPct(f.value - 100)}</strong>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
