import { portfolioReturn, computePortfolioContext } from "../lib/calculations";
import { TIME_SPANS, formatKr, fmtFee, fmtPct } from "../lib/utils";
import FundSVGChart from "./FundSVGChart";

export default function FundReturnChart({ fundLines, portfolioSeries, selectedSpan, spanMonths, oldestTsA, onSpanChange, totalA, fee1, latestNavTs }) {
  const retPortfolio = portfolioReturn(portfolioSeries);
  const { refNow, startTs, endTs, spanHasFullData, isIncomplete, actualFromStr } =
    computePortfolioContext({ latestNavTs, spanMonths, oldestTs: oldestTsA, allSeries: [portfolioSeries] });

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "22px 24px", animation: "scaleIn 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "15px", fontWeight: 700, color: "#f0ede8", margin: "0 0 8px" }}>Historisk avkastning</h3>
          {fundLines.length > 1 && portfolioSeries.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" strokeLinecap="round"/></svg>
              <span style={{ fontSize: "12px", color: "#f0ede8", fontFamily: "'Syne', sans-serif" }}>
                Portfölj: <span style={{ color: retPortfolio >= 0 ? "#6ee7b7" : "#f87171", fontWeight: 700 }}>{fmtPct(retPortfolio)}</span>
              </span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
          <div style={{ display: "flex", gap: "3px", background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "3px", flexWrap: "wrap" }}>
            {TIME_SPANS.map(ts => {
              const full = spanHasFullData(ts);
              return (
                <button key={ts.label} onClick={() => onSpanChange(ts.label)}
                  title={!full ? "Ofullständig data" : undefined}
                  style={{
                    background: selectedSpan === ts.label ? "rgba(255,255,255,0.12)" : "transparent",
                    border: "none", color: selectedSpan === ts.label ? "#f0ede8" : full ? "#5a6e8a" : "#6b4c1a",
                    padding: "5px 10px", borderRadius: "6px", cursor: "pointer",
                    fontSize: "11px", fontFamily: "'Syne', sans-serif", fontWeight: 600,
                    transition: "all 0.18s", whiteSpace: "nowrap",
                    boxShadow: selectedSpan === ts.label ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
                  }}
                >{ts.label}{!full ? " ⚠" : ""}</button>
              );
            })}
          </div>
          {isIncomplete && actualFromStr && (
            <div style={{ fontSize: "10px", color: "#b45309", fontFamily: "'Syne', sans-serif" }}>
              Data fr.o.m. {actualFromStr} – Yahoo Finance saknar äldre historik
            </div>
          )}
        </div>
      </div>

      <FundSVGChart lines={fundLines} portfolioSeries={portfolioSeries} showPortfolioLine={fundLines.length > 1} />

      {portfolioSeries.length > 0 && (() => {
        const fmtDate = ts => new Date(ts * 1000).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });
        return (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px", padding: "0 2px" }}>
            <span style={{ fontSize: "11px", color: "#5a6e8a", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>{fmtDate(startTs)}</span>
            <div style={{ flex: 1, position: "relative", height: "12px", display: "flex", alignItems: "center" }}>
              <div style={{ position: "absolute", left: 0, right: 0, height: "1px", background: "rgba(90,110,138,0.35)" }} />
              <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", background: "#090d1a", padding: "0 8px", fontSize: "10px", color: "#5a6e8a", fontFamily: "'Syne', sans-serif", fontWeight: 600, whiteSpace: "nowrap" }}>{selectedSpan}</div>
            </div>
            <span style={{ fontSize: "11px", color: "#5a6e8a", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>{fmtDate(endTs)}</span>
          </div>
        );
      })()}

      {fundLines.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "14px" }}>
          {fundLines.length > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "18px", height: "2.5px", background: "rgba(255,255,255,0.85)", borderRadius: "2px" }} />
              <span style={{ fontSize: "11px", color: "#8a9bb0", fontFamily: "'DM Sans', sans-serif" }}>Portfölj</span>
            </div>
          )}
          {fundLines.map(l => (
            <div key={l.name} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "18px", height: "2px", background: l.color, borderRadius: "2px", opacity: 0.75 }} />
              <span style={{ fontSize: "11px", color: "#8a9bb0", fontFamily: "'DM Sans', sans-serif" }}>{l.name}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginTop: "16px" }}>
        {[
          { lbl: "Total avgift/år", val: fmtFee(fee1), sub: totalA > 0 ? formatKr(totalA * fee1 / 100) + "/år" : null },
          { lbl: `Avkastning (${selectedSpan})`, val: fmtPct(retPortfolio), col: retPortfolio >= 0 ? "#6ee7b7" : "#f87171", sub: totalA > 0 ? formatKr(totalA * retPortfolio / 100) : null },
          { lbl: "Investerat belopp", val: totalA > 0 ? formatKr(totalA) : "–" },
        ].map(({ lbl, val, col, sub }) => (
          <div key={lbl} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "12px 16px" }}>
            <div style={{ fontSize: "9px", color: "#5a6e8a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px", fontFamily: "'Syne', sans-serif" }}>{lbl}</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "17px", fontWeight: 700, color: col || "#f0ede8" }}>{val}</div>
            {sub && <div style={{ fontSize: "10px", color: "#5a6e8a", marginTop: "2px" }}>{sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
