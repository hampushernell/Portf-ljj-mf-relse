import { useState } from "react";
import { MAX_FUNDS_PER_PORTFOLIO, isEvenWeights } from "../lib/compareSelection";

export default function usePortfolio(_manualFundsDb) {
  const [funds, setFunds]               = useState([]);
  const [allocs, setAllocs]             = useState({});
  const [inputMode, setInputMode]       = useState("pct");
  const [manualAmount, setManualAmount] = useState(0);
  const [hasManualEdit, setHasManualEdit] = useState(false);

  const addFund = f => {
    if (funds.length >= MAX_FUNDS_PER_PORTFOLIO || funds.some(x => x.id === f.id)) return;
    const newFunds = [...funds, f];
    setFunds(newFunds);
    if (inputMode === "pct") {
      if (!hasManualEdit) {
        const even = parseFloat((100 / newFunds.length).toFixed(2));
        setAllocs(prev => {
          const n = { ...prev };
          newFunds.forEach(fund => { n[fund.id] = { ...n[fund.id], pct: even }; });
          return n;
        });
      } else {
        const existingSum = funds.reduce((sum, fund) => sum + (allocs[fund.id]?.pct ?? 0), 0);
        const remaining = Math.max(0, 100 - existingSum);
        setAllocs(prev => ({ ...prev, [f.id]: { ...prev[f.id], pct: remaining } }));
      }
    }
  };

  const updateAlloc = (id, v) => {
    setAllocs(p => ({ ...p, [id]: { ...p[id], ...v } }));
    setHasManualEdit(true);
  };

  const removeFund = id => {
    const newFunds = funds.filter(f => f.id !== id);
    setFunds(newFunds);
    setAllocs(p => { const n = { ...p }; delete n[id]; return n; });
    if (newFunds.length === 0) setHasManualEdit(false);
  };

  const updateFundData = fund => setFunds(fs => fs.map(f => f.id === fund.id ? fund : f));

  // Atomically initialize portfolio from URL. fundsWithPcts: [{fund, pct}]
  const bulkInit = fundsWithPcts => {
    setFunds(fundsWithPcts.map(x => x.fund));
    const newAllocs = {};
    fundsWithPcts.forEach(({ fund, pct }) => { newAllocs[fund.id] = { pct }; });
    setAllocs(newAllocs);
    // Ojämna vikter (t.ex. från fondlistan eller en delad länk) är egna vikter —
    // annars fördelas de om vid nästa addFund.
    setHasManualEdit(!isEvenWeights(fundsWithPcts.map(x => x.pct)));
  };

  return {
    funds, allocs, inputMode, manualAmount, hasManualEdit,
    addFund, updateAlloc, removeFund, bulkInit,
    setInputMode, setManualAmount,
    updateFundData,
  };
}
