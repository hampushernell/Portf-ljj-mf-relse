import { useState, useRef, useEffect } from "react";
import { fmtFee } from "../lib/utils";
import { COLOR, FONT } from "../lib/tokens";
import ManualFundModal from "./ManualFundModal";

const CATEGORY_ORDER = [
  "Globalfond", "Sverigefond", "USA-fond", "Räntefond",
  "Temafond", "Tillväxtmarknadsfond", "Europafond", "Småbolagsfond", "Blandfond",
];

function CategoryRow({ cat, isSelected, onToggle }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "8px 12px", cursor: "pointer",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: hovered ? "rgba(255,255,255,0.05)" : "transparent",
        transition: "background 0.1s",
      }}
    >
      <span style={{
        fontSize: "12px", fontFamily: FONT.family.display,
        color: hovered ? "#f0ede8" : "#94a3b8", transition: "color 0.1s",
      }}>{cat}</span>
      <div style={{
        width: "14px", height: "14px", borderRadius: "3px", flexShrink: 0,
        background: isSelected ? "rgba(0,24,245,0.25)" : "transparent",
        border: isSelected ? "1px solid rgba(0,24,245,0.5)" : "1px solid rgba(255,255,255,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.12s",
      }}>
        {isSelected && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
            <polyline points="1,3.5 3.5,6 8,1" stroke="#7b93ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </div>
  );
}

// eslint-disable-next-line no-unused-vars
export default function FundSearchModal({ isOpen, onClose, onAdd, onRemove, excluded, allFunds, loading, onSaveManualFund, failedFunds: _failedFunds, label, accent: _accent, accentRgb: _accentRgb }) {
  const [q, setQ] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const searchRef = useRef(null);
  const filterRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => searchRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    if (!filterOpen) return;
    const handler = e => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filterOpen]);

  const availableCategories = CATEGORY_ORDER.filter(cat =>
    allFunds.some(f => f.category === cat)
  );

  const filtered = allFunds.filter(f => {
    const matchesCat = selectedCategories.length === 0 || selectedCategories.includes(f.category);
    const matchesQ = !q || (
      f.name.toLowerCase().includes(q.toLowerCase()) ||
      (f.ticker || "").toLowerCase().includes(q.toLowerCase()) ||
      (f.category || "").toLowerCase().includes(q.toLowerCase())
    );
    return matchesCat && matchesQ;
  }).slice(0, 20);

  const toggleCategory = cat =>
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );

  const isFilterActive = selectedCategories.length > 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px", animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: COLOR.bg.elevated,
          border: "1px solid rgba(255,255,255,0.13)",
          borderRadius: "14px", width: "100%", maxWidth: "560px",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "18px 20px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        }}>
          <div>
            <div style={{
              fontSize: "9px", color: "#5a6e8a", fontFamily: FONT.family.display,
              fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em",
              marginBottom: "4px",
            }}>{label}</div>
            <div style={{
              fontSize: "15px", fontWeight: 700, color: COLOR.text.primary,
              fontFamily: FONT.family.display,
            }}>Lägg till fonder</div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#5a6e8a", cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
              fontSize: "18px", lineHeight: 1, fontFamily: FONT.family.display, padding: 0,
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ padding: "14px 20px" }}>
          <input
            ref={searchRef}
            type="text"
            placeholder={loading ? "Laddar fonddata…" : "Sök fond, kategori eller ticker…"}
            value={q}
            onChange={e => setQ(e.target.value)}
            disabled={loading}
            style={{
              width: "100%", boxSizing: "border-box",
              background: COLOR.surface.tab, border: `1px solid ${COLOR.border.strong}`,
              borderRadius: "8px",
              color: loading ? COLOR.text.secondary : COLOR.text.primary,
              fontSize: "13px", padding: "9px 14px", outline: "none",
              fontFamily: FONT.family.display, marginBottom: "8px", display: "block",
            }}
          />

          {/* Chip bar */}
          <div style={{
            display: "flex", flexWrap: "wrap", gap: "5px", alignItems: "center",
            marginBottom: "8px",
          }}>
            <div ref={filterRef} style={{ position: "relative", flexShrink: 0 }}>
              <button
                onClick={() => setFilterOpen(o => !o)}
                style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "4px 10px", borderRadius: "20px", cursor: "pointer",
                  background: isFilterActive ? "rgba(0,24,245,0.12)" : "transparent",
                  border: isFilterActive
                    ? "1px solid rgba(0,24,245,0.35)"
                    : "1px solid rgba(255,255,255,0.10)",
                  color: isFilterActive ? "#7b93ff" : "#5a6e8a",
                  fontFamily: FONT.family.display, fontWeight: 600,
                  fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.04em",
                  transition: "all 0.15s",
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <line x1="4" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="7" y1="12" x2="17" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="10" y1="18" x2="14" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                FILTRERA
                <svg
                  width="8" height="5" viewBox="0 0 8 5" fill="none"
                  style={{ flexShrink: 0, transform: filterOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
                >
                  <path d="M1 1L4 4L7 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {filterOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", left: 0,
                  background: "#0d1120", border: "1px solid rgba(255,255,255,0.13)",
                  borderRadius: "10px", zIndex: 10,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                  minWidth: "190px", overflow: "hidden",
                }}>
                  {availableCategories.map(cat => (
                    <CategoryRow
                      key={cat}
                      cat={cat}
                      isSelected={selectedCategories.includes(cat)}
                      onToggle={() => toggleCategory(cat)}
                    />
                  ))}
                </div>
              )}
            </div>

            {selectedCategories.map(cat => (
              <div key={cat} style={{
                display: "flex", alignItems: "center", gap: "4px",
                background: "rgba(0,24,245,0.10)", border: "1px solid rgba(0,24,245,0.25)",
                color: "#7b93ff", fontSize: "10px", fontFamily: FONT.family.display,
                fontWeight: 600, textTransform: "uppercase",
                padding: "3px 8px 3px 10px", borderRadius: "20px",
              }}>
                {cat}
                <span
                  onClick={() => toggleCategory(cat)}
                  onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "0.65"}
                  style={{ fontSize: "10px", cursor: "pointer", opacity: 0.65, lineHeight: 1 }}
                >×</span>
              </div>
            ))}
          </div>

          {/* Counter */}
          <div style={{
            fontSize: "9px", color: "#5a6e8a", fontFamily: FONT.family.display,
            fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em",
            marginBottom: "6px",
          }}>
            {filtered.length} fonder
          </div>

          {/* Fund list */}
          <div style={{
            maxHeight: "300px", overflowY: "auto",
            scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.15) transparent",
          }}>
            {filtered.map(f => {
              const added = excluded.includes(f.id);
              return (
                <div
                  key={f.id}
                  onClick={added ? () => onRemove(f.id) : () => onAdd(f)}
                  onMouseEnter={added ? e => {
                    setHoveredId(f.id);
                    e.currentTarget.style.background = "rgba(248,113,113,0.07)";
                    e.currentTarget.style.borderColor = "rgba(248,113,113,0.15)";
                  } : e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.055)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                  }}
                  onMouseLeave={added ? e => {
                    setHoveredId(null);
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "transparent";
                  } : e => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "transparent";
                  }}
                  style={{
                    padding: "8px 10px", borderRadius: "9px",
                    display: "flex", alignItems: "center", gap: "8px",
                    border: "1px solid transparent",
                    cursor: "pointer",
                    opacity: added ? 0.45 : 1,
                    transition: "background 0.1s, border-color 0.1s",
                  }}
                >
                  <div style={{
                    width: "7px", height: "7px", borderRadius: "50%", flexShrink: 0,
                    background: added ? "#6ee7b7" : "#5a6e8a",
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: "12px", fontFamily: FONT.family.display,
                      fontWeight: 600, color: COLOR.text.primary,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {f.name}
                      {f.isManual && (
                        <span style={{ fontSize: "10px", color: COLOR.text.secondary, marginLeft: "5px" }}>manuell</span>
                      )}
                    </div>
                    <div style={{
                      fontSize: "10px", color: "#5a6e8a", fontFamily: FONT.family.display,
                      marginTop: "1px",
                    }}>
                      {f.category} · {fmtFee(f.fee)}
                    </div>
                  </div>
                  <div style={{
                    width: "16px", height: "16px", borderRadius: "50%", flexShrink: 0,
                    background: added ? "rgba(110,231,183,0.15)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${added ? "rgba(110,231,183,0.3)" : "rgba(255,255,255,0.12)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {added && (
                      hoveredId === f.id
                        ? <span style={{ fontSize: "10px", color: "#f87171", lineHeight: 1 }}>×</span>
                        : <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                            <polyline points="1,3.5 3.5,6 8,1" stroke="#6ee7b7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                    )}
                  </div>
                </div>
              );
            })}

            <div
              onClick={() => setShowManualModal(true)}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.055)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              style={{
                padding: "8px 10px", borderRadius: "9px",
                display: "flex", alignItems: "center", gap: "8px",
                cursor: "pointer", transition: "background 0.1s",
              }}
            >
              <div style={{
                width: "16px", height: "16px", borderRadius: "50%", flexShrink: 0,
                background: COLOR.border.subtle, border: `1px solid ${COLOR.border.circle}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "13px", color: COLOR.text.subtle, lineHeight: 1,
              }}>+</div>
              <span style={{ fontSize: "12px", color: COLOR.text.subtle, fontFamily: FONT.family.display }}>
                Lägg till fond manuellt
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 20px",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: "11px", color: "#5a6e8a", fontFamily: FONT.family.display }}>
            {excluded.length} {excluded.length === 1 ? "fond vald" : "fonder valda"}
          </span>
          <button
            onClick={onClose}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(0,24,245,0.18)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(0,24,245,0.10)"}
            style={{
              background: "rgba(0,24,245,0.10)", border: "1px solid rgba(0,24,245,0.30)",
              color: "#7b93ff", fontSize: "12px", fontFamily: FONT.family.display,
              fontWeight: 600, padding: "8px 18px", borderRadius: "8px",
              cursor: "pointer", transition: "background 0.15s",
            }}
          >Klar</button>
        </div>
      </div>

      {showManualModal && (
        <div onClick={e => e.stopPropagation()}>
          <ManualFundModal
            onSave={fund => { onSaveManualFund(fund); onAdd(fund); }}
            onClose={() => setShowManualModal(false)}
          />
        </div>
      )}
    </div>
  );
}
