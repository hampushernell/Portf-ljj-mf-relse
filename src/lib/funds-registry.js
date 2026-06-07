export const FUNDS_REGISTRY = [
  // Globalfonder
  { id: 1,  ticker: "0P0001ECQR.ST", isin: "SE0011527613", name: "Avanza Global",                      category: "Globalfond",        fallbackFee: 0.08 },
  { id: 2,  ticker: "0P0001CKSU.ST", isin: "FI4000261326", name: "Nordea Global Enhanced Growth",       category: "Globalfond",        fallbackFee: 0.60 },
  { id: 3,  ticker: "0P0000YVZ3.ST", isin: "SE0005188836", name: "Länsförsäkringar Global Index",       category: "Globalfond",        fallbackFee: 0.20 },
  { id: 4,  ticker: "0P0000XAIN.ST", isin: "FI4000046685", name: "Nordea Global Index Select",          category: "Globalfond",        fallbackFee: 0.40 },
  { id: 5,  ticker: "0P0001F3XN.ST", isin: "SE0011309707", name: "Handelsbanken Global Index",          category: "Globalfond",        fallbackFee: 0.41 },
  { id: 6,  ticker: "0P0001Q6FC.ST", isin: "NO0010827280", name: "DNB Global Indeks S",                 category: "Globalfond",        fallbackFee: 0.20 },
  { id: 7,  ticker: "0P00000LST.ST", isin: "SE0000671919", name: "Storebrand Global All Countries",     category: "Globalfond",        fallbackFee: 0.31 },
  // Sverigefonder
  { id: 8,  ticker: "0P00005U1J.ST", isin: "SE0001718388", name: "Avanza Zero",                         category: "Sverigefond",       fallbackFee: 0.00 },
  { id: 9,  ticker: "0P0001JF8S.ST", isin: "LU2122930915", name: "Nordea Swedish Sustainable Enhanced", category: "Sverigefond",       fallbackFee: 0.61 },
  { id: 10, ticker: "0P00000K12.ST", isin: "SE0000739195", name: "AMF Aktiefond Sverige",               category: "Sverigefond",       fallbackFee: 0.40 },
  { id: 11, ticker: "0P00001DF8.ST", isin: "SE0001466368", name: "Handelsbanken Sverige Index",         category: "Sverigefond",       fallbackFee: 0.65 },
  { id: 12, ticker: "0P0000ULAP.ST", isin: "SE0004297927", name: "Spiltan Aktiefond Investmentbolag",   category: "Sverigefond",       fallbackFee: 0.20 },
  { id: 13, ticker: "0P0000J1JM.ST", isin: "SE0002656611", name: "Länsförsäkringar Sverige Index",      category: "Sverigefond",       fallbackFee: 0.20 },
  // Räntefonder
  { id: 14, ticker: "0P00009NT9.ST", isin: "SE0002152140", name: "Spiltan Räntefond Sverige",           category: "Räntefond",         fallbackFee: 0.10 },
  { id: 15, ticker: "0P00000K19.ST", isin: "SE0000739187", name: "AMF Räntefond Lång",                  category: "Räntefond",         fallbackFee: 0.10 },
  // USA-fonder
  { id: 16, ticker: "0P0000K9E7.ST", isin: "SE0002793943", name: "Länsförsäkringar USA Index",          category: "USA-fond",          fallbackFee: 0.20 },
  { id: 17, ticker: "0P0000TXY1.ST", isin: "SE0004139780", name: "Handelsbanken USA Index Criteria",    category: "USA-fond",          fallbackFee: 0.20 },
  { id: 18, ticker: "0P0001IVD1.ST", isin: "SE0012741163", name: "Avanza USA",                          category: "USA-fond",          fallbackFee: 0.10 },
  // Temafonder
  { id: 19, ticker: "0P00000LCG.ST", isin: "SE0000538944", name: "Swedbank Robur Technology A",         category: "Temafond",          fallbackFee: 1.40 },
  { id: 20, ticker: "0P00000K48.ST", isin: "SE0000709123", name: "Swedbank Robur Ny Teknik A",           category: "Temafond",          fallbackFee: 1.40 },
  { id: 21, ticker: "0P00013668.ST", isin: "SE0005796331", name: "LF Tillväxtmarknad Index A",           category: "Tillväxtmarknadsfond", fallbackFee: 0.40 },
  // Nordnet-fonder
  { id: 22, ticker: "0P0000J24W.ST", isin: "SE0002756973", name: "Nordnet Sverige Index",               category: "Sverigefond",       fallbackFee: 0.00 },
  { id: 23, ticker: "0P0001K6NH.ST", isin: "IE00BMTD2G30", name: "Nordnet Global Index",               category: "Globalfond",        fallbackFee: 0.20 }, // IE-fond, ej FI-täckning
  { id: 24, ticker: "0P0001K6NL.ST", isin: "IE00BMTD2V80", name: "Nordnet USA Index",                  category: "USA-fond",          fallbackFee: 0.20 }, // IE-fond, ej FI-täckning
  // Avanza-fonder
  { id: 25, ticker: "0P0001J6WY.ST", isin: "SE0013718699", name: "Avanza Europa",                      category: "Europafond",        fallbackFee: 0.17 },
  { id: 26, ticker: "0P0001H4TL.ST", isin: "SE0012454338", name: "Avanza Emerging Markets",            category: "Tillväxtmarknadsfond", fallbackFee: 0.15 },
  // Swedbank Robur Access-serien
  { id: 27, ticker: "0P00016KI8.ST", isin: "SE0007074075", name: "Swedbank Robur Access Sverige",      category: "Sverigefond",       fallbackFee: 0.20 },
  { id: 28, ticker: "0P00016L3S.ST", isin: "SE0007074059", name: "Swedbank Robur Access Global",       category: "Globalfond",        fallbackFee: 0.20 },
  { id: 29, ticker: "0P00016L23.ST", isin: "SE0007074083", name: "Swedbank Robur Access USA",          category: "USA-fond",          fallbackFee: 0.20 },
  // SEB
  { id: 30, ticker: "0P0000MWNE.ST", isin: "SE0001696857", name: "SEB Hållbarhetsfond Sverige Index",  category: "Sverigefond",       fallbackFee: 0.25 },
  // Småbolagsfonder
  { id: 31, ticker: "0P00000T7M.ST", isin: "SE0001185000", name: "AMF Aktiefond Småbolag",             category: "Småbolagsfond",     fallbackFee: 0.40 },
  { id: 32, ticker: "0P00017M15.ST", isin: "SE0008585459", name: "LF Småbolag Sverige",                category: "Småbolagsfond",     fallbackFee: 1.40 },
  { id: 33, ticker: "0P00000LEY.ST", isin: "SE0000602302", name: "Swedbank Robur Småbolagsfond Sverige", category: "Småbolagsfond",   fallbackFee: 1.40 },
  { id: 34, ticker: "0P00000L4S.ST", isin: "FI0008813365", name: "Nordea Småbolagsfond Norden",         category: "Småbolagsfond",     fallbackFee: 1.60 }, // FI-fond, ej FI-täckning
];
