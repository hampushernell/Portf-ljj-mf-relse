import { useState } from "react";
import { COLOR, FONT } from "../lib/tokens";
import FundSearchModal from "./FundSearchModal";

export default function FundSearch({ onAdd, onRemove, excluded, allFunds, loading, onSaveManualFund, failedFunds = [], label, accent, accentRgb, hasFunds }) {
  const [isOpen, setIsOpen] = useState(false);
  const [triggerHovered, setTriggerHovered] = useState(false);

  return (
    <div style={{ position: "relative", marginBottom: "12px" }}>
      {!hasFunds ? (
        <div
          onClick={() => setIsOpen(true)}
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "9px", padding: "16px 14px", background: "transparent",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            cursor: "pointer",
          }}
        >
          <div style={{
            width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
            border: `1.5px solid rgba(${accentRgb}, 0.5)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "14px", color: accent, lineHeight: 1,
          }}>+</div>
          <span style={{
            fontSize: "12px", fontFamily: FONT.family.display,
            fontWeight: 600, color: COLOR.text.secondary,
          }}>Lägg till fond</span>
        </div>
      ) : (
        <div
          onClick={() => setIsOpen(true)}
          onMouseEnter={() => setTriggerHovered(true)}
          onMouseLeave={() => setTriggerHovered(false)}
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "9px", padding: "8px 10px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            cursor: "pointer",
          }}
        >
          <div style={{
            width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0,
            border: `1.5px solid rgba(${accentRgb}, 0.4)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "13px", color: accent, lineHeight: 1,
          }}>+</div>
          <span style={{
            fontSize: "12px", fontFamily: FONT.family.display, fontWeight: 600,
            color: triggerHovered ? COLOR.text.primary : COLOR.text.secondary,
            transition: "color 0.15s",
          }}>Lägg till fond</span>
        </div>
      )}

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
          onRemove={onRemove}
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
