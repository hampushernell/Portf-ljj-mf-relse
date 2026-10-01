import { useState } from "react";
import useBreakpoint from "../hooks/useBreakpoint";
import { COLOR, FONT } from "../lib/tokens";
import { anim, ANIM } from "../lib/animations";

// Gemensam header för hela sajten — samma markup som siteHeader() i
// scripts/build-seo-pages.mjs. Se project-docs/mockups/header.html.
const LINKS = [
  { key: "jamfor", label: "Jämför", href: "/" },
  { key: "fonder", label: "Fonder", href: "/fonder/" },
];

export default function SiteHeader({ active = "jamfor", onOpenAbout }) {
  const { isMobile } = useBreakpoint();
  const [hovered, setHovered] = useState(null);
  const linkPad = isMobile ? 6 : 12;

  return (
    <header style={{
      display: "flex", alignItems: "center", gap: isMobile ? "8px" : "36px",
      height: isMobile ? "56px" : "64px", padding: isMobile ? "0 16px" : "0 36px",
      borderBottom: `1px solid ${COLOR.border.hairline}`,
    }}>
      <a href="/" style={{
        display: "inline-flex", alignItems: "center", gap: isMobile ? "7px" : "10px",
        fontFamily: FONT.family.display, fontWeight: FONT.weight.extrabold,
        fontSize: isMobile ? "15px" : FONT.size["3xl"], letterSpacing: FONT.tracking.tight,
        color: COLOR.text.primary, textDecoration: "none", whiteSpace: "nowrap",
      }}>
        <svg viewBox="0 0 44 40" width={isMobile ? 18 : 24} height={isMobile ? 16 : 22} aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
          <rect x="0" y="0" width="16" height="40" rx="5" fill="#5a6e8a"/>
          <rect x="20" y="0" width="24" height="40" rx="6" fill="#94a3b8"/>
        </svg>
        <span>MinPortfölj</span>
      </a>

      <nav aria-label="Huvudmeny" style={{ display: "flex", gap: isMobile ? 0 : "4px", height: "100%", marginLeft: isMobile ? "auto" : 0 }}>
        {LINKS.map(l => {
          const isActive = l.key === active;
          return (
            <a key={l.key} href={l.href} aria-current={isActive ? "page" : undefined}
              onMouseEnter={() => setHovered(l.key)} onMouseLeave={() => setHovered(null)}
              style={{
                position: "relative", display: "flex", alignItems: "center", padding: `0 ${linkPad}px`,
                fontFamily: FONT.family.display, fontSize: FONT.size.md, fontWeight: FONT.weight.semibold,
                textDecoration: "none", transition: anim(ANIM.tab),
                color: isActive || hovered === l.key ? COLOR.text.primary : COLOR.text.label,
              }}>
              {l.label}
              {isActive && (
                <span aria-hidden="true" style={{
                  position: "absolute", left: linkPad, right: linkPad, bottom: "-1px", height: "2px",
                  borderRadius: "2px 2px 0 0", background: COLOR.accentA,
                }} />
              )}
            </a>
          );
        })}
      </nav>

      <div style={{ marginLeft: isMobile ? "4px" : "auto", display: "flex", alignItems: "center", gap: "10px" }}>
        <button type="button" onClick={onOpenAbout}
          onMouseEnter={() => setHovered("om")} onMouseLeave={() => setHovered(null)}
          style={{
            display: "inline-flex", alignItems: "center", cursor: "pointer",
            background: COLOR.surface.tab, borderRadius: "20px", padding: isMobile ? "5px 10px" : "5px 14px",
            border: `1px solid ${hovered === "om" ? COLOR.border.edge : COLOR.border.card}`,
            fontFamily: FONT.family.display, fontSize: FONT.size.sm, fontWeight: FONT.weight.semibold,
            color: COLOR.text.secondary, transition: anim(ANIM.tab),
          }}>Om</button>
      </div>
    </header>
  );
}
