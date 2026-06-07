import { useState, useMemo, useRef, useEffect } from "react";
import { fmtFee } from "../lib/utils";
import { COLOR, FONT } from "../lib/tokens";
import ManualFundModal from "./ManualFundModal";

const CATEGORY_ORDER = [
  "Globalfond",
  "Sverigefond",
  "USA-fond",
  "Räntefond",
  "Temafond",
  "Tillväxtmarknadsfond",
];

export default function FundSearch({ onAdd, excluded, allFunds, loading, onSaveManualFund, failedFunds = [] }) {
  const [q, setQ]                           = useState("");
  const [activeIdx, setActiveIdx]           = useState(-1);
  const [activeCategory, setActiveCategory] = useState(null);
  const [categoryOpen, setCategoryOpen]     = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const containerRef = useRef(null);

  // Stäng allt vid klick utanför komponenten
  useEffect(() => {
    const handleOutsideClick = e => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setQ("");
        setActiveIdx(-1);
        setCategoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Kategorier i definierad ordning, deriverade från tillgängliga fonder
  const categories = useMemo(() => {
    const set = new Set(allFunds.map(f => f.category).filter(Boolean));
    const ordered = CATEGORY_ORDER.filter(c => set.has(c));
    const rest = [...set].filter(c => !CATEGORY_ORDER.includes(c)).sort();
    return [...ordered, ...rest];
  }, [allFunds]);

  // Filtrering: kategori + textsökning
  const results = useMemo(() => {
    const pool = activeCategory
      ? allFunds.filter(f => f.category === activeCategory)
      : allFunds;

    const filtered = q.length > 1
      ? pool.filter(f =>
          f.name.toLowerCase().includes(q.toLowerCase()) ||
          (f.ticker || "").toLowerCase().includes(q.toLowerCase()) ||
          (f.category || "").toLowerCase().includes(q.toLowerCase())
        )
      : pool;

    return filtered
      .filter(f => !excluded.includes(f.id))
      .slice(0, activeCategory && q.length <= 1 ? 20 : 6);
  }, [q, activeCategory, allFunds, excluded]);

  const showFundDropdown = (q.length > 0 || activeCategory !== null) && !categoryOpen;

  const pick = f => { onAdd(f); setQ(""); setActiveIdx(-1); };

  const selectCategory = cat => {
    setActiveCategory(cat);
    setCategoryOpen(false);
    setActiveIdx(-1);
  };

  const clearCategory = e => {
    e.stopPropagation();
    setActiveCategory(null);
    setCategoryOpen(false);
  };

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
      setQ(""); setActiveIdx(-1); setActiveCategory(null); setCategoryOpen(false);
    }
  };

  return (
    <div ref={containerRef} style={{ marginBottom: "12px" }}>

      {/* Sökfält */}
      <div style={{ position: "relative" }}>
        <input type="text"
          placeholder={loading ? "Laddar fonddata…" : "Sök fond, kategori eller ticker…"}
          value={q}
          onChange={e => { setQ(e.target.value); setActiveIdx(-1); setCategoryOpen(false); }}
          onKeyDown={handleKeyDown}
          disabled={loading}
          style={{
            width: "100%", boxSizing: "border-box",
            background: COLOR.surface.tab, border: `1px solid ${COLOR.border.strong}`,
            borderRadius: "8px", color: loading ? COLOR.text.secondary : COLOR.text.primary,
            fontSize: "13px", padding: "9px 14px", outline: "none",
            fontFamily: FONT.family.display,
          }}
        />

        {/* Funddropdown */}
        {showFundDropdown && (
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
            background: COLOR.bg.elevated, border: `1px solid ${COLOR.border.strong}`,
            borderRadius: "8px", zIndex: 200, overflow: "hidden",
          }}>
            {results.length === 0 && q.length > 1 && (
              <div style={{ padding: "10px 14px", fontSize: "12px", color: COLOR.text.secondary, fontFamily: FONT.family.display }}>
                Inga träffar för "{q}"
              </div>
            )}
            {results.map((f, i) => (
              <div key={f.id} onClick={() => pick(f)}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(-1)}
                style={{
                  padding: "9px 14px", cursor: "pointer",
                  borderBottom: `1px solid ${COLOR.border.muted}`,
                  background: i === activeIdx ? "rgba(255,255,255,0.09)" : "transparent",
                  transition: "background 0.12s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "13px", color: COLOR.text.primary, fontFamily: FONT.family.display }}>
                    {f.name}
                    {f.isManual && <span style={{ fontSize: "10px", color: COLOR.text.secondary, marginLeft: "6px" }}>manuell</span>}
                  </div>
                  <div style={{ fontSize: "10px", color: COLOR.text.secondary, fontFamily: "monospace" }}>
                    {f.isManual ? "" : f.ticker}
                  </div>
                </div>
                <div style={{ fontSize: "11px", color: COLOR.text.secondary, marginTop: "2px" }}>
                  {f.category} · {fmtFee(f.fee)} avgift/år
                  {f.currentPrice && <span> · {f.currentPrice.toFixed(2)} SEK</span>}
                </div>
              </div>
            ))}
            <div
              onClick={() => { setShowManualModal(true); setQ(""); setActiveIdx(-1); setActiveCategory(null); }}
              onMouseEnter={e => e.currentTarget.style.background = COLOR.surface.tab}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              style={{
                padding: "9px 14px", cursor: "pointer",
                borderTop: results.length > 0 ? `1px solid ${COLOR.border.muted}` : "none",
                display: "flex", alignItems: "center", gap: "8px",
                transition: "background 0.12s",
              }}
            >
              <div style={{
                width: "17px", height: "17px", borderRadius: "50%", flexShrink: 0,
                background: COLOR.border.subtle, border: `1px solid ${COLOR.border.circle}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "14px", color: COLOR.text.subtle, lineHeight: 1,
              }}>+</div>
              <span style={{ fontSize: "12px", color: COLOR.text.subtle, fontFamily: FONT.family.display }}>
                Lägg till fond manuellt
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Kategorirad */}
      {!loading && (
        <div style={{ marginTop: "8px", position: "relative" }}>
          {activeCategory ? (
            /* Aktivt filterbadge */
            <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "4px 8px 4px 10px", borderRadius: "20px",
                border: "1px solid rgba(255,255,255,0.22)",
                background: "rgba(255,255,255,0.10)",
                fontSize: "11px", fontFamily: FONT.family.display, fontWeight: 600,
                color: COLOR.text.primary, letterSpacing: "0.03em",
              }}>
                {activeCategory}
                <button onClick={clearCategory} style={{
                  background: "none", border: "none", padding: "0 1px",
                  color: COLOR.text.secondary, cursor: "pointer",
                  fontSize: "13px", lineHeight: 1, display: "flex", alignItems: "center",
                }}>✕</button>
              </span>
            </div>
          ) : (
            /* Välj kategori-chip */
            <button
              onClick={() => setCategoryOpen(o => !o)}
              style={{
                display: "inline-flex", alignItems: "center", gap: "5px",
                padding: "4px 10px", borderRadius: "20px",
                border: `1px solid ${categoryOpen ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.09)"}`,
                background: categoryOpen ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.03)",
                color: COLOR.text.secondary, fontSize: "11px",
                fontFamily: FONT.family.display, fontWeight: 600,
                letterSpacing: "0.03em", cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              Välj kategori
              <span style={{ fontSize: "9px", opacity: 0.7 }}>{categoryOpen ? "▲" : "▾"}</span>
            </button>
          )}

          {/* Kategoridropdown */}
          {categoryOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0,
              background: COLOR.bg.elevated, border: `1px solid ${COLOR.border.strong}`,
              borderRadius: "8px", zIndex: 200, overflow: "hidden",
              minWidth: "160px",
            }}>
              {categories.map((cat, i) => (
                <div key={cat} onClick={() => selectCategory(cat)}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.09)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  style={{
                    padding: "9px 14px", cursor: "pointer",
                    borderBottom: i < categories.length - 1 ? `1px solid ${COLOR.border.muted}` : "none",
                    fontSize: "12px", fontFamily: FONT.family.display, fontWeight: 600,
                    color: COLOR.text.primary, transition: "background 0.12s",
                  }}
                >
                  {cat}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Varning för fonder som inte laddats */}
      {!showFundDropdown && !categoryOpen && failedFunds.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "6px", fontSize: "11px", color: COLOR.warning, fontFamily: FONT.family.display }}>
          <span>⚠</span>
          <span>Kunde inte ladda: {failedFunds.join(", ")}</span>
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
