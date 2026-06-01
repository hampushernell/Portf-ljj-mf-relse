import { useState, useRef, useCallback } from "react";
import { fmtPct } from "../lib/utils";
import { COLOR, FONT, SHADOW } from "../lib/tokens";

const getSVGX = (e, svgEl) => {
  const rect = svgEl.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  return clientX - rect.left;
};

export default function FundSVGChart({ lines, portfolioSeries, showPortfolioLine = true }) {
  const W = 800, H = 400, PL = 48, PR = 0, PT = 10, PB = 28;
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

  const refSeries = portfolioSeries.length ? portfolioSeries : lines[0]?.series ?? [];

  const handleMouseMove = useCallback(e => {
    if (!svgRef.current || !refSeries.length) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx   = getSVGX(e, svgRef.current) * (W / rect.width);
    const idx  = Math.round(((mx - PL) / chartW) * (refSeries.length - 1));
    const ci   = Math.max(0, Math.min(refSeries.length - 1, idx));
    const isLast = ci === refSeries.length - 1;
    setTooltip({
      x: toX(ci, refSeries.length),
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
        onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}
        onTouchMove={e => { e.preventDefault(); handleMouseMove(e); }}
        onTouchEnd={() => setTooltip(null)}>

        {yTicks.map(({ v, y }, i) => (
          <g key={i}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
            <text x={PL - 6} y={y + 4} textAnchor="end" fill={COLOR.text.muted} fontSize="10" fontFamily={FONT.family.body}>{`${(v - 100).toFixed(0)}%`}</text>
          </g>
        ))}
        <line x1={PL} y1={baselineY} x2={W - PR} y2={baselineY} stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="5 4"/>
        {lines.map(l => {
          if (l.series.length <= 1) return null;
          return (
            <path key={l.color + l.name}
              d={makePath(l.series)} fill="none" stroke={l.color}
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              opacity="0.80"
            />
          );
        })}
        {showPortfolioLine && portfolioSeries.length > 1 && (
          <path d={makePath(portfolioSeries)} fill="none" stroke="rgba(255,255,255,0.88)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            opacity="1"
          />
        )}
        {tooltip && (
          <>
            <line x1={tooltip.x} y1={PT} x2={tooltip.x} y2={H - PB} stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
            {tooltip.portfolio != null && showPortfolioLine && <circle cx={tooltip.x} cy={toY(tooltip.portfolio)} r="5" fill="white" stroke={COLOR.bg.base} strokeWidth="2"/>}
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
          boxShadow: SHADOW.tooltip, maxWidth: "220px",
        }}>
          <div style={{ color: COLOR.text.secondary, fontSize: "10px", marginBottom: "6px" }}>
            {tooltip.timestamp ? new Date(tooltip.timestamp * 1000).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" }) : ""}
          </div>
          {tooltip.portfolio != null && showPortfolioLine && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "white", flexShrink: 0 }} />
              <span style={{ color: COLOR.text.primary, fontSize: "11px" }}>Portfölj: <strong style={{ color: (tooltip.portfolio - 100) >= 0 ? COLOR.positive : COLOR.negative }}>{fmtPct(tooltip.portfolio - 100)}</strong></span>
            </div>
          )}
          {tooltip.funds.map(f => f.value != null && (
            <div key={f.name} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: f.color, flexShrink: 0 }} />
              <span style={{ color: COLOR.text.subtle, fontSize: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {f.name.split(" ").slice(0, 2).join(" ")}: <strong style={{ color: (f.value - 100) >= 0 ? COLOR.positive : COLOR.negative }}>{fmtPct(f.value - 100)}</strong>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
