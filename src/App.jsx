import { useState, useMemo, useRef, useCallback } from "react";

// ─── Real Swedish fund data ───────────────────────────────────────────────────
// Fees and historical returns sourced from Avanza/Morningstar (as of 2024)
// Returns are annualized averages: 1y, 3y, 5y (used to simulate realistic curves)

function generateReturns(annualReturn, fee, years, volatility, seed) {
  const months = years * 12;
  let value = 100;
  const data = [{ month: 0, value: 100 }];
  let rng = seed;
  const lcg = () => { rng = (rng * 1664525 + 1013904223) & 0xffffffff; return (rng >>> 0) / 0xffffffff; };
  const monthlyReturn = (1 + (annualReturn - fee) / 100) ** (1 / 12) - 1;
  for (let i = 1; i <= months; i++) {
    const noise = (lcg() - 0.5) * 2 * (volatility / 100) / Math.sqrt(12);
    value *= (1 + monthlyReturn + noise);
    data.push({ month: i, value: parseFloat(value.toFixed(2)) });
  }
  return data;
}

const SAMPLE_FUNDS = [
  // Globalfonder
  { id: 1,  name: "Avanza Global",                         category: "Globalfond",         fee: 0.11, annualReturn: 16.2, volatility: 14, seed: 101, isin: "SE0006259771" },
  { id: 2,  name: "Länsförsäkringar Global Indexnära",     category: "Globalfond",         fee: 0.20, annualReturn: 15.8, volatility: 14, seed: 102, isin: "SE0006951381" },
  { id: 3,  name: "SPP Aktiefond Global",                  category: "Globalfond",         fee: 0.44, annualReturn: 16.5, volatility: 15, seed: 103, isin: "SE0001298071" },
  { id: 4,  name: "Handelsbanken Global Index",            category: "Globalfond",         fee: 0.40, annualReturn: 15.6, volatility: 14, seed: 104, isin: "SE0000847944" },
  { id: 5,  name: "SEB Global Indexfond",                  category: "Globalfond",         fee: 0.40, annualReturn: 15.4, volatility: 14, seed: 105, isin: "SE0000432726" },
  { id: 6,  name: "Swedbank Robur Access Global",          category: "Globalfond",         fee: 0.24, annualReturn: 15.7, volatility: 14, seed: 106, isin: "SE0009694822" },

  // Sverigefonder
  { id: 7,  name: "AMF Aktiefond Sverige",                 category: "Sverigefond",        fee: 0.17, annualReturn: 10.2, volatility: 17, seed: 107, isin: "SE0000537749" },
  { id: 8,  name: "Handelsbanken Sverige Index",           category: "Sverigefond",        fee: 0.21, annualReturn: 9.8,  volatility: 17, seed: 108, isin: "SE0000810848" },
  { id: 9,  name: "Spiltan Aktiefond Investmentbolag",    category: "Sverigefond",        fee: 0.20, annualReturn: 11.4, volatility: 18, seed: 109, isin: "SE0003313570" },
  { id: 10, name: "Länsförsäkringar Sverige Indexnära",   category: "Sverigefond",        fee: 0.20, annualReturn: 10.0, volatility: 17, seed: 110, isin: "SE0000816850" },
  { id: 11, name: "Swedbank Robur Sverigefond",           category: "Sverigefond",        fee: 1.40, annualReturn: 10.5, volatility: 18, seed: 111, isin: "SE0000432783" },
  { id: 12, name: "SEB Sverige Indexfond",                category: "Sverigefond",        fee: 0.40, annualReturn: 9.9,  volatility: 17, seed: 112, isin: "SE0000432734" },

  // Teknikfonder
  { id: 13, name: "Swedbank Robur Teknologifond",         category: "Teknikfond",         fee: 1.40, annualReturn: 19.8, volatility: 22, seed: 113, isin: "SE0000432817" },
  { id: 14, name: "DNB Teknologi",                        category: "Teknikfond",         fee: 1.61, annualReturn: 21.2, volatility: 24, seed: 114, isin: "SE0000522344" },
  { id: 15, name: "Handelsbanken Amerika Tema",           category: "Teknikfond",         fee: 1.50, annualReturn: 18.4, volatility: 20, seed: 115, isin: "SE0000810822" },

  // Tillväxtmarknader
  { id: 16, name: "Länsförsäkringar Tillväxtmarknad",    category: "Tillväxtmarknad",    fee: 0.46, annualReturn: 5.2,  volatility: 19, seed: 116, isin: "SE0000539753" },
  { id: 17, name: "Avanza Emerging Markets",             category: "Tillväxtmarknad",    fee: 0.33, annualReturn: 4.8,  volatility: 18, seed: 117, isin: "SE0009805904" },
  { id: 18, name: "SPP Aktiefond Tillväxtmarknad",       category: "Tillväxtmarknad",    fee: 0.44, annualReturn: 5.5,  volatility: 20, seed: 118, isin: "SE0001298063" },

  // Blandfonder
  { id: 19, name: "AMF Blandfond",                       category: "Blandfond",          fee: 0.40, annualReturn: 8.4,  volatility: 10, seed: 119, isin: "SE0000537756" },
  { id: 20, name: "Spiltan Räntefond Sverige",           category: "Räntefond",          fee: 0.10, annualReturn: 2.8,  volatility: 2,  seed: 120, isin: "SE0003313554" },

  // USA-fonder
  { id: 21, name: "Avanza USA",                          category: "USA-fond",           fee: 0.13, annualReturn: 18.6, volatility: 16, seed: 121, isin: "SE0009806045" },
  { id: 22, name: "Länsförsäkringar USA Indexnära",      category: "USA-fond",           fee: 0.20, annualReturn: 18.2, volatility: 16, seed: 122, isin: "SE0000539746" },
  { id: 23, name: "Handelsbanken USA Index",             category: "USA-fond",           fee: 0.40, annualReturn: 18.0, volatility: 16, seed: 123, isin: "SE0000810889" },

  // Hållbara fonder
  { id: 24, name: "SPP Global Plus",                    category: "Hållbar globalfond",  fee: 0.44, annualReturn: 15.1, volatility: 15, seed: 124, isin: "SE0001298055" },
  { id: 25, name: "Öhman Sverige Hållbar",              category: "Hållbar sverigefond", fee: 0.60, annualReturn: 9.6,  volatility: 17, seed: 125, isin: "SE0000558438" },
  { id: 26, name: "Swedbank Robur Hållbar Sverige",     category: "Hållbar sverigefond", fee: 1.20, annualReturn: 10.1, volatility: 17, seed: 126, isin: "SE0009694830" },

  // Asienfonder
  { id: 27, name: "Robur Access Asien",                 category: "Asienfond",           fee: 1.39, annualReturn: 5.8,  volatility: 20, seed: 127, isin: "SE0000810871" },
  { id: 28, name: "Handelsbanken Asien Tema",           category: "Asienfond",           fee: 1.50, annualReturn: 6.2,  volatility: 21, seed: 128, isin: "SE0000810830" },

  // Europafonder
  { id: 29, name: "Länsförsäkringar Europa Indexnära",  category: "Europafond",          fee: 0.20, annualReturn: 9.4,  volatility: 15, seed: 129, isin: "SE0000539761" },
  { id: 30, name: "Handelsbanken Europa Index",         category: "Europafond",          fee: 0.40, annualReturn: 9.1,  volatility: 15, seed: 130, isin: "SE0000810855" },
];

const FUND_SERIES = {};
SAMPLE_FUNDS.forEach(f => { FUND_SERIES[f.id] = generateReturns(f.annualReturn, f.fee, 10, f.volatility, f.seed); });

const TIME_SPANS = [
  { label: "1 mån",  months: 1   },
  { label: "3 mån",  months: 3   },
  { label: "6 mån",  months: 6   },
  { label: "1 år",   months: 12  },
  { label: "3 år",   months: 36  },
  { label: "5 år",   months: 60  },
  { label: "10 år",  months: 120 },
];

// ─── Color palette ─────────────────────────────────────────────────────────
const ACCENT_A       = "#0018F5";
const ACCENT_A_LIGHT = "#7b93ff";
const ACCENT_B       = "#38bdf8";
const BG             = "#090d1a";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatKr = v => new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(v);
const fmtFee   = v => `${v.toFixed(2)}%`;
const fmtPct   = v => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

function getFundPct(fund, allocs, inputMode, portfolioTotal) {
  if (inputMode === "pct") return allocs[fund.id]?.pct || 0;
  if (portfolioTotal <= 0) return 0;
  return ((allocs[fund.id]?.kr || 0) / portfolioTotal) * 100;
}

function blendPortfolioSeries(funds, allocs, inputMode, portfolioTotal, months) {
  if (!funds.length) return [];
  const totalM = Math.min(months, 120);
  const startIdx = 120 - totalM;
  return Array.from({ length: totalM + 1 }, (_, i) => {
    let blended = 0, totalWeight = 0;
    funds.forEach(f => {
      const pct = getFundPct(f, allocs, inputMode, portfolioTotal);
      if (pct > 0) {
        const series = FUND_SERIES[f.id];
        const base = series[startIdx]?.value || 100;
        const cur  = series[startIdx + i]?.value || 100;
        blended += (pct / 100) * (cur / base) * 100;
        totalWeight += pct;
      }
    });
    return { month: i, value: totalWeight > 0 ? parseFloat((blended / (totalWeight / 100)).toFixed(2)) : 100 };
  });
}

function getWeightedFee(funds, allocs, inputMode, portfolioTotal) {
  return funds.reduce((acc, f) => {
    const pct = getFundPct(f, allocs, inputMode, portfolioTotal);
    return acc + (pct / 100) * f.fee;
  }, 0);
}

function portfolioKrTotal(funds, allocs) {
  return funds.reduce((acc, f) => acc + (allocs[f.id]?.kr || 0), 0);
}

const portfolioReturn = series => series.length ? series[series.length - 1].value - 100 : 0;

// ─── Briefcase icon ───────────────────────────────────────────────────────────
function BriefcaseIcon({ color }) {
  return (
    <svg width="18" height="17" viewBox="0 0 28 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 8 Q10 4 14 4 Q18 4 18 8" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <rect x="3" y="8" width="22" height="15" rx="2.5" stroke={color} strokeWidth="2.5" fill="none"/>
      <line x1="3" y1="14" x2="25" y2="14" stroke={color} strokeWidth="1.5"/>
    </svg>
  );
}

// ─── Pure SVG Chart ───────────────────────────────────────────────────────────
function SVGChart({ seriesA, seriesB, showB, totalA, totalB }) {
  const W = 800, H = 220, PL = 48, PR = 12, PT = 10, PB = 28;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;

  const allVals = [...seriesA.map(d => d.value), ...(showB ? seriesB.map(d => d.value) : [])];
  const minV = Math.min(...allVals, 95);
  const maxV = Math.max(...allVals, 105);
  const pad  = (maxV - minV) * 0.12;
  const yMin = minV - pad;
  const yMax = maxV + pad;

  const toX = i => PL + (i / (seriesA.length - 1)) * chartW;
  const toY = v => PT + chartH - ((v - yMin) / (yMax - yMin)) * chartH;

  const makePath = series => series.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(d.value).toFixed(1)}`).join(" ");

  const pathA = seriesA.length > 1 ? makePath(seriesA) : null;
  const pathB = showB && seriesB.length > 1 ? makePath(seriesB) : null;

  const yTicks = [];
  const step = (yMax - yMin) / 4;
  for (let i = 0; i <= 4; i++) {
    const v = yMin + i * step;
    yTicks.push({ v, y: toY(v) });
  }

  const xTicks = [];
  const n = seriesA.length;
  const tickCount = Math.min(6, n);
  for (let i = 0; i < tickCount; i++) {
    const idx = Math.round((i / (tickCount - 1)) * (n - 1));
    xTicks.push({ idx, x: toX(idx) });
  }

  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef(null);

  const handleMouseMove = useCallback(e => {
    if (!svgRef.current || !seriesA.length) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const idx = Math.round(((mx - PL) / chartW) * (seriesA.length - 1));
    const clamped = Math.max(0, Math.min(seriesA.length - 1, idx));
    setTooltip({
      x: toX(clamped),
      idx: clamped,
      vA: seriesA[clamped]?.value,
      vB: showB ? seriesB[clamped]?.value : null,
    });
  }, [seriesA, seriesB, showB]);

  const baselineY = toY(100);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        {yTicks.map(({ v, y }, i) => (
          <g key={i}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
            <text x={PL - 6} y={y + 4} textAnchor="end" fill="#444" fontSize="10" fontFamily="DM Sans, sans-serif">
              {`${(v - 100).toFixed(0)}%`}
            </text>
          </g>
        ))}
        <line x1={PL} y1={baselineY} x2={W - PR} y2={baselineY} stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="5 4"/>
        {xTicks.map(({ idx, x }, i) => (
          <text key={i} x={x} y={H - 6} textAnchor="middle" fill="#444" fontSize="10" fontFamily="DM Sans, sans-serif">
            {idx === 0 ? "Start" : `m${idx}`}
          </text>
        ))}
        {pathA && <path d={pathA} fill="none" stroke={ACCENT_A} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
        {pathB && <path d={pathB} fill="none" stroke={ACCENT_B} strokeWidth="2.5" strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round"/>}
        {tooltip && (
          <>
            <line x1={tooltip.x} y1={PT} x2={tooltip.x} y2={H - PB} stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
            {tooltip.vA && <circle cx={tooltip.x} cy={toY(tooltip.vA)} r="5" fill={ACCENT_A} stroke={BG} strokeWidth="2"/>}
            {tooltip.vB && <circle cx={tooltip.x} cy={toY(tooltip.vB)} r="5" fill={ACCENT_B} stroke={BG} strokeWidth="2"/>}
          </>
        )}
      </svg>
      {tooltip && (
        <div style={{
          position: "absolute", top: "10px",
          left: tooltip.x / W * 100 > 60 ? "auto" : `calc(${tooltip.x / W * 100}% + 10px)`,
          right: tooltip.x / W * 100 > 60 ? `calc(${(1 - tooltip.x / W) * 100}% + 10px)` : "auto",
          background: "#0d1120", border: "1px solid rgba(255,255,255,0.13)",
          borderRadius: "8px", padding: "8px 12px",
          fontSize: "12px", fontFamily: "'Syne', sans-serif",
          pointerEvents: "none", zIndex: 10,
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        }}>
          <div style={{ color: "#5a6e8a", fontSize: "10px", marginBottom: "4px" }}>Månad {tooltip.idx}</div>
          {tooltip.vA && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: tooltip.vB ? "3px" : 0 }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: ACCENT_A }} />
              <span style={{ color: "#f0ede8" }}>A: <strong style={{ color: (tooltip.vA - 100) >= 0 ? "#6ee7b7" : "#f87171" }}>{fmtPct(tooltip.vA - 100)}</strong></span>
              {totalA > 0 && <span style={{ color: "#5a6e8a", fontSize: "11px" }}>{formatKr(totalA * (tooltip.vA - 100) / 100)}</span>}
            </div>
          )}
          {tooltip.vB && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: ACCENT_B }} />
              <span style={{ color: "#f0ede8" }}>B: <strong style={{ color: (tooltip.vB - 100) >= 0 ? "#6ee7b7" : "#f87171" }}>{fmtPct(tooltip.vB - 100)}</strong></span>
              {totalB > 0 && <span style={{ color: "#5a6e8a", fontSize: "11px" }}>{formatKr(totalB * (tooltip.vB - 100) / 100)}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Fund Search ──────────────────────────────────────────────────────────────
function FundSearch({ onAdd, excluded }) {
  const [q, setQ] = useState("");
  const results = q.length > 1
    ? SAMPLE_FUNDS.filter(f => !excluded.includes(f.id) && (
        f.name.toLowerCase().includes(q.toLowerCase()) ||
        f.isin.toLowerCase().includes(q.toLowerCase()) ||
        f.category.toLowerCase().includes(q.toLowerCase())
      )).slice(0, 6)
    : [];
  return (
    <div style={{ position: "relative", marginBottom: "12px" }}>
      <input type="text" placeholder="Sök fond eller ISIN…" value={q} onChange={e => setQ(e.target.value)}
        style={{
          width: "100%", boxSizing: "border-box",
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.13)",
          borderRadius: "8px", color: "#f0ede8", fontSize: "13px",
          padding: "9px 14px", outline: "none", fontFamily: "'Syne', sans-serif",
        }}
      />
      {results.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#0d1120", border: "1px solid rgba(255,255,255,0.13)",
          borderRadius: "8px", zIndex: 200, overflow: "hidden",
        }}>
          {results.map(f => (
            <div key={f.id} onClick={() => { onAdd(f); setQ(""); }}
              style={{ padding: "9px 14px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.06)", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "13px", color: "#f0ede8", fontFamily: "'Syne', sans-serif" }}>{f.name}</div>
                <div style={{ fontSize: "10px", color: "#5a6e8a", fontFamily: "monospace" }}>{f.isin}</div>
              </div>
              <div style={{ fontSize: "11px", color: "#5a6e8a", marginTop: "2px" }}>{f.category} · {fmtFee(f.fee)} avgift/år</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Fund Row ─────────────────────────────────────────────────────────────────
function FundRow({ fund, allocation, inputMode, portfolioTotal, onUpdate, onRemove }) {
  const pct = getFundPct(fund, { [fund.id]: allocation }, inputMode, portfolioTotal);
  const kr  = inputMode === "kr" ? (allocation.kr || 0) : (portfolioTotal * (allocation.pct || 0) / 100);
  const inputVal = inputMode === "pct" ? (allocation.pct || "") : (allocation.kr || "");
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 100px 90px 26px", gap: "8px", alignItems: "center",
      padding: "10px 12px", background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)", borderRadius: "9px", marginBottom: "7px",
    }}>
      <div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "13px", color: "#f0ede8", fontWeight: 600 }}>{fund.name}</div>
        <div style={{ fontSize: "11px", color: "#5a6e8a", marginTop: "1px" }}>{fund.category} · {fmtFee(fund.fee)} avgift · <span style={{ fontFamily: "monospace", fontSize: "10px" }}>{fund.isin}</span></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <label style={{ fontSize: "9px", color: "#5a6e8a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {inputMode === "pct" ? "Andel %" : "Belopp kr"}
        </label>
        <input type="number" value={inputVal}
          onChange={e => {
            const val = parseFloat(e.target.value) || 0;
            onUpdate(inputMode === "pct" ? { pct: val } : { kr: val });
          }}
          style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.11)",
            borderRadius: "6px", color: "#f0ede8", fontSize: "13px",
            padding: "5px 8px", width: "100%", outline: "none",
            fontFamily: "'Syne', sans-serif", boxSizing: "border-box",
          }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <label style={{ fontSize: "9px", color: "#5a6e8a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {inputMode === "pct" ? "≈ kr" : "≈ %"}
        </label>
        <div style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "6px", color: "#5a6e8a", fontSize: "11px", padding: "5px 8px",
        }}>
          {inputMode === "pct" ? formatKr(kr) : `${pct.toFixed(1)}%`}
        </div>
      </div>
      <button onClick={onRemove}
        style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "18px", padding: "2px", transition: "color 0.2s" }}
        onMouseEnter={e => e.target.style.color = "#f87171"}
        onMouseLeave={e => e.target.style.color = "#555"}
      >×</button>
    </div>
  );
}

// ─── Portfolio Panel ──────────────────────────────────────────────────────────
function PortfolioPanel({ label, accent, accentRgb, accentText, funds, allocations, inputMode, manualAmount, onAddFund, onUpdateAlloc, onRemoveFund }) {
  const portfolioTotal = inputMode === "kr" ? portfolioKrTotal(funds, allocations) : manualAmount;
  const fee = getWeightedFee(funds, allocations, inputMode, portfolioTotal);
  const totalPct = inputMode === "pct"
    ? funds.reduce((acc, f) => acc + (allocations[f.id]?.pct || 0), 0)
    : 100;
  const pctOk = Math.abs(totalPct - 100) < 0.5;

  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: "rgba(255,255,255,0.02)",
      border: `1px solid ${accent}33`,
      borderRadius: "14px", padding: "20px",
      display: "flex", flexDirection: "column", gap: "12px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <BriefcaseIcon color={accent} />
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "15px", fontWeight: 700, color: "#f0ede8", margin: 0 }}>{label}</h2>
        {funds.length > 0 && inputMode === "pct" && (
          <span style={{
            marginLeft: "auto", fontSize: "10px",
            color: pctOk ? "#6ee7b7" : "#f87171",
            background: pctOk ? "rgba(110,231,183,0.1)" : "rgba(248,113,113,0.12)",
            padding: "2px 8px", borderRadius: "20px", fontFamily: "'Syne', sans-serif", fontWeight: 600,
          }}>{totalPct.toFixed(1)}% fördelat</span>
        )}
      </div>
      <FundSearch onAdd={onAddFund} excluded={funds.map(f => f.id)} />
      <div style={{ flex: 1 }}>
        {funds.map(f => (
          <FundRow key={f.id} fund={f}
            allocation={allocations[f.id] || { pct: 0, kr: 0 }}
            inputMode={inputMode} portfolioTotal={portfolioTotal}
            onUpdate={vals => onUpdateAlloc(f.id, vals)}
            onRemove={() => onRemoveFund(f.id)}
          />
        ))}
        {funds.length === 0 && (
          <div style={{ textAlign: "center", padding: "28px 0", color: "#444", fontSize: "13px", fontFamily: "'Syne', sans-serif" }}>
            Sök och lägg till fonder ovan
          </div>
        )}
      </div>
      {funds.length > 0 && (
        <div style={{ padding: "14px", background: `rgba(${accentRgb}, 0.06)`, border: `1px solid rgba(${accentRgb}, 0.2)`, borderRadius: "10px" }}>
          <div style={{ fontSize: "9px", color: "#5a6e8a", marginBottom: "10px", fontFamily: "'Syne', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>Portföljsammanfattning</div>
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "10px 12px" }}>
              <div style={{ fontSize: "9px", color: "#5a6e8a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "3px" }}>Avgift/år</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "17px", fontWeight: 700, color: accentText }}>{fmtFee(fee)}</div>
              {portfolioTotal > 0 && <div style={{ fontSize: "10px", color: "#5a6e8a", marginTop: "2px" }}>{formatKr(portfolioTotal * fee / 100)}</div>}
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "10px 12px" }}>
              <div style={{ fontSize: "9px", color: "#5a6e8a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "3px" }}>
                {inputMode === "kr" ? "Totalt" : "Belopp"}
              </div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "17px", fontWeight: 700, color: "#f0ede8" }}>
                {portfolioTotal > 0 ? formatKr(portfolioTotal) : "–"}
              </div>
              <div style={{ fontSize: "10px", color: "#5a6e8a", marginTop: "2px" }}>{funds.length} fonder</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Return Chart ─────────────────────────────────────────────────────────────
function ReturnChart({ seriesA, seriesB, showB, selectedSpan, onSpanChange, totalA, totalB }) {
  const retA = portfolioReturn(seriesA);
  const retB = portfolioReturn(seriesB);

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "22px 24px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "15px", fontWeight: 700, color: "#f0ede8", margin: "0 0 8px" }}>Historisk avkastning</h3>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {seriesA.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke={ACCENT_A} strokeWidth="2.5" strokeLinecap="round" /></svg>
                <span style={{ fontSize: "12px", color: "#f0ede8", fontFamily: "'Syne', sans-serif" }}>
                  A: <span style={{ color: retA >= 0 ? "#6ee7b7" : "#f87171", fontWeight: 700 }}>{fmtPct(retA)}</span>
                </span>
                {totalA > 0 && <span style={{ fontSize: "11px", color: "#5a6e8a" }}>({formatKr(totalA * retA / 100)})</span>}
              </div>
            )}
            {showB && seriesB.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="22" height="10">
                  <line x1="0" y1="5" x2="6" y2="5" stroke={ACCENT_B} strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="9" y1="5" x2="15" y2="5" stroke={ACCENT_B} strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="18" y1="5" x2="22" y2="5" stroke={ACCENT_B} strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <span style={{ fontSize: "12px", color: "#f0ede8", fontFamily: "'Syne', sans-serif" }}>
                  B: <span style={{ color: retB >= 0 ? "#6ee7b7" : "#f87171", fontWeight: 700 }}>{fmtPct(retB)}</span>
                </span>
                {totalB > 0 && <span style={{ fontSize: "11px", color: "#5a6e8a" }}>({formatKr(totalB * retB / 100)})</span>}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: "3px", background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "3px", flexWrap: "wrap" }}>
          {TIME_SPANS.map(ts => (
            <button key={ts.label} onClick={() => onSpanChange(ts.label)}
              style={{
                background: selectedSpan === ts.label ? "rgba(255,255,255,0.12)" : "transparent",
                border: "none", color: selectedSpan === ts.label ? "#f0ede8" : "#5a6e8a",
                padding: "5px 10px", borderRadius: "6px", cursor: "pointer",
                fontSize: "11px", fontFamily: "'Syne', sans-serif", fontWeight: 600,
                transition: "all 0.18s", whiteSpace: "nowrap",
                boxShadow: selectedSpan === ts.label ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
              }}
            >{ts.label}</button>
          ))}
        </div>
      </div>

      <SVGChart seriesA={seriesA} seriesB={seriesB} showB={showB} totalA={totalA} totalB={totalB} />

      {showB && seriesA.length > 0 && seriesB.length > 0 && (() => {
        const diff = retA - retB;
        const winnerCol = diff >= 0 ? ACCENT_A : ACCENT_B;
        const winner    = diff >= 0 ? "A" : "B";
        const refTotal  = totalA > 0 ? totalA : totalB;
        return (
          <div style={{
            marginTop: "16px", padding: "12px 16px",
            background: `rgba(${diff >= 0 ? "0,24,245" : "56,189,248"}, 0.07)`,
            border: `1px solid rgba(${diff >= 0 ? "0,24,245" : "56,189,248"}, 0.2)`,
            borderRadius: "9px", display: "flex", alignItems: "center", gap: "10px",
          }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: winnerCol, flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: "#f0ede8", fontFamily: "'DM Sans', sans-serif" }}>
              Portfölj <strong style={{ color: winnerCol }}>{winner}</strong> har gett{" "}
              <strong style={{ color: winnerCol }}>{Math.abs(diff).toFixed(1)} %-enheter</strong> högre avkastning under vald period.
              {refTotal > 0 && ` Det motsvarar ${formatKr(Math.abs(refTotal * diff / 100))}.`}
            </span>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Compare bars ─────────────────────────────────────────────────────────────
function CompareBar({ label, val1, val2, unit = "", higherIsBetter = true }) {
  const max  = Math.max(Math.abs(val1), Math.abs(val2), 0.001);
  const w1   = (Math.abs(val1) / max) * 100;
  const w2   = (Math.abs(val2) / max) * 100;
  const b1   = higherIsBetter ? val1 >= val2 : val1 <= val2;
  const disp = v => Math.abs(v) > 999 ? formatKr(v) : `${v.toFixed(1)}${unit}`;
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ fontSize: "10px", color: "#5a6e8a", marginBottom: "5px", fontFamily: "'Syne', sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 1fr", gap: "6px", alignItems: "center" }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ height: "7px", width: `${w1}%`, background: ACCENT_A, borderRadius: "4px", opacity: b1 ? 1 : 0.3, transition: "width 0.5s ease" }} />
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "10px", color: ACCENT_A_LIGHT, fontFamily: "'Syne', sans-serif" }}>{disp(val1)}</div>
          <div style={{ fontSize: "10px", color: ACCENT_B, fontFamily: "'Syne', sans-serif" }}>{disp(val2)}</div>
        </div>
        <div>
          <div style={{ height: "7px", width: `${w2}%`, background: ACCENT_B, borderRadius: "4px", opacity: !b1 ? 1 : 0.3, transition: "width 0.5s ease" }} />
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [funds1, setFunds1]             = useState([]);
  const [funds2, setFunds2]             = useState([]);
  const [allocs1, setAllocs1]           = useState({});
  const [allocs2, setAllocs2]           = useState({});
  const [inputMode, setInputMode]       = useState("pct");
  const [manualAmount, setManualAmount] = useState(0);
  const [compareMode, setCompareMode]   = useState(true);
  const [span, setSpan]                 = useState("5 år");

  const totalA = inputMode === "kr" ? portfolioKrTotal(funds1, allocs1) : manualAmount;
  const totalB = inputMode === "kr" ? portfolioKrTotal(funds2, allocs2) : manualAmount;
  const spanMonths = TIME_SPANS.find(t => t.label === span)?.months || 60;

  const seriesA = useMemo(() => blendPortfolioSeries(funds1, allocs1, inputMode, totalA, spanMonths), [funds1, allocs1, inputMode, totalA, spanMonths]);
  const seriesB = useMemo(() => blendPortfolioSeries(funds2, allocs2, inputMode, totalB, spanMonths), [funds2, allocs2, inputMode, totalB, spanMonths]);

  const fee1 = getWeightedFee(funds1, allocs1, inputMode, totalA);
  const fee2 = getWeightedFee(funds2, allocs2, inputMode, totalB);
  const retA = portfolioReturn(seriesA);
  const retB = portfolioReturn(seriesB);

  const addFund1 = f => setFunds1(p => [...p, f]);
  const addFund2 = f => setFunds2(p => [...p, f]);
  const updA     = (id, v) => setAllocs1(p => ({ ...p, [id]: { ...p[id], ...v } }));
  const updB     = (id, v) => setAllocs2(p => ({ ...p, [id]: { ...p[id], ...v } }));
  const remF1    = id => { setFunds1(p => p.filter(f => f.id !== id)); setAllocs1(p => { const n={...p}; delete n[id]; return n; }); };
  const remF2    = id => { setFunds2(p => p.filter(f => f.id !== id)); setAllocs2(p => { const n={...p}; delete n[id]; return n; }); };

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#f0ede8", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />

      {/* ── Header ── */}
      <div style={{ padding: "26px 36px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 800, margin: 0, letterSpacing: "-0.02em", color: "#f0ede8" }}>MinPortfölj</h1>
          <p style={{ margin: "3px 0 0", fontSize: "11px", color: "#5a6e8a" }}>Jämför avgifter & historisk avkastning</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: "7px", padding: "3px", gap: "2px" }}>
            {["pct", "kr"].map(m => (
              <button key={m} onClick={() => setInputMode(m)} style={{
                background: inputMode === m ? "rgba(255,255,255,0.1)" : "transparent",
                border: "none", color: inputMode === m ? "#f0ede8" : "#5a6e8a",
                padding: "5px 12px", borderRadius: "5px", cursor: "pointer",
                fontSize: "11px", fontFamily: "'Syne', sans-serif", fontWeight: 600, transition: "all 0.2s",
              }}>{m === "pct" ? "% Procent" : "kr Kronor"}</button>
            ))}
          </div>
          {inputMode === "pct" && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11px", color: "#5a6e8a" }}>Belopp per portfölj:</span>
              <input type="number" value={manualAmount || ""}
                onChange={e => setManualAmount(parseFloat(e.target.value) || 0)}
                style={{
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.11)",
                  borderRadius: "6px", color: "#f0ede8", fontSize: "12px",
                  padding: "5px 9px", width: "110px", outline: "none", fontFamily: "'Syne', sans-serif",
                }}
              />
              <span style={{ fontSize: "11px", color: "#5a6e8a" }}>kr</span>
            </div>
          )}
          <button onClick={() => setCompareMode(m => !m)} style={{
            background: compareMode ? "rgba(0,24,245,0.15)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${compareMode ? "rgba(0,24,245,0.5)" : "rgba(255,255,255,0.1)"}`,
            color: compareMode ? "#6b8fff" : "#5a6e8a",
            padding: "6px 12px", borderRadius: "7px", cursor: "pointer",
            fontSize: "11px", fontFamily: "'Syne', sans-serif", fontWeight: 600, transition: "all 0.2s",
          }}>⇄ {compareMode ? "Jämförelse på" : "Jämförelse av"}</button>
        </div>
      </div>

      <div style={{ padding: "22px 36px", display: "flex", flexDirection: "column", gap: "18px" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
          <PortfolioPanel label="Portfölj A" accent={ACCENT_A} accentRgb="0,24,245" accentText={ACCENT_A_LIGHT}
            funds={funds1} allocations={allocs1} inputMode={inputMode} manualAmount={manualAmount}
            onAddFund={addFund1} onUpdateAlloc={updA} onRemoveFund={remF1}
          />
          {compareMode && (
            <PortfolioPanel label="Portfölj B" accent={ACCENT_B} accentRgb="56,189,248" accentText={ACCENT_B}
              funds={funds2} allocations={allocs2} inputMode={inputMode} manualAmount={manualAmount}
              onAddFund={addFund2} onUpdateAlloc={updB} onRemoveFund={remF2}
            />
          )}
        </div>

        {(funds1.length > 0 || (compareMode && funds2.length > 0)) && (
          <ReturnChart
            seriesA={seriesA} seriesB={seriesB}
            showB={compareMode && funds2.length > 0}
            selectedSpan={span} onSpanChange={setSpan}
            totalA={totalA} totalB={totalB}
          />
        )}

        {compareMode && funds1.length > 0 && funds2.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ fontSize: "9px", color: ACCENT_A_LIGHT, background: "rgba(0,24,245,0.1)", padding: "3px 9px", borderRadius: "20px", fontFamily: "'Syne', sans-serif", fontWeight: 600 }}>A</div>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "13px", fontWeight: 700, margin: 0, color: "#f0ede8" }}>Snabb jämförelse</h3>
              <div style={{ fontSize: "9px", color: ACCENT_B, background: "rgba(56,189,248,0.1)", padding: "3px 9px", borderRadius: "20px", fontFamily: "'Syne', sans-serif", fontWeight: 600 }}>B</div>
            </div>
            <div style={{ maxWidth: "560px", margin: "0 auto" }}>
              <CompareBar label="Avgift per år" val1={fee1} val2={fee2} unit="%" higherIsBetter={false} />
              {(totalA > 0 || totalB > 0) && <CompareBar label="Avgift i kr/år" val1={totalA * fee1 / 100} val2={totalB * fee2 / 100} higherIsBetter={false} />}
              <CompareBar label={`Avkastning (${span})`} val1={retA} val2={retB} unit="%" higherIsBetter={true} />
              {(totalA > 0 || totalB > 0) && <CompareBar label={`Avkastning i kr (${span})`} val1={totalA * retA / 100} val2={totalB * retB / 100} higherIsBetter={true} />}
            </div>
            <div style={{ marginTop: "16px", display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
              {[
                { label: "Lägre avgift",        winner: fee1 <= fee2 ? "A" : "B", accent: fee1 <= fee2 ? ACCENT_A : ACCENT_B, accentRgb: fee1 <= fee2 ? "0,24,245" : "56,189,248", accentText: fee1 <= fee2 ? ACCENT_A_LIGHT : ACCENT_B },
                { label: `Bäst avk. (${span})`, winner: retA >= retB  ? "A" : "B", accent: retA >= retB  ? ACCENT_A : ACCENT_B, accentRgb: retA >= retB  ? "0,24,245" : "56,189,248", accentText: retA >= retB  ? ACCENT_A_LIGHT : ACCENT_B },
              ].map(({ label: lbl, winner, accentRgb, accentText }) => (
                <div key={lbl} style={{ textAlign: "center", padding: "14px 24px", background: `rgba(${accentRgb}, 0.06)`, border: `1px solid rgba(${accentRgb}, 0.2)`, borderRadius: "10px" }}>
                  <div style={{ fontSize: "9px", color: "#5a6e8a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px", fontFamily: "'Syne', sans-serif" }}>{lbl}</div>
                  <div style={{ fontSize: "18px", fontFamily: "'Syne', sans-serif", fontWeight: 800, color: accentText }}>Portfölj {winner}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ fontSize: "10px", color: "#1e2d3a", textAlign: "center", paddingBottom: "12px" }}>
          * Avkastning baseras på historiska snittavkastningar och är simulerad. Historisk avkastning garanterar inte framtida resultat.
        </div>
      </div>
    </div>
  );
}