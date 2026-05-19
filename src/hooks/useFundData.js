import { useState, useEffect } from "react";
import fiFees from "../data/fi-fees.json";
import { FUND_ISINS } from "../lib/utils";
import { FUNDS_REGISTRY } from "../lib/funds-registry";

const FI_FEE_MAP = Object.fromEntries(
  Object.entries(fiFees).filter(([k]) => k !== "_meta")
);
const FI_PERIOD = fiFees._meta?.period ?? null;

const TICKER_TO_ISIN = FUND_ISINS;

const FUND_FEES = Object.fromEntries(FUNDS_REGISTRY.map(f => [f.ticker, f.fallbackFee]));

export default function useFundData() {
  const [allFunds, setAllFunds]       = useState([]);
  const [failedFunds, setFailedFunds] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  useEffect(() => {
    fetch("/api/funds")
      .then(r => r.json())
      .then(data => {
        const funds = data.funds
          .filter(f => !f.error && f.prices?.length > 0)
          .map(f => {
            const isin   = TICKER_TO_ISIN[f.ticker];
            const fiFee  = isin !== undefined ? FI_FEE_MAP[isin] : undefined;
            const msFee  = f.fee;
            const fbFee  = FUND_FEES[f.ticker];
            const fee        = fiFee  !== undefined ? fiFee
                             : msFee  !== undefined && msFee !== null ? msFee
                             : fbFee  ?? 0;
            const feeSource  = fiFee  !== undefined ? "fi"
                             : msFee  !== undefined && msFee !== null ? "morningstar"
                             : "fallback";
            return { ...f, fee, feeSource, feePeriod: feeSource === "fi" ? FI_PERIOD : null };
          });
        const failed = data.funds
          .filter(f => f.error || !f.prices?.length)
          .map(f => f.name ?? f.ticker ?? "Okänd fond");
        setAllFunds(funds);
        setFailedFunds(failed);
        setLoading(false);
      })
      .catch(() => {
        setError("Kunde inte ladda fonddata. Försök igen senare.");
        setLoading(false);
      });
  }, []);

  return { allFunds, failedFunds, loading, error };
}
