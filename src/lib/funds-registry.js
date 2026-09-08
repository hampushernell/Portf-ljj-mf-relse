export const FUNDS_REGISTRY = [
  // Globalfonder
  { id: 1,  ticker: "0P0001ECQR.ST", isin: "SE0011527613", name: "Avanza Global",                      category: "Globalfond",        fallbackFee: 0.08, slug: "avanza-global" },
  { id: 2,  ticker: "0P0001CKSU.ST", isin: "FI4000261326", name: "Nordea Global Enhanced Growth",       category: "Globalfond",        fallbackFee: 0.60, slug: "nordea-global-enhanced-growth" },
  { id: 3,  ticker: "0P0000YVZ3.ST", isin: "SE0005188836", name: "Länsförsäkringar Global Index",       category: "Globalfond",        fallbackFee: 0.20, slug: "lansforsakringar-global-index" },
  { id: 4,  ticker: "0P0000XAIN.ST", isin: "FI4000046685", name: "Nordea Global Index Select",          category: "Globalfond",        fallbackFee: 0.19, slug: "nordea-global-index-select" },
  { id: 5,  ticker: "0P0001F3XN.ST", isin: "SE0011309707", name: "Handelsbanken Global Index",          category: "Globalfond",        fallbackFee: 0.41, slug: "handelsbanken-global-index" },
  { id: 6,  ticker: "0P0001Q6FC.ST", isin: "NO0010827280", name: "DNB Global Indeks S",                 category: "Globalfond",        fallbackFee: 0.20, slug: "dnb-global-indeks-s" },
  { id: 7,  ticker: "0P00000LST.ST", isin: "SE0000671919", name: "Storebrand Global All Countries",     category: "Globalfond",        fallbackFee: 0.31, slug: "storebrand-global-all-countries" },
  // Sverigefonder
  { id: 8,  ticker: "0P00005U1J.ST", isin: "SE0001718388", name: "Avanza Zero",                         category: "Sverigefond",       fallbackFee: 0.00, slug: "avanza-zero" },
  { id: 9,  ticker: "0P0001JF8S.ST", isin: "LU2122930915", name: "Nordea Swedish Sustainable Enhanced", category: "Sverigefond",       fallbackFee: 0.61, slug: "nordea-swedish-sustainable-enhanced" },
  { id: 10, ticker: "0P00000K12.ST", isin: "SE0000739195", name: "AMF Aktiefond Sverige",               category: "Sverigefond",       fallbackFee: 0.40, slug: "amf-aktiefond-sverige" },
  { id: 11, ticker: "0P00001DF8.ST", isin: "SE0001466368", name: "Handelsbanken Sverige Index",         category: "Sverigefond",       fallbackFee: 0.65, slug: "handelsbanken-sverige-index" },
  { id: 12, ticker: "0P0000ULAP.ST", isin: "SE0004297927", name: "Spiltan Aktiefond Investmentbolag",   category: "Sverigefond",       fallbackFee: 0.20, slug: "spiltan-aktiefond-investmentbolag" },
  { id: 13, ticker: "0P0000J1JM.ST", isin: "SE0002656611", name: "Länsförsäkringar Sverige Index",      category: "Sverigefond",       fallbackFee: 0.20, slug: "lansforsakringar-sverige-index" },
  // Räntefonder
  { id: 14, ticker: "0P00009NT9.ST", isin: "SE0002152140", name: "Spiltan Räntefond Sverige",           category: "Räntefond",         fallbackFee: 0.10, slug: "spiltan-rantefond-sverige" },
  { id: 15, ticker: "0P00000K19.ST", isin: "SE0000739187", name: "AMF Räntefond Lång",                  category: "Räntefond",         fallbackFee: 0.10, slug: "amf-rantefond-lang" },
  // USA-fonder
  { id: 16, ticker: "0P0000K9E7.ST", isin: "SE0002793943", name: "Länsförsäkringar USA Index",          category: "USA-fond",          fallbackFee: 0.20, slug: "lansforsakringar-usa-index" },
  { id: 17, ticker: "0P0000TXY1.ST", isin: "SE0004139780", name: "Handelsbanken USA Index Criteria",    category: "USA-fond",          fallbackFee: 0.20, slug: "handelsbanken-usa-index-criteria" },
  { id: 18, ticker: "0P0001IVD1.ST", isin: "SE0012741163", name: "Avanza USA",                          category: "USA-fond",          fallbackFee: 0.10, slug: "avanza-usa" },
  // Temafonder
  { id: 19, ticker: "0P00000LCG.ST", isin: "SE0000538944", name: "Swedbank Robur Technology A",         category: "Temafond",          fallbackFee: 1.40, slug: "swedbank-robur-technology-a" },
  { id: 20, ticker: "0P00000K48.ST", isin: "SE0000709123", name: "Swedbank Robur Ny Teknik A",           category: "Temafond",          fallbackFee: 1.40, slug: "swedbank-robur-ny-teknik-a" },
  { id: 21, ticker: "0P00013668.ST", isin: "SE0005796331", name: "LF Tillväxtmarknad Index A",           category: "Tillväxtmarknadsfond", fallbackFee: 0.40, slug: "lf-tillvaxtmarknad-index-a" },
  // Nordnet-fonder
  { id: 22, ticker: "0P0000J24W.ST", isin: "SE0002756973", name: "Nordnet Sverige Index",               category: "Sverigefond",       fallbackFee: 0.00, slug: "nordnet-sverige-index" },
  { id: 23, ticker: "0P0001K6NH.ST", isin: "IE00BMTD2G30", name: "Nordnet Global Index",               category: "Globalfond",        fallbackFee: 0.20, slug: "nordnet-global-index" }, // IE-fond, ej FI-täckning
  { id: 24, ticker: "0P0001K6NL.ST", isin: "IE00BMTD2V80", name: "Nordnet USA Index",                  category: "USA-fond",          fallbackFee: 0.20, slug: "nordnet-usa-index" }, // IE-fond, ej FI-täckning
  // Avanza-fonder
  { id: 25, ticker: "0P0001J6WY.ST", isin: "SE0013718699", name: "Avanza Europa",                      category: "Europafond",        fallbackFee: 0.17, slug: "avanza-europa" },
  { id: 26, ticker: "0P0001H4TL.ST", isin: "SE0012454338", name: "Avanza Emerging Markets",            category: "Tillväxtmarknadsfond", fallbackFee: 0.15, slug: "avanza-emerging-markets" },
  // Swedbank Robur Access-serien
  { id: 27, ticker: "0P00016KI8.ST", isin: "SE0007074075", name: "Swedbank Robur Access Sverige",      category: "Sverigefond",       fallbackFee: 0.20, slug: "swedbank-robur-access-sverige" },
  { id: 28, ticker: "0P00016L3S.ST", isin: "SE0007074059", name: "Swedbank Robur Access Global",       category: "Globalfond",        fallbackFee: 0.20, slug: "swedbank-robur-access-global" },
  { id: 29, ticker: "0P00016L23.ST", isin: "SE0007074083", name: "Swedbank Robur Access USA",          category: "USA-fond",          fallbackFee: 0.20, slug: "swedbank-robur-access-usa" },
  // SEB
  { id: 30, ticker: "0P0000MWNE.ST", isin: "SE0001696857", name: "SEB Hållbarhetsfond Sverige Index",  category: "Sverigefond",       fallbackFee: 0.25, slug: "seb-hallbarhetsfond-sverige-index" },
  // Småbolagsfonder
  { id: 31, ticker: "0P00000T7M.ST", isin: "SE0001185000", name: "AMF Aktiefond Småbolag",             category: "Småbolagsfond",     fallbackFee: 0.40, slug: "amf-aktiefond-smabolag" },
  { id: 32, ticker: "0P00017M15.ST", isin: "SE0008585459", name: "LF Småbolag Sverige",                category: "Småbolagsfond",     fallbackFee: 1.40, slug: "lf-smabolag-sverige" },
  { id: 33, ticker: "0P00000LEY.ST", isin: "SE0000602302", name: "Swedbank Robur Småbolagsfond Sverige", category: "Småbolagsfond",   fallbackFee: 1.40, slug: "swedbank-robur-smabolagsfond-sverige" },
  { id: 34, ticker: "0P00000L4S.ST", isin: "FI0008813365", name: "Nordea Småbolagsfond Norden",         category: "Småbolagsfond",     fallbackFee: 1.60, slug: "nordea-smabolagsfond-norden" }, // FI-fond, ej FI-täckning
  { id: 35, ticker: "0P0000V49E.ST", isin: "SE0004392025", name: "Carnegie Småbolagsfond",              category: "Småbolagsfond",     fallbackFee: 1.60, slug: "carnegie-smabolagsfond" },
  // Blandfonder
  { id: 36, ticker: "0P00000H3S.ST", isin: "SE0001114976", name: "Nordea Stratega 50",                  category: "Blandfond",         fallbackFee: 1.37, slug: "nordea-stratega-50" },
  { id: 37, ticker: "0P00000LDX.ST", isin: "SE0000434359", name: "Swedbank Robur Access Mix",            category: "Blandfond",         fallbackFee: 0.20, slug: "swedbank-robur-access-mix" },
  { id: 38, ticker: "0P00000LU5.ST", isin: "SE0000500407", name: "SEB Blandfond Sverige",               category: "Blandfond",         fallbackFee: 1.00, slug: "seb-blandfond-sverige" },
  { id: 39, ticker: "0P00000T3C.ST", isin: "SE0001192618", name: "Handelsbanken Multi Asset 50",        category: "Blandfond",         fallbackFee: 1.25, slug: "handelsbanken-multi-asset-50" },
  { id: 40, ticker: "0P00000EXD.ST", isin: "SE0000739179", name: "AMF Balansfond",                      category: "Blandfond",         fallbackFee: 0.40, slug: "amf-balansfond" },
  { id: 41, ticker: "0P00015KOT.ST", isin: "SE0006963518", name: "LF Bekväm Fond Balans",               category: "Blandfond",         fallbackFee: 1.30, slug: "lf-bekvam-fond-balans" },
  // Avanza Auto (fond-i-fond)
  { id: 51, ticker: "0P0001BM0V.ST", isin: "SE0009779671", name: "Avanza Auto 3",                       category: "Blandfond",         fallbackFee: 0.34, slug: "avanza-auto-3" },
  { id: 52, ticker: "0P0001BM0Y.ST", isin: "SE0009779705", name: "Avanza Auto 6",                       category: "Blandfond",         fallbackFee: 0.34, slug: "avanza-auto-6" },
  // Globalfonder (tillägg)
  { id: 42, ticker: "0P00000L33.ST", isin: "SE0000862278", name: "AMF Aktiefond Global",                category: "Globalfond",        fallbackFee: 0.40, slug: "amf-aktiefond-global" },
  { id: 43, ticker: "0P00000LDD.ST", isin: "SE0000542979", name: "Swedbank Robur Globalfond A",         category: "Globalfond",        fallbackFee: 1.29, slug: "swedbank-robur-globalfond-a" },
  { id: 44, ticker: "0P0000YYOP.ST", isin: "FI4000064076", name: "Nordea Global Dividend A",            category: "Globalfond",        fallbackFee: 0.80, slug: "nordea-global-dividend-a" }, // FI-fond, ej FI-täckning
  // Sverigefonder (tillägg)
  { id: 45, ticker: "0P0000HNUF.ST", isin: "SE0002591016", name: "Nordea Sverige Passiv",               category: "Sverigefond",       fallbackFee: 0.19, slug: "nordea-sverige-passiv" },
  // USA-fonder (tillägg)
  { id: 46, ticker: "0P00000FYR.ST", isin: "SE0000594111", name: "SPP Aktiefond USA",                   category: "USA-fond",          fallbackFee: 0.20, slug: "spp-aktiefond-usa" },
  // Europafonder (tillägg)
  { id: 47, ticker: "0P00000FYN.ST", isin: "SE0000531881", name: "Storebrand Europa A SEK",             category: "Europafond",        fallbackFee: 0.20, slug: "storebrand-europa-a-sek" },
  // Temafonder (tillägg)
  { id: 48, ticker: "0P00014CZ3.ST", isin: "SE0005965662", name: "Handelsbanken Hållbar Energi A1",     category: "Temafond",          fallbackFee: 1.50, slug: "handelsbanken-hallbar-energi-a1" },
  // Tillväxtmarknadsfonder (tillägg)
  { id: 49, ticker: "0P0001E1JQ.ST", isin: "LU1648400262", name: "Nordea Emerging Markets Enhanced BP",        category: "Tillväxtmarknadsfond", fallbackFee: 0.65, slug: "nordea-emerging-markets-enhanced-bp" }, // LU-fond, ej FI-täckning
  // Räntefonder (tillägg)
  { id: 50, ticker: "0P0000NRW6.ST", isin: "FI4000010525", name: "Nordea Stratega Ränta",               category: "Räntefond",         fallbackFee: 0.65, slug: "nordea-stratega-ranta" }, // FI-fond, ej FI-täckning
];
