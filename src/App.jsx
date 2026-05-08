import { useState, useMemo } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip as ChartTooltip2, Filler } from "chart.js";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTooltip2, Filler);
// ─── Sample fund data ────────────────────────────────────────────────────────

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
  { id: 1,  name: "Avanza Global",                     category: "Globalfond",      fee: 0.11, annualReturn: 14.3, volatility: 14, seed: 111 },
  { id: 2,  name: "Länsförsäkringar Global Indexnära", category: "Globalfond",      fee: 0.20, annualReturn: 13.9, volatility: 14, seed: 222 },
  { id: 3,  name: "SPP Global Plus",                   category: "Globalfond",      fee: 0.44, annualReturn: 15.1, volatility: 15, seed: 333 },
  { id: 4,  name: "Swedbank Robur Teknologifond",       category: "Teknikfond",      fee: 1.40, annualReturn: 18.2, volatility: 22, seed: 444 },
  { id: 5,  name: "AMF Aktiefond Sverige",             category: "Sverigefond",     fee: 0.17, annualReturn: 8.4,  volatility: 17, seed: 555 },
  { id: 6,  name: "Handelsbanken Sverige Index",        category: "Sverigefond",     fee: 0.21, annualReturn: 8.1,  volatility: 17, seed: 666 },
  { id: 7,  name: "Spiltan Aktiefond Investmentbolag", category: "Sverigefond",     fee: 0.20, annualReturn: 10.3, volatility: 18, seed: 777 },
  { id: 8,  name: "DNB Teknologi",                     category: "Teknikfond",      fee: 1.61, annualReturn: 19.5, volatility: 24, seed: 888 },
  { id: 9,  name: "Länsförsäkringar Tillväxtmarknad",  category: "Tillväxtmarknad", fee: 0.46, annualReturn: 5.8,  volatility: 19, seed: 999 },
  { id: 10, name: "Avanza Emerging Markets",           category: "Tillväxtmarknad", fee: 0.33, annualReturn: 5.4,  volatility: 18, seed: 1010 },
  { id: 11, name: "Öhman Sverige Hållbar",             category: "Sverigefond",     fee: 0.60, annualReturn: 8.9,  volatility: 17, seed: 1111 },
  { id: 12, name: "Robur Access Asien",                category: "Asienfond",       fee: 1.39, annualReturn: 6.7,  volatility: 20, seed: 1212 },
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

// ─── Color palette ────────────────────────────────────────────────────────────
const ACCENT_A = "#0018F5";
const ACCENT_A_LIGHT = "#7b93ff";
const ACCENT_B = "#38bdf8";

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

// ─── Custom chart tooltip ─────────────────────────────────────────────────────
function ChartTooltip({ active, payload, showB, totalA, totalB }) {
  if (!active || !payload?.length) return null;
  const a = payload.find(p => p.dataKey === "A");
  const b = payload.find(p => p.dataKey === "B");
  return (
    <div style={{
      background: "#0d1120", border: "1px solid rgba(255,255,255,0.13)",
      borderRadius: "10px", padding: "12px 16px",
      fontSize: "12px", fontFamily: "'Syne', sans-serif",
      boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
    }}>
      {a && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: showB && b ? "6px" : 0 }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: ACCENT_A_LIGHT }} />
          <span style={{ color: "#f0ede8" }}>A: <strong style={{ color: (a.value - 100) >= 0 ? "#6ee7b7" : "#f87171" }}>{fmtPct(a.value - 100)}</strong></span>
          {totalA > 0 && <span style={{ color: "#666" }}>{formatKr(totalA * ((a.value - 100) / 100))}</span>}
        </div>
      )}
      {showB && b && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: ACCENT_B }} />
          <span style={{ color: "#f0ede8" }}>B: <strong style={{ color: (b.value - 100) >= 0 ? "#6ee7b7" : "#f87171" }}>{fmtPct(b.value - 100)}</strong></span>
          {totalB > 0 && <span style={{ color: "#666" }}>{formatKr(totalB * ((b.value - 100) / 100))}</span>}
        </div>
      )}
    </div>
  );
}

// ─── Fund Search ──────────────────────────────────────────────────────────────
function FundSearch({ onAdd, excluded }) {
  const [q, setQ] = useState("");
  const results = q.length > 1
    ? SAMPLE_FUNDS.filter(f => !excluded.includes(f.id) && f.name.toLowerCase().includes(q.toLowerCase())).slice(0, 5)
    : [];
  return (
    <div style={{ position: "relative", marginBottom: "12px" }}>
      <input type="text" placeholder="Sök fond att lägga till…" value={q} onChange={e => setQ(e.target.value)}
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
              <div style={{ fontSize: "13px", color: "#f0ede8", fontFamily: "'Syne', sans-serif" }}>{f.name}</div>
              <div style={{ fontSize: "11px", color: "#5a6e8a" }}>{f.category} · {fmtFee(f.fee)} avgift/år</div>
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
        <div style={{ fontSize: "11px", color: "#5a6e8a", marginTop: "1px" }}>{fund.category} · {fmtFee(fund.fee)} avgift</div>
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
function PortfolioPanel({ label, accent, accentRgb, funds, allocations, inputMode, manualAmount, onAddFund, onUpdateAlloc, onRemoveFund }) {
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
        <div style={{
          padding: "14px",
          background: `rgba(${accentRgb}, 0.06)`,
          border: `1px solid rgba(${accentRgb}, 0.2)`,
          borderRadius: "10px",
        }}>
          <div style={{ fontSize: "9px", color: "#5a6e8a", marginBottom: "10px", fontFamily: "'Syne', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>Portföljsammanfattning</div>
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "10px 12px" }}>
              <div style={{ fontSize: "9px", color: "#5a6e8a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "3px" }}>Avgift/år</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "17px", fontWeight: 700, color: accent }}>{fmtFee(fee)}</div>
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

  const chartData = useMemo(() => {
    const maxLen = Math.max(seriesA.length, showB ? seriesB.length : 0);
    return Array.from({ length: maxLen }, (_, i) => ({
      month: i,
      A: seriesA[i]?.value ?? null,
      B: showB && seriesB[i] ? seriesB[i].value : null,
    }));
  }, [seriesA, seriesB, showB]);

  const span = TIME_SPANS.find(t => t.label === selectedSpan);
  const tickFormatter = month => {
    const months = span?.months || 60;
    if (months <= 3)  return `v${Math.round(month * 4.3)}`;
    if (months <= 12) return `m${month}`;
    const yr = Math.floor(month / 12);
    const mo = month % 12;
    return mo === 0 ? `År ${yr}` : "";
  };

  const allVals = chartData.flatMap(d => [d.A, d.B].filter(Boolean));
  const minV = Math.min(...allVals, 95);
  const maxV = Math.max(...allVals, 105);
  const pad  = (maxV - minV) * 0.1;

  return (
    <div style={{
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "14px", padding: "22px 24px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "15px", fontWeight: 700, color: "#f0ede8", margin: "0 0 8px" }}>
            Historisk avkastning
          </h3>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {seriesA.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke={ACCENT_A_LIGHT} strokeWidth="2.5" strokeLinecap="round" /></svg>
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
                border: "none",
                color: selectedSpan === ts.label ? "#f0ede8" : "#5a6e8a",
                padding: "5px 10px", borderRadius: "6px", cursor: "pointer",
                fontSize: "11px", fontFamily: "'Syne', sans-serif", fontWeight: 600,
                transition: "all 0.18s", whiteSpace: "nowrap",
                boxShadow: selectedSpan === ts.label ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
              }}
            >{ts.label}</button>
          ))}
        </div>
      </div>

<div style={{ height: 260, width: "100%", minHeight: 260 }}>
  <Line
    data={{
      labels: chartData.map(d => d.month),
      datasets: [
        {
          label: "A",
          data: chartData.map(d => d.A),
          borderColor: ACCENT_A_LIGHT,
          borderWidth: 2.5,
          pointRadius: 0,
          tension: 0.4,
        },
        ...(showB ? [{
          label: "B",
          data: chartData.map(d => d.B),
          borderColor: ACCENT_B,
          borderWidth: 2.5,
          borderDash: [6, 4],
          pointRadius: 0,
          tension: 0.4,
        }] : []),
      ],
    }}
    options={{
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false } },
      scales: {
        x: { display: true, grid: { display: false }, ticks: { color: "#444", font: { size: 10 }, maxTicksLimit: 8 } },
        y: { display: true, grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#444", font: { size: 10 }, callback: v => `${(v - 100).toFixed(0)}%` } },
      },
    }}
  />
</div>
      {showB && seriesA.length > 0 && seriesB.length > 0 && (() => {
        const diff = retA - retB;
        const winnerCol = diff >= 0 ? ACCENT_A_LIGHT : ACCENT_B;
        const winner    = diff >= 0 ? "A" : "B";
        const refTotal  = totalA > 0 ? totalA : totalB;
        return (
          <div style={{
            marginTop: "16px", padding: "12px 16px",
            background: `rgba(${diff >= 0 ? "77,101,255" : "56,189,248"}, 0.07)`,
            border: `1px solid rgba(${diff >= 0 ? "77,101,255" : "56,189,248"}, 0.2)`,
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
          <div style={{ height: "7px", width: `${w1}%`, background: ACCENT_A_LIGHT, borderRadius: "4px", opacity: b1 ? 1 : 0.3, transition: "width 0.5s ease" }} />
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
    <div style={{ minHeight: "100vh", background: "#070a14", color: "#f0ede8", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />

      {/* ── Header ── */}
      <div style={{
        padding: "26px 36px 18px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap",
      }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 800, margin: 0, letterSpacing: "-0.02em", color: "#f0ede8" }}>
            MinPortfölj
          </h1>
          <p style={{ margin: "3px 0 0", fontSize: "11px", color: "#5a6e8a" }}>Jämför avgifter & historisk avkastning</p>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Mode toggle */}
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

          {/* Amount */}
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

          {/* Compare toggle */}
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

        {/* ── Portfolio panels ── */}
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
          <PortfolioPanel label="Portfölj A" accent={ACCENT_A} accentRgb="0,24,245"
            funds={funds1} allocations={allocs1} inputMode={inputMode} manualAmount={manualAmount}
            onAddFund={addFund1} onUpdateAlloc={updA} onRemoveFund={remF1}
          />
          {compareMode && (
            <PortfolioPanel label="Portfölj B" accent={ACCENT_B} accentRgb="56,189,248"
              funds={funds2} allocations={allocs2} inputMode={inputMode} manualAmount={manualAmount}
              onAddFund={addFund2} onUpdateAlloc={updB} onRemoveFund={remF2}
            />
          )}
        </div>

        {/* ── Chart ── */}
        {(funds1.length > 0 || (compareMode && funds2.length > 0)) && (
          <ReturnChart
            seriesA={seriesA} seriesB={seriesB}
            showB={compareMode && funds2.length > 0}
            selectedSpan={span} onSpanChange={setSpan}
            totalA={totalA} totalB={totalB}
          />
        )}

        {/* ── Comparison summary ── */}
        {compareMode && funds1.length > 0 && funds2.length > 0 && (
          <div style={{
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "14px", padding: "20px 24px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ fontSize: "9px", color: ACCENT_A_LIGHT, background: "rgba(77,101,255,0.1)", padding: "3px 9px", borderRadius: "20px", fontFamily: "'Syne', sans-serif", fontWeight: 600 }}>A</div>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "13px", fontWeight: 700, margin: 0, color: "#f0ede8" }}>Snabb jämförelse</h3>
              <div style={{ fontSize: "9px", color: ACCENT_B, background: "rgba(56,189,248,0.1)", padding: "3px 9px", borderRadius: "20px", fontFamily: "'Syne', sans-serif", fontWeight: 600 }}>B</div>
            </div>
            <div style={{ maxWidth: "560px", margin: "0 auto" }}>
              <CompareBar label="Avgift per år" val1={fee1} val2={fee2} unit="%" higherIsBetter={false} />
              {(totalA > 0 || totalB > 0) && (
                <CompareBar label="Avgift i kr/år" val1={totalA * fee1 / 100} val2={totalB * fee2 / 100} higherIsBetter={false} />
              )}
              <CompareBar label={`Avkastning (${span})`} val1={retA} val2={retB} unit="%" higherIsBetter={true} />
              {(totalA > 0 || totalB > 0) && (
                <CompareBar label={`Avkastning i kr (${span})`} val1={totalA * retA / 100} val2={totalB * retB / 100} higherIsBetter={true} />
              )}
            </div>
            <div style={{ marginTop: "16px", display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
              {[
                { label: "Lägre avgift",        winner: fee1 <= fee2 ? "A" : "B", col: fee1 <= fee2 ? ACCENT_A_LIGHT : ACCENT_B },
                { label: `Bäst avk. (${span})`, winner: retA >= retB  ? "A" : "B", col: retA >= retB  ? ACCENT_A_LIGHT : ACCENT_B },
              ].map(({ label: lbl, winner, col }) => (
                <div key={lbl} style={{ textAlign: "center", padding: "10px 20px", background: `${col}15`, border: `1px solid ${col}30`, borderRadius: "9px" }}>
                  <div style={{ fontSize: "9px", color: "#5a6e8a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "3px" }}>{lbl}</div>
                  <div style={{ fontSize: "18px", fontFamily: "'Syne', sans-serif", fontWeight: 800, color: col }}>Portfölj {winner}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ fontSize: "10px", color: "#1e2d3a", textAlign: "center", paddingBottom: "12px" }}>
          * Avkastning är simulerad exempeldata. Historisk avkastning garanterar inte framtida resultat.
        </div>
      </div>
    </div>
  );
}