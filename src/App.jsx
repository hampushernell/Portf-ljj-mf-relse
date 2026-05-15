import { useState, useMemo } from "react";
import {
  getWeightedFee,
  portfolioKrTotal,
  portfolioReturn,
  blendPortfolioSeries,
  buildSeries,
  generateSimulatedSeries,
  getYahooRef,
} from "./lib/calculations";
import { formatCompareStats } from "./lib/comparisons";
import useFundData from "./hooks/useFundData";
import usePortfolio from "./hooks/usePortfolio";
import {
  ACCENT_A, ACCENT_A_LIGHT, ACCENT_B, BG,
  FUND_COLORS, TIME_SPANS,
} from "./lib/utils";
import PortfolioPanel from "./components/PortfolioPanel";
import CompareBar from "./components/CompareBar";
import ReturnChart from "./components/ReturnChart";
import FundReturnChart from "./components/FundReturnChart";

export default function App() {
  const { allFunds, loading, error } = useFundData();
  const [manualFundsDb, setManualFundsDb] = useState(() => {
    try { return JSON.parse(localStorage.getItem("manualFunds") || "[]"); } catch { return []; }
  });
  const portfolioA = usePortfolio(manualFundsDb);
  const portfolioB = usePortfolio(manualFundsDb);
  const [viewMode, setViewMode] = useState("fund");
  const [span, setSpan]         = useState("Max");

  const compareMode = viewMode === "compare";

  const totalA = portfolioA.inputMode === "kr" ? portfolioKrTotal(portfolioA.funds, portfolioA.allocs) : portfolioA.manualAmount;
  const totalB = portfolioB.inputMode === "kr" ? portfolioKrTotal(portfolioB.funds, portfolioB.allocs) : portfolioB.manualAmount;
  const spanMonths = TIME_SPANS.find(t => t.label === span)?.months ?? null;

  const sharedRef = useMemo(() => getYahooRef([...portfolioA.funds, ...portfolioB.funds], spanMonths), [portfolioA.funds, portfolioB.funds, spanMonths]);
  const seriesA = useMemo(() => blendPortfolioSeries(portfolioA.funds, portfolioA.allocs, portfolioA.inputMode, totalA, spanMonths, span, sharedRef), [portfolioA.funds, portfolioA.allocs, portfolioA.inputMode, totalA, spanMonths, span, sharedRef]);
  const seriesB = useMemo(() => blendPortfolioSeries(portfolioB.funds, portfolioB.allocs, portfolioB.inputMode, totalB, spanMonths, span, sharedRef), [portfolioB.funds, portfolioB.allocs, portfolioB.inputMode, totalB, spanMonths, span, sharedRef]);
  const fundSeriesA = useMemo(() => {
    const { refEndTs, refLen, latestNavTs } = getYahooRef(portfolioA.funds, spanMonths);
    return portfolioA.funds.map((f, i) => {
      const color = FUND_COLORS[i % FUND_COLORS.length];
      if (f.isManual) {
        const ret    = f.returns?.[span];
        const months = TIME_SPANS.find(t => t.label === span)?.months;
        if (ret == null || !months) return null;
        return { name: f.name, color, isManual: true, series: generateSimulatedSeries(ret, months, f.id, refEndTs, refLen) };
      }
      return { name: f.name, color, isManual: false, series: buildSeries(f.prices, spanMonths, latestNavTs) };
    }).filter(Boolean).filter(l => l.series.length > 0);
  }, [portfolioA.funds, spanMonths, span]);

  const fee1 = getWeightedFee(portfolioA.funds, portfolioA.allocs, portfolioA.inputMode, totalA);
  const fee2 = getWeightedFee(portfolioB.funds, portfolioB.allocs, portfolioB.inputMode, totalB);
  const retA = portfolioReturn(seriesA);
  const retB = portfolioReturn(seriesB);
  const compareStats = compareMode ? formatCompareStats(retA, retB, fee1, fee2, totalA, totalB) : null;

  const oldestTsA = useMemo(() => {
    const tss = portfolioA.funds.flatMap(f => f.prices?.length ? [f.prices[0].timestamp] : []);
    return tss.length ? Math.max(...tss) : null;
  }, [portfolioA.funds]);
  const oldestTsB = useMemo(() => {
    const tss = portfolioB.funds.flatMap(f => f.prices?.length ? [f.prices[0].timestamp] : []);
    return tss.length ? Math.max(...tss) : null;
  }, [portfolioB.funds]);

  const saveManualFund = fund => {
    const updated = [...manualFundsDb.filter(f => f.id !== fund.id), fund];
    setManualFundsDb(updated);
    localStorage.setItem("manualFunds", JSON.stringify(updated));
  };

  const deleteManualFund = id => {
    const updated = manualFundsDb.filter(f => f.id !== id);
    setManualFundsDb(updated);
    localStorage.setItem("manualFunds", JSON.stringify(updated));
    portfolioA.removeFund(id);
    portfolioB.removeFund(id);
  };

  const searchableFunds = useMemo(() => [...allFunds, ...manualFundsDb], [allFunds, manualFundsDb]);

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
                funds={portfolioA.funds} allocations={portfolioA.allocs} inputMode={portfolioA.inputMode} manualAmount={portfolioA.manualAmount}
                onInputModeChange={portfolioA.setInputMode} onManualAmountChange={portfolioA.setManualAmount}
                allFunds={searchableFunds} loading={loading} viewMode={viewMode}
                onAddFund={portfolioA.addFund} onUpdateAlloc={portfolioA.updateAlloc} onRemoveFund={portfolioA.removeFund}
                span={span} onSaveManualFund={saveManualFund}
                onDeleteManualFund={deleteManualFund} onUpdateFundData={portfolioA.updateFundData}
              />
              {compareMode && (
                <PortfolioPanel label="Portfölj B" accent={ACCENT_B} accentRgb="56,189,248" accentText={ACCENT_B}
                  funds={portfolioB.funds} allocations={portfolioB.allocs} inputMode={portfolioB.inputMode} manualAmount={portfolioB.manualAmount}
                  onInputModeChange={portfolioB.setInputMode} onManualAmountChange={portfolioB.setManualAmount}
                  allFunds={searchableFunds} loading={loading} viewMode={viewMode}
                  onAddFund={portfolioB.addFund} onUpdateAlloc={portfolioB.updateAlloc} onRemoveFund={portfolioB.removeFund}
                  span={span} onSaveManualFund={saveManualFund}
                  onDeleteManualFund={deleteManualFund} onUpdateFundData={portfolioB.updateFundData}
                />
              )}
            </div>

            {viewMode === "fund" && portfolioA.funds.length > 0 && (
              <FundReturnChart key="fund-chart"
                fundLines={fundSeriesA} portfolioSeries={seriesA}
                selectedSpan={span} spanMonths={spanMonths} onSpanChange={setSpan}
                totalA={totalA} fee1={fee1} oldestTsA={oldestTsA}
                latestNavTs={sharedRef.latestNavTs}
              />
            )}

            {viewMode !== "fund" && (portfolioA.funds.length > 0 || (compareMode && portfolioB.funds.length > 0)) && (
              <ReturnChart key={`compare-${compareMode}`}
                seriesA={seriesA} seriesB={seriesB}
                showB={compareMode && portfolioB.funds.length > 0}
                selectedSpan={span} spanMonths={spanMonths} onSpanChange={setSpan}
                totalA={totalA} totalB={totalB}
                oldestTsA={oldestTsA} oldestTsB={oldestTsB}
                latestNavTs={sharedRef.latestNavTs}
              />
            )}

            {compareMode && portfolioA.funds.length > 0 && portfolioB.funds.length > 0 && (
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                  <div style={{ fontSize: "9px", color: ACCENT_A_LIGHT, background: "rgba(0,24,245,0.1)", padding: "3px 9px", borderRadius: "20px", fontFamily: "'Syne', sans-serif", fontWeight: 600 }}>A</div>
                  <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "13px", fontWeight: 700, margin: 0, color: "#f0ede8" }}>Snabb jämförelse</h3>
                  <div style={{ fontSize: "9px", color: ACCENT_B, background: "rgba(56,189,248,0.1)", padding: "3px 9px", borderRadius: "20px", fontFamily: "'Syne', sans-serif", fontWeight: 600 }}>B</div>
                </div>
                <div style={{ maxWidth: "560px", margin: "0 auto" }}>
                  <CompareBar label="Avgift per år" val1={fee1} val2={fee2} unit="%" higherIsBetter={false} />
                  {(totalA > 0 || totalB > 0) && <CompareBar label="Avgift i kr/år" val1={compareStats.feeKrA} val2={compareStats.feeKrB} higherIsBetter={false} />}
                  <CompareBar label={`Avkastning (${span})`} val1={retA} val2={retB} unit="%" higherIsBetter={true} />
                  {(totalA > 0 || totalB > 0) && <CompareBar label={`Avkastning i kr (${span})`} val1={compareStats.retKrA} val2={compareStats.retKrB} higherIsBetter={true} />}
                </div>
                <div style={{ marginTop: "16px", display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                  {[
                    { label: "Lägre avgift",        winner: compareStats.feeWinner, accentRgb: compareStats.feeWinner === "A" ? "0,24,245" : "56,189,248", accentText: compareStats.feeWinner === "A" ? ACCENT_A_LIGHT : ACCENT_B },
                    { label: `Bäst avk. (${span})`, winner: compareStats.retWinner, accentRgb: compareStats.retWinner === "A" ? "0,24,245" : "56,189,248", accentText: compareStats.retWinner === "A" ? ACCENT_A_LIGHT : ACCENT_B },
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
