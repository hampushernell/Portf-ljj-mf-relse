import { buildSeries } from "../lib/calculations";
import { FUND_ISINS, fmtFee, fmtPct } from "../lib/utils";

export default function FundDetailsModal({ funds, accent, accentRgb, label, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#0d1120", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "16px", padding: "28px 28px 24px",
          maxWidth: "640px", width: "100%", maxHeight: "85vh",
          overflow: "auto", position: "relative",
          animation: "scaleIn 0.25s ease",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "16px", fontWeight: 700, color: "#f0ede8", margin: 0 }}>
            {label} – Detaljer & historik
          </h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#5a6e8a", cursor: "pointer", fontSize: "24px", lineHeight: 1, padding: "0 4px", transition: "color 0.2s" }}
            onMouseEnter={e => e.target.style.color = "#f0ede8"}
            onMouseLeave={e => e.target.style.color = "#5a6e8a"}
          >×</button>
        </div>

        <div style={{
          background: `rgba(${accentRgb}, 0.07)`, border: `1px solid rgba(${accentRgb}, 0.22)`,
          borderRadius: "10px", padding: "12px 16px", marginBottom: "22px",
          fontSize: "12px", color: "#8a9bb0", lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif",
        }}>
          Prisdata hämtas från Yahoo Finance och är tillgänglig fr.o.m. mars 2022 för dessa fonder.
          För fullständig historik, besök respektive fondsida via länkarna nedan.
        </div>

        {funds.map(fund => {
          const s1y = buildSeries(fund.prices, 12);
          const ret1y = s1y.length ? s1y[s1y.length - 1].value - 100 : null;
          const oldestDate = fund.prices?.[0]?.timestamp
            ? new Date(fund.prices[0].timestamp * 1000).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" })
            : "–";
          const isin = FUND_ISINS[fund.ticker] || "–";
          const morningstarUrl = `https://www.morningstar.se/se/funds/snapshot/snapshot.aspx?id=${fund.ticker.replace(".ST", "")}`;

          return (
            <div key={fund.id} style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "10px", padding: "14px 16px", marginBottom: "10px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "13px", fontWeight: 700, color: "#f0ede8" }}>{fund.name}</div>
                  <div style={{ fontSize: "11px", color: "#5a6e8a", marginTop: "2px" }}>{fund.category}</div>
                </div>
                <a
                  href={morningstarUrl} target="_blank" rel="noopener noreferrer"
                  style={{
                    fontSize: "11px", color: accent, textDecoration: "none",
                    fontFamily: "'Syne', sans-serif", fontWeight: 600,
                    background: `rgba(${accentRgb}, 0.1)`, padding: "5px 11px",
                    borderRadius: "6px", border: `1px solid rgba(${accentRgb}, 0.3)`,
                    whiteSpace: "nowrap", transition: "background 0.2s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = `rgba(${accentRgb}, 0.2)`}
                  onMouseLeave={e => e.currentTarget.style.background = `rgba(${accentRgb}, 0.1)`}
                >
                  Visa på Morningstar ↗
                </a>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "7px" }}>
                {[
                  { lbl: "ISIN", val: isin, mono: true },
                  { lbl: "Avgift/år", val: fmtFee(fund.fee) },
                  { lbl: "Avk. 1 år", val: ret1y !== null ? fmtPct(ret1y) : "–", color: ret1y !== null ? (ret1y >= 0 ? "#6ee7b7" : "#f87171") : "#5a6e8a" },
                  { lbl: "Data fr.o.m.", val: oldestDate },
                ].map(({ lbl, val, color, mono }) => (
                  <div key={lbl} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "7px", padding: "8px 10px" }}>
                    <div style={{ fontSize: "9px", color: "#5a6e8a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px", fontFamily: "'Syne', sans-serif" }}>{lbl}</div>
                    <div style={{ fontFamily: mono ? "monospace" : "'Syne', sans-serif", fontSize: mono ? "10px" : "12px", fontWeight: 600, color: color || "#f0ede8" }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
