import { useState } from "react";
import { COLOR, FONT } from "../lib/tokens";
import FundSearchModal from "./FundSearchModal";

export default function FundSearch({ onAdd, excluded, allFunds, loading, onSaveManualFund, failedFunds = [], label, accent }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: "relative", marginBottom: "12px" }}>
      <button
        onClick={() => setIsOpen(true)}
        disabled={loading}
        style={{
          width: "100%", boxSizing: "border-box", textAlign: "left",
          background: "rgba(255,255,255,0.06)", border: `1px solid ${COLOR.border.strong}`,
          borderRadius: "8px", padding: "9px 14px 9px 36px",
          color: COLOR.text.secondary, fontSize: "13px",
          fontFamily: FONT.family.display, cursor: loading ? "default" : "pointer",
          position: "relative", display: "flex", alignItems: "center",
        }}
      >
        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none"
          style={{ position: "absolute", left: "12px", flexShrink: 0, opacity: 0.5 }}
        >
          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {loading ? "Laddar fonddata…" : "Sök och lägg till fonder…"}
      </button>

      {failedFunds.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: "5px",
          marginTop: "6px", fontSize: "11px", color: COLOR.warning,
          fontFamily: FONT.family.display,
        }}>
          <span>⚠</span>
          <span>Kunde inte ladda: {failedFunds.join(", ")}</span>
        </div>
      )}

      {isOpen && (
        <FundSearchModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onAdd={onAdd}
          excluded={excluded}
          allFunds={allFunds}
          loading={loading}
          onSaveManualFund={onSaveManualFund}
          failedFunds={failedFunds}
          label={label}
          accent={accent}
        />
      )}
    </div>
  );
}
