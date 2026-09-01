import { getLatestNavTs } from "../lib/calculations";
import { normalizeToCalendar } from "../lib/normalize";
import { rebaseSeries } from "../lib/blend";
import { getDisplayRange } from "../lib/dateRange";
import { FUND_ISINS, fmtFee, fmtPct } from "../lib/utils";
import { COLOR, FONT } from "../lib/tokens";
import { ANIM, anim } from "../lib/animations";
import { FeeBadge } from "./FeeBadge";

export default function FundDetailsModal({ funds, accent, accentRgb, label, onClose }) {
  const latestNavTs = getLatestNavTs(funds.filter(f => !f.isManual));
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: COLOR.bg.overlay, backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
        animation: anim(ANIM.overlayMount),
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: COLOR.bg.elevated, border: `1px solid ${COLOR.border.default}`,
          borderRadius: "16px", padding: "28px 28px 24px",
          maxWidth: "640px", width: "100%", maxHeight: "85vh",
          overflow: "auto", position: "relative",
          animation: anim(ANIM.dialogMount),
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <h2 style={{ fontFamily: FONT.family.display, fontSize: FONT.size.xl, fontWeight: 700, color: COLOR.text.primary, margin: 0 }}>
            {label} – Detaljer & historik
          </h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: COLOR.text.secondary, cursor: "pointer", fontSize: FONT.icon.md, lineHeight: 1, padding: "0 4px", transition: anim(ANIM.hoverColor) }}
            onMouseEnter={e => e.target.style.color = COLOR.text.primary}
            onMouseLeave={e => e.target.style.color = COLOR.text.secondary}
          >×</button>
        </div>

        <div style={{
          background: `rgba(${accentRgb}, 0.07)`, border: `1px solid rgba(${accentRgb}, 0.22)`,
          borderRadius: "10px", padding: "12px 16px", marginBottom: "22px",
          fontSize: FONT.size.md, color: COLOR.text.subtle, lineHeight: 1.65, fontFamily: FONT.family.body,
        }}>
          Prisdata hämtas från Yahoo Finance och är tillgänglig fr.o.m. mars 2022 för dessa fonder.
          För fullständig historik, besök respektive fondsida via länkarna nedan.
        </div>

        {funds.map(fund => {
          let ret1y = null;
          if (!fund.isManual && fund.prices?.length) {
            const { startTs, endTs } = getDisplayRange("1 år", latestNavTs);
            const normalized = normalizeToCalendar(fund.prices, startTs, endTs);
            const s1y = rebaseSeries(normalized);
            ret1y = s1y.length ? s1y[s1y.length - 1].value - 100 : null;
          }
          const oldestDate = fund.prices?.[0]?.timestamp
            ? new Date(fund.prices[0].timestamp * 1000).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" })
            : "–";
          const isin = FUND_ISINS[fund.ticker] || "–";
          const morningstarUrl = `https://www.morningstar.se/se/funds/snapshot/snapshot.aspx?id=${fund.ticker.replace(".ST", "")}`;

          return (
            <div key={fund.id} style={{
              background: COLOR.surface.faint, border: `1px solid ${COLOR.border.subtle}`,
              borderRadius: "10px", padding: "14px 16px", marginBottom: "10px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                <div>
                  <div style={{ fontFamily: FONT.family.display, fontSize: FONT.size.base, fontWeight: 700, color: COLOR.text.primary }}>{fund.name}</div>
                  <div style={{ fontSize: FONT.size.sm, color: COLOR.text.secondary, marginTop: "2px" }}>{fund.category}</div>
                </div>
                <a
                  href={morningstarUrl} target="_blank" rel="noopener noreferrer"
                  style={{
                    fontSize: FONT.size.sm, color: accent, textDecoration: "none",
                    fontFamily: FONT.family.display, fontWeight: 600,
                    background: `rgba(${accentRgb}, 0.1)`, padding: "5px 11px",
                    borderRadius: "6px", border: `1px solid rgba(${accentRgb}, 0.3)`,
                    whiteSpace: "nowrap", transition: anim(ANIM.hover),
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = `rgba(${accentRgb}, 0.2)`}
                  onMouseLeave={e => e.currentTarget.style.background = `rgba(${accentRgb}, 0.1)`}
                >
                  Visa på Morningstar ↗
                </a>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "7px" }}>
                <div style={{ background: COLOR.surface[1], borderRadius: "7px", padding: "8px 10px" }}>
                  <div style={{ fontSize: FONT.size.xxs, color: COLOR.text.secondary, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px", fontFamily: FONT.family.display }}>Avgift/år</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ fontFamily: FONT.family.display, fontSize: FONT.size.md, fontWeight: 600, color: COLOR.text.primary }}>{fmtFee(fund.fee)}</span>
                    <FeeBadge source={fund.feeSource} period={fund.feePeriod} isManual={fund.isManual ?? false} updatedAt={fund.updatedAt} />
                  </div>
                </div>
                {[
                  { lbl: "ISIN", val: isin, mono: true },
                  { lbl: "Avk. 1 år", val: ret1y !== null ? fmtPct(ret1y) : "–", color: ret1y !== null ? (ret1y >= 0 ? COLOR.positive : COLOR.negative) : COLOR.text.secondary },
                  { lbl: "Data fr.o.m.", val: oldestDate },
                ].map(({ lbl, val, color, mono }) => (
                  <div key={lbl} style={{ background: COLOR.surface[1], borderRadius: "7px", padding: "8px 10px" }}>
                    <div style={{ fontSize: FONT.size.xxs, color: COLOR.text.secondary, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px", fontFamily: FONT.family.display }}>{lbl}</div>
                    <div style={{ fontFamily: mono ? "monospace" : FONT.family.display, fontSize: mono ? "10px" : "12px", fontWeight: 600, color: color || COLOR.text.primary }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
