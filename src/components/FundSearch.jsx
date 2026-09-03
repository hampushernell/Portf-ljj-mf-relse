import { useState } from "react";
import { COLOR, FONT } from "../lib/tokens";
import { ANIM, anim } from "../lib/animations";
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
            border: `1px solid ${COLOR.border.edge}`,
            borderRadius: "9px", padding: "20px 14px", background: "transparent",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            cursor: "pointer",
          }}
        >
          <div style={{
            width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0,
            border: `1.5px solid ${COLOR.border.edge}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: FONT.size.lg, color: accent, lineHeight: 1,
          }}>+</div>
          <span style={{
            fontSize: FONT.size.base, fontFamily: FONT.family.display,
            fontWeight: 600, color: COLOR.text.secondary,
          }}>Lägg till fond</span>
        </div>
      ) : (
        <div
          onClick={() => setIsOpen(true)}
          onMouseEnter={() => setTriggerHovered(true)}
          onMouseLeave={() => setTriggerHovered(false)}
          style={{
            border: `1px solid ${COLOR.border.edge}`,
            borderRadius: "9px", padding: "10px 12px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            cursor: "pointer", minHeight: "60px", boxSizing: "border-box",
          }}
        >
          <div style={{
            width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0,
            border: `1.5px solid ${COLOR.border.edge}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: FONT.size.base, color: accent, lineHeight: 1,
          }}>+</div>
          <span style={{
            fontSize: FONT.size.md, fontFamily: FONT.family.display, fontWeight: 600,
            color: triggerHovered ? COLOR.text.primary : COLOR.text.secondary,
            transition: anim(ANIM.hoverColor),
          }}>Lägg till fond</span>
        </div>
      )}

      {failedFunds.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: "5px",
          marginTop: "6px", fontSize: FONT.size.sm, color: COLOR.warning,
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
