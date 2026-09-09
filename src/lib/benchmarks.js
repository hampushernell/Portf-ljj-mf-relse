// Register för jämförelseindex — se project-docs/BENCHMARKS.md.
// Enda stället att redigera vid ny benchmark. Inte funds-registry.js, som är
// enda stället för fonder och inte ska innehålla annat.
//
// STEG 1 (aktuellt): ingen valutaomräkning. sp500tr ritas rakt av i USD.
// Namnet står därför med "(USD)" — avsiktligt, ändras inte förrän steg 2.

export const BENCHMARKS = [
  {
    id:       "sp500tr",
    ticker:   "^SP500TR",
    name:     "S&P 500 TR (USD)",
    currency: "USD",
    fxTicker: "SEK=X", // deklarerad men oanvänd i steg 1 — kopplas in när valutaomräkningen byggs
    category: "USA-fond",
    note:     "Total Return — inkluderar återinvesterade utdelningar. Visas i USD utan valutaomräkning (steg 1).",
    source:   "S&P Dow Jones Indices, via Yahoo Finance",
  },
];
