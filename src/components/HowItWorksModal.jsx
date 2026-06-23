import { useState, useEffect, useRef } from "react";
import { COLOR, FONT } from "../lib/tokens";

const ACCENT_A_LIGHT = "#7b93ff";

const STEPS = [
  {
    num: "01",
    title: "Lägg till fonder",
    desc: 'Klicka på "Lägg till fond" i Portfölj A. Sök på fondnamn eller filtrera per kategori — Globalfond, Sverigefond, Räntefond och fler. Klicka på en fond för att lägga till den.',
  },
  {
    num: "02",
    title: "Välj tidsspan och läs grafen",
    desc: "Klicka på ett tidsspan ovanför grafen — 3 mån, 1 år, 3 år eller Max. Grafen ritar om direkt. Tooltipet visar avkastning per datum. Sammanfattningsraden under namnger vinnaren.",
  },
  {
    num: "03",
    title: "Analysera utfallet",
    desc: "CAGR-tabellen visar genomsnittlig årsavkastning per period. Riskpanelen visar max nedgång och volatilitet — färgkodad grön–gul–röd så du direkt ser vilken portfölj tagit mest risk.",
  },
];

const STEP_DURATION = 5500;
const TICK_MS = 80;

const KEYFRAMES = `
@keyframes slideR { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: translateX(0); } }
@keyframes slideL { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: translateX(0); } }
@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
@keyframes sil { from { opacity: 0; transform: translateX(-14px); } to { opacity: 1; transform: translateX(0); } }
@keyframes spanPulse { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
@keyframes drawLine { from { stroke-dashoffset: 700; } to { stroke-dashoffset: 0; } }
@keyframes tipIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes fadeUp { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
@keyframes rPop { from { opacity: 0; transform: scale(0.84); } to { opacity: 1; transform: scale(1); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
@media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; } }
`;

// ── SVG illustrations ──────────────────────────────────────────────────────────

function Step1SVG() {
  return (
    <svg viewBox="0 0 520 200" width="100%" height="100%" style={{ display: "block" }} aria-hidden="true">
      <style>{`
        .r1 { animation: sil 0.38s ease both; animation-delay: 0.15s; }
        .r2 { animation: sil 0.38s ease both; animation-delay: 0.45s; }
        .r3 { animation: sil 0.38s ease both; animation-delay: 0.75s; }
        .cur { animation: blink 0.9s step-end infinite; }
      `}</style>

      {/* Card */}
      <rect x="14" y="5" width="492" height="190" rx="12" fill="#0d1120" stroke="rgba(255,255,255,0.10)" strokeWidth="1"/>

      {/* Card header */}
      <text x="30" y="25" fontFamily="Syne, sans-serif" fontSize="11.5" fontWeight="700" fill="#f0ede8">Lägg till fond</text>
      <text x="490" y="25" fontFamily="Syne, sans-serif" fontSize="17" fill="#5a6e8a" textAnchor="end">×</text>
      <line x1="14" y1="33" x2="506" y2="33" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>

      {/* Search bar */}
      <rect x="28" y="38" width="464" height="22" rx="5" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.11)" strokeWidth="1"/>
      <text x="42" y="53" fontFamily="Syne, sans-serif" fontSize="10" fill="#5a6e8a">Sök fond...</text>
      <rect className="cur" x="113" y="43" width="1.5" height="13" rx="0.5" fill="#7b93ff"/>

      {/* Chip row */}
      <rect x="28" y="65" width="72" height="16" rx="8" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>
      <text x="64" y="77" fontFamily="Syne, sans-serif" fontSize="8" fontWeight="600" fill="#5a6e8a" textAnchor="middle">▼ FILTRERA</text>
      <rect x="106" y="65" width="92" height="16" rx="8" fill="rgba(0,24,245,0.12)" stroke="rgba(0,24,245,0.35)" strokeWidth="1"/>
      <text x="152" y="77" fontFamily="Syne, sans-serif" fontSize="8" fontWeight="600" fill="#7b93ff" textAnchor="middle">GLOBALFOND ×</text>

      {/* Counter */}
      <text x="28" y="97" fontFamily="Syne, sans-serif" fontSize="8.5" fontWeight="600" letterSpacing="0.05em" fill="#5a6e8a">6 FONDER</text>

      {/* Fund rows */}
      {[
        { cls: "r1", y: 101, dot: "#7b93ff", name: "Länsförs. Global",    sub: "Globalfond · 0.20%" },
        { cls: "r2", y: 133, dot: "#38bdf8", name: "SPP Aktiefond Global", sub: "Globalfond · 0.15%" },
        { cls: "r3", y: 165, dot: "#6ee7b7", name: "Avanza Global",       sub: "Globalfond · 0.10%" },
      ].map(({ cls, y, dot, name, sub }) => (
        <g key={y} className={cls}>
          <rect x="28" y={y} width="464" height="28" rx="5" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
          <circle cx="43" cy={y + 14} r="3.5" fill={dot}/>
          <text x="53" y={y + 16} fontFamily="Syne, sans-serif" fontSize="10.5" fontWeight="600" fill="#f0ede8">{name}</text>
          <text x="53" y={y + 26} fontFamily="Syne, sans-serif" fontSize="9" fill="#5a6e8a">{sub}</text>
          <circle cx="479" cy={y + 14} r="8" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.13)" strokeWidth="1"/>
          <text x="479" y={y + 18.5} fontFamily="Syne, sans-serif" fontSize="13" fontWeight="300" fill="#94a3b8" textAnchor="middle">+</text>
        </g>
      ))}
    </svg>
  );
}

function Step2SVG() {
  return (
    <svg viewBox="0 0 520 200" width="100%" height="100%" style={{ display: "block" }} aria-hidden="true">
      <style>{`
        .sp-act { animation: spanPulse 1.6s ease infinite; }
        .la { stroke-dasharray: 700; stroke-dashoffset: 700; animation: drawLine 1.3s ease both; animation-delay: 0.3s; }
        .lb { stroke-dasharray: 700; stroke-dashoffset: 700; animation: drawLine 1.3s ease both; animation-delay: 0.75s; }
        .tip { animation: tipIn 0.4s ease both; animation-delay: 1.8s; opacity: 0; }
      `}</style>

      {/* Card border */}
      <rect x="14" y="5" width="492" height="190" rx="12" fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.10)" strokeWidth="1"/>

      {/* Header */}
      <text x="30" y="24" fontFamily="Syne, sans-serif" fontSize="11" fontWeight="700" fill="#f0ede8">Historisk avkastning</text>

      {/* Span buttons (right-aligned) */}
      {[
        { label: "3 mån", x: 336, active: false },
        { label: "1 år",  x: 381, active: false },
        { label: "3 år",  x: 416, active: true  },
        { label: "Max",   x: 455, active: false },
      ].map(({ label, x, active }) => (
        <g key={label}>
          <rect x={x} y="13" width={label.length * 5.8 + 12} height="16" rx="4"
            fill={active ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)"}
            stroke={active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)"} strokeWidth="1"
            className={active ? "sp-act" : ""}/>
          <text x={x + (label.length * 5.8 + 12) / 2} y="25" fontFamily="Syne, sans-serif" fontSize="8.5"
            fontWeight={active ? "700" : "400"} fill={active ? "#f0ede8" : "#5a6e8a"} textAnchor="middle">{label}</text>
        </g>
      ))}

      <line x1="14" y1="34" x2="506" y2="34" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>

      {/* Y-axis grid lines */}
      {[
        { y: 52,  label: "+150%" },
        { y: 88,  label: "+75%"  },
        { y: 124, label: "0%"    },
      ].map(({ y, label }) => (
        <g key={y}>
          <line x1="62" x2="504" y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 3"/>
          <text x="18" y={y + 4} fontFamily="Syne, sans-serif" fontSize="8" fill="#5a6e8a">{label}</text>
        </g>
      ))}

      {/* Line A */}
      <polyline className="la"
        points="62,124 152,108 248,88 352,70 448,56 504,50"
        fill="none" stroke="#7b93ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>

      {/* Line B */}
      <polyline className="lb"
        points="62,124 152,116 248,108 352,100 448,95 504,93"
        fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>

      {/* Tooltip */}
      <g className="tip">
        <rect x="316" y="46" width="86" height="42" rx="5" fill="#0d1120" stroke="rgba(255,255,255,0.13)" strokeWidth="1"/>
        <text x="359" y="60" fontFamily="Syne, sans-serif" fontSize="8.5" fill="#5a6e8a" textAnchor="middle">jun 2024</text>
        <circle cx="326" cy="70" r="3.5" fill="#7b93ff"/>
        <text x="333" y="73" fontFamily="Syne, sans-serif" fontSize="9.5" fontWeight="600" fill="#6ee7b7">+112%</text>
        <circle cx="326" cy="82" r="3.5" fill="#38bdf8"/>
        <text x="333" y="85" fontFamily="Syne, sans-serif" fontSize="9.5" fontWeight="600" fill="#38bdf8">+59%</text>
      </g>

      {/* Legend */}
      <circle cx="28" cy="139" r="4" fill="#7b93ff"/>
      <text x="36" y="143" fontFamily="Syne, sans-serif" fontSize="9.5" fill="#94a3b8">Portfölj A</text>
      <text x="94" y="143" fontFamily="Syne, sans-serif" fontSize="10" fontWeight="700" fill="#6ee7b7">+147%</text>
      <circle cx="148" cy="139" r="4" fill="#38bdf8"/>
      <text x="156" y="143" fontFamily="Syne, sans-serif" fontSize="9.5" fill="#94a3b8">Portfölj B</text>
      <text x="214" y="143" fontFamily="Syne, sans-serif" fontSize="10" fontWeight="700" fill="#38bdf8">+77%</text>

      {/* Summary row */}
      <rect x="14" y="153" width="492" height="42" rx="0" fill="rgba(255,255,255,0.025)"/>
      <line x1="14" y1="153" x2="506" y2="153" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
      <text x="30" y="173" fontFamily="Syne, sans-serif" fontSize="9.5" fontWeight="600" fill="#6ee7b7">Portfölj A +147%</text>
      <text x="149" y="173" fontFamily="Syne, sans-serif" fontSize="9.5" fill="#5a6e8a">  ·  </text>
      <text x="165" y="173" fontFamily="Syne, sans-serif" fontSize="9.5" fontWeight="600" fill="#38bdf8">Portfölj B +77%</text>
      <text x="272" y="173" fontFamily="Syne, sans-serif" fontSize="9.5" fill="#5a6e8a">  ·  </text>
      <text x="288" y="173" fontFamily="Syne, sans-serif" fontSize="9.5" fontWeight="600" fill="#f0ede8">Skillnad +70 pp</text>
    </svg>
  );
}

function Step3SVG() {
  return (
    <svg viewBox="0 0 520 200" width="100%" height="100%" style={{ display: "block" }} aria-hidden="true">
      <style>{`
        .fu1 { animation: fadeUp 0.32s ease both; animation-delay: 0.10s; }
        .fu2 { animation: fadeUp 0.32s ease both; animation-delay: 0.30s; }
        .fu3 { animation: fadeUp 0.32s ease both; animation-delay: 0.50s; }
        .fu4 { animation: fadeUp 0.32s ease both; animation-delay: 0.70s; }
        .fu5 { animation: fadeUp 0.32s ease both; animation-delay: 0.90s; }
        .rp1 { animation: rPop 0.35s ease both; animation-delay: 1.05s; }
        .rp2 { animation: rPop 0.35s ease both; animation-delay: 1.25s; }
        .rp3 { animation: rPop 0.35s ease both; animation-delay: 1.45s; }
        .rp4 { animation: rPop 0.35s ease both; animation-delay: 1.65s; }
      `}</style>

      {/* ── Left card: CAGR ── */}
      <rect x="8" y="6" width="246" height="188" rx="10" fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.10)" strokeWidth="1"/>

      <text x="22" y="22" fontFamily="Syne, sans-serif" fontSize="9.5" fontWeight="700" fill="#f0ede8">Historisk snittavkastning</text>
      <text x="22" y="33" fontFamily="Syne, sans-serif" fontSize="8.5" fill="#5a6e8a">CAGR (per år)</text>

      {/* Column headers */}
      <text x="22" y="48" fontFamily="Syne, sans-serif" fontSize="8" fontWeight="600" letterSpacing="0.05em" fill="#5a6e8a">PERIOD</text>
      <text x="178" y="48" fontFamily="Syne, sans-serif" fontSize="8" fontWeight="600" letterSpacing="0.04em" fill="#7b93ff" textAnchor="end">A</text>
      <text x="242" y="48" fontFamily="Syne, sans-serif" fontSize="8" fontWeight="600" letterSpacing="0.04em" fill="#38bdf8" textAnchor="end">B</text>
      <line x1="8" y1="52" x2="254" y2="52" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>

      {/* CAGR rows */}
      {[
        { cls: "fu1", y: 64,  period: "1 mån",  a: "+1.2%",  b: "+0.8%"  },
        { cls: "fu2", y: 84,  period: "1 år",   a: "+23.4%", b: "+18.7%" },
        { cls: "fu3", y: 104, period: "3 år",   a: "+18.6%", b: "+14.2%" },
        { cls: "fu4", y: 124, period: "Max",    a: "+9.8%",  b: "+7.4%"  },
      ].map(({ cls, y, period, a, b }) => (
        <g key={y} className={cls}>
          <text x="22" y={y} fontFamily="Syne, sans-serif" fontSize="9.5" fill="#5a6e8a">{period}</text>
          <text x="178" y={y} fontFamily="Syne, sans-serif" fontSize="10" fontWeight="600" fill="#6ee7b7" textAnchor="end">{a}</text>
          <text x="242" y={y} fontFamily="Syne, sans-serif" fontSize="10" fontWeight="600" fill="#38bdf8" textAnchor="end">{b}</text>
          <line x1="8" y1={y + 6} x2="254" y2={y + 6} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
        </g>
      ))}

      {/* ── Right card: Risk ── */}
      <rect x="264" y="6" width="248" height="188" rx="10" fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.10)" strokeWidth="1"/>

      <text x="278" y="22" fontFamily="Syne, sans-serif" fontSize="9.5" fontWeight="700" fill="#f0ede8">Riskanalys</text>

      {/* Column headers */}
      <text x="278" y="48" fontFamily="Syne, sans-serif" fontSize="8" fontWeight="600" letterSpacing="0.05em" fill="#5a6e8a">RISK</text>
      <text x="382" y="48" fontFamily="Syne, sans-serif" fontSize="8" fontWeight="600" letterSpacing="0.04em" fill="#7b93ff" textAnchor="middle">A</text>
      <text x="470" y="48" fontFamily="Syne, sans-serif" fontSize="8" fontWeight="600" letterSpacing="0.04em" fill="#38bdf8" textAnchor="middle">B</text>
      <line x1="264" y1="52" x2="512" y2="52" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>

      {/* Max nedgång */}
      <text x="278" y="72" fontFamily="Syne, sans-serif" fontSize="9" fill="#5a6e8a">Max nedgång</text>
      <g className="rp1">
        <rect x="352" y="58" width="54" height="18" rx="4" fill="rgba(248,113,113,0.14)" stroke="rgba(248,113,113,0.25)" strokeWidth="1"/>
        <text x="379" y="71" fontFamily="Syne, sans-serif" fontSize="9.5" fontWeight="600" fill="#f87171" textAnchor="middle">−28%</text>
      </g>
      <g className="rp2">
        <rect x="440" y="58" width="54" height="18" rx="4" fill="rgba(245,158,11,0.14)" stroke="rgba(245,158,11,0.25)" strokeWidth="1"/>
        <text x="467" y="71" fontFamily="Syne, sans-serif" fontSize="9.5" fontWeight="600" fill="#f59e0b" textAnchor="middle">−22%</text>
      </g>
      <line x1="264" y1="84" x2="512" y2="84" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>

      {/* Volatilitet */}
      <text x="278" y="104" fontFamily="Syne, sans-serif" fontSize="9" fill="#5a6e8a">Volatilitet/år</text>
      <g className="rp3">
        <rect x="352" y="90" width="54" height="18" rx="4" fill="rgba(245,158,11,0.14)" stroke="rgba(245,158,11,0.25)" strokeWidth="1"/>
        <text x="379" y="103" fontFamily="Syne, sans-serif" fontSize="9.5" fontWeight="600" fill="#f59e0b" textAnchor="middle">14.2%</text>
      </g>
      <g className="rp4">
        <rect x="440" y="90" width="54" height="18" rx="4" fill="rgba(110,231,183,0.14)" stroke="rgba(110,231,183,0.25)" strokeWidth="1"/>
        <text x="467" y="103" fontFamily="Syne, sans-serif" fontSize="9.5" fontWeight="600" fill="#6ee7b7" textAnchor="middle">11.8%</text>
      </g>
      <line x1="264" y1="116" x2="512" y2="116" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>

      {/* Shared fu5 summary row */}
      <g className="fu5">
        <rect x="264" y="128" width="248" height="58" rx="0" fill="rgba(255,255,255,0.02)"/>
        <line x1="264" y1="128" x2="512" y2="128" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
        <text x="278" y="145" fontFamily="Syne, sans-serif" fontSize="8.5" fontWeight="600" letterSpacing="0.04em" fill="#5a6e8a">VINNARE PER MÅTT</text>
        <text x="278" y="162" fontFamily="Syne, sans-serif" fontSize="9" fill="#94a3b8">Avkastning</text>
        <text x="390" y="162" fontFamily="Syne, sans-serif" fontSize="9.5" fontWeight="700" fill="#7b93ff">Portfölj A</text>
        <text x="278" y="176" fontFamily="Syne, sans-serif" fontSize="9" fill="#94a3b8">Lägst risk</text>
        <text x="390" y="176" fontFamily="Syne, sans-serif" fontSize="9.5" fontWeight="700" fill="#38bdf8">Portfölj B</text>
      </g>
    </svg>
  );
}

const SVG_BY_STEP = [Step1SVG, Step2SVG, Step3SVG];

// ── Progress bar ───────────────────────────────────────────────────────────────

function ProgressBar({ onAdvance }) {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);
  const progressRef = useRef(0);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      progressRef.current += (TICK_MS / STEP_DURATION) * 100;
      if (progressRef.current >= 100) {
        clearInterval(intervalRef.current);
        setProgress(100);
        onAdvance();
      } else {
        setProgress(progressRef.current);
      }
    }, TICK_MS);
    return () => clearInterval(intervalRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ height: "2px", background: "rgba(255,255,255,0.06)", flexShrink: 0 }}>
      <div style={{
        height: "100%", width: `${progress}%`,
        background: ACCENT_A_LIGHT,
        transition: `width ${TICK_MS}ms linear`,
      }}/>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────

export default function HowItWorksModal({ onClose }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState("forward");
  const StepSVG = SVG_BY_STEP[step];

  const goNext = () => {
    setDirection("forward");
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };
  const goPrev = () => {
    setDirection("backward");
    setStep(s => Math.max(s - 1, 0));
  };
  const goStep = (i) => {
    setDirection(i >= step ? "forward" : "backward");
    setStep(i);
  };
  const handleAdvance = () => {
    if (step < STEPS.length - 1) goNext();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.62)", backdropFilter: "blur(5px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <style>{KEYFRAMES}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: COLOR.bg.elevated,
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: "16px",
          width: "min(520px, 92vw)",
          position: "relative",
          overflow: "hidden",
          animation: "scaleIn 0.25s ease",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Stäng"
          style={{
            position: "absolute", top: "11px", right: "11px", zIndex: 2,
            width: "27px", height: "27px",
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)",
            color: COLOR.text.secondary, cursor: "pointer", fontSize: "17px",
            lineHeight: 1, borderRadius: "6px", display: "flex", alignItems: "center",
            justifyContent: "center", transition: "color 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.color = COLOR.text.primary}
          onMouseLeave={e => e.currentTarget.style.color = COLOR.text.secondary}
        >×</button>

        {/* Animated step wrapper */}
        <div style={{ overflow: "hidden", position: "relative" }}>
          <div
            key={step}
            style={{ animation: `${direction === "forward" ? "slideR" : "slideL"} 0.3s ease` }}
          >
            {/* Illustration */}
            <div style={{
              height: "200px",
              background: COLOR.bg.base,
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              overflow: "hidden",
            }}>
              <StepSVG />
            </div>

            {/* Text section */}
            <div style={{ padding: "18px 24px 14px" }}>
              <p style={{
                fontFamily: FONT.family.display,
                fontSize: "10px", fontWeight: 700,
                letterSpacing: "0.07em", textTransform: "uppercase",
                color: ACCENT_A_LIGHT, margin: "0 0 5px",
              }}>
                {STEPS[step].num} / {String(STEPS.length).padStart(2, "0")}
              </p>
              <h2 style={{
                fontFamily: FONT.family.display,
                fontSize: "16px", fontWeight: 700,
                color: COLOR.text.primary, margin: "0 0 7px",
                letterSpacing: "-0.01em",
              }}>
                {STEPS[step].title}
              </h2>
              <p style={{
                fontFamily: FONT.family.body,
                fontSize: "13px", color: COLOR.text.muted,
                lineHeight: 1.6, margin: 0,
              }}>
                {STEPS[step].desc}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px 18px",
        }}>
          {/* Dot navigation */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => goStep(i)}
                aria-label={`Steg ${i + 1}`}
                style={{
                  width: i === step ? "18px" : "6px", height: "6px",
                  borderRadius: "3px", border: "none", cursor: "pointer",
                  background: i === step ? ACCENT_A_LIGHT : "rgba(255,255,255,0.18)",
                  padding: 0, transition: "width 0.25s ease, background 0.2s",
                }}
              />
            ))}
          </div>

          {/* Prev / Next */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={goPrev}
              disabled={step === 0}
              style={{
                fontFamily: FONT.family.display, fontSize: "11px", fontWeight: 600,
                padding: "6px 14px", borderRadius: "6px",
                border: "1px solid rgba(255,255,255,0.12)", background: "transparent",
                color: step === 0 ? "rgba(255,255,255,0.2)" : COLOR.text.secondary,
                cursor: step === 0 ? "default" : "pointer", transition: "color 0.2s",
              }}
            >Föregående</button>

            {step < STEPS.length - 1 ? (
              <button
                onClick={goNext}
                style={{
                  fontFamily: FONT.family.display, fontSize: "11px", fontWeight: 600,
                  padding: "6px 14px", borderRadius: "6px",
                  border: "none", background: ACCENT_A_LIGHT,
                  color: "#010911", cursor: "pointer",
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >Nästa</button>
            ) : (
              <button
                onClick={onClose}
                style={{
                  fontFamily: FONT.family.display, fontSize: "11px", fontWeight: 600,
                  padding: "6px 14px", borderRadius: "6px",
                  border: "none", background: ACCENT_A_LIGHT,
                  color: "#010911", cursor: "pointer",
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >Stäng</button>
            )}
          </div>
        </div>

        {/* Progress bar — key remounts on step change, restarting the timer */}
        <ProgressBar key={step} onAdvance={handleAdvance} />
      </div>
    </div>
  );
}
