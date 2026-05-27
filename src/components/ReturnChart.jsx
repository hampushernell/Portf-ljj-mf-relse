import { portfolioReturn, computePortfolioContext } from "../lib/calculations";
import { ACCENT_A, ACCENT_B, TIME_SPANS, formatKr, fmtPct } from "../lib/utils";
import { COLOR, FONT } from "../lib/tokens";
import SVGChart from "./SVGChart";
import useBreakpoint from "../hooks/useBreakpoint";

export default function ReturnChart({ seriesA, seriesB, showB, selectedSpan, spanMonths, oldestTsA, oldestTsB, onSpanChange, totalA, totalB, latestNavTs }) {
  const retA = portfolioReturn(seriesA);
  const retB = portfolioReturn(seriesB);
  const { isMobile } = useBreakpoint();

  const oldestTs = [oldestTsA, oldestTsB].filter(Boolean).reduce((a, b) => Math.max(a, b), 0);
  const { refNow, startTs, endTs, spanHasFullData, isIncomplete, actualFromStr } =
    computePortfolioContext({ latestNavTs, spanMonths, oldestTs, allSeries: [seriesA, seriesB] });

  return (
    <div style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: isMobile ? "10px" : "14px", padding: isMobile ? "14px 16px" : "22px 24px", animation: "scaleIn 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px", gap: "12px", flexWrap: "wrap", flexDirection: isMobile ? "column" : "row" }}>
        <div>
          <h3 style={{ fontFamily: FONT.family.display, fontSize: "16px", fontWeight: 700, color: COLOR.text.primary, margin: "0 0 8px" }}>Historisk avkastning</h3>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {seriesA.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke={ACCENT_A} strokeWidth="2.5" strokeLinecap="round"/></svg>
                <span style={{ fontSize: "13px", color: COLOR.text.primary, fontFamily: FONT.family.display }}>
                  A: <span style={{ color: retA >= 0 ? COLOR.positive : COLOR.negative, fontWeight: 700 }}>{fmtPct(retA)}</span>
                </span>
                {totalA > 0 && <span style={{ fontSize: "11px", color: COLOR.text.secondary }}>({formatKr(totalA * retA / 100)})</span>}
              </div>
            )}
            {showB && seriesB.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke={ACCENT_B} strokeWidth="2.5" strokeLinecap="round"/></svg>
                <span style={{ fontSize: "13px", color: COLOR.text.primary, fontFamily: FONT.family.display }}>
                  B: <span style={{ color: retB >= 0 ? COLOR.positive : COLOR.negative, fontWeight: 700 }}>{fmtPct(retB)}</span>
                </span>
                {totalB > 0 && <span style={{ fontSize: "11px", color: COLOR.text.secondary }}>({formatKr(totalB * retB / 100)})</span>}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
          <div style={{ overflowX: isMobile ? "auto" : "visible", WebkitOverflowScrolling: "touch" }}>
            <div style={{ display: "flex", gap: "3px", background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "3px", flexWrap: isMobile ? "nowrap" : "wrap", minWidth: isMobile ? "max-content" : undefined }}>
              {TIME_SPANS.map(ts => {
                const full = spanHasFullData(ts);
                return (
                  <button key={ts.label} onClick={() => onSpanChange(ts.label)}
                    title={!full ? "Ofullständig data – Yahoo Finance saknar historik för vald period" : undefined}
                    style={{
                      background: selectedSpan === ts.label ? "rgba(255,255,255,0.12)" : "transparent",
                      border: "none",
                      color: selectedSpan === ts.label ? COLOR.text.primary : full ? COLOR.text.secondary : COLOR.warning,
                      padding: "5px 10px", borderRadius: "6px", cursor: "pointer",
                      fontSize: "11px", fontFamily: FONT.family.display, fontWeight: 600,
                      transition: "all 0.18s", whiteSpace: "nowrap",
                      boxShadow: selectedSpan === ts.label ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
                    }}
                  >{ts.label}{!full ? " ⚠" : ""}</button>
                );
              })}
            </div>
          </div>
          {isIncomplete && actualFromStr && (
            <div style={{ fontSize: "10px", color: COLOR.warning, fontFamily: FONT.family.display }}>
              Data fr.o.m. {actualFromStr} – Yahoo Finance saknar äldre historik
            </div>
          )}
        </div>
      </div>

      <SVGChart seriesA={seriesA} seriesB={seriesB} showB={showB} totalA={totalA} totalB={totalB} />

      {(seriesA.length > 0 || seriesB.length > 0) && (() => {
        const fmtDate = ts => new Date(ts * 1000).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });
        return (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px", padding: "0 2px" }}>
            <span style={{ fontSize: "11px", color: COLOR.text.secondary, fontFamily: FONT.family.body, whiteSpace: "nowrap" }}>
              {fmtDate(startTs)}
            </span>
            <div style={{ flex: 1, position: "relative", height: "12px", display: "flex", alignItems: "center" }}>
              <div style={{ position: "absolute", left: 0, width: "45%", height: "1px", background: "rgba(90,110,138,0.35)" }} />
              <div style={{ position: "absolute", right: 0, width: "45%", height: "1px", background: "rgba(90,110,138,0.35)" }} />
              <div style={{
                position: "absolute", left: "50%", transform: "translateX(-50%)",
                background: "transparent",
                fontSize: "10px", color: COLOR.text.secondary, fontFamily: FONT.family.display,
                fontWeight: 600, whiteSpace: "nowrap",
              }}>
                {selectedSpan}
              </div>
            </div>
            <span style={{ fontSize: "11px", color: COLOR.text.secondary, fontFamily: FONT.family.body, whiteSpace: "nowrap" }}>
              {fmtDate(endTs)}
            </span>
          </div>
        );
      })()}

      {showB && seriesA.length > 0 && seriesB.length > 0 && (() => {
        const diff = retA - retB;
        const winnerCol = diff >= 0 ? ACCENT_A : ACCENT_B;
        const winner    = diff >= 0 ? "A" : "B";
        const refTotal  = totalA > 0 ? totalA : totalB;
        return (
          <div style={{
            marginTop: "16px", padding: "12px 16px",
            background: `rgba(${diff >= 0 ? "0,24,245" : "56,189,248"}, 0.07)`,
            border: `1px solid rgba(${diff >= 0 ? "0,24,245" : "56,189,248"}, 0.2)`,
            borderRadius: "9px", display: "flex", alignItems: "center", gap: "10px",
          }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: winnerCol, flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: COLOR.text.primary, fontFamily: FONT.family.body }}>
              Portfölj <strong style={{ color: winnerCol }}>{winner}</strong> har gett{" "}
              <strong style={{ color: winnerCol }}>{Math.abs(diff).toFixed(1)} %-enheter</strong> högre avkastning under vald period.
              {refTotal > 0 && ` Det motsvarar ${formatKr(Math.abs(refTotal * diff / 100))}.`}
            </span>
          </div>
        );
      })()}
    </div>
  );
}
