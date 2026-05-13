import { useState } from "react";
import { ACCENT_A_LIGHT, ACCENT_B } from "../lib/utils";

const MANUAL_SPANS = ["1 mån", "3 mån", "1 år", "3 år"];

export default function ManualFundModal({ onSave, onClose, initialData = null, onDelete = null }) {
  const [name, setName]         = useState(initialData?.name ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "");
  const [isin, setIsin]         = useState(initialData?.isin ?? "");
  const [fee, setFee]           = useState(initialData?.fee != null ? String(initialData.fee) : "");
  const [returns, setReturns]   = useState(
    MANUAL_SPANS.reduce((acc, s) => ({ ...acc, [s]: initialData?.returns?.[s] != null ? String(initialData.returns[s]) : "" }), {})
  );
  const [errors, setErrors]     = useState({});

  const fieldStyle = (err) => ({
    width: "100%", boxSizing: "border-box",
    background: "rgba(255,255,255,0.06)",
    border: `1px solid ${err ? "rgba(248,113,113,0.55)" : "rgba(255,255,255,0.11)"}`,
    borderRadius: "7px", color: "#f0ede8", fontSize: "13px",
    padding: "8px 12px", outline: "none", fontFamily: "'Syne', sans-serif",
  });
  const label = (txt) => (
    <div style={{ fontSize: "10px", color: "#5a6e8a", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'Syne', sans-serif", marginBottom: "5px" }}>{txt}</div>
  );

  const handleSubmit = () => {
    const errs = {};
    if (!name.trim()) errs.name = true;
    if (fee === "" || isNaN(parseFloat(fee))) errs.fee = true;
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const id = initialData?.id ?? `manual-${Date.now()}`;
    onSave({
      id, name: name.trim(), category: category.trim() || "Manuell",
      isin: isin.trim() || null, ticker: initialData?.ticker ?? id, fee: parseFloat(fee),
      isManual: true, prices: [], currentPrice: null, updatedAt: Date.now(),
      returns: Object.fromEntries(MANUAL_SPANS.map(s => [s, returns[s] !== "" ? parseFloat(returns[s]) : null])),
    });
    onClose();
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
      animation: "fadeIn 0.2s ease",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#0d1120", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "16px", padding: "28px 28px 24px",
        maxWidth: "520px", width: "100%", maxHeight: "92vh",
        overflow: "auto", animation: "scaleIn 0.25s ease",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "16px", fontWeight: 700, color: "#f0ede8", margin: 0 }}>
            {initialData ? "Redigera fond" : "Lägg till fond manuellt"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#5a6e8a", cursor: "pointer", fontSize: "24px", lineHeight: 1, padding: "0 4px" }}>×</button>
        </div>

        <a href="https://www.morningstar.se" target="_blank" rel="noopener noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px",
          color: ACCENT_B, fontFamily: "'Syne', sans-serif", textDecoration: "none", marginBottom: "14px",
        }}>Sök upp fonden på Morningstar ↗</a>

        <div style={{
          background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.28)",
          borderRadius: "10px", padding: "11px 14px", marginBottom: "20px",
          fontSize: "12px", color: "#fbbf24", lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif",
        }}>
          ℹ Grafen visar en <strong style={{ color: "#fbbf24" }}>simulerad kursutveckling</strong> baserad på angiven avkastning och antagen volatilitet ~15% — den speglar inte faktisk historisk kursutveckling. Avkastningsprocenten i grafen stämmer med angiven data. Tidsspann utan data visas med varning i listan.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            {label("Fondnamn *")}
            <input value={name} onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: false })); }}
              placeholder="t.ex. Länsförsäkringar Global Index" style={fieldStyle(errors.name)} />
            {errors.name && <div style={{ fontSize: "11px", color: "#f87171", marginTop: "3px" }}>Obligatoriskt fält</div>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              {label("Kategori")}
              <input value={category} onChange={e => setCategory(e.target.value)}
                placeholder="t.ex. Globalfond" style={fieldStyle(false)} />
            </div>
            <div>
              {label("ISIN")}
              <input value={isin} onChange={e => setIsin(e.target.value)}
                placeholder="t.ex. SE0011527613" style={fieldStyle(false)} />
            </div>
          </div>

          <div>
            {label("Förvaltningsavgift (%) *")}
            <input type="number" step="0.01" value={fee}
              onChange={e => { setFee(e.target.value); setErrors(p => ({ ...p, fee: false })); }}
              placeholder="t.ex. 0.20" style={{ ...fieldStyle(errors.fee), width: "48%" }} />
            {errors.fee && <div style={{ fontSize: "11px", color: "#f87171", marginTop: "3px" }}>Obligatoriskt fält</div>}
          </div>

          <div>
            {label("Historisk avkastning (%)")}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
              {MANUAL_SPANS.map(s => {
                const filled = returns[s] !== "";
                return (
                  <div key={s}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "5px" }}>
                      <span style={{ fontSize: "10px", fontFamily: "'Syne', sans-serif", fontWeight: 600, color: filled ? "#6ee7b7" : "#5a6e8a" }}>{s}</span>
                      {filled && <span style={{ color: "#6ee7b7", fontSize: "12px", lineHeight: 1 }}>✓</span>}
                    </div>
                    <input type="number" step="0.01" value={returns[s]}
                      onChange={e => setReturns(p => ({ ...p, [s]: e.target.value }))}
                      placeholder="±%" style={{ ...fieldStyle(false), padding: "7px 8px" }} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "24px", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            {onDelete && (
              <button onClick={onDelete}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.2)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(248,113,113,0.1)"}
                style={{
                  background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.35)",
                  color: "#f87171", borderRadius: "8px", padding: "9px 16px",
                  cursor: "pointer", fontSize: "12px", fontFamily: "'Syne', sans-serif", fontWeight: 600,
                  transition: "background 0.2s",
                }}>Ta bort fond</button>
            )}
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={onClose} style={{
              background: "transparent", border: "1px solid rgba(255,255,255,0.13)",
              color: "#5a6e8a", borderRadius: "8px", padding: "9px 20px",
              cursor: "pointer", fontSize: "12px", fontFamily: "'Syne', sans-serif", fontWeight: 600,
            }}>Avbryt</button>
            <button onClick={handleSubmit}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(0,24,245,0.28)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(0,24,245,0.15)"}
              style={{
                background: "rgba(0,24,245,0.15)", border: "1px solid rgba(0,24,245,0.4)",
                color: ACCENT_A_LIGHT, borderRadius: "8px", padding: "9px 20px",
                cursor: "pointer", fontSize: "12px", fontFamily: "'Syne', sans-serif", fontWeight: 600,
                transition: "background 0.2s",
              }}>{initialData ? "Spara ändringar" : "Lägg till fond"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
