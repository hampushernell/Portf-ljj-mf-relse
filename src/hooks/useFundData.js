import { useState, useEffect } from "react";

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
          .map(f => ({
            ...f,
            fee: f.fee ?? FUND_FEES[f.ticker] ?? 0,
          }));
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
