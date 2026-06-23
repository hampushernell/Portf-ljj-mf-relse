import { useState, useEffect, useRef } from "react";
import { COLOR, FONT } from "../lib/tokens";
import useBreakpoint from "../hooks/useBreakpoint";

const ACCENT_A_LIGHT = "#7b93ff";

const STEPS = [
  {
    num: "01",
    title: "Lägg till fonder",
    desc: 'Klicka på "Lägg till fond" i Portfölj A. Sök på fondnamn eller filtrera per kategori — globalfond, sverigefond, räntefond och fler.',
  },
  {
    num: "02",
    title: "Välj tidsspan",
    desc: "Klicka på 1 år, 3 år eller Max ovanför grafen. Linjen ritar om direkt — indexerad från 100 från periodens start.",
  },
  {
    num: "03",
    title: "Jämför två portföljer",
    desc: "Byt till Jämför-läget och bygg en andra portfölj. Mixa fonder och justera vikter med slidern — grafen uppdateras i realtid.",
  },
  {
    num: "04",
    title: "Analysera utfallet",
    desc: "Under grafen: CAGR per period och riskanalys med max drawdown och volatilitet färgkodad grön–gul–röd.",
  },
];

const KEYFRAMES = `
@keyframes slideInFromRight {
  from { opacity: 0; transform: translateX(32px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes slideInFromLeft {
  from { opacity: 0; transform: translateX(-32px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-18px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
@keyframes tooltipFade {
  0%,  55% { opacity: 0; transform: translateY(4px); }
  65%, 85% { opacity: 1; transform: translateY(0);   }
  95%,100% { opacity: 0; transform: translateY(-2px); }
}
@keyframes drawLine {
  from { stroke-dashoffset: 300; }
  to   { stroke-dashoffset: 0;   }
}
@keyframes spanPulse {
  0%,100% { opacity: 0.5; }
  50%     { opacity: 1;   }
}
@keyframes tooltipIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0);   }
}
@keyframes panelFadeA {
  from { opacity: 0; transform: translateX(-14px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes panelFadeB {
  from { opacity: 0; transform: translateX(14px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes sliderMove {
  from { transform: translateX(0); }
  to   { transform: translateX(52px); }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0);   }
}
@keyframes riskPop {
  from { opacity: 0; transform: scale(0.85); }
  to   { opacity: 1; transform: scale(1);    }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1);    }
}
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
}
`;

// ── SVG illustrations ─────────────────────────────────────────────────────────

function Step1SVG() {
  return (
    <svg viewBox="0 0 500 188" width="100%" height="100%" style={{ display: "block" }} aria-hidden="true">
      <style>{`
        .s1-row { animation: slideInLeft 0.4s ease both; }
        .s1-row1 { animation-delay: 0.2s; }
        .s1-row2 { animation-delay: 0.55s; }
        .s1-row3 { animation-delay: 0.9s; }
        .s1-cursor { animation: blink 0.9s infinite; }
        .s1-tooltip { animation: tooltipFade 3.5s infinite; }
      `}</style>

      {/* Modal card */}
      <rect x="100" y="14" width="300" height="162" rx="10" fill="#0d1120" stroke="rgba(255,255,255,0.10)" strokeWidth="1"/>

      {/* Search bar */}
      <rect x="116" y="28" width="268" height="28" rx="5" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.11)" strokeWidth="1"/>
      <text x="130" y="47" fontFamily="'Syne', sans-serif" fontSize="11" fill="#94a3b8">Sök fond...</text>
      <rect className="s1-cursor" x="207" y="33" width="1.5" height="16" rx="1" fill="#7b93ff"/>

      {/* Fund rows */}
      {[
        { y: 68,  name: "Länsförs. Global",  fee: "0.20%", cls: "s1-row s1-row1" },
        { y: 98,  name: "SPP Aktiefond Global", fee: "0.15%", cls: "s1-row s1-row2" },
        { y: 128, name: "Avanza Global",      fee: "0.10%", cls: "s1-row s1-row3" },
      ].map(({ y, name, fee, cls }) => (
        <g key={y} className={cls}>
          <rect x="116" y={y} width="268" height="22" rx="4" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
          <text x="127" y={y + 15} fontFamily="'Syne', sans-serif" fontSize="10" fill="#f0ede8">{name}</text>
          <text x="354" y={y + 15} fontFamily="'Syne', sans-serif" fontSize="10" fill="#94a3b8" textAnchor="end">{fee}</text>
        </g>
      ))}

      {/* Tooltip "Lägg till" */}
      <g className="s1-tooltip">
        <rect x="326" y="120" width="60" height="18" rx="4" fill="#7b93ff"/>
        <text x="356" y="132" fontFamily="'Syne', sans-serif" fontSize="9" fontWeight="600" fill="#010911" textAnchor="middle">Lägg till</text>
      </g>
    </svg>
  );
}

function Step2SVG() {
  return (
    <svg viewBox="0 0 500 188" width="100%" height="100%" style={{ display: "block" }} aria-hidden="true">
      <style>{`
        .s2-lineA { stroke-dasharray: 300; animation: drawLine 1.4s ease both; animation-delay: 0.3s; }
        .s2-lineB { stroke-dasharray: 300; animation: drawLine 1.4s ease both; animation-delay: 0.7s; }
        .s2-span  { animation: spanPulse 1.5s ease infinite; }
        .s2-tip   { animation: tooltipIn 0.4s ease both; animation-delay: 1.8s; }
      `}</style>

      {/* Span buttons */}
      {[
        { label: "1 år",  x: 110, active: false },
        { label: "3 år",  x: 155, active: true  },
        { label: "Max",   x: 202, active: false },
      ].map(({ label, x, active }) => (
        <g key={label}>
          <rect x={x} y="14" width="38" height="18" rx="4"
            fill={active ? "rgba(123,147,255,0.18)" : "rgba(255,255,255,0.04)"}
            stroke={active ? "rgba(123,147,255,0.4)" : "rgba(255,255,255,0.08)"} strokeWidth="1"
            className={active ? "s2-span" : ""}/>
          <text x={x + 19} y="27" fontFamily="'Syne', sans-serif" fontSize="9" fontWeight={active ? "700" : "400"}
            fill={active ? "#7b93ff" : "#94a3b8"} textAnchor="middle">{label}</text>
        </g>
      ))}

      {/* Chart axes */}
      <line x1="90" y1="44" x2="90" y2="158" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
      <line x1="90" y1="158" x2="420" y2="158" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>

      {/* Horizontal grid */}
      {[70, 100, 130].map(y => (
        <line key={y} x1="90" x2="420" y1={y} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 4"/>
      ))}

      {/* Line A */}
      <polyline className="s2-lineA"
        points="90,130 150,118 210,108 270,95 330,80 390,62 420,55"
        fill="none" stroke="#7b93ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>

      {/* Line B */}
      <polyline className="s2-lineB"
        points="90,135 150,128 210,122 270,115 330,108 390,98 420,92"
        fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>

      {/* Tooltip */}
      <g className="s2-tip">
        <rect x="350" y="42" width="72" height="32" rx="5" fill="#0d1120" stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>
        <text x="386" y="55" fontFamily="'Syne', sans-serif" fontSize="9" fill="#94a3b8" textAnchor="middle">Portfölj A</text>
        <text x="386" y="68" fontFamily="'Syne', sans-serif" fontSize="10" fontWeight="700" fill="#7b93ff" textAnchor="middle">+42.3%</text>
      </g>
    </svg>
  );
}

function Step3SVG() {
  return (
    <svg viewBox="0 0 500 188" width="100%" height="100%" style={{ display: "block" }} aria-hidden="true">
      <style>{`
        .s3-panelA { animation: panelFadeA 0.5s ease both; animation-delay: 0.1s; }
        .s3-panelB { animation: panelFadeB 0.5s ease both; animation-delay: 0.4s; }
        .s3-thumb  { animation: sliderMove 2.5s ease 0.8s infinite alternate; }
        .s3-badge  { animation: fadeUp 0.4s ease both; animation-delay: 1.0s; }
      `}</style>

      {/* Panel A */}
      <g className="s3-panelA">
        <rect x="30" y="14" width="198" height="162" rx="8" fill="#0d1120" stroke="rgba(0,24,245,0.35)" strokeWidth="1"/>
        <text x="44" y="33" fontFamily="'Syne', sans-serif" fontSize="10" fontWeight="700" fill="#7b93ff">Portfölj A</text>
        {/* Fund rows */}
        {[
          { y: 44, name: "Länsförs. Global", pct: "60%"  },
          { y: 66, name: "Avanza Global",    pct: "40%"  },
        ].map(({ y, name, pct }) => (
          <g key={y}>
            <rect x="44" y={y} width="170" height="18" rx="3" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
            <text x="52" y={y + 12} fontFamily="'Syne', sans-serif" fontSize="9" fill="#f0ede8">{name}</text>
            <text x="206" y={y + 12} fontFamily="'Syne', sans-serif" fontSize="9" fill="#7b93ff" textAnchor="end">{pct}</text>
          </g>
        ))}
        {/* Slider */}
        <rect x="44" y="96" width="170" height="4" rx="2" fill="rgba(255,255,255,0.08)"/>
        <rect x="44" y="96" width="100" height="4" rx="2" fill="rgba(123,147,255,0.5)"/>
        <circle className="s3-thumb" cx="144" cy="98" r="6" fill="#7b93ff" stroke="#0d1120" strokeWidth="1.5"/>
      </g>

      {/* Panel B */}
      <g className="s3-panelB">
        <rect x="272" y="14" width="198" height="162" rx="8" fill="#0d1120" stroke="rgba(56,189,248,0.3)" strokeWidth="1"/>
        <text x="286" y="33" fontFamily="'Syne', sans-serif" fontSize="10" fontWeight="700" fill="#38bdf8">Portfölj B</text>
        {[
          { y: 44, name: "Swedbank Robur",  pct: "50%" },
          { y: 66, name: "SPP Aktiefond",   pct: "50%" },
        ].map(({ y, name, pct }) => (
          <g key={y}>
            <rect x="286" y={y} width="170" height="18" rx="3" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
            <text x="294" y={y + 12} fontFamily="'Syne', sans-serif" fontSize="9" fill="#f0ede8">{name}</text>
            <text x="448" y={y + 12} fontFamily="'Syne', sans-serif" fontSize="9" fill="#38bdf8" textAnchor="end">{pct}</text>
          </g>
        ))}
        <rect x="286" y="96" width="170" height="4" rx="2" fill="rgba(255,255,255,0.08)"/>
        <rect x="286" y="96" width="85" height="4" rx="2" fill="rgba(56,189,248,0.5)"/>
        <circle cx="371" cy="98" r="6" fill="#38bdf8" stroke="#0d1120" strokeWidth="1.5"/>
      </g>

      {/* FI badge */}
      <g className="s3-badge">
        <rect x="210" y="80" width="80" height="20" rx="4" fill="rgba(58,154,168,0.18)" stroke="rgba(58,154,168,0.4)" strokeWidth="1"/>
        <text x="250" y="94" fontFamily="'Syne', sans-serif" fontSize="9" fontWeight="600" fill="#3a9aa8" textAnchor="middle">FI-avgift</text>
      </g>
    </svg>
  );
}

function Step4SVG() {
  return (
    <svg viewBox="0 0 500 188" width="100%" height="100%" style={{ display: "block" }} aria-hidden="true">
      <style>{`
        .s4-row1  { animation: fadeUp 0.4s ease both; animation-delay: 0.1s; }
        .s4-row2  { animation: fadeUp 0.4s ease both; animation-delay: 0.35s; }
        .s4-row3  { animation: fadeUp 0.4s ease both; animation-delay: 0.6s; }
        .s4-row4  { animation: fadeUp 0.4s ease both; animation-delay: 0.9s; }
        .s4-rbad1 { animation: riskPop 0.3s ease both; animation-delay: 1.1s; }
        .s4-rbad2 { animation: riskPop 0.3s ease both; animation-delay: 1.3s; }
      `}</style>

      {/* Summary row */}
      <g className="s4-row1">
        <rect x="60" y="10" width="380" height="26" rx="5" fill="rgba(123,147,255,0.08)" stroke="rgba(123,147,255,0.2)" strokeWidth="1"/>
        <text x="76" y="27" fontFamily="'Syne', sans-serif" fontSize="10" fill="#94a3b8">Portfölj A</text>
        <text x="360" y="27" fontFamily="'Syne', sans-serif" fontSize="11" fontWeight="700" fill="#7b93ff" textAnchor="end">+57.2%</text>
        <text x="432" y="27" fontFamily="'Syne', sans-serif" fontSize="9" fill="#94a3b8" textAnchor="end">CAGR Max</text>
      </g>

      {/* CAGR table rows */}
      {[
        { y: 46,  label: "CAGR 3 år",  val: "+18.4%", color: "#7b93ff", cls: "s4-row2" },
        { y: 72,  label: "CAGR Max",   val: "+9.7%",  color: "#7b93ff", cls: "s4-row3" },
        { y: 98,  label: "Volatilitet",val: "14.2%",  color: "#f59e0b", cls: "s4-row4" },
      ].map(({ y, label, val, color, cls }) => (
        <g key={y} className={cls}>
          <rect x="60" y={y} width="380" height="20" rx="4" fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
          <text x="76" y={y + 13} fontFamily="'Syne', sans-serif" fontSize="10" fill="#94a3b8">{label}</text>
          <text x="430" y={y + 13} fontFamily="'Syne', sans-serif" fontSize="10" fontWeight="600" fill={color} textAnchor="end">{val}</text>
        </g>
      ))}

      {/* Risk badges */}
      <g className="s4-rbad1">
        <rect x="60" y="130" width="88" height="22" rx="5" fill="rgba(248,113,113,0.15)" stroke="rgba(248,113,113,0.3)" strokeWidth="1"/>
        <text x="104" y="145" fontFamily="'Syne', sans-serif" fontSize="9" fontWeight="600" fill="#f87171" textAnchor="middle">Max DD −28%</text>
      </g>
      <g className="s4-rbad2">
        <rect x="158" y="130" width="96" height="22" rx="5" fill="rgba(245,158,11,0.15)" stroke="rgba(245,158,11,0.3)" strokeWidth="1"/>
        <text x="206" y="145" fontFamily="'Syne', sans-serif" fontSize="9" fontWeight="600" fill="#f59e0b" textAnchor="middle">Volatilitet 14%</text>
      </g>
      <g className="s4-rbad1" style={{ animationDelay: "1.45s" }}>
        <rect x="264" y="130" width="96" height="22" rx="5" fill="rgba(110,231,183,0.15)" stroke="rgba(110,231,183,0.3)" strokeWidth="1"/>
        <text x="312" y="145" fontFamily="'Syne', sans-serif" fontSize="9" fontWeight="600" fill="#6ee7b7" textAnchor="middle">CAGR +18.4%</text>
      </g>
    </svg>
  );
}

const SVG_BY_STEP = [Step1SVG, Step2SVG, Step3SVG, Step4SVG];

// ── Progress bar ──────────────────────────────────────────────────────────────

const STEP_DURATION = 5500;
const TICK_MS = 80;

function ProgressBar({ onAdvance }) {
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const progressRef = useRef(0);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      progressRef.current += (TICK_MS / STEP_DURATION) * 100;
      if (progressRef.current >= 100) {
        clearInterval(timerRef.current);
        setProgress(100);
        onAdvance();
      } else {
        setProgress(progressRef.current);
      }
    }, TICK_MS);
    return () => clearInterval(timerRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ height: "2px", background: "rgba(255,255,255,0.06)", borderRadius: "1px", overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${progress}%`,
        background: ACCENT_A_LIGHT,
        transition: `width ${TICK_MS}ms linear`,
        borderRadius: "1px",
      }}/>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function HowItWorksModal({ onClose }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState("forward");
  const { isMobile } = useBreakpoint();
  const StepSVG = SVG_BY_STEP[step];

  const goNext = () => { setDirection("forward");  setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const goPrev = () => { setDirection("backward"); setStep(s => Math.max(s - 1, 0)); };
  const goStep = (i) => { setDirection(i > step ? "forward" : "backward"); setStep(i); };

  const handleAdvance = () => {
    if (step < STEPS.length - 1) goNext();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
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
          width: "min(500px, 92vw)",
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
          style={{
            position: "absolute", top: "12px", right: "12px", zIndex: 2,
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)",
            color: COLOR.text.secondary, cursor: "pointer", fontSize: "18px",
            lineHeight: 1, padding: "2px 7px", borderRadius: "6px", transition: "color 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.color = COLOR.text.primary}
          onMouseLeave={e => e.currentTarget.style.color = COLOR.text.secondary}
          aria-label="Stäng"
        >×</button>

        {/* Animated step wrapper — key remounts on step change, triggering slide */}
        <div style={{ overflow: "hidden", position: "relative" }}>
          <div
            key={step}
            style={{ animation: `${direction === "forward" ? "slideInFromRight" : "slideInFromLeft"} 0.3s ease` }}
          >
            {/* Illustration */}
            <div style={{
              height: "188px",
              background: COLOR.bg.base,
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              overflow: "hidden",
            }}>
              <StepSVG />
            </div>

            {/* Text section */}
            <div style={{ padding: "20px 24px 16px" }}>
              <p style={{
                fontFamily: FONT.family.display,
                fontSize: isMobile ? "9px" : "10px",
                fontWeight: 700,
                letterSpacing: "0.07em",
                color: ACCENT_A_LIGHT,
                margin: "0 0 6px",
                textTransform: "uppercase",
              }}>
                {STEPS[step].num} / {String(STEPS.length).padStart(2, "0")}
              </p>
              <h2 style={{
                fontFamily: FONT.family.display,
                fontSize: isMobile ? "14px" : "16px",
                fontWeight: 700,
                color: COLOR.text.primary,
                margin: "0 0 8px",
                letterSpacing: "-0.01em",
              }}>
                {STEPS[step].title}
              </h2>
              <p style={{
                fontFamily: FONT.family.body,
                fontSize: "13px",
                color: COLOR.text.muted,
                lineHeight: 1.6,
                margin: 0,
              }}>
                {STEPS[step].desc}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px 20px",
        }}>
          {/* Dot navigation */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => goStep(i)}
                aria-label={`Steg ${i + 1}`}
                style={{
                  width: i === step ? "18px" : "6px",
                  height: "6px",
                  borderRadius: "3px",
                  border: "none",
                  cursor: "pointer",
                  background: i === step ? ACCENT_A_LIGHT : "rgba(255,255,255,0.18)",
                  padding: 0,
                  transition: "width 0.25s ease, background 0.2s",
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
                fontFamily: FONT.family.display,
                fontSize: "11px", fontWeight: 600,
                padding: "6px 14px",
                borderRadius: "6px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "transparent",
                color: step === 0 ? "rgba(255,255,255,0.2)" : COLOR.text.secondary,
                cursor: step === 0 ? "default" : "pointer",
                transition: "color 0.2s",
              }}
            >
              Föregående
            </button>
            {step < STEPS.length - 1 ? (
              <button
                onClick={goNext}
                style={{
                  fontFamily: FONT.family.display,
                  fontSize: "11px", fontWeight: 600,
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "none",
                  background: ACCENT_A_LIGHT,
                  color: "#010911",
                  cursor: "pointer",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                Nästa
              </button>
            ) : (
              <button
                onClick={onClose}
                style={{
                  fontFamily: FONT.family.display,
                  fontSize: "11px", fontWeight: 600,
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "none",
                  background: ACCENT_A_LIGHT,
                  color: "#010911",
                  cursor: "pointer",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                Stäng
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <ProgressBar key={step} onAdvance={handleAdvance} />
      </div>
    </div>
  );
}
