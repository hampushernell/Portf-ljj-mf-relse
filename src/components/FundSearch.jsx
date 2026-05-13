import { useState } from "react";
import { fmtFee } from "../lib/utils";
import ManualFundModal from "./ManualFundModal";

export default function FundSearch({ onAdd, excluded, allFunds, loading, onSaveManualFund }) {
  const [q, setQ] = useState("");
  const [activeIdx, setActiveIdx] = useState(-1);
  const [showManualModal, setShowManualModal] = useState(false);

  const results = q.length > 1
    ? allFunds.filter(f => !excluded.includes(f.id) && (
        f.name.toLowerCase().includes(q.toLowerCase()) ||
        (f.ticker || "").toLowerCase().includes(q.toLowerCase()) ||
        (f.category || "").toLowerCase().includes(q.toLowerCase())
      )).slice(0, 6)
    : [];

  const showDropdown = q.length > 0;
  const pick = f => { onAdd(f); setQ(""); setActiveIdx(-1); };

  const handleKeyDown = e => {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = results[activeIdx] ?? results[0];
      if (target) pick(target);
    } else if (e.key === "Escape") {
      setQ(""); setActiveIdx(-1);
    }
  };

  return (
    <div style={{ position: "relative", marginBottom: "12px" }}>
      <input type="text"
        placeholder={loading ? "Laddar fonddata…" : "Sök fond, kategori eller ticker…"}
        value={q}
        onChange={e => { setQ(e.target.value); setActiveIdx(-1); }}
        onKeyDown={handleKeyDown}
        disabled={loading}
        style={{
          width: "100%", boxSizing: "border-box",
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.13)",
          borderRadius: "8px", color: loading ? "#5a6e8a" : "#f0ede8", fontSize: "13px",
          padding: "9px 14px", outline: "none", fontFamily: "'Syne', sans-serif",
        }}
      />
      {showDropdown && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#0d1120", border: "1px solid rgba(255,255,255,0.13)",
          borderRadius: "8px", zIndex: 200, overflow: "hidden",
        }}>
          {results.map((f, i) => (
            <div key={f.id} onClick={() => pick(f)}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(-1)}
              style={{
                padding: "9px 14px", cursor: "pointer",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: i === activeIdx ? "rgba(255,255,255,0.09)" : "transparent",
                transition: "background 0.12s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "13px", color: "#f0ede8", fontFamily: "'Syne', sans-serif" }}>
                  {f.name}{f.isManual && <span style={{ fontSize: "10px", color: "#5a6e8a", marginLeft: "6px" }}>manuell</span>}
                </div>
                <div style={{ fontSize: "10px", color: "#5a6e8a", fontFamily: "monospace" }}>{f.isManual ? "" : f.ticker}</div>
              </div>
              <div style={{ fontSize: "11px", color: "#5a6e8a", marginTop: "2px" }}>
                {f.category} · {fmtFee(f.fee)} avgift/år
                {f.currentPrice && <span> · {f.currentPrice.toFixed(2)} SEK</span>}
              </div>
            </div>
          ))}
          <div
            onClick={() => { setShowManualModal(true); setQ(""); setActiveIdx(-1); }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            style={{
              padding: "9px 14px", cursor: "pointer",
              borderTop: results.length > 0 ? "1px solid rgba(255,255,255,0.08)" : "none",
              display: "flex", alignItems: "center", gap: "8px",
              transition: "background 0.12s",
            }}
          >
            <div style={{
              width: "17px", height: "17px", borderRadius: "50%", flexShrink: 0,
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "14px", color: "#8a9bb0", lineHeight: 1,
            }}>+</div>
            <span style={{ fontSize: "12px", color: "#8a9bb0", fontFamily: "'Syne', sans-serif" }}>Lägg till fond manuellt</span>
          </div>
        </div>
      )}
      {showManualModal && (
        <ManualFundModal
          onSave={fund => { onSaveManualFund(fund); onAdd(fund); }}
          onClose={() => setShowManualModal(false)}
        />
      )}
    </div>
  );
}
