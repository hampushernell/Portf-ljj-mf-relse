import { COLOR, FONT } from "../lib/tokens";
import { ANIM, anim } from "../lib/animations";

const SECTION_LABEL = {
  fontFamily: FONT.family.display,
  fontSize: FONT.size.xxs,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: COLOR.text.secondary,
  marginBottom: "6px",
};

const BODY = {
  fontFamily: FONT.family.body,
  fontSize: FONT.size.base,
  color: COLOR.text.muted,
  lineHeight: 1.6,
  maxWidth: "65ch",
  margin: 0,
};

const DIVIDER = {
  border: "none",
  borderTop: `1px solid ${COLOR.border.subtle}`,
  margin: "20px 0",
};

export default function AboutModal({ onClose }) {
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
          borderRadius: "14px", padding: "28px 28px 24px",
          maxWidth: "540px", width: "100%", maxHeight: "85vh",
          overflow: "auto", position: "relative",
          animation: anim(ANIM.dialogMount),
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
          <h2 style={{ fontFamily: FONT.family.display, fontSize: FONT.size.xl, fontWeight: 700, lineHeight: 1.3, color: COLOR.text.primary, margin: 0 }}>
            Om minportfölj.se
          </h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: COLOR.text.secondary, cursor: "pointer", fontSize: FONT.icon.md, lineHeight: 1, padding: "0 4px", transition: anim(ANIM.hoverColor) }}
            onMouseEnter={e => e.target.style.color = COLOR.text.primary}
            onMouseLeave={e => e.target.style.color = COLOR.text.secondary}
          >×</button>
        </div>

        {/* Vad är minportfölj.se? */}
        <div style={{ marginBottom: "18px" }}>
          <p style={SECTION_LABEL}>Vad är minportfölj.se?</p>
          <p style={BODY}>
            Minportfölj är ett verktyg för att jämföra historisk avkastning, avgifter och risk på fonder. Du kan jämföra fonder mot varandra, se hur din portfölj utvecklats, portföljens totala avgift eller jämföra en portfölj mot en annan. Hemsidan har skapats av en enskild utvecklare som ett hobbyprojekt.
          </p>
        </div>

        {/* Transparens och begränsningar */}
        <div style={{ marginBottom: "18px" }}>
          <p style={SECTION_LABEL}>Transparens och begränsningar</p>
          <p style={BODY}>
            Minportfölj är inte ett professionellt finansiellt instrument och ska inte användas som ett. Fullständiga och juridiskt granskade finansdata kostar pengar — ibland väldigt mycket. Licensavtal med börsdatadistributörer, realtidspriser och certifierade datakällor är inte tillgängliga för en liten sajt utan institutionella resurser. Det vi kan göra är att vara öppna med exakt varifrån datan kommer och vad det innebär i praktiken.
          </p>
        </div>

        {/* Datakällor */}
        <div style={{ marginBottom: "18px" }}>
          <p style={SECTION_LABEL}>Datakällor</p>

          <p style={{ ...BODY, fontWeight: 500, color: COLOR.text.subtle, marginBottom: "4px" }}>Prishistorik</p>
          <p style={{ ...BODY, marginBottom: "14px" }}>
            Prisdata hämtas från Yahoo Finance. Yahoo Finance är inte en licensierad finansiell datakälla och datan kan vara något fördröjd, ofullständig eller i sällsynta fall felaktig.
          </p>
          <p style={{ ...BODY, marginBottom: "14px" }}>
            För majoriteten av fonderna finns prisdata i Yahoo Finance enbart från och med mars 2022 — oavsett hur länge fonden faktiskt har funnits. Är du osäker på hur långt tillbaka data sträcker sig för en specifik fond rekommenderar vi att du kontrollerar direkt hos fondbolaget.
          </p>

          <p style={{ ...BODY, fontWeight: 500, color: COLOR.text.subtle, marginBottom: "4px" }}>Avgifter</p>
          <p style={BODY}>
            Avgifter hämtas i första hand från Finansinspektionens (Fi) öppna register, registret kontrolleras varje månad. För fonder som saknas i registret — ofta för att fonden är registrerad utomlands — är avgiften manuellt inlagd med hjälp av AI baserat på fondbolagets publikt tillgängliga information. Manuellt inlagda avgifter markeras tydligt i gränssnittet och bör betraktas som indikativa.
          </p>
        </div>

        <hr style={DIVIDER} />

        {/* Kontakt */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: FONT.size.base, color: COLOR.text.secondary, lineHeight: 1 }}>✉</span>
          <span style={{ fontFamily: FONT.family.body, fontSize: FONT.size.md, color: COLOR.text.secondary }}>Frågor eller feedback?</span>
          <a href="mailto:info@minportfolj.se" style={{ fontFamily: FONT.family.display, fontSize: FONT.size.sm, fontWeight: 600, color: "#7b93ff", textDecoration: "none", marginLeft: "2px" }}>info@minportfolj.se</a>
        </div>
      </div>
    </div>
  );
}
