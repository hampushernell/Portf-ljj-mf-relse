import { useState, useMemo } from "react";
import useBreakpoint from "./hooks/useBreakpoint";
import {
  getWeightedFee,
  portfolioKrTotal,
  getLatestNavTs,
  computeReturnBundle,
  seriesYears,
  computeCAGR,
  computeMaxDrawdown,
  computeAnnualizedVolatility,
} from "./lib/calculations";
import useFundData from "./hooks/useFundData";
import usePortfolio from "./hooks/usePortfolio";
import { loadManualFunds, saveManualFunds } from "./lib/storage";
import {
  ACCENT_A, ACCENT_A_LIGHT, ACCENT_B,
  FUND_COLORS, TIME_SPANS,
} from "./lib/utils";
import { COLOR, FONT } from "./lib/tokens";
import PortfolioPanel from "./components/PortfolioPanel";
import ComparePlaceholder from "./components/ComparePlaceholder";
import ReturnChart from "./components/ReturnChart";
import FundReturnChart from "./components/FundReturnChart";
import CAGRTable from "./components/CAGRTable";
import RiskPanel from "./components/RiskPanel";
import AboutModal from "./components/AboutModal";

export default function App() {
  const { allFunds, failedFunds, loading, error } = useFundData();
  const [manualFundsDb, setManualFundsDb] = useState(loadManualFunds);
  const portfolioA = usePortfolio(manualFundsDb);
  const portfolioB = usePortfolio(manualFundsDb);
  const [viewMode, setViewMode] = useState("fund");
  const [span, setSpan]         = useState("Max");
  const [showAbout, setShowAbout] = useState(false);

  const compareMode = viewMode === "compare";
  const { isMobile } = useBreakpoint();

  const totalA = portfolioA.inputMode === "kr" ? portfolioKrTotal(portfolioA.funds, portfolioA.allocs) : portfolioA.manualAmount;
  const totalB = portfolioB.inputMode === "kr" ? portfolioKrTotal(portfolioB.funds, portfolioB.allocs) : portfolioB.manualAmount;
  const spanMonths = TIME_SPANS.find(t => t.label === span)?.months ?? null;

  const latestNavTs = useMemo(() => {
    const funds = compareMode
      ? [...portfolioA.funds, ...portfolioB.funds]
      : portfolioA.funds;
    return getLatestNavTs(funds);
  }, [compareMode, portfolioA.funds, portfolioB.funds]);
  // I jämförläge på Max: synka startdatum till den kortaste gemensamma historiken
  const sharedStartTs = useMemo(() => {
    if (!compareMode || spanMonths !== null) return null;
    const getFirst = fs => {
      const tss = fs.flatMap(f => f.prices?.length ? [f.prices[0].timestamp] : []);
      return tss.length ? Math.max(...tss) : null;
    };
    const a = getFirst(portfolioA.funds);
    const b = getFirst(portfolioB.funds);
    if (a == null && b == null) return null;
    return Math.max(a ?? b, b ?? a);
  }, [compareMode, spanMonths, portfolioA.funds, portfolioB.funds]);

  const bundleA = useMemo(() => computeReturnBundle({ funds: portfolioA.funds, allocs: portfolioA.allocs, inputMode: portfolioA.inputMode, portfolioTotal: totalA, spanMonths, spanLabel: span, colors: FUND_COLORS, sharedStartTs }), [portfolioA.funds, portfolioA.allocs, portfolioA.inputMode, totalA, spanMonths, span, sharedStartTs]);
  const bundleB = useMemo(() => computeReturnBundle({ funds: portfolioB.funds, allocs: portfolioB.allocs, inputMode: portfolioB.inputMode, portfolioTotal: totalB, spanMonths, spanLabel: span, colors: FUND_COLORS, sharedStartTs }), [portfolioB.funds, portfolioB.allocs, portfolioB.inputMode, totalB, spanMonths, span, sharedStartTs]);
  const { portfolioSeries: seriesA, fundLines: fundSeriesA, portfolioReturn: retA, oldestTs: oldestTsA } = bundleA;
  const { portfolioSeries: seriesB, portfolioReturn: retB, oldestTs: oldestTsB } = bundleB;

  const cagr3yA  = useMemo(() => computeReturnBundle({ funds: portfolioA.funds, allocs: portfolioA.allocs, inputMode: portfolioA.inputMode, portfolioTotal: totalA, spanMonths: 36,   spanLabel: "3 år", colors: FUND_COLORS }), [portfolioA.funds, portfolioA.allocs, portfolioA.inputMode, totalA]);
  const cagrMaxA = useMemo(() => computeReturnBundle({ funds: portfolioA.funds, allocs: portfolioA.allocs, inputMode: portfolioA.inputMode, portfolioTotal: totalA, spanMonths: null, spanLabel: "Max",  colors: FUND_COLORS, sharedStartTs }), [portfolioA.funds, portfolioA.allocs, portfolioA.inputMode, totalA, sharedStartTs]);
  const cagr3yB  = useMemo(() => computeReturnBundle({ funds: portfolioB.funds, allocs: portfolioB.allocs, inputMode: portfolioB.inputMode, portfolioTotal: totalB, spanMonths: 36,   spanLabel: "3 år", colors: FUND_COLORS }), [portfolioB.funds, portfolioB.allocs, portfolioB.inputMode, totalB]);
  const cagrMaxB = useMemo(() => computeReturnBundle({ funds: portfolioB.funds, allocs: portfolioB.allocs, inputMode: portfolioB.inputMode, portfolioTotal: totalB, spanMonths: null, spanLabel: "Max",  colors: FUND_COLORS, sharedStartTs }), [portfolioB.funds, portfolioB.allocs, portfolioB.inputMode, totalB, sharedStartTs]);

  const cagrPortfolios = useMemo(() => {
    const make = (name, color, b3y, bMax) => {
      const pY3 = seriesYears(b3y.portfolioSeries);
      const pYM = seriesYears(bMax.portfolioSeries);
      const maxByName = Object.fromEntries(bMax.fundLines.map(f => [f.name, f]));
      return {
        name, color,
        cagr3y:  pY3 >= 2.9 ? computeCAGR(b3y.portfolioSeries, 3) : null,
        cagrMax: pYM >= 0.5 ? computeCAGR(bMax.portfolioSeries, pYM) : null,
        funds: b3y.fundLines.map(fl3 => {
          const flM = maxByName[fl3.name];
          const y3 = seriesYears(fl3.series);
          const yM = flM ? seriesYears(flM.series) : 0;
          return {
            name: fl3.name, color: fl3.color,
            cagr3y:  y3 >= 2.9 ? computeCAGR(fl3.series, 3) : null,
            cagrMax: flM && yM >= 0.5 ? computeCAGR(flM.series, yM) : null,
          };
        }),
      };
    };
    const result = [];
    if (portfolioA.funds.length > 0)
      result.push(make(compareMode ? "Portfölj A" : "Portfölj", ACCENT_A, cagr3yA, cagrMaxA));
    if (compareMode && portfolioB.funds.length > 0)
      result.push(make("Portfölj B", ACCENT_B, cagr3yB, cagrMaxB));
    return result;
  }, [compareMode, cagr3yA, cagrMaxA, cagr3yB, cagrMaxB, portfolioA.funds.length, portfolioB.funds.length]);

  const riskPortfolios = useMemo(() => {
    const make = (name, color, bMax) => ({
      name, color,
      maxDrawdown: computeMaxDrawdown(bMax.portfolioSeries),
      volatility:  computeAnnualizedVolatility(bMax.portfolioSeries),
      funds: bMax.fundLines.map(fl => ({
        name: fl.name, color: fl.color,
        maxDrawdown: computeMaxDrawdown(fl.series),
        volatility:  computeAnnualizedVolatility(fl.series),
      })),
    });
    const result = [];
    if (portfolioA.funds.length > 0)
      result.push(make(compareMode ? "Portfölj A" : "Portfölj", ACCENT_A, cagrMaxA));
    if (compareMode && portfolioB.funds.length > 0)
      result.push(make("Portfölj B", ACCENT_B, cagrMaxB));
    return result;
  }, [compareMode, cagrMaxA, cagrMaxB, portfolioA.funds.length, portfolioB.funds.length]);

  const fee1 = getWeightedFee(portfolioA.funds, portfolioA.allocs, portfolioA.inputMode, totalA);

  const saveManualFund = fund => {
    const updated = [...manualFundsDb.filter(f => f.id !== fund.id), fund];
    setManualFundsDb(updated);
    saveManualFunds(updated);
  };

  const deleteManualFund = id => {
    const updated = manualFundsDb.filter(f => f.id !== id);
    setManualFundsDb(updated);
    saveManualFunds(updated);
    portfolioA.removeFund(id);
    portfolioB.removeFund(id);
  };

  const searchableFunds = useMemo(() => [...allFunds, ...manualFundsDb], [allFunds, manualFundsDb]);

  return (
    <div style={{ minHeight: "100vh", background: COLOR.bg.base, color: COLOR.text.primary, fontFamily: FONT.family.body }}>
      {/* ── Header ── */}
      <div style={{ padding: isMobile ? "12px 16px 10px" : "26px 36px 18px", borderBottom: `1px solid ${COLOR.border.subtle}`, display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div>
            <h1 style={{ fontFamily: FONT.family.display, fontSize: "20px", fontWeight: 800, margin: 0, letterSpacing: "-0.02em", color: COLOR.text.primary }}>MinPortfölj</h1>
            <p style={{ margin: "3px 0 0", fontSize: "11px", color: COLOR.text.secondary }}>Jämför avgifter & historisk avkastning</p>
          </div>
        </div>
        <span
          onClick={() => setShowAbout(true)}
          style={{
            display: "flex", alignItems: "center", gap: "7px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: "20px", padding: "5px 11px 5px 12px", cursor: "pointer",
            marginLeft: "auto",
          }}
        >
          <span style={{ fontFamily: FONT.family.display, fontSize: "11px", fontWeight: 600, color: COLOR.text.muted }}>Om</span>
          <span style={{ width: "1px", height: "11px", background: "rgba(255,255,255,0.15)" }} />
          <svg width="24" height="18" viewBox="0 0 44 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="0" y="0" width="16" height="40" rx="5" fill="#5a6e8a"/>
            <rect x="20" y="0" width="24" height="40" rx="6" fill="#94a3b8"/>
          </svg>
        </span>
      </div>

      <div style={{ padding: isMobile ? "12px 14px" : "22px 36px", display: "flex", flexDirection: "column", gap: isMobile ? "12px" : "18px" }}>

        {error && (
          <div style={{ padding: "16px", background: COLOR.tint.negative, border: "1px solid rgba(248,113,113,0.3)", borderRadius: "10px", color: COLOR.negative, fontSize: "13px", fontFamily: FONT.family.display }}>
            {error}
          </div>
        )}

        {!loading && failedFunds.length > 0 && (
          <div style={{ padding: "16px", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: "10px", color: COLOR.warningLight, fontSize: "13px", fontFamily: FONT.family.display }}>
            {failedFunds.join(", ")} kunde inte laddas just nu – försök igen senare
          </div>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: "40px 0", color: COLOR.text.secondary, fontSize: "13px", fontFamily: FONT.family.display }}>
            Hämtar fonddata från Yahoo Finance…
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── Lägesväxlare ── */}
            <div>
              <div style={{ display: "flex", background: COLOR.surface.tab, borderRadius: "7px", padding: "3px", gap: "2px", width: "fit-content" }}>
                {[
                  { value: "fund",    label: "◈ Fonder",  activeColor: ACCENT_A_LIGHT, activeBg: "rgba(0,24,245,0.18)"   },
                  { value: "compare", label: "⇄ Jämför",  activeColor: ACCENT_B,       activeBg: "rgba(56,189,248,0.15)" },
                ].map(({ value, label, activeColor, activeBg }) => (
                  <button key={value} className="mode-btn" onClick={() => setViewMode(value)} style={{
                    background: viewMode === value ? activeBg : "transparent",
                    border: "none", color: viewMode === value ? activeColor : COLOR.text.secondary,
                    padding: "5px 12px", borderRadius: "5px", cursor: "pointer",
                    fontSize: "11px", fontFamily: FONT.family.display, fontWeight: 600, transition: "all 0.2s",
                  }}>{label}</button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: isMobile ? "12px" : "16px", alignItems: "flex-start", flexDirection: isMobile ? "column" : "row" }}>
              <div style={{ flex: 1, minWidth: 0, alignSelf: isMobile ? "stretch" : "flex-start" }}>
                <PortfolioPanel label={viewMode === "fund" ? "Portfölj" : "Portfölj A"} accent={ACCENT_A} accentRgb="0,24,245" accentText={ACCENT_A_LIGHT}
                  funds={portfolioA.funds} allocations={portfolioA.allocs} inputMode={portfolioA.inputMode} manualAmount={portfolioA.manualAmount}
                  onInputModeChange={portfolioA.setInputMode} onManualAmountChange={portfolioA.setManualAmount}
                  allFunds={searchableFunds} loading={loading} viewMode={viewMode}
                  onAddFund={portfolioA.addFund} onUpdateAlloc={portfolioA.updateAlloc} onRemoveFund={portfolioA.removeFund}
                  span={span} onSaveManualFund={saveManualFund}
                  onDeleteManualFund={deleteManualFund} onUpdateFundData={portfolioA.updateFundData}
                  failedFunds={failedFunds}
                />
              </div>
              {!compareMode && (
                <ComparePlaceholder onClick={() => setViewMode("compare")} />
              )}
              {compareMode && (
                <div style={{ flex: 1, minWidth: 0, alignSelf: isMobile ? "stretch" : "flex-start" }}>
                  <PortfolioPanel label="Portfölj B" accent={ACCENT_B} accentRgb="56,189,248" accentText={ACCENT_B}
                    funds={portfolioB.funds} allocations={portfolioB.allocs} inputMode={portfolioB.inputMode} manualAmount={portfolioB.manualAmount}
                    onInputModeChange={portfolioB.setInputMode} onManualAmountChange={portfolioB.setManualAmount}
                    allFunds={searchableFunds} loading={loading} viewMode={viewMode}
                    onAddFund={portfolioB.addFund} onUpdateAlloc={portfolioB.updateAlloc} onRemoveFund={portfolioB.removeFund}
                    span={span} onSaveManualFund={saveManualFund}
                    onDeleteManualFund={deleteManualFund} onUpdateFundData={portfolioB.updateFundData}
                    failedFunds={failedFunds}
                    isB={true} onHide={() => setViewMode("fund")}
                  />
                </div>
              )}
            </div>

            {viewMode === "fund" && portfolioA.funds.length > 0 && (
              <FundReturnChart key="fund-chart"
                fundLines={fundSeriesA} portfolioSeries={seriesA}
                selectedSpan={span} spanMonths={spanMonths} onSpanChange={setSpan}
                totalA={totalA} fee1={fee1} oldestTsA={oldestTsA}
                latestNavTs={latestNavTs}
              />
            )}

            {viewMode !== "fund" && (portfolioA.funds.length > 0 || (compareMode && portfolioB.funds.length > 0)) && (
              <ReturnChart key={`compare-${compareMode}`}
                seriesA={seriesA} seriesB={seriesB}
                showB={compareMode && portfolioB.funds.length > 0}
                selectedSpan={span} spanMonths={spanMonths} onSpanChange={setSpan}
                totalA={totalA} totalB={totalB}
                oldestTsA={oldestTsA} oldestTsB={oldestTsB}
                latestNavTs={latestNavTs}
              />
            )}

            {cagrPortfolios.length > 0 && (
              <div style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: "12px",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <CAGRTable compareMode={compareMode} portfolios={cagrPortfolios} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <RiskPanel compareMode={compareMode} portfolios={riskPortfolios} />
                </div>
              </div>
            )}

          </>
        )}

        <div style={{ fontSize: "10px", color: COLOR.text.ghost, textAlign: "center", paddingBottom: "12px" }}>
          * Historisk avkastning från Yahoo Finance. Historisk avkastning garanterar inte framtida resultat.
        </div>
      </div>
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </div>
  );
}
