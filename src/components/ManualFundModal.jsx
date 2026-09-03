import { useState } from "react";
import { ACCENT_A_LIGHT, ACCENT_B } from "../lib/utils";
import { COLOR, FONT } from "../lib/tokens";
import { ANIM, anim } from "../lib/animations";

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
    background: COLOR.surface.sunken,
    border: `1px solid ${err ? "rgba(248,113,113,0.55)" : COLOR.border.edge}`,
    borderRadius: "7px", color: COLOR.text.primary, fontSize: FONT.size.base,
    padding: "8px 12px", outline: "none", fontFamily: FONT.family.display,
  });
  const label = (txt) => (
    <div style={{ fontSize: FONT.size.xs, color: COLOR.text.label, textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: FONT.family.display, marginBottom: "5px" }}>{txt}</div>
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
      background: COLOR.bg.overlay, backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
      animation: anim(ANIM.overlayMount),
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: COLOR.bg.elevated, border: `1px solid ${COLOR.border.modal}`,
        borderRadius: "16px", padding: "28px 28px 24px",
        maxWidth: "520px", width: "100%", maxHeight: "92vh",
        overflow: "auto", animation: anim(ANIM.dialogMount),
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontFamily: FONT.family.display, fontSize: FONT.size.xl, fontWeight: 700, lineHeight: 1.3, color: COLOR.text.primary, margin: 0 }}>
            {initialData ? "Redigera fond" : "Lägg till fond manuellt"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLOR.text.secondary, cursor: "pointer", fontSize: FONT.icon.md, lineHeight: 1, padding: "0 4px" }}>×</button>
        </div>

        <a href="https://www.morningstar.se" target="_blank" rel="noopener noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: "4px", fontSize: FONT.size.md,
          color: ACCENT_B, fontFamily: FONT.family.display, textDecoration: "none", marginBottom: "14px",
        }}>Sök upp fonden på Morningstar ↗</a>

        <div style={{
          background: COLOR.tint.warning, border: "1px solid rgba(251,191,36,0.28)",
          borderRadius: "10px", padding: "11px 14px", marginBottom: "20px",
          fontSize: FONT.size.md, color: COLOR.warningLight, lineHeight: 1.6, fontFamily: FONT.family.body,
        }}>
          ℹ Grafen visar en <strong style={{ color: COLOR.warningLight }}>simulerad kursutveckling</strong> baserad på angiven avkastning och antagen volatilitet ~15% — den speglar inte faktisk historisk kursutveckling. Avkastningsprocenten i grafen stämmer med angiven data. Tidsspann utan data visas med varning i listan.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            {label("Fondnamn *")}
            <input value={name} onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: false })); }}
              placeholder="t.ex. Länsförsäkringar Global Index" style={fieldStyle(errors.name)} />
            {errors.name && <div style={{ fontSize: FONT.size.sm, color: COLOR.negative, marginTop: "3px" }}>Obligatoriskt fält</div>}
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
            {errors.fee && <div style={{ fontSize: FONT.size.sm, color: COLOR.negative, marginTop: "3px" }}>Obligatoriskt fält</div>}
          </div>

          <div>
            {label("Historisk avkastning (%)")}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
              {MANUAL_SPANS.map(s => {
                const filled = returns[s] !== "";
                return (
                  <div key={s}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "5px" }}>
                      <span style={{ fontSize: FONT.size.xs, fontFamily: FONT.family.display, fontWeight: 600, color: filled ? COLOR.positive : COLOR.text.secondary }}>{s}</span>
                      {filled && <span style={{ color: COLOR.positive, fontSize: FONT.size.md, lineHeight: 1 }}>✓</span>}
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
                onMouseLeave={e => e.currentTarget.style.background = COLOR.tint.negative}
                style={{
                  background: COLOR.tint.negative, border: "1px solid rgba(248,113,113,0.35)",
                  color: COLOR.negative, borderRadius: "8px", padding: "9px 16px",
                  cursor: "pointer", fontSize: FONT.size.md, fontFamily: FONT.family.display, fontWeight: 600,
                  transition: anim(ANIM.hover),
                }}>Ta bort fond</button>
            )}
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={onClose} style={{
              background: "transparent", border: `1px solid ${COLOR.border.strong}`,
              color: COLOR.text.secondary, borderRadius: "8px", padding: "9px 20px",
              cursor: "pointer", fontSize: FONT.size.md, fontFamily: FONT.family.display, fontWeight: 600,
            }}>Avbryt</button>
            <button onClick={handleSubmit}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.18)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(0,24,245,0.15)"}
              style={{
                background: "rgba(0,24,245,0.15)", border: "1px solid rgba(0,24,245,0.4)",
                color: ACCENT_A_LIGHT, borderRadius: "8px", padding: "9px 20px",
                cursor: "pointer", fontSize: FONT.size.md, fontFamily: FONT.family.display, fontWeight: 600,
                transition: anim(ANIM.hover),
              }}>{initialData ? "Spara ändringar" : "Lägg till fond"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
