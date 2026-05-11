import { useState, useMemo, useRef, useCallback, useEffect } from "react";

// ─── Color palette ─────────────────────────────────────────────────────────
const ACCENT_A       = "#0018F5";
const ACCENT_A_LIGHT = "#7b93ff";
const ACCENT_B       = "#38bdf8";
const BG             = "#090d1a";
const FUND_COLORS    = ["#0018F5","#38bdf8","#6ee7b7","#f59e0b","#f87171","#a78bfa","#84cc16","#facc15","#f472b6","#e879f9"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatKr = v => new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(v);
const fmtFee   = v => `${v.toFixed(2)}%`;
const fmtPct   = v => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

const TIME_SPANS = [
  { label: "1 mån",  months: 1   },
  { label: "3 mån",  months: 3   },
  { label: "6 mån",  months: 6   },
  { label: "1 år",   months: 12  },
  { label: "3 år",   months: 36  },
  { label: "Max",    months: null },
];

// ─── ISIN codes ───────────────────────────────────────────────────────────────
const FUND_ISINS = {
  "0P0001ECQR.ST": "SE0011527613",  // Avanza Global
  "0P0001CKSU.ST": "FI4000261326",  // Nordea Global Enhanced Growth
  "0P0000YVZ3.ST": "SE0005188836",  // Länsförsäkringar Global Index
  "0P0000XAIN.ST": "FI4000046685",  // Nordea Global Index Select
  "0P0001F3XN.ST": "SE0011309707",  // Handelsbanken Global Index
  "0P0001Q6FC.ST": "NO0010827280",  // DNB Global Indeks S
  "0P00000LST.ST": "SE0000671919",  // Storebrand Global All Countries
  "0P00005U1J.ST": "SE0001718388",  // Avanza Zero
  "0P0001JF8S.ST": "LU2122930915",  // Nordea Swedish Sustainable Enhanced
  "0P00000K12.ST": "SE0000739195",  // AMF Aktiefond Sverige
  "0P00001DF8.ST": "SE0001466368",  // Handelsbanken Sverige Index
  "0P0000ULAP.ST": "SE0004297927",  // Spiltan Aktiefond Investmentbolag
  "0P0000J1JM.ST": "SE0002656611",  // Länsförsäkringar Sverige Index
};

// ─── Manual fees (not available from Yahoo Finance) ───────────────────────────
// Fallback fees (löpande kostnader från Morningstar) — används om API-hämtning misslyckas
const FUND_FEES = {
  "0P0001ECQR.ST": 0.08,  // Avanza Global
  "0P0001CKSU.ST": 0.60,  // Nordea Global Enhanced Growth
  "0P0000YVZ3.ST": 0.20,  // Länsförsäkringar Global Index
  "0P0000XAIN.ST": 0.40,  // Nordea Global Index Select
  "0P0001F3XN.ST": 0.41,  // Handelsbanken Global Index
  "0P0001Q6FC.ST": 0.20,  // DNB Global Indeks S
  "0P00000LST.ST": 0.31,  // Storebrand Global All Countries
  "0P00005U1J.ST": 0.00,  // Avanza Zero
  "0P0001JF8S.ST": 0.61,  // Nordea Swedish Sustainable Enhanced (BP SEK)
  "0P00000K12.ST": 0.40,  // AMF Aktiefond Sverige
  "0P00001DF8.ST": 0.65,  // Handelsbanken Sverige Index (A1-klass)
  "0P0000ULAP.ST": 0.20,  // Spiltan Aktiefond Investmentbolag
  "0P0000J1JM.ST": 0.20,  // Länsförsäkringar Sverige Index
};

// ─── Build normalized price series from API data ──────────────────────────────
function buildSeries(prices, months) {
  if (!prices || prices.length === 0) return [];
  let sliced;
  if (months === null) {
    sliced = prices;
  } else {
    const cutoffTs = Date.now() / 1000 - months * 30.44 * 24 * 3600;
    let startIdx = prices.findIndex(p => p.timestamp >= cutoffTs);
    if (startIdx === -1) return [];
    if (startIdx > 0) startIdx--;
    sliced = prices.slice(startIdx);
  }
  const base = sliced[0]?.value;
  if (!base || base <= 0) return [];
  return sliced.map((p, i) => ({
    month: i,
    timestamp: p.timestamp,
    value: parseFloat(((p.value / base) * 100).toFixed(2)),
  }));
}

// ─── Simulated price series for manual funds ──────────────────────────────────
function seededRng(seed) {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 0x100000000; };
}
function normalRandom(rng) {
  const u1 = Math.max(rng(), 1e-10);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * rng());
}
function generateSimulatedSeries(totalReturnPct, months, fundId) {
  const years      = months / 12;
  const steps      = Math.round(months * 21);
  const annualRet  = Math.pow(1 + totalReturnPct / 100, 1 / years) - 1;
  const vol        = 0.15;
  const dt         = 1 / 252;
  const mu         = annualRet - 0.5 * vol * vol;
  const sigma      = vol * Math.sqrt(dt);

  let hash = 0;
  for (const c of String(fundId)) hash = ((Math.imul(31, hash) + c.charCodeAt(0)) | 0) >>> 0;
  const rng = seededRng(hash);

  const now     = Date.now() / 1000;
  const startTs = now - months * 30.44 * 24 * 3600;
  const dtSec   = (months * 30.44 * 24 * 3600) / steps;

  let logPrice = 0;
  const pts = [{ ts: startTs, v: 100 }];
  for (let i = 1; i < steps; i++) {
    logPrice += mu * dt + sigma * normalRandom(rng);
    pts.push({ ts: startTs + i * dtSec, v: Math.exp(logPrice) * 100 });
  }

  const scale = (100 + totalReturnPct) / pts[pts.length - 1].v;
  return pts.map((p, i) => ({
    month: i,
    timestamp: p.ts,
    value: i === 0 ? 100 : parseFloat((p.v * scale).toFixed(2)),
  }));
}

function getFundPct(fund, allocs, inputMode, portfolioTotal) {
  if (inputMode === "pct") return allocs[fund.id]?.pct || 0;
  if (portfolioTotal <= 0) return 0;
  return ((allocs[fund.id]?.kr || 0) / portfolioTotal) * 100;
}

function getWeightedFee(funds, allocs, inputMode, portfolioTotal) {
  return funds.reduce((acc, f) => {
    const pct = getFundPct(f, allocs, inputMode, portfolioTotal);
    return acc + (pct / 100) * (f.fee || 0);
  }, 0);
}

function blendPortfolioSeries(funds, allocs, inputMode, portfolioTotal, months) {
  if (!funds.length) return [];
  const seriesList = funds.map(f => ({
    pct: getFundPct(f, allocs, inputMode, portfolioTotal),
    series: buildSeries(f.prices, months),
  })).filter(s => s.pct > 0 && s.series.length > 0);

  if (!seriesList.length) return [];

  const minLen = Math.min(...seriesList.map(s => s.series.length));
  const totalWeight = seriesList.reduce((acc, s) => acc + s.pct, 0);

  return Array.from({ length: minLen }, (_, i) => {
    const blended = seriesList.reduce((acc, s) => acc + (s.pct / totalWeight) * s.series[i].value, 0);
    return { month: i, timestamp: seriesList[0].series[i].timestamp, value: parseFloat(blended.toFixed(2)) };
  });
}

function portfolioKrTotal(funds, allocs) {
  return funds.reduce((acc, f) => acc + (allocs[f.id]?.kr || 0), 0);
}

const portfolioReturn = series => series.length ? series[series.length - 1].value - 100 : 0;

// ─── Briefcase icon ───────────────────────────────────────────────────────────
function BriefcaseIcon({ color }) {
  return (
    <svg width="18" height="17" viewBox="0 0 28 26" fill="none">
      <path d="M10 8 Q10 4 14 4 Q18 4 18 8" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <rect x="3" y="8" width="22" height="15" rx="2.5" stroke={color} strokeWidth="2.5" fill="none"/>
      <line x1="3" y1="14" x2="25" y2="14" stroke={color} strokeWidth="1.5"/>
    </svg>
  );
}

// ─── SVG Chart ────────────────────────────────────────────────────────────────
function SVGChart({ seriesA, seriesB, showB, totalA, totalB }) {
  const W = 800, H = 220, PL = 48, PR = 12, PT = 10, PB = 28;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;

  const allVals = [...seriesA.map(d => d.value), ...(showB ? seriesB.map(d => d.value) : [])];
  if (!allVals.length) return null;

  const minV = Math.min(...allVals, 95);
  const maxV = Math.max(...allVals, 105);
  const pad  = (maxV - minV) * 0.12;
  const yMin = minV - pad;
  const yMax = maxV + pad;

  const toX = (i, len) => PL + (i / Math.max(len - 1, 1)) * chartW;
  const toY = v => PT + chartH - ((v - yMin) / (yMax - yMin)) * chartH;

  const makePath = series => series.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i, series.length).toFixed(1)},${toY(d.value).toFixed(1)}`).join(" ");

  const pathA = seriesA.length > 1 ? makePath(seriesA) : null;
  const pathB = showB && seriesB.length > 1 ? makePath(seriesB) : null;

  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const v = yMin + (i / 4) * (yMax - yMin);
    return { v, y: toY(v) };
  });

  const baselineY = toY(100);
  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef(null);

  const handleMouseMove = useCallback(e => {
    if (!svgRef.current || !seriesA.length) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const idx = Math.round(((mx - PL) / chartW) * (seriesA.length - 1));
    const clamped = Math.max(0, Math.min(seriesA.length - 1, idx));
    const bIdx = showB && seriesB.length ? Math.min(clamped, seriesB.length - 1) : null;
    setTooltip({
      x: toX(clamped, seriesA.length),
      idx: clamped,
      timestamp: seriesA[clamped]?.timestamp,
      vA: seriesA[clamped]?.value,
      vB: bIdx !== null ? seriesB[bIdx]?.value : null,
    });
  }, [seriesA, seriesB, showB]);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}
        onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>
        {yTicks.map(({ v, y }, i) => (
          <g key={i}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
            <text x={PL - 6} y={y + 4} textAnchor="end" fill="#444" fontSize="10" fontFamily="DM Sans, sans-serif">
              {`${(v - 100).toFixed(0)}%`}
            </text>
          </g>
        ))}
        <line x1={PL} y1={baselineY} x2={W - PR} y2={baselineY} stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="5 4"/>
        {pathA && <path d={pathA} fill="none" stroke={ACCENT_A} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
        {pathB && <path d={pathB} fill="none" stroke={ACCENT_B} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
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
          borderRadius: "8px", padding: "8px 12px", fontSize: "12px",
          fontFamily: "'Syne', sans-serif", pointerEvents: "none", zIndex: 10,
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        }}>
          <div style={{ color: "#5a6e8a", fontSize: "10px", marginBottom: "4px" }}>
            {tooltip.timestamp
              ? new Date(tooltip.timestamp * 1000).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" })
              : `Dag ${tooltip.idx}`}
          </div>
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

// ─── Manual Fund Modal ────────────────────────────────────────────────────────
const MANUAL_SPANS = ["1 mån", "3 mån", "1 år", "3 år"];

function ManualFundModal({ onSave, onClose }) {
  const [name, setName]         = useState("");
  const [category, setCategory] = useState("");
  const [isin, setIsin]         = useState("");
  const [fee, setFee]           = useState("");
  const [returns, setReturns]   = useState({ "1 mån": "", "3 mån": "", "1 år": "", "3 år": "" });
  const [errors, setErrors]     = useState({});

  const fieldStyle = (err) => ({
    width: "100%", boxSizing: "border-box",
    background: "rgba(255,255,255,0.06)",
    border: `1px solid ${err ? "rgba(248,113,113,0.55)" : "rgba(255,255,255,0.11)"}`,
    borderRadius: "7px", color: "#f0ede8", fontSize: "13px",
    padding: "8px 12px", outline: "none", fontFamily: "'Syne', sans-serif",
  });
  const label = (txt) => (
    <div style={{ fontSize: "10px", color: "#5a6e8a", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'Syne', sans-serif", marginBottom: "5px" }}>{txt}</div>
  );

  const handleSubmit = () => {
    const errs = {};
    if (!name.trim()) errs.name = true;
    if (fee === "" || isNaN(parseFloat(fee))) errs.fee = true;
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const id = `manual-${Date.now()}`;
    onSave({
      id, name: name.trim(), category: category.trim() || "Manuell",
      isin: isin.trim() || null, ticker: id, fee: parseFloat(fee),
      isManual: true, prices: [], currentPrice: null,
      returns: Object.fromEntries(MANUAL_SPANS.map(s => [s, returns[s] !== "" ? parseFloat(returns[s]) : null])),
    });
    onClose();
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
      animation: "fadeIn 0.2s ease",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#0d1120", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "16px", padding: "28px 28px 24px",
        maxWidth: "520px", width: "100%", maxHeight: "92vh",
        overflow: "auto", animation: "scaleIn 0.25s ease",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "16px", fontWeight: 700, color: "#f0ede8", margin: 0 }}>
            Lägg till fond manuellt
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#5a6e8a", cursor: "pointer", fontSize: "24px", lineHeight: 1, padding: "0 4px" }}>×</button>
        </div>

        <a href="https://www.morningstar.se" target="_blank" rel="noopener noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px",
          color: ACCENT_B, fontFamily: "'Syne', sans-serif", textDecoration: "none", marginBottom: "14px",
        }}>Sök upp fonden på Morningstar ↗</a>

        <div style={{
          background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.28)",
          borderRadius: "10px", padding: "11px 14px", marginBottom: "20px",
          fontSize: "12px", color: "#fbbf24", lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif",
        }}>
          ℹ Grafen visar en <strong style={{ color: "#fbbf24" }}>simulerad kursutveckling</strong> baserad på angiven avkastning och antagen volatilitet ~15% — den speglar inte faktisk historisk kursutveckling. Avkastningsprocenten i grafen stämmer med angiven data. Tidsspann utan data visas med varning i listan.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            {label("Fondnamn *")}
            <input value={name} onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: false })); }}
              placeholder="t.ex. Länsförsäkringar Global Index" style={fieldStyle(errors.name)} />
            {errors.name && <div style={{ fontSize: "11px", color: "#f87171", marginTop: "3px" }}>Obligatoriskt fält</div>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              {label("Kategori")}
              <input value={category} onChange={e => setCategory(e.target.value)}
                placeholder="t.ex. Globalfond" style={fieldStyle(false)} />
            </div>
            <div>
              {label("ISIN")}
              <input value={isin} onChange={e => setIsin(e.target.value)}
                placeholder="t.ex. SE0011527613" style={fieldStyle(false)} />
            </div>
          </div>

          <div>
            {label("Förvaltningsavgift (%) *")}
            <input type="number" step="0.01" value={fee}
              onChange={e => { setFee(e.target.value); setErrors(p => ({ ...p, fee: false })); }}
              placeholder="t.ex. 0.20" style={{ ...fieldStyle(errors.fee), width: "48%" }} />
            {errors.fee && <div style={{ fontSize: "11px", color: "#f87171", marginTop: "3px" }}>Obligatoriskt fält</div>}
          </div>

          <div>
            {label("Historisk avkastning (%)")}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
              {MANUAL_SPANS.map(s => {
                const filled = returns[s] !== "";
                return (
                  <div key={s}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "5px" }}>
                      <span style={{ fontSize: "10px", fontFamily: "'Syne', sans-serif", fontWeight: 600, color: filled ? "#6ee7b7" : "#5a6e8a" }}>{s}</span>
                      {filled && <span style={{ color: "#6ee7b7", fontSize: "12px", lineHeight: 1 }}>✓</span>}
                    </div>
                    <input type="number" step="0.01" value={returns[s]}
                      onChange={e => setReturns(p => ({ ...p, [s]: e.target.value }))}
                      placeholder="±%" style={{ ...fieldStyle(false), padding: "7px 8px" }} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "24px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            background: "transparent", border: "1px solid rgba(255,255,255,0.13)",
            color: "#5a6e8a", borderRadius: "8px", padding: "9px 20px",
            cursor: "pointer", fontSize: "12px", fontFamily: "'Syne', sans-serif", fontWeight: 600,
          }}>Avbryt</button>
          <button onClick={handleSubmit}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(0,24,245,0.28)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(0,24,245,0.15)"}
            style={{
              background: "rgba(0,24,245,0.15)", border: "1px solid rgba(0,24,245,0.4)",
              color: ACCENT_A_LIGHT, borderRadius: "8px", padding: "9px 20px",
              cursor: "pointer", fontSize: "12px", fontFamily: "'Syne', sans-serif", fontWeight: 600,
              transition: "background 0.2s",
            }}>Lägg till fond</button>
        </div>
      </div>
    </div>
  );
}

// ─── Fund Search ──────────────────────────────────────────────────────────────
function FundSearch({ onAdd, excluded, allFunds, loading, onSaveManualFund }) {
  const [q, setQ] = useState("");
  const [activeIdx, setActiveIdx] = useState(-1);
  const [showManualModal, setShowManualModal] = useState(false);

  const results = q.length > 1
    ? allFunds.filter(f => !excluded.includes(f.id) && (
        f.name.toLowerCase().includes(q.toLowerCase()) ||
        (f.ticker || "").toLowerCase().includes(q.toLowerCase()) ||
        (f.category || "").toLowerCase().includes(q.toLowerCase())
      )).slice(0, 6)
    : [];

  const showDropdown = q.length > 0;
  const pick = f => { onAdd(f); setQ(""); setActiveIdx(-1); };

  const handleKeyDown = e => {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = results[activeIdx] ?? results[0];
      if (target) pick(target);
    } else if (e.key === "Escape") {
      setQ(""); setActiveIdx(-1);
    }
  };

  return (
    <div style={{ position: "relative", marginBottom: "12px" }}>
      <input type="text"
        placeholder={loading ? "Laddar fonddata…" : "Sök fond, kategori eller ticker…"}
        value={q}
        onChange={e => { setQ(e.target.value); setActiveIdx(-1); }}
        onKeyDown={handleKeyDown}
        disabled={loading}
        style={{
          width: "100%", boxSizing: "border-box",
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.13)",
          borderRadius: "8px", color: loading ? "#5a6e8a" : "#f0ede8", fontSize: "13px",
          padding: "9px 14px", outline: "none", fontFamily: "'Syne', sans-serif",
        }}
      />
      {showDropdown && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#0d1120", border: "1px solid rgba(255,255,255,0.13)",
          borderRadius: "8px", zIndex: 200, overflow: "hidden",
        }}>
          {results.map((f, i) => (
            <div key={f.id} onClick={() => pick(f)}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(-1)}
              style={{
                padding: "9px 14px", cursor: "pointer",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: i === activeIdx ? "rgba(255,255,255,0.09)" : "transparent",
                transition: "background 0.12s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "13px", color: "#f0ede8", fontFamily: "'Syne', sans-serif" }}>
                  {f.name}{f.isManual && <span style={{ fontSize: "10px", color: "#5a6e8a", marginLeft: "6px" }}>manuell</span>}
                </div>
                <div style={{ fontSize: "10px", color: "#5a6e8a", fontFamily: "monospace" }}>{f.isManual ? "" : f.ticker}</div>
              </div>
              <div style={{ fontSize: "11px", color: "#5a6e8a", marginTop: "2px" }}>
                {f.category} · {fmtFee(f.fee)} avgift/år
                {f.currentPrice && <span> · {f.currentPrice.toFixed(2)} SEK</span>}
              </div>
            </div>
          ))}
          {/* Always-visible manual add row */}
          <div
            onClick={() => { setShowManualModal(true); setQ(""); setActiveIdx(-1); }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            style={{
              padding: "9px 14px", cursor: "pointer",
              borderTop: results.length > 0 ? "1px solid rgba(255,255,255,0.08)" : "none",
              display: "flex", alignItems: "center", gap: "8px",
              transition: "background 0.12s",
            }}
          >
            <div style={{
              width: "17px", height: "17px", borderRadius: "50%", flexShrink: 0,
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "14px", color: "#8a9bb0", lineHeight: 1,
            }}>+</div>
            <span style={{ fontSize: "12px", color: "#8a9bb0", fontFamily: "'Syne', sans-serif" }}>Lägg till fond manuellt</span>
          </div>
        </div>
      )}
      {showManualModal && (
        <ManualFundModal
          onSave={fund => { onSaveManualFund(fund); onAdd(fund); }}
          onClose={() => setShowManualModal(false)}
        />
      )}
    </div>
  );
}

// ─── Fund Row ─────────────────────────────────────────────────────────────────
function FundRow({ fund, allocation, inputMode, portfolioTotal, onUpdate, onRemove, dotColor, spanHasData = true }) {
  const pct = getFundPct(fund, { [fund.id]: allocation }, inputMode, portfolioTotal);
  const kr  = inputMode === "kr" ? (allocation.kr || 0) : (portfolioTotal * (allocation.pct || 0) / 100);
  const inputVal = inputMode === "pct" ? (allocation.pct || "") : (allocation.kr || "");

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 100px 90px 26px", gap: "8px", alignItems: "center",
      padding: "10px 12px", background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)", borderRadius: "9px", marginBottom: "7px",
      animation: "slideInLeft 0.22s ease", boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
        {dotColor && <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: dotColor, flexShrink: 0 }} />}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: "13px", color: "#f0ede8", fontWeight: 600 }}>{fund.name}</span>
              {!spanHasData && <span title="Ingen data för valt tidsspann" style={{ color: "#f59e0b", fontSize: "11px", lineHeight: 1 }}>⚠</span>}
            </div>
          <div style={{ fontSize: "11px", color: "#5a6e8a", marginTop: "1px" }}>
            {fund.category} · {fmtFee(fund.fee)} avgift
            {fund.currentPrice && <span> · {fund.currentPrice.toFixed(2)} SEK</span>}
          </div>
        </div>
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

// ─── Fund Details Modal ───────────────────────────────────────────────────────
function FundDetailsModal({ funds, accent, accentRgb, label, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#0d1120", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "16px", padding: "28px 28px 24px",
          maxWidth: "640px", width: "100%", maxHeight: "85vh",
          overflow: "auto", position: "relative",
          animation: "scaleIn 0.25s ease",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "16px", fontWeight: 700, color: "#f0ede8", margin: 0 }}>
            {label} – Detaljer & historik
          </h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#5a6e8a", cursor: "pointer", fontSize: "24px", lineHeight: 1, padding: "0 4px", transition: "color 0.2s" }}
            onMouseEnter={e => e.target.style.color = "#f0ede8"}
            onMouseLeave={e => e.target.style.color = "#5a6e8a"}
          >×</button>
        </div>

        {/* Info text */}
        <div style={{
          background: `rgba(${accentRgb}, 0.07)`, border: `1px solid rgba(${accentRgb}, 0.22)`,
          borderRadius: "10px", padding: "12px 16px", marginBottom: "22px",
          fontSize: "12px", color: "#8a9bb0", lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif",
        }}>
          Prisdata hämtas från Yahoo Finance och är tillgänglig fr.o.m. mars 2022 för dessa fonder.
          För fullständig historik, besök respektive fondsida via länkarna nedan.
        </div>

        {/* Fund rows */}
        {funds.map(fund => {
          const s1y = buildSeries(fund.prices, 12);
          const ret1y = s1y.length ? s1y[s1y.length - 1].value - 100 : null;
          const oldestDate = fund.prices?.[0]?.timestamp
            ? new Date(fund.prices[0].timestamp * 1000).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" })
            : "–";
          const isin = FUND_ISINS[fund.ticker] || "–";
          const morningstarUrl = `https://www.morningstar.se/se/funds/snapshot/snapshot.aspx?id=${fund.ticker.replace(".ST", "")}`;

          return (
            <div key={fund.id} style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "10px", padding: "14px 16px", marginBottom: "10px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "13px", fontWeight: 700, color: "#f0ede8" }}>{fund.name}</div>
                  <div style={{ fontSize: "11px", color: "#5a6e8a", marginTop: "2px" }}>{fund.category}</div>
                </div>
                <a
                  href={morningstarUrl} target="_blank" rel="noopener noreferrer"
                  style={{
                    fontSize: "11px", color: accent, textDecoration: "none",
                    fontFamily: "'Syne', sans-serif", fontWeight: 600,
                    background: `rgba(${accentRgb}, 0.1)`, padding: "5px 11px",
                    borderRadius: "6px", border: `1px solid rgba(${accentRgb}, 0.3)`,
                    whiteSpace: "nowrap", transition: "background 0.2s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = `rgba(${accentRgb}, 0.2)`}
                  onMouseLeave={e => e.currentTarget.style.background = `rgba(${accentRgb}, 0.1)`}
                >
                  Visa på Morningstar ↗
                </a>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "7px" }}>
                {[
                  { lbl: "ISIN", val: isin, mono: true },
                  { lbl: "Avgift/år", val: fmtFee(fund.fee) },
                  { lbl: "Avk. 1 år", val: ret1y !== null ? fmtPct(ret1y) : "–", color: ret1y !== null ? (ret1y >= 0 ? "#6ee7b7" : "#f87171") : "#5a6e8a" },
                  { lbl: "Data fr.o.m.", val: oldestDate },
                ].map(({ lbl, val, color, mono }) => (
                  <div key={lbl} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "7px", padding: "8px 10px" }}>
                    <div style={{ fontSize: "9px", color: "#5a6e8a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px", fontFamily: "'Syne', sans-serif" }}>{lbl}</div>
                    <div style={{ fontFamily: mono ? "monospace" : "'Syne', sans-serif", fontSize: mono ? "10px" : "12px", fontWeight: 600, color: color || "#f0ede8" }}>{val}</div>
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

// ─── Portfolio Panel ──────────────────────────────────────────────────────────
function PortfolioPanel({ label, accent, accentRgb, accentText, funds, allocations, inputMode, manualAmount, onInputModeChange, onManualAmountChange, allFunds, loading, onAddFund, onUpdateAlloc, onRemoveFund, viewMode, span, onSaveManualFund }) {
  const [showDetails, setShowDetails] = useState(false);
  const portfolioTotal = inputMode === "kr" ? portfolioKrTotal(funds, allocations) : manualAmount;
  const fee = getWeightedFee(funds, allocations, inputMode, portfolioTotal);
  const totalPct = inputMode === "pct"
    ? funds.reduce((acc, f) => acc + (allocations[f.id]?.pct || 0), 0)
    : 100;
  const pctOk = Math.abs(totalPct - 100) < 0.5;

  return (
    <div className="panel-card"
      onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 0 1px rgba(255,255,255,0.07), 0 12px 40px rgba(0,0,0,0.3), 0 0 28px rgba(${accentRgb},0.2)`}
      onMouseLeave={e => e.currentTarget.style.boxShadow = `0 0 28px rgba(${accentRgb},0.13), 0 2px 8px rgba(0,0,0,0.4)`}
      style={{
        flex: 1, minWidth: 0, background: "rgba(255,255,255,0.02)",
        border: `1px solid ${accent}33`, borderRadius: "14px", padding: "20px",
        display: "flex", flexDirection: "column", gap: "12px",
        animation: "fadeSlideUp 0.35s ease",
        boxShadow: `0 0 28px rgba(${accentRgb},0.13), 0 2px 8px rgba(0,0,0,0.4)`,
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

      {/* ── Input mode controls ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: "7px", padding: "3px", gap: "2px" }}>
          {["pct", "kr"].map(m => (
            <button key={m} onClick={() => onInputModeChange(m)} style={{
              background: inputMode === m ? "rgba(255,255,255,0.1)" : "transparent",
              border: "none", color: inputMode === m ? "#f0ede8" : "#5a6e8a",
              padding: "5px 12px", borderRadius: "5px", cursor: "pointer",
              fontSize: "11px", fontFamily: "'Syne', sans-serif", fontWeight: 600,
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
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.11)",
                borderRadius: "6px", color: "#f0ede8", fontSize: "12px",
                padding: "5px 9px", width: "100px", outline: "none", fontFamily: "'Syne', sans-serif",
              }}
            />
            <span style={{ fontSize: "11px", color: "#5a6e8a" }}>kr</span>
          </div>
        )}
      </div>

      <FundSearch onAdd={onAddFund} excluded={funds.map(f => f.id)} allFunds={allFunds} loading={loading} onSaveManualFund={onSaveManualFund} />

      <div style={{ flex: 1 }}>
        {funds.map((f, i) => (
          <FundRow key={f.id} fund={f}
            allocation={allocations[f.id] || { pct: 0, kr: 0 }}
            inputMode={inputMode} portfolioTotal={portfolioTotal}
            onUpdate={vals => onUpdateAlloc(f.id, vals)}
            onRemove={() => onRemoveFund(f.id)}
            dotColor={viewMode === "fund" ? FUND_COLORS[i % FUND_COLORS.length] : null}
            spanHasData={!f.isManual || f.returns?.[span] != null}
          />
        ))}
        {funds.length === 0 && (
          <div style={{ textAlign: "center", padding: "28px 0", color: "#444", fontSize: "13px", fontFamily: "'Syne', sans-serif" }}>
            {loading ? "Laddar fonddata…" : "Sök och lägg till fonder ovan"}
          </div>
        )}
      </div>

      {funds.length > 0 && (
        <div style={{ padding: "14px", background: `rgba(${accentRgb}, 0.06)`, border: `1px solid rgba(${accentRgb}, 0.2)`, borderRadius: "10px", boxShadow: `0 6px 24px rgba(0,0,0,0.5), 0 2px 8px rgba(${accentRgb},0.08)` }}>
          <div style={{ fontSize: "9px", color: "#5a6e8a", marginBottom: "10px", fontFamily: "'Syne', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>Portföljsammanfattning</div>
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "10px 12px", boxShadow: "0 3px 10px rgba(0,0,0,0.35)" }}>
              <div style={{ fontSize: "9px", color: "#5a6e8a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "3px" }}>Avgift/år</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "17px", fontWeight: 700, color: accentText }}>{fmtFee(fee)}</div>
              {portfolioTotal > 0 && <div style={{ fontSize: "10px", color: "#5a6e8a", marginTop: "2px" }}>{formatKr(portfolioTotal * fee / 100)}</div>}
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "10px 12px", boxShadow: "0 3px 10px rgba(0,0,0,0.35)" }}>
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

      {funds.length > 0 && (
        <button
          onClick={() => setShowDetails(true)}
          style={{
            width: "100%", background: `rgba(${accentRgb}, 0.07)`,
            border: `1px solid rgba(${accentRgb}, 0.25)`, color: accent,
            borderRadius: "8px", padding: "9px 14px", cursor: "pointer",
            fontSize: "12px", fontFamily: "'Syne', sans-serif", fontWeight: 600,
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
    </div>
  );
}

// ─── Return Chart ─────────────────────────────────────────────────────────────
function ReturnChart({ seriesA, seriesB, showB, selectedSpan, spanMonths, oldestTsA, oldestTsB, onSpanChange, totalA, totalB }) {
  const retA = portfolioReturn(seriesA);
  const retB = portfolioReturn(seriesB);

  const requestedCutoffTs = spanMonths !== null
    ? Date.now() / 1000 - spanMonths * 30.44 * 24 * 3600
    : -Infinity;
  const oldestTs = [oldestTsA, oldestTsB].filter(Boolean).reduce((a, b) => Math.max(a, b), 0);
  const spanHasFullData = ts => ts.months === null || !oldestTs || oldestTs <= Date.now() / 1000 - ts.months * 30.44 * 24 * 3600 + 30 * 86400;

  const actualFromTs = seriesA[0]?.timestamp ?? seriesB[0]?.timestamp;
  const isIncomplete = spanMonths !== null && actualFromTs && actualFromTs > requestedCutoffTs + 30 * 86400;
  const actualFromStr = actualFromTs
    ? new Date(actualFromTs * 1000).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "22px 24px", animation: "scaleIn 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "15px", fontWeight: 700, color: "#f0ede8", margin: "0 0 8px" }}>Historisk avkastning</h3>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {seriesA.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke={ACCENT_A} strokeWidth="2.5" strokeLinecap="round"/></svg>
                <span style={{ fontSize: "12px", color: "#f0ede8", fontFamily: "'Syne', sans-serif" }}>
                  A: <span style={{ color: retA >= 0 ? "#6ee7b7" : "#f87171", fontWeight: 700 }}>{fmtPct(retA)}</span>
                </span>
                {totalA > 0 && <span style={{ fontSize: "11px", color: "#5a6e8a" }}>({formatKr(totalA * retA / 100)})</span>}
              </div>
            )}
            {showB && seriesB.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke={ACCENT_B} strokeWidth="2.5" strokeLinecap="round"/></svg>
                <span style={{ fontSize: "12px", color: "#f0ede8", fontFamily: "'Syne', sans-serif" }}>
                  B: <span style={{ color: retB >= 0 ? "#6ee7b7" : "#f87171", fontWeight: 700 }}>{fmtPct(retB)}</span>
                </span>
                {totalB > 0 && <span style={{ fontSize: "11px", color: "#5a6e8a" }}>({formatKr(totalB * retB / 100)})</span>}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
          <div style={{ display: "flex", gap: "3px", background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "3px", flexWrap: "wrap" }}>
            {TIME_SPANS.map(ts => {
              const full = spanHasFullData(ts);
              return (
                <button key={ts.label} onClick={() => onSpanChange(ts.label)}
                  title={!full ? "Ofullständig data – Yahoo Finance saknar historik för vald period" : undefined}
                  style={{
                    background: selectedSpan === ts.label ? "rgba(255,255,255,0.12)" : "transparent",
                    border: "none",
                    color: selectedSpan === ts.label ? "#f0ede8" : full ? "#5a6e8a" : "#6b4c1a",
                    padding: "5px 10px", borderRadius: "6px", cursor: "pointer",
                    fontSize: "11px", fontFamily: "'Syne', sans-serif", fontWeight: 600,
                    transition: "all 0.18s", whiteSpace: "nowrap",
                    boxShadow: selectedSpan === ts.label ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
                  }}
                >{ts.label}{!full ? " ⚠" : ""}</button>
              );
            })}
          </div>
          {isIncomplete && actualFromStr && (
            <div style={{ fontSize: "10px", color: "#b45309", fontFamily: "'Syne', sans-serif" }}>
              Data fr.o.m. {actualFromStr} – Yahoo Finance saknar äldre historik
            </div>
          )}
        </div>
      </div>

      <SVGChart seriesA={seriesA} seriesB={seriesB} showB={showB} totalA={totalA} totalB={totalB} />

      {(seriesA.length > 0 || seriesB.length > 0) && (() => {
        const fmtDate = ts => new Date(ts * 1000).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });
        const endTs   = Math.max(seriesA[seriesA.length - 1]?.timestamp ?? 0, seriesB[seriesB.length - 1]?.timestamp ?? 0);
        const startTs = spanMonths === null
          ? Math.min(...[seriesA[0]?.timestamp, seriesB[0]?.timestamp].filter(Boolean))
          : Date.now() / 1000 - spanMonths * 30.44 * 24 * 3600;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px", padding: "0 2px" }}>
            <span style={{ fontSize: "11px", color: "#5a6e8a", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
              {fmtDate(startTs)}
            </span>
            <div style={{ flex: 1, position: "relative", height: "12px", display: "flex", alignItems: "center" }}>
              <div style={{ position: "absolute", left: 0, right: 0, height: "1px", background: "rgba(90,110,138,0.35)" }} />
              <div style={{
                position: "absolute", left: "50%", transform: "translateX(-50%)",
                background: "#090d1a", padding: "0 8px",
                fontSize: "10px", color: "#5a6e8a", fontFamily: "'Syne', sans-serif",
                fontWeight: 600, letterSpacing: "0.04em", whiteSpace: "nowrap",
              }}>
                {selectedSpan}
              </div>
            </div>
            <span style={{ fontSize: "11px", color: "#5a6e8a", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
              {fmtDate(endTs)}
            </span>
          </div>
        );
      })()}

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

// ─── Fund SVG Chart ───────────────────────────────────────────────────────────
function FundSVGChart({ lines, portfolioSeries }) {
  const W = 800, H = 220, PL = 48, PR = 12, PT = 10, PB = 28;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;

  const allVals = [...lines.flatMap(l => l.series.map(d => d.value)), ...portfolioSeries.map(d => d.value)];
  if (!allVals.length) return null;

  const minV = Math.min(...allVals, 95);
  const maxV = Math.max(...allVals, 105);
  const pad  = (maxV - minV) * 0.12;
  const yMin = minV - pad;
  const yMax = maxV + pad;

  const toX = (i, len) => PL + (i / Math.max(len - 1, 1)) * chartW;
  const toY = v => PT + chartH - ((v - yMin) / (yMax - yMin)) * chartH;
  const makePath = s => s.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i, s.length).toFixed(1)},${toY(d.value).toFixed(1)}`).join(" ");

  const baselineY = toY(100);
  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef(null);

  const handleMouseMove = useCallback(e => {
    if (!svgRef.current || !portfolioSeries.length) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx   = (e.clientX - rect.left) * (W / rect.width);
    const idx  = Math.round(((mx - PL) / chartW) * (portfolioSeries.length - 1));
    const ci   = Math.max(0, Math.min(portfolioSeries.length - 1, idx));
    setTooltip({
      x: toX(ci, portfolioSeries.length),
      timestamp: portfolioSeries[ci]?.timestamp,
      portfolio: portfolioSeries[ci]?.value,
      funds: lines.map(l => ({ name: l.name, color: l.color, value: l.series[Math.min(ci, l.series.length - 1)]?.value })),
    });
  }, [portfolioSeries, lines]);

  const yTicks = Array.from({ length: 5 }, (_, i) => ({ v: yMin + (i / 4) * (yMax - yMin) })).map(t => ({ ...t, y: toY(t.v) }));

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}
        onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>
        {yTicks.map(({ v, y }, i) => (
          <g key={i}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
            <text x={PL - 6} y={y + 4} textAnchor="end" fill="#444" fontSize="10" fontFamily="DM Sans, sans-serif">{`${(v - 100).toFixed(0)}%`}</text>
          </g>
        ))}
        <line x1={PL} y1={baselineY} x2={W - PR} y2={baselineY} stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="5 4"/>
        {lines.map(l => l.series.length > 1 && (
          <path key={l.color + l.name} d={makePath(l.series)} fill="none" stroke={l.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.80"/>
        ))}
        {portfolioSeries.length > 1 && (
          <path d={makePath(portfolioSeries)} fill="none" stroke="rgba(255,255,255,0.88)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        )}
        {tooltip && (
          <>
            <line x1={tooltip.x} y1={PT} x2={tooltip.x} y2={H - PB} stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
            {tooltip.portfolio && <circle cx={tooltip.x} cy={toY(tooltip.portfolio)} r="5" fill="white" stroke={BG} strokeWidth="2"/>}
          </>
        )}
      </svg>
      {tooltip && (
        <div style={{
          position: "absolute", top: "10px",
          left: tooltip.x / W * 100 > 60 ? "auto" : `calc(${tooltip.x / W * 100}% + 10px)`,
          right: tooltip.x / W * 100 > 60 ? `calc(${(1 - tooltip.x / W) * 100}% + 10px)` : "auto",
          background: "#0d1120", border: "1px solid rgba(255,255,255,0.13)",
          borderRadius: "8px", padding: "8px 12px", fontSize: "12px",
          fontFamily: "'Syne', sans-serif", pointerEvents: "none", zIndex: 10,
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)", maxWidth: "220px",
        }}>
          <div style={{ color: "#5a6e8a", fontSize: "10px", marginBottom: "6px" }}>
            {tooltip.timestamp ? new Date(tooltip.timestamp * 1000).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" }) : ""}
          </div>
          {tooltip.portfolio != null && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "white", flexShrink: 0 }} />
              <span style={{ color: "#f0ede8", fontSize: "11px" }}>Portfölj: <strong style={{ color: (tooltip.portfolio - 100) >= 0 ? "#6ee7b7" : "#f87171" }}>{fmtPct(tooltip.portfolio - 100)}</strong></span>
            </div>
          )}
          {tooltip.funds.map(f => f.value != null && (
            <div key={f.name} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: f.color, flexShrink: 0 }} />
              <span style={{ color: "#8a9bb0", fontSize: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {f.name.split(" ").slice(0, 2).join(" ")}: <strong style={{ color: (f.value - 100) >= 0 ? "#6ee7b7" : "#f87171" }}>{fmtPct(f.value - 100)}</strong>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Fund Return Chart ────────────────────────────────────────────────────────
function FundReturnChart({ fundLines, portfolioSeries, selectedSpan, spanMonths, oldestTsA, onSpanChange, totalA, fee1 }) {
  const retPortfolio = portfolioReturn(portfolioSeries);
  const requestedCutoffTs = spanMonths !== null ? Date.now() / 1000 - spanMonths * 30.44 * 24 * 3600 : -Infinity;
  const spanHasFullData = ts => ts.months === null || !oldestTsA || oldestTsA <= Date.now() / 1000 - ts.months * 30.44 * 24 * 3600 + 30 * 86400;
  const actualFromTs = portfolioSeries[0]?.timestamp;
  const isIncomplete = spanMonths !== null && actualFromTs && actualFromTs > requestedCutoffTs + 30 * 86400;
  const actualFromStr = actualFromTs ? new Date(actualFromTs * 1000).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" }) : null;

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "22px 24px", animation: "scaleIn 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "15px", fontWeight: 700, color: "#f0ede8", margin: "0 0 8px" }}>Historisk avkastning</h3>
          {portfolioSeries.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" strokeLinecap="round"/></svg>
              <span style={{ fontSize: "12px", color: "#f0ede8", fontFamily: "'Syne', sans-serif" }}>
                Portfölj: <span style={{ color: retPortfolio >= 0 ? "#6ee7b7" : "#f87171", fontWeight: 700 }}>{fmtPct(retPortfolio)}</span>
              </span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
          <div style={{ display: "flex", gap: "3px", background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "3px", flexWrap: "wrap" }}>
            {TIME_SPANS.map(ts => {
              const full = spanHasFullData(ts);
              return (
                <button key={ts.label} onClick={() => onSpanChange(ts.label)}
                  title={!full ? "Ofullständig data" : undefined}
                  style={{
                    background: selectedSpan === ts.label ? "rgba(255,255,255,0.12)" : "transparent",
                    border: "none", color: selectedSpan === ts.label ? "#f0ede8" : full ? "#5a6e8a" : "#6b4c1a",
                    padding: "5px 10px", borderRadius: "6px", cursor: "pointer",
                    fontSize: "11px", fontFamily: "'Syne', sans-serif", fontWeight: 600,
                    transition: "all 0.18s", whiteSpace: "nowrap",
                    boxShadow: selectedSpan === ts.label ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
                  }}
                >{ts.label}{!full ? " ⚠" : ""}</button>
              );
            })}
          </div>
          {isIncomplete && actualFromStr && (
            <div style={{ fontSize: "10px", color: "#b45309", fontFamily: "'Syne', sans-serif" }}>
              Data fr.o.m. {actualFromStr} – Yahoo Finance saknar äldre historik
            </div>
          )}
        </div>
      </div>

      <FundSVGChart lines={fundLines} portfolioSeries={portfolioSeries} />

      {portfolioSeries.length > 0 && (() => {
        const fmtDate = ts => new Date(ts * 1000).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });
        const endTs   = portfolioSeries[portfolioSeries.length - 1]?.timestamp;
        const startTs = spanMonths === null ? portfolioSeries[0]?.timestamp : Date.now() / 1000 - spanMonths * 30.44 * 24 * 3600;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px", padding: "0 2px" }}>
            <span style={{ fontSize: "11px", color: "#5a6e8a", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>{fmtDate(startTs)}</span>
            <div style={{ flex: 1, position: "relative", height: "12px", display: "flex", alignItems: "center" }}>
              <div style={{ position: "absolute", left: 0, right: 0, height: "1px", background: "rgba(90,110,138,0.35)" }} />
              <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", background: "#090d1a", padding: "0 8px", fontSize: "10px", color: "#5a6e8a", fontFamily: "'Syne', sans-serif", fontWeight: 600, whiteSpace: "nowrap" }}>{selectedSpan}</div>
            </div>
            <span style={{ fontSize: "11px", color: "#5a6e8a", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>{fmtDate(endTs)}</span>
          </div>
        );
      })()}

      {fundLines.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "18px", height: "2.5px", background: "rgba(255,255,255,0.85)", borderRadius: "2px" }} />
            <span style={{ fontSize: "11px", color: "#8a9bb0", fontFamily: "'DM Sans', sans-serif" }}>Portfölj</span>
          </div>
          {fundLines.map(l => (
            <div key={l.name} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "18px", height: "2px", background: l.color, borderRadius: "2px", opacity: 0.75 }} />
              <span style={{ fontSize: "11px", color: "#8a9bb0", fontFamily: "'DM Sans', sans-serif" }}>{l.name}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginTop: "16px" }}>
        {[
          { lbl: "Total avgift/år", val: fmtFee(fee1), sub: totalA > 0 ? formatKr(totalA * fee1 / 100) + "/år" : null },
          { lbl: `Avkastning (${selectedSpan})`, val: fmtPct(retPortfolio), col: retPortfolio >= 0 ? "#6ee7b7" : "#f87171", sub: totalA > 0 ? formatKr(totalA * retPortfolio / 100) : null },
          { lbl: "Investerat belopp", val: totalA > 0 ? formatKr(totalA) : "–" },
        ].map(({ lbl, val, col, sub }) => (
          <div key={lbl} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "12px 16px" }}>
            <div style={{ fontSize: "9px", color: "#5a6e8a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px", fontFamily: "'Syne', sans-serif" }}>{lbl}</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "17px", fontWeight: 700, color: col || "#f0ede8" }}>{val}</div>
            {sub && <div style={{ fontSize: "10px", color: "#5a6e8a", marginTop: "2px" }}>{sub}</div>}
          </div>
        ))}
      </div>
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
  const [allFunds, setAllFunds]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [funds1, setFunds1]             = useState([]);
  const [funds2, setFunds2]             = useState([]);
  const [allocs1, setAllocs1]           = useState({});
  const [allocs2, setAllocs2]           = useState({});
  const [inputMode1, setInputMode1]           = useState("pct");
  const [manualAmount1, setManualAmount1]     = useState(0);
  const [inputMode2, setInputMode2]           = useState("pct");
  const [manualAmount2, setManualAmount2]     = useState(0);
  const [hasManualEdit1, setHasManualEdit1]   = useState(false);
  const [hasManualEdit2, setHasManualEdit2]   = useState(false);
  const [manualFundsDb, setManualFundsDb]     = useState(() => {
    try { return JSON.parse(localStorage.getItem("manualFunds") || "[]"); } catch { return []; }
  });
  const [viewMode, setViewMode]               = useState("fund");
  const [span, setSpan]                       = useState("Max");

  const compareMode = viewMode === "compare";

  // Fetch real fund data on mount
  useEffect(() => {
    fetch("/api/funds")
      .then(r => r.json())
      .then(data => {
        const funds = data.funds
          .filter(f => !f.error && f.prices?.length > 0)
          .map(f => ({
            ...f,
            fee: f.fee ?? FUND_FEES[f.ticker] ?? 0,
          }));
        setAllFunds(funds);
        setLoading(false);
      })
      .catch(() => {
        setError("Kunde inte ladda fonddata. Försök igen senare.");
        setLoading(false);
      });
  }, []);

  const totalA = inputMode1 === "kr" ? portfolioKrTotal(funds1, allocs1) : manualAmount1;
  const totalB = inputMode2 === "kr" ? portfolioKrTotal(funds2, allocs2) : manualAmount2;
  const spanMonths = TIME_SPANS.find(t => t.label === span)?.months ?? null;

  const seriesA = useMemo(() => blendPortfolioSeries(funds1, allocs1, inputMode1, totalA, spanMonths), [funds1, allocs1, inputMode1, totalA, spanMonths]);
  const seriesB = useMemo(() => blendPortfolioSeries(funds2, allocs2, inputMode2, totalB, spanMonths), [funds2, allocs2, inputMode2, totalB, spanMonths]);
  const fundSeriesA = useMemo(() => funds1.map((f, i) => {
    const color = FUND_COLORS[i % FUND_COLORS.length];
    if (f.isManual) {
      const ret     = f.returns?.[span];
      const months  = TIME_SPANS.find(t => t.label === span)?.months;
      if (ret == null || !months) return null;
      return { name: f.name, color, isManual: true, series: generateSimulatedSeries(ret, months, f.id) };
    }
    return { name: f.name, color, isManual: false, series: buildSeries(f.prices, spanMonths) };
  }).filter(Boolean).filter(l => l.series.length > 0), [funds1, spanMonths, span]);

  const fee1 = getWeightedFee(funds1, allocs1, inputMode1, totalA);
  const fee2 = getWeightedFee(funds2, allocs2, inputMode2, totalB);
  const retA = portfolioReturn(seriesA);
  const retB = portfolioReturn(seriesB);

  const oldestTsA = useMemo(() => {
    const tss = funds1.flatMap(f => f.prices?.length ? [f.prices[0].timestamp] : []);
    return tss.length ? Math.max(...tss) : null;
  }, [funds1]);
  const oldestTsB = useMemo(() => {
    const tss = funds2.flatMap(f => f.prices?.length ? [f.prices[0].timestamp] : []);
    return tss.length ? Math.max(...tss) : null;
  }, [funds2]);

  const saveManualFund = fund => {
    const updated = [...manualFundsDb.filter(f => f.id !== fund.id), fund];
    setManualFundsDb(updated);
    localStorage.setItem("manualFunds", JSON.stringify(updated));
  };

  const searchableFunds = useMemo(() => [...allFunds, ...manualFundsDb], [allFunds, manualFundsDb]);

  const addFund1 = f => {
    const newFunds = [...funds1, f];
    setFunds1(newFunds);
    if (inputMode1 === "pct" && !hasManualEdit1) {
      const even = parseFloat((100 / newFunds.length).toFixed(2));
      setAllocs1(prev => {
        const n = { ...prev };
        newFunds.forEach(fund => { n[fund.id] = { ...n[fund.id], pct: even }; });
        return n;
      });
    }
  };
  const addFund2 = f => {
    const newFunds = [...funds2, f];
    setFunds2(newFunds);
    if (inputMode2 === "pct" && !hasManualEdit2) {
      const even = parseFloat((100 / newFunds.length).toFixed(2));
      setAllocs2(prev => {
        const n = { ...prev };
        newFunds.forEach(fund => { n[fund.id] = { ...n[fund.id], pct: even }; });
        return n;
      });
    }
  };
  const updA = (id, v) => { setAllocs1(p => ({ ...p, [id]: { ...p[id], ...v } })); setHasManualEdit1(true); };
  const updB = (id, v) => { setAllocs2(p => ({ ...p, [id]: { ...p[id], ...v } })); setHasManualEdit2(true); };
  const remF1 = id => {
    const newFunds = funds1.filter(f => f.id !== id);
    setFunds1(newFunds);
    setAllocs1(p => { const n = { ...p }; delete n[id]; return n; });
    if (newFunds.length === 0) setHasManualEdit1(false);
  };
  const remF2 = id => {
    const newFunds = funds2.filter(f => f.id !== id);
    setFunds2(newFunds);
    setAllocs2(p => { const n = { ...p }; delete n[id]; return n; });
    if (newFunds.length === 0) setHasManualEdit2(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#f0ede8", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.985); }
          to   { opacity: 1; transform: scale(1);     }
        }
        .mode-btn:active { transform: scale(0.94); }
        .panel-card { transition: box-shadow 0.3s ease, border-color 0.3s ease; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ padding: "26px 36px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 800, margin: 0, letterSpacing: "-0.02em", color: "#f0ede8" }}>MinPortfölj</h1>
          <p style={{ margin: "3px 0 0", fontSize: "11px", color: "#5a6e8a" }}>Jämför avgifter & historisk avkastning</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: "7px", padding: "3px", gap: "2px" }}>
            {[
              { value: "compare", label: "⇄ Jämför",   activeColor: ACCENT_B,       activeBg: "rgba(56,189,248,0.15)"  },
              { value: "fund",    label: "◈ Fondläge", activeColor: ACCENT_A,       activeBg: "rgba(0,24,245,0.18)"    },
            ].map(({ value, label, activeColor, activeBg }) => (
              <button key={value} className="mode-btn" onClick={() => setViewMode(value)} style={{
                background: viewMode === value ? activeBg : "transparent",
                border: "none", color: viewMode === value ? activeColor : "#5a6e8a",
                padding: "5px 12px", borderRadius: "5px", cursor: "pointer",
                fontSize: "11px", fontFamily: "'Syne', sans-serif", fontWeight: 600, transition: "all 0.2s",
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "22px 36px", display: "flex", flexDirection: "column", gap: "18px" }}>

        {error && (
          <div style={{ padding: "16px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "10px", color: "#f87171", fontSize: "13px", fontFamily: "'Syne', sans-serif" }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#5a6e8a", fontSize: "13px", fontFamily: "'Syne', sans-serif" }}>
            Hämtar fonddata från Yahoo Finance…
          </div>
        )}

        {!loading && !error && (
          <>
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <PortfolioPanel label={viewMode === "fund" ? "Portfölj" : "Portfölj A"} accent={ACCENT_A} accentRgb="0,24,245" accentText={ACCENT_A_LIGHT}
                funds={funds1} allocations={allocs1} inputMode={inputMode1} manualAmount={manualAmount1}
                onInputModeChange={setInputMode1} onManualAmountChange={setManualAmount1}
                allFunds={searchableFunds} loading={loading} viewMode={viewMode}
                onAddFund={addFund1} onUpdateAlloc={updA} onRemoveFund={remF1}
                span={span} onSaveManualFund={saveManualFund}
              />
              {compareMode && (
                <PortfolioPanel label="Portfölj B" accent={ACCENT_B} accentRgb="56,189,248" accentText={ACCENT_B}
                  funds={funds2} allocations={allocs2} inputMode={inputMode2} manualAmount={manualAmount2}
                  onInputModeChange={setInputMode2} onManualAmountChange={setManualAmount2}
                  allFunds={searchableFunds} loading={loading} viewMode={viewMode}
                  onAddFund={addFund2} onUpdateAlloc={updB} onRemoveFund={remF2}
                  span={span} onSaveManualFund={saveManualFund}
                />
              )}
            </div>

            {viewMode === "fund" && funds1.length > 0 && (
              <FundReturnChart key="fund-chart"
                fundLines={fundSeriesA} portfolioSeries={seriesA}
                selectedSpan={span} spanMonths={spanMonths} onSpanChange={setSpan}
                totalA={totalA} fee1={fee1} oldestTsA={oldestTsA}
              />
            )}

            {viewMode !== "fund" && (funds1.length > 0 || (compareMode && funds2.length > 0)) && (
              <ReturnChart key={`compare-${compareMode}`}
                seriesA={seriesA} seriesB={seriesB}
                showB={compareMode && funds2.length > 0}
                selectedSpan={span} spanMonths={spanMonths} onSpanChange={setSpan}
                totalA={totalA} totalB={totalB}
                oldestTsA={oldestTsA} oldestTsB={oldestTsB}
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
                    { label: "Lägre avgift",        winner: fee1 <= fee2 ? "A" : "B", accentRgb: fee1 <= fee2 ? "0,24,245" : "56,189,248", accentText: fee1 <= fee2 ? ACCENT_A_LIGHT : ACCENT_B },
                    { label: `Bäst avk. (${span})`, winner: retA >= retB  ? "A" : "B", accentRgb: retA >= retB  ? "0,24,245" : "56,189,248", accentText: retA >= retB  ? ACCENT_A_LIGHT : ACCENT_B },
                  ].map(({ label: lbl, winner, accentRgb, accentText }) => (
                    <div key={lbl} style={{ textAlign: "center", padding: "14px 24px", background: `rgba(${accentRgb}, 0.06)`, border: `1px solid rgba(${accentRgb}, 0.2)`, borderRadius: "10px" }}>
                      <div style={{ fontSize: "9px", color: "#5a6e8a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px", fontFamily: "'Syne', sans-serif" }}>{lbl}</div>
                      <div style={{ fontSize: "18px", fontFamily: "'Syne', sans-serif", fontWeight: 800, color: accentText }}>Portfölj {winner}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ fontSize: "10px", color: "#1e2d3a", textAlign: "center", paddingBottom: "12px" }}>
          * Historisk avkastning från Yahoo Finance. Historisk avkastning garanterar inte framtida resultat.
        </div>
      </div>
    </div>
  );
}