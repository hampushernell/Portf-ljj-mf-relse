import { useState } from "react";
import { getFundPct } from "../lib/calculations";
import { formatKr, fmtFee } from "../lib/utils";

export default function FundRow({ fund, allocation, inputMode, portfolioTotal, onUpdate, onRemove, onEdit, dotColor, spanHasData = true }) {
  const pct = getFundPct(fund, { [fund.id]: allocation }, inputMode, portfolioTotal);
  const kr  = inputMode === "kr" ? (allocation.kr || 0) : (portfolioTotal * (allocation.pct || 0) / 100);
  const inputVal = inputMode === "pct" ? (allocation.pct || "") : (allocation.kr || "");
  const [hovered, setHovered] = useState(false);
  const clickable = fund.isManual && !!onEdit;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={clickable ? () => onEdit(fund) : undefined}
      style={{
        display: "grid", gridTemplateColumns: "1fr 100px 90px 26px", gap: "8px", alignItems: "center",
        padding: "10px 12px",
        background: hovered ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)", borderRadius: "9px", marginBottom: "7px",
        animation: "slideInLeft 0.22s ease", boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
        transition: "background 0.15s",
        cursor: clickable ? "pointer" : "default",
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
        {dotColor && <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: dotColor, flexShrink: 0 }} />}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: "13px", color: "#f0ede8", fontWeight: 600 }}>{fund.name}</span>
            {!spanHasData && <span title="Ingen data för valt tidsspann" style={{ color: "#f59e0b", fontSize: "11px", lineHeight: 1 }}>⚠</span>}
          </div>
          <div style={{ fontSize: "11px", color: "#5a6e8a", marginTop: "1px" }}>
            {fund.category} · {fmtFee(fund.fee)} avgift
            {fund.currentPrice && <span> · {fund.currentPrice.toFixed(2)} SEK</span>}
          </div>
          {fund.isManual && fund.updatedAt && (() => {
            const days = (Date.now() - fund.updatedAt) / 86400000;
            const color = days > 90 ? "#f87171" : days > 30 ? "#fbbf24" : "#5a6e8a";
            const dateStr = new Date(fund.updatedAt).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });
            return (
              <div style={{ fontSize: "10px", color, marginTop: "2px" }}>
                {days > 30 ? "⚠️ " : ""}Uppdaterad: {dateStr}
              </div>
            );
          })()}
        </div>
      </div>
      <div onClick={e => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <label style={{ fontSize: "9px", color: "#5a6e8a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {inputMode === "pct" ? "Andel %" : "Belopp kr"}
        </label>
        <input type="number" value={inputVal}
          onChange={e => {
            const val = parseFloat(e.target.value) || 0;
            onUpdate(inputMode === "pct" ? { pct: val } : { kr: val });
          }}
          style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.11)",
            borderRadius: "6px", color: "#f0ede8", fontSize: "13px",
            padding: "5px 8px", width: "100%", outline: "none",
            fontFamily: "'Syne', sans-serif", boxSizing: "border-box",
          }}
        />
      </div>
      <div onClick={e => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <label style={{ fontSize: "9px", color: "#5a6e8a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {inputMode === "pct" ? "≈ kr" : "≈ %"}
        </label>
        <div style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "6px", color: "#5a6e8a", fontSize: "11px", padding: "5px 8px",
        }}>
          {inputMode === "pct" ? formatKr(kr) : `${pct.toFixed(1)}%`}
        </div>
      </div>
      <button onClick={e => { e.stopPropagation(); onRemove(); }}
        style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "18px", padding: "2px", transition: "color 0.2s" }}
        onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
        onMouseLeave={e => e.currentTarget.style.color = "#555"}
      >×</button>
    </div>
  );
}
