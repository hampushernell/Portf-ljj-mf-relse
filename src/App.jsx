import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatKr = v => new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(v);
const fmtPct   = v => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
const fmtFee   = v => `${v.toFixed(2)}%`;

function blendPortfolioSeries(funds, allocs, inputMode, totalAmount, months) {
  if (!funds.length) return [];
  const totalM = Math.min(months, 120);
  const startIdx = 120 - totalM;
  return Array.from({ length: totalM + 1 }, (_, i) => {
    let blended = 0, totalWeight = 0;
    funds.forEach(f => {
      const pct = inputMode === "pct"
        ? (allocs[f.id]?.pct || 0)
        : totalAmount > 0 ? ((allocs[f.id]?.kr || 0) / totalAmount) * 100 : 0;
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

function getWeightedFee(funds, allocs, inputMode, totalAmount) {
  return funds.reduce((acc, f) => {
    const pct = inputMode === "pct" ? (allocs[f.id]?.pct || 0) : totalAmount > 0 ? ((allocs[f.id]?.kr || 0) / totalAmount) * 100 : 0;
    return acc + (pct / 100) * f.fee;
  }, 0);
}

const portfolioReturn = series => series.length ? series[series.length - 1].value - 100 : 0;

// ─── Custom chart tooltip ─────────────────────────────────────────────────────

function ChartTooltip({ active, payload, showB, totalAmount }) {
  if (!active || !payload?.length) return null;
  const a = payload.find(p => p.dataKey === "A");
  const b = payload.find(p => p.dataKey === "B");
  return (
    <div style={{
      background: "#12121e", border: "1px solid rgba(255,255,255,0.13)",
      borderRadius: "10px", padding: "12px 16px",
      fontSize: "12px", fontFamily: "'Syne', sans-serif",
      boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
    }}>
      {a && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: showB && b ? "6px" : 0 }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#7dd3fc" }} />
          <span style={{ color: "#f0ede8" }}>A: <strong style={{ color: (a.value - 100) >= 0 ? "#6ee7b7" : "#f87171" }}>{fmtPct(a.value - 100)}</strong></span>
          {totalAmount > 0 && <span style={{ color: "#666" }}>{formatKr(totalAmount * ((a.value - 100) / 100))}</span>}
        </div>
      )}
      {showB && b && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#c4b5fd" }} />
          <span style={{ color: "#f0ede8" }}>B: <strong style={{ color: (b.value - 100) >= 0 ? "#6ee7b7" : "#f87171" }}>{fmtPct(b.value - 100)}</strong></span>
          {totalAmount > 0 && <span style={{ color: "#666" }}>{formatKr(totalAmount * ((b.value - 100) / 100))}</span>}
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
          background: "#14142a", border: "1px solid rgba(255,255,255,0.13)",
          borderRadius: "8px", zIndex: 200, overflow: "hidden",
        }}>
          {results.map(f => (
            <div key={f.id} onClick={() => { onAdd(f); setQ(""); }}
              style={{ padding: "9px 14px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.06)", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ fontSize: "13px", color: "#f0ede8", fontFamily: "'Syne', sans-serif" }}>{f.name}</div>
              <div style={{ fontSize: "11px", color: "#8a8a9a" }}>{f.category} · {fmtFee(f.fee)} avgift/år</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Fund Row ─────────────────────────────────────────────────────────────────

function FundRow({ fund, allocation, inputMode, totalAmount, onUpdate, onRemove }) {
  const krVal  = inputMode === "kr"  ? allocation.kr  : (totalAmount * (allocation.pct / 100));
  const pctVal = inputMode === "pct" ? allocation.pct : (totalAmount > 0 ? (allocation.kr / totalAmount) * 100 : 0);
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 100px 90px 26px", gap: "8px", alignItems: "center",
      padding: "10px 12px", background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)", borderRadius: "9px", marginBottom: "7px",
    }}>
      <div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "13px", color: "#f0ede8", fontWeight: 600 }}>{fund.name}</div>
        <div style={{ fontSize: "11px", color: "#8a8a9a", marginTop: "1px" }}>{fund.category} · {fmtFee(fund.fee)} avgift</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <label style={{ fontSize: "9px", color: "#8a8a9a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {inputMode === "pct" ? "Andel %" : "Belopp kr"}
        </label>
        <input type="number"
          value={inputMode === "pct" ? allocation.pct : allocation.kr}
          onChange={e => onUpdate(inputMode === "pct" ? { pct: parseFloat(e.target.value) || 0 } : { kr: parseFloat(e.target.value) || 0 })}
          style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.11)",
            borderRadius: "6px", color: "#f0ede8", fontSize: "13px",
            padding: "5px 8px", width: "100%", outline: "none",
            fontFamily: "'Syne', sans-serif", boxSizing: "border-box",
          }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <label style={{ fontSize: "9px", color: "#8a8a9a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {inputMode === "pct" ? "≈ kr" : "≈ %"}
        </label>
        <div style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "6px", color: "#8a8a9a", fontSize: "11px", padding: "5px 8px",
        }}>
          {inputMode === "pct" ? formatKr(krVal) : `${pctVal.toFixed(1)}%`}
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

function PortfolioPanel({ label, accent, funds, allocations, inputMode, totalAmount, onAddFund, onUpdateAlloc, onRemoveFund }) {
  const fee = getWeightedFee(funds, allocations, inputMode, totalAmount);
  const totalPct = funds.reduce((acc, f) => acc + (inputMode === "pct" ? (allocations[f.id]?.pct || 0) : totalAmount > 0 ? ((allocations[f.id]?.kr || 0) / totalAmount) * 100 : 0), 0);
  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: "rgba(255,255,255,0.02)", border: `1px solid ${accent}30`,
      borderRadius: "14px", padding: "20px",
      display: "flex", flexDirection: "column", gap: "12px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: accent, boxShadow: `0 0 8px ${accent}88` }} />
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "15px", fontWeight: 700, color: "#f0ede8", margin: 0 }}>{label}</h2>
        {funds.length > 0 && (
          <span style={{
            marginLeft: "auto", fontSize: "10px",
            color: Math.abs(totalPct - 100) < 0.5 ? "#6ee7b7" : "#fbbf24",
            background: Math.abs(totalPct - 100) < 0.5 ? "rgba(110,231,183,0.1)" : "rgba(251,191,36,0.1)",
            padding: "2px 8px", borderRadius: "20px", fontFamily: "'Syne', sans-serif",
          }}>{totalPct.toFixed(1)}% fördelat</span>
        )}
      </div>
      <FundSearch onAdd={onAddFund} excluded={funds.map(f => f.id)} />
      <div style={{ flex: 1 }}>
        {funds.map(f => (
          <FundRow key={f.id} fund={f}
            allocation={allocations[f.id] || { pct: 0, kr: 0 }}
            inputMode={inputMode} totalAmount={totalAmount}
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
        <div style={{ padding: "14px", background: `${accent}0d`, border: `1px solid ${accent}1a`, borderRadius: "10px" }}>
          <div style={{ fontSize: "9px", color: "#8a8a9a", marginBottom: "10px", fontFamily: "'Syne', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>Portföljsammanfattning</div>
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "10px 12px" }}>
              <div style={{ fontSize: "9px", color: "#8a8a9a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "3px" }}>Avgift/år</div>
              <div style={{ fontSize: "17px", fontFamily: "'Syne', sans-serif", fontWeight: 700, color: accent }}>{fmtFee(fee)}</div>
              {totalAmount > 0 && <div style={{ fontSize: "10px", color: "#8a8a9a", marginTop: "2px" }}>{formatKr(totalAmount * fee / 100)}</div>}
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "10px 12px" }}>
              <div style={{ fontSize: "9px", color: "#8a8a9a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "3px" }}>Investerat</div>
              <div style={{ fontSize: "17px", fontFamily: "'Syne', sans-serif", fontWeight: 700, color: "#f0ede8" }}>{formatKr(totalAmount)}</div>
              <div style={{ fontSize: "10px", color: "#8a8a9a", marginTop: "2px" }}>{funds.length} fonder</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Return Chart ─────────────────────────────────────────────────────────────

function ReturnChart({ seriesA, seriesB, showB, selectedSpan, onSpanChange, totalAmount }) {
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
      {/* Chart header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "15px", fontWeight: 700, color: "#f0ede8", margin: "0 0 8px" }}>
            Historisk avkastning
          </h3>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {seriesA.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke="#7dd3fc" strokeWidth="2.5" strokeLinecap="round" /></svg>
                <span style={{ fontSize: "12px", color: "#f0ede8", fontFamily: "'Syne', sans-serif" }}>
                  A: <span style={{ color: retA >= 0 ? "#6ee7b7" : "#f87171", fontWeight: 700 }}>{fmtPct(retA)}</span>
                </span>
                {totalAmount > 0 && <span style={{ fontSize: "11px", color: "#8a8a9a" }}>({formatKr(totalAmount * retA / 100)})</span>}
              </div>
            )}
            {showB && seriesB.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="22" height="10">
                  <line x1="0" y1="5" x2="6" y2="5" stroke="#c4b5fd" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="9" y1="5" x2="15" y2="5" stroke="#c4b5fd" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="18" y1="5" x2="22" y2="5" stroke="#c4b5fd" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <span style={{ fontSize: "12px", color: "#f0ede8", fontFamily: "'Syne', sans-serif" }}>
                  B: <span style={{ color: retB >= 0 ? "#6ee7b7" : "#f87171", fontWeight: 700 }}>{fmtPct(retB)}</span>
                </span>
                {totalAmount > 0 && <span style={{ fontSize: "11px", color: "#8a8a9a" }}>({formatKr(totalAmount * retB / 100)})</span>}
              </div>
            )}
          </div>
        </div>

        {/* Time span pills */}
        <div style={{ display: "flex", gap: "3px", background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "3px", flexWrap: "wrap" }}>
          {TIME_SPANS.map(ts => (
            <button key={ts.label} onClick={() => onSpanChange(ts.label)}
              style={{
                background: selectedSpan === ts.label ? "rgba(255,255,255,0.13)" : "transparent",
                border: "none",
                color: selectedSpan === ts.label ? "#f0ede8" : "#8a8a9a",
                padding: "5px 10px", borderRadius: "6px", cursor: "pointer",
                fontSize: "11px", fontFamily: "'Syne', sans-serif", fontWeight: 600,
                transition: "all 0.18s", whiteSpace: "nowrap",
                boxShadow: selectedSpan === ts.label ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
              }}
            >{ts.label}</button>
          ))}
        </div>
      </div>

      {/* Recharts line chart */}
      <div style={{ height: "260px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <ReferenceLine y={100} stroke="rgba(255,255,255,0.18)" strokeDasharray="5 4" />
            <XAxis dataKey="month" tickFormatter={tickFormatter}
              tick={{ fill: "#555", fontSize: 10, fontFamily: "'Syne', sans-serif" }}
              axisLine={false} tickLine={false} interval="preserveStartEnd"
            />
            <YAxis domain={[minV - pad, maxV + pad]}
              tickFormatter={v => `${(v - 100).toFixed(0)}%`}
              tick={{ fill: "#555", fontSize: 10, fontFamily: "'Syne', sans-serif" }}
              axisLine={false} tickLine={false} width={42}
            />
            <Tooltip content={<ChartTooltip showB={showB} totalAmount={totalAmount} />} />
            <Line type="monotone" dataKey="A" stroke="#7dd3fc" strokeWidth={2.5}
              dot={false} activeDot={{ r: 5, fill: "#7dd3fc", strokeWidth: 0 }}
              connectNulls animationDuration={500}
            />
            {showB && (
              <Line type="monotone" dataKey="B" stroke="#c4b5fd" strokeWidth={2.5}
                dot={false} strokeDasharray="6 4"
                activeDot={{ r: 5, fill: "#c4b5fd", strokeWidth: 0 }}
                connectNulls animationDuration={500}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Winner callout */}
      {showB && seriesA.length > 0 && seriesB.length > 0 && (() => {
        const diff = retA - retB;
        const winnerCol = diff >= 0 ? "#7dd3fc" : "#c4b5fd";
        const winner    = diff >= 0 ? "A" : "B";
        return (
          <div style={{
            marginTop: "16px", padding: "12px 16px",
            background: `${winnerCol}0d`, border: `1px solid ${winnerCol}22`,
            borderRadius: "9px", display: "flex", alignItems: "center", gap: "10px",
          }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: winnerCol, flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: "#f0ede8", fontFamily: "'Syne', sans-serif" }}>
              Portfölj <strong style={{ color: winnerCol }}>{winner}</strong> presterar{" "}
              <strong style={{ color: winnerCol }}>{Math.abs(diff).toFixed(2)} pp</strong> bättre under vald period.
              {totalAmount > 0 && ` Det motsvarar ${formatKr(Math.abs(totalAmount * diff / 100))}.`}
            </span>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Compare bars ─────────────────────────────────────────────────────────────

function CompareBar({ label, val1, val2, unit = "", higherIsBetter = true }) {
  const max   = Math.max(Math.abs(val1), Math.abs(val2), 0.001);
  const w1    = (Math.abs(val1) / max) * 100;
  const w2    = (Math.abs(val2) / max) * 100;
  const b1    = higherIsBetter ? val1 >= val2 : val1 <= val2;
  const disp  = v => Math.abs(v) > 999 ? formatKr(v) : `${v.toFixed(2)}${unit}`;
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ fontSize: "10px", color: "#8a8a9a", marginBottom: "5px", fontFamily: "'Syne', sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 1fr", gap: "6px", alignItems: "center" }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ height: "7px", width: `${w1}%`, background: "#7dd3fc", borderRadius: "4px", opacity: b1 ? 1 : 0.3, transition: "width 0.5s ease" }} />
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "10px", color: "#7dd3fc", fontFamily: "'Syne', sans-serif" }}>{disp(val1)}</div>
          <div style={{ fontSize: "10px", color: "#c4b5fd", fontFamily: "'Syne', sans-serif" }}>{disp(val2)}</div>
        </div>
        <div>
          <div style={{ height: "7px", width: `${w2}%`, background: "#c4b5fd", borderRadius: "4px", opacity: !b1 ? 1 : 0.3, transition: "width 0.5s ease" }} />
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

const DEF_F1 = [SAMPLE_FUNDS[0], SAMPLE_FUNDS[4], SAMPLE_FUNDS[6]];
const DEF_F2 = [SAMPLE_FUNDS[2], SAMPLE_FUNDS[3]];
const DEF_A1 = { 1: { pct: 60, kr: 60000 }, 5: { pct: 20, kr: 20000 }, 7: { pct: 20, kr: 20000 } };
const DEF_A2 = { 3: { pct: 60, kr: 60000 }, 4: { pct: 40, kr: 40000 } };

export default function App() {
  const [funds1, setFunds1]           = useState(DEF_F1);
  const [funds2, setFunds2]           = useState(DEF_F2);
  const [allocs1, setAllocs1]         = useState(DEF_A1);
  const [allocs2, setAllocs2]         = useState(DEF_A2);
  const [inputMode, setInputMode]     = useState("pct");
  const [totalAmount, setTotalAmount] = useState(100000);
  const [compareMode, setCompareMode] = useState(true);
  const [span, setSpan]               = useState("5 år");

  const spanMonths = TIME_SPANS.find(t => t.label === span)?.months || 60;

  const seriesA = useMemo(() => blendPortfolioSeries(funds1, allocs1, inputMode, totalAmount, spanMonths), [funds1, allocs1, inputMode, totalAmount, spanMonths]);
  const seriesB = useMemo(() => blendPortfolioSeries(funds2, allocs2, inputMode, totalAmount, spanMonths), [funds2, allocs2, inputMode, totalAmount, spanMonths]);

  const fee1 = getWeightedFee(funds1, allocs1, inputMode, totalAmount);
  const fee2 = getWeightedFee(funds2, allocs2, inputMode, totalAmount);
  const retA = portfolioReturn(seriesA);
  const retB = portfolioReturn(seriesB);

  const addFund1  = f => setFunds1(p => [...p, f]);
  const addFund2  = f => setFunds2(p => [...p, f]);
  const updA      = (id, v) => setAllocs1(p => ({ ...p, [id]: { ...p[id], ...v } }));
  const updB      = (id, v) => setAllocs2(p => ({ ...p, [id]: { ...p[id], ...v } }));
  const remFund1  = id => { setFunds1(p => p.filter(f => f.id !== id)); setAllocs1(p => { const n={...p}; delete n[id]; return n; }); };
  const remFund2  = id => { setFunds2(p => p.filter(f => f.id !== id)); setAllocs2(p => { const n={...p}; delete n[id]; return n; }); };

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", color: "#f0ede8", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />

      {/* ── Header ── */}
      <div style={{
        padding: "26px 36px 18px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap",
      }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "23px", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            Fondportfölj
          </h1>
          <p style={{ margin: "3px 0 0", fontSize: "11px", color: "#8a8a9a" }}>Jämför avgifter & historisk avkastning</p>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Mode toggle */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: "7px", padding: "3px", gap: "2px" }}>
            {["pct", "kr"].map(m => (
              <button key={m} onClick={() => setInputMode(m)} style={{
                background: inputMode === m ? "rgba(255,255,255,0.1)" : "transparent",
                border: "none", color: inputMode === m ? "#f0ede8" : "#8a8a9a",
                padding: "5px 12px", borderRadius: "5px", cursor: "pointer",
                fontSize: "11px", fontFamily: "'Syne', sans-serif", fontWeight: 600, transition: "all 0.2s",
              }}>{m === "pct" ? "% Procent" : "kr Kronor"}</button>
            ))}
          </div>

          {/* Total amount */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "11px", color: "#8a8a9a" }}>Belopp:</span>
            <input type="number" value={totalAmount} onChange={e => setTotalAmount(parseFloat(e.target.value) || 0)}
              style={{
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.11)",
                borderRadius: "6px", color: "#f0ede8", fontSize: "12px",
                padding: "5px 9px", width: "100px", outline: "none", fontFamily: "'Syne', sans-serif",
              }}
            />
            <span style={{ fontSize: "11px", color: "#8a8a9a" }}>kr</span>
          </div>

          {/* Compare toggle */}
          <button onClick={() => setCompareMode(m => !m)} style={{
            background: compareMode ? "rgba(124,58,237,0.18)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${compareMode ? "rgba(124,58,237,0.35)" : "rgba(255,255,255,0.1)"}`,
            color: compareMode ? "#c4b5fd" : "#8a8a9a",
            padding: "6px 12px", borderRadius: "7px", cursor: "pointer",
            fontSize: "11px", fontFamily: "'Syne', sans-serif", fontWeight: 600, transition: "all 0.2s",
          }}>⇄ {compareMode ? "Jämförelse på" : "Jämförelse av"}</button>
        </div>
      </div>

      <div style={{ padding: "22px 36px", display: "flex", flexDirection: "column", gap: "18px" }}>

        {/* ── Portfolio panels ── */}
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
          <PortfolioPanel label="Portfölj A" accent="#7dd3fc"
            funds={funds1} allocations={allocs1} inputMode={inputMode} totalAmount={totalAmount}
            onAddFund={addFund1} onUpdateAlloc={updA} onRemoveFund={remFund1}
          />
          {compareMode && (
            <PortfolioPanel label="Portfölj B" accent="#c4b5fd"
              funds={funds2} allocations={allocs2} inputMode={inputMode} totalAmount={totalAmount}
              onAddFund={addFund2} onUpdateAlloc={updB} onRemoveFund={remFund2}
            />
          )}
        </div>

        {/* ── Chart ── */}
        {(funds1.length > 0 || (compareMode && funds2.length > 0)) && (
          <ReturnChart
            seriesA={seriesA} seriesB={seriesB}
            showB={compareMode && funds2.length > 0}
            selectedSpan={span} onSpanChange={setSpan}
            totalAmount={totalAmount}
          />
        )}

        {/* ── Comparison summary ── */}
        {compareMode && funds1.length > 0 && funds2.length > 0 && (
          <div style={{
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "14px", padding: "20px 24px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ fontSize: "9px", color: "#7dd3fc", background: "rgba(125,211,252,0.1)", padding: "3px 9px", borderRadius: "20px", fontFamily: "'Syne', sans-serif", fontWeight: 600 }}>A</div>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "13px", fontWeight: 700, margin: 0, color: "#f0ede8" }}>Snabb jämförelse</h3>
              <div style={{ fontSize: "9px", color: "#c4b5fd", background: "rgba(196,181,253,0.1)", padding: "3px 9px", borderRadius: "20px", fontFamily: "'Syne', sans-serif", fontWeight: 600 }}>B</div>
            </div>
            <div style={{ maxWidth: "560px", margin: "0 auto" }}>
              <CompareBar label="Avgift per år" val1={fee1} val2={fee2} unit="%" higherIsBetter={false} />
              {totalAmount > 0 && <CompareBar label="Avgift i kr/år" val1={totalAmount * fee1 / 100} val2={totalAmount * fee2 / 100} higherIsBetter={false} />}
              <CompareBar label={`Avkastning (${span})`} val1={retA} val2={retB} unit="%" higherIsBetter={true} />
              {totalAmount > 0 && <CompareBar label={`Avkastning i kr (${span})`} val1={totalAmount * retA / 100} val2={totalAmount * retB / 100} higherIsBetter={true} />}
            </div>
            <div style={{ marginTop: "16px", display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
              {[
                { label: "Lägre avgift",         winner: fee1 <= fee2 ? "A" : "B", col: fee1 <= fee2 ? "#7dd3fc" : "#c4b5fd" },
                { label: `Bäst avk. (${span})`,  winner: retA >= retB  ? "A" : "B", col: retA >= retB  ? "#7dd3fc" : "#c4b5fd" },
              ].map(({ label: lbl, winner, col }) => (
                <div key={lbl} style={{ textAlign: "center", padding: "10px 20px", background: `${col}0d`, border: `1px solid ${col}22`, borderRadius: "9px" }}>
                  <div style={{ fontSize: "9px", color: "#8a8a9a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "3px" }}>{lbl}</div>
                  <div style={{ fontSize: "18px", fontFamily: "'Syne', sans-serif", fontWeight: 800, color: col }}>Portfölj {winner}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ fontSize: "10px", color: "#3a3a55", textAlign: "center", paddingBottom: "12px" }}>
          * Avkastning är simulerad exempeldata baserad på historiska snittavkastningar. Historisk avkastning garanterar inte framtida resultat.
        </div>
      </div>
    </div>
  );
}