import { useState } from "react";
import { getWeightedFee, portfolioKrTotal } from "../lib/calculations";
import { FUND_COLORS, ALLOC_SHADES_A, ALLOC_SHADES_B, formatKr, fmtFee } from "../lib/utils";
import { COLOR, FONT, SHADOW } from "../lib/tokens";
import useBreakpoint from "../hooks/useBreakpoint";
import FundRow from "./FundRow";
import FundSearch from "./FundSearch";
import ManualFundModal from "./ManualFundModal";
import FundDetailsModal from "./FundDetailsModal";

function BriefcaseIcon({ color }) {
  return (
    <svg width="18" height="17" viewBox="0 0 28 26" fill="none">
      <path d="M10 8 Q10 4 14 4 Q18 4 18 8" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <rect x="3" y="8" width="22" height="15" rx="2.5" stroke={color} strokeWidth="2.5" fill="none"/>
      <line x1="3" y1="14" x2="25" y2="14" stroke={color} strokeWidth="1.5"/>
    </svg>
  );
}

export default function PortfolioPanel({ label, accent, accentRgb, accentText, funds, allocations, inputMode, manualAmount, onInputModeChange, onManualAmountChange, allFunds, loading, onAddFund, onUpdateAlloc, onRemoveFund, viewMode, span, onSaveManualFund, onDeleteManualFund, onUpdateFundData, failedFunds = [], isB, onHide }) {
  const [showDetails, setShowDetails] = useState(false);
  const [editingFund, setEditingFund] = useState(null);
  const [showFeeInfo, setShowFeeInfo] = useState(false);
  const { isMobile } = useBreakpoint();
  const portfolioTotal = inputMode === "kr" ? portfolioKrTotal(funds, allocations) : manualAmount;
  const fee = getWeightedFee(funds, allocations, inputMode, portfolioTotal);
  const totalPct = inputMode === "pct"
    ? funds.reduce((acc, f) => acc + (allocations[f.id]?.pct || 0), 0)
    : 100;
  const pctOk = Math.abs(totalPct - 100) < 0.5;

  return (
    <div className="panel-card"
      onMouseEnter={e => e.currentTarget.style.boxShadow = SHADOW.cardHover}
      onMouseLeave={e => e.currentTarget.style.boxShadow = SHADOW.card}
      style={{
        flex: 1, minWidth: 0, background: "transparent",
        border: `1px solid ${accent}73`, borderRadius: isMobile ? "10px" : "14px", padding: isMobile ? "14px" : "20px",
        display: "flex", flexDirection: "column", gap: "12px",
        animation: "fadeSlideUp 0.35s ease",
        boxShadow: SHADOW.card,
        minHeight: funds.length === 0 && !isMobile ? "220px" : "auto",
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {isMobile && (
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: accent, flexShrink: 0 }} />
        )}
        <BriefcaseIcon color={accent} />
        <h2 style={{ fontFamily: FONT.family.display, fontSize: "16px", fontWeight: 700, color: COLOR.text.primary, margin: 0 }}>{label}</h2>
        {isB && onHide && (
          <button onClick={onHide} style={{
            marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px",
            fontSize: "11px", color: COLOR.text.secondary,
            background: "rgba(255,255,255,0.06)", border: `1px solid ${COLOR.border.subtle}`,
            borderRadius: "6px", padding: "4px 9px", cursor: "pointer",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Dölj
          </button>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", background: COLOR.surface.tab, borderRadius: "7px", padding: "3px", gap: "2px" }}>
          {["pct", "kr"].map(m => (
            <button key={m} onClick={() => onInputModeChange(m)} style={{
              background: inputMode === m ? COLOR.surface.active : "transparent",
              border: "none", color: inputMode === m ? COLOR.text.primary : COLOR.text.secondary,
              padding: "5px 12px", borderRadius: "5px", cursor: "pointer",
              fontSize: "11px", fontFamily: FONT.family.display, fontWeight: 600,
              transition: "all 0.2s",
            }}>{m === "pct" ? "% Procent" : "kr Kronor"}</button>
          ))}
        </div>
        {inputMode === "pct" && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", animation: "fadeIn 0.2s ease" }}>
            <input type="number" value={manualAmount || ""}
              onChange={e => onManualAmountChange(parseFloat(e.target.value) || 0)}
              placeholder="Belopp"
              style={{
                background: COLOR.surface.input, border: `1px solid ${COLOR.border.input}`,
                borderRadius: "6px", color: COLOR.text.primary, fontSize: "13px",
                padding: "5px 9px", width: "100px", outline: "none", fontFamily: FONT.family.display,
              }}
            />
            <span style={{ fontSize: "11px", color: COLOR.text.secondary }}>kr</span>
          </div>
        )}
      </div>

      <div style={{ flex: 1 }}>
        {funds.map((f, i) => (
          <FundRow key={f.id} fund={f}
            allocation={allocations[f.id] || { pct: 0, kr: 0 }}
            inputMode={inputMode} portfolioTotal={portfolioTotal}
            onUpdate={vals => onUpdateAlloc(f.id, vals)}
            onRemove={() => onRemoveFund(f.id)}
            onEdit={f.isManual ? setEditingFund : undefined}
            dotColor={viewMode === "fund" ? FUND_COLORS[i % FUND_COLORS.length] : null}
            spanHasData={!f.isManual || f.returns?.[span] != null}
          />
        ))}
      </div>

      <FundSearch onAdd={onAddFund} onRemove={onRemoveFund} excluded={funds.map(f => f.id)} allFunds={allFunds} loading={loading} onSaveManualFund={onSaveManualFund} failedFunds={failedFunds} label={label} accent={accent} accentRgb={accentRgb} accentText={accentText} hasFunds={funds.length > 0} />

      {funds.length > 0 && inputMode === "pct" && (
        <div style={{ padding: isMobile ? "12px" : "14px", background: `rgba(${accentRgb}, 0.06)`, border: `1px solid rgba(${accentRgb}, 0.2)`, borderRadius: "10px", boxShadow: `0 6px 24px rgba(0,0,0,0.5), 0 2px 8px rgba(${accentRgb},0.08)` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ fontSize: "9px", color: COLOR.text.secondary, fontFamily: FONT.family.display, textTransform: "uppercase", letterSpacing: "0.06em" }}>Fördelning</div>
            <span style={{
              fontSize: "10px",
              color: pctOk ? COLOR.positive : COLOR.negative,
              background: pctOk ? COLOR.tint.positive : COLOR.tint.negativeStrong,
              padding: "2px 8px", borderRadius: "20px", fontFamily: FONT.family.display, fontWeight: 600,
            }}>{totalPct.toFixed(1)}% fördelat</span>
          </div>
          <div style={{ display: "flex", height: "6px", borderRadius: "20px", overflow: "hidden", marginBottom: "10px" }}>
            {funds.map((f, i) => {
              const pct = allocations[f.id]?.pct || 0;
              const color = viewMode === "compare" ? (isB ? ALLOC_SHADES_B : ALLOC_SHADES_A)[i % 10] : FUND_COLORS[i % FUND_COLORS.length];
              return pct > 0 ? (
                <div key={f.id} style={{ width: `${pct}%`, background: color, transition: "width 0.3s ease" }} />
              ) : null;
            })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px" }}>
            {funds.map((f, i) => {
              const pct = allocations[f.id]?.pct || 0;
              const color = viewMode === "compare" ? (isB ? ALLOC_SHADES_B : ALLOC_SHADES_A)[i % 10] : FUND_COLORS[i % FUND_COLORS.length];
              const shortName = f.name.length > 20 ? f.name.slice(0, 19) + "…" : f.name;
              return (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: "10px", color: COLOR.text.secondary, fontFamily: FONT.family.display }}>{shortName}</span>
                  <span style={{ fontSize: "10px", color: COLOR.text.primary, fontFamily: FONT.family.display, fontWeight: 600 }}>{pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {funds.length > 0 && (
        <div style={{ padding: isMobile ? "12px" : "14px", background: `rgba(${accentRgb}, 0.06)`, border: `1px solid rgba(${accentRgb}, 0.2)`, borderRadius: "10px", boxShadow: `0 6px 24px rgba(0,0,0,0.5), 0 2px 8px rgba(${accentRgb},0.08)` }}>
          <div style={{ fontSize: "9px", color: COLOR.text.secondary, marginBottom: "12px", fontFamily: FONT.family.display, textTransform: "uppercase", letterSpacing: "0.06em" }}>Portföljsammanfattning</div>
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: 1, background: COLOR.surface[1], borderRadius: "8px", padding: "10px 12px", boxShadow: SHADOW.medium }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                <span style={{ fontSize: "9px", color: COLOR.text.secondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>Avgift/år</span>
                <button
                  onClick={() => setShowFeeInfo(true)}
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: "15px", height: "15px", borderRadius: "50%",
                    border: `1px solid ${COLOR.border.circle}`, background: "none",
                    color: COLOR.text.secondary, fontSize: "9px", cursor: "pointer", lineHeight: 1,
                    fontFamily: FONT.family.display, flexShrink: 0, padding: 0 }}
                >?</button>
              </div>
              <div style={{ fontFamily: FONT.family.display, fontSize: "17px", fontWeight: 700, color: accentText }}>{fmtFee(fee)}</div>
              {portfolioTotal > 0 && <div style={{ fontSize: "10px", color: COLOR.text.secondary, marginTop: "2px" }}>{formatKr(portfolioTotal * fee / 100)}</div>}
            </div>
            <div style={{ flex: 1, background: COLOR.surface[1], borderRadius: "8px", padding: "10px 12px", boxShadow: SHADOW.medium }}>
              <div style={{ fontSize: "9px", color: COLOR.text.secondary, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "3px" }}>
                {inputMode === "kr" ? "Totalt" : "Belopp"}
              </div>
              <div style={{ fontFamily: FONT.family.display, fontSize: "17px", fontWeight: 700, color: COLOR.text.primary }}>
                {portfolioTotal > 0 ? formatKr(portfolioTotal) : "–"}
              </div>
              <div style={{ fontSize: "10px", color: COLOR.text.secondary, marginTop: "2px" }}>{funds.length} fonder</div>
            </div>
          </div>
        </div>
      )}

      {funds.length > 0 && (
        <button
          onClick={() => setShowDetails(true)}
          style={{
            width: "100%", background: `rgba(${accentRgb}, 0.07)`,
            border: `1px solid rgba(${accentRgb}, 0.25)`, color: accent,
            borderRadius: "8px", padding: "9px 14px", cursor: "pointer",
            fontSize: "12px", fontFamily: FONT.family.display, fontWeight: 600,
            transition: "background 0.2s", textAlign: "center",
          }}
          onMouseEnter={e => e.currentTarget.style.background = `rgba(${accentRgb}, 0.15)`}
          onMouseLeave={e => e.currentTarget.style.background = `rgba(${accentRgb}, 0.07)`}
        >
          Visa fullständig historik &amp; detaljer
        </button>
      )}

      {showDetails && (
        <FundDetailsModal
          funds={funds} accent={accent} accentRgb={accentRgb} label={label}
          onClose={() => setShowDetails(false)}
        />
      )}

      {showFeeInfo && (
        <div
          onClick={() => setShowFeeInfo(false)}
          style={{
            position: "fixed", inset: 0, background: COLOR.bg.overlay, backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: COLOR.bg.elevated, border: `1px solid ${COLOR.border.default}`,
              borderRadius: "16px", padding: "24px", maxWidth: "420px", width: "100%",
              fontFamily: FONT.family.display,
            }}
          >
            <div style={{ fontSize: "16px", fontWeight: 700, color: COLOR.text.primary, marginBottom: "12px" }}>Om avgifterna i portföljen</div>
            <p style={{ fontSize: "13px", fontFamily: FONT.family.body, color: COLOR.text.subtle, lineHeight: 1.6, margin: "0 0 16px 0" }}>
              Den visade avgiften är den viktade förvaltningsavgiften — varje fonds avgift vägs mot dess andel av portföljvärdet och justeras automatiskt när du ändrar fördelningen.
            </p>
            <div style={{ display: "flex", gap: "12px", marginBottom: "12px", alignItems: "flex-start" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: COLOR.fi, flexShrink: 0, marginTop: "3px" }} />
              <div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: COLOR.text.primary }}>FI — Finansinspektionen</div>
                <div style={{ fontSize: "11px", fontFamily: FONT.family.body, color: COLOR.text.subtle, marginTop: "2px", lineHeight: 1.5 }}>Juridiskt bindande förvaltningsavgift som fondbolagen rapporterar kvartalsvis till FI. Uppdateras automatiskt månadsvis.</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px", alignItems: "flex-start" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: COLOR.fallback, flexShrink: 0, marginTop: "3px" }} />
              <div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: COLOR.text.primary }}>Manuell — uppskattad avgift</div>
                <div style={{ fontSize: "11px", fontFamily: FONT.family.body, color: COLOR.text.subtle, marginTop: "2px", lineHeight: 1.5 }}>Avgiften saknar verifierad FI-data och är manuellt angiven — antingen i fondregistret eller av dig. Kontrollera aktuell avgift via fondens faktablad.</div>
              </div>
            </div>
            <div style={{ height: "1px", background: COLOR.border.muted, margin: "0 0 14px 0" }} />
            <div style={{ fontSize: "9px", color: COLOR.text.secondary, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>Verifiera på Morningstar</div>
            {funds.map(fund => {
              const ticker = fund.ticker?.replace(".ST", "");
              const isFallbackNonManual = fund.feeSource === "fallback" && !fund.isManual;
              return (
                <div key={fund.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "12px", color: COLOR.text.primary }}>{fund.name}</span>
                    {isFallbackNonManual && (
                      <span style={{ fontSize: "9px", color: COLOR.fallback, background: COLOR.tint.fallback, padding: "1px 5px", borderRadius: "4px" }}>Manuell avgift</span>
                    )}
                    {fund.isManual && (
                      <span style={{ fontSize: "9px", color: COLOR.fallback, background: COLOR.tint.fallback, padding: "1px 5px", borderRadius: "4px" }}>Manuell fond</span>
                    )}
                  </span>
                  <a
                    href={fund.isManual
                      ? "https://www.morningstar.se/se/funds/default.aspx"
                      : `https://www.morningstar.se/se/funds/snapshot/snapshot.aspx?id=${ticker}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: "11px", color: COLOR.fi, textDecoration: "none" }}
                  >{fund.isManual ? "Sök på Morningstar ↗" : "Morningstar ↗"}</a>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {editingFund && (
        <ManualFundModal
          initialData={editingFund}
          onSave={fund => {
            onSaveManualFund(fund);
            onUpdateFundData(fund);
            setEditingFund(null);
          }}
          onDelete={() => {
            onDeleteManualFund(editingFund.id);
            setEditingFund(null);
          }}
          onClose={() => setEditingFund(null)}
        />
      )}
    </div>
  );
}
