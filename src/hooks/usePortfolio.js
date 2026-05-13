import { useState } from "react";

export default function usePortfolio(_manualFundsDb) {
  const [funds, setFunds]               = useState([]);
  const [allocs, setAllocs]             = useState({});
  const [inputMode, setInputMode]       = useState("pct");
  const [manualAmount, setManualAmount] = useState(0);
  const [hasManualEdit, setHasManualEdit] = useState(false);

  const addFund = f => {
    const newFunds = [...funds, f];
    setFunds(newFunds);
    if (inputMode === "pct" && !hasManualEdit) {
      const even = parseFloat((100 / newFunds.length).toFixed(2));
      setAllocs(prev => {
        const n = { ...prev };
        newFunds.forEach(fund => { n[fund.id] = { ...n[fund.id], pct: even }; });
        return n;
      });
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

  return {
    funds, allocs, inputMode, manualAmount, hasManualEdit,
    addFund, updateAlloc, removeFund,
    setInputMode, setManualAmount,
    updateFundData,
  };
}
