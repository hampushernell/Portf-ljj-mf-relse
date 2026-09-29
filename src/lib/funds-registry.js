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
  // Lysa-fonder
  { id: 53, ticker: "0P00019MOJ.ST", isin: "SE0009268584", name: "Lysa Global Equity Broad C",          category: "Globalfond",        fallbackFee: 0.17, slug: "lysa-global-equity-broad-c" }, // ej FI-täckning, källa: Lysa Fonder AB prospekt 2026-03-24
  { id: 54, ticker: "0P0001OECU.ST", isin: "SE0017231947", name: "Lysa Sweden Equity Broad B",          category: "Sverigefond",       fallbackFee: 0.17, slug: "lysa-sweden-equity-broad-b" }, // ej FI-täckning, källa: Lysa Fonder AB prospekt 2026-03-24
  { id: 55, ticker: "0P0001UE4I.ST", isin: "SE0023260468", name: "Lysa Global Small Cap Equity Broad B", category: "Småbolagsfond",     fallbackFee: 0.28, slug: "lysa-global-small-cap-equity-broad-b" }, // ej FI-täckning, matarfond (Vanguard), källa: Lysa PRIIP-KID 2025-05-05
  { id: 56, ticker: "0P0001UE4H.ST", isin: "SE0023260401", name: "Lysa Emerging Markets Equity Broad B", category: "Tillväxtmarknadsfond", fallbackFee: 0.25, slug: "lysa-emerging-markets-equity-broad-b" }, // ej FI-täckning, matarfond (Vanguard), källa: Lysa PRIIP-KID 2025-05-05
  // Spiltan- och Nordea-fonder (tillägg)
  { id: 57, ticker: "0P00018OKM.ST", isin: "SE0008613939", name: "Spiltan Globalfond Investmentbolag",   category: "Globalfond",        fallbackFee: 0.50, slug: "spiltan-globalfond-investmentbolag" }, // ej FI-täckning, källa: spiltanfonder.se
  { id: 58, ticker: "0P0000M4TI.ST", isin: "FI0008813324", name: "Nordea Globala Tillväxtmarknader",    category: "Tillväxtmarknadsfond", fallbackFee: 1.60, slug: "nordea-emerging-market-equities-a" }, // FI-fond, ej FI-täckning, källa: nordeafunds.com
  // Swedbank Robur, Storebrand, Nordea, PLUS m.fl. (tillägg)
  { id: 59, ticker: "0P00000LDS.ST", isin: "SE0000996241", name: "Swedbank Robur Kapitalinvest",         category: "Globalfond",        fallbackFee: 1.25, slug: "swedbank-robur-kapitalinvest" }, // ej FI-täckning, källa: Swedbank fondvillkor
  { id: 60, ticker: "0P00000LC8.ST", isin: "SE0000538910", name: "Swedbank Robur Allemansfond Komplett", category: "Globalfond",        fallbackFee: 1.25, slug: "swedbank-robur-allemansfond-komplett" }, // ej FI-täckning, källa: swedbankrobur.fondlista.se
  { id: 61, ticker: "0P00016L22.ST", isin: "SE0007074117", name: "Swedbank Robur Access Asien",          category: "Tillväxtmarknadsfond", fallbackFee: 0.20, slug: "swedbank-robur-access-asien" }, // ej FI-täckning, källa: swedbankrobur.fondlista.se
  { id: 62, ticker: "0P0001FLH9.ST", isin: "SE0012193019", name: "TIN Ny Teknik",                        category: "Temafond",          fallbackFee: 1.50, slug: "tin-ny-teknik" }, // ej FI-täckning, källa: tinfonder.se
  { id: 63, ticker: "0P0001KTCS.ST", isin: "SE0014808382", name: "Storebrand Sverige Småbolag Plus",     category: "Småbolagsfond",     fallbackFee: 0.50, slug: "storebrand-sverige-smabolag-plus" }, // ej FI-täckning, källa: storebrandfonder.se
  { id: 64, ticker: "0P00017TAO.ST", isin: "SE0008129969", name: "Storebrand Emerging Markets Plus",     category: "Tillväxtmarknadsfond", fallbackFee: 0.56, slug: "storebrand-emerging-markets-plus" }, // ej FI-täckning, källa: storebrandfonder.se
  { id: 65, ticker: "0P0000X2A9.ST", isin: "SE0004576452", name: "Storebrand Global Solutions",          category: "Globalfond",        fallbackFee: 0.78, slug: "storebrand-global-solutions" }, // ej FI-täckning, källa: storebrandfonder.se
  { id: 66, ticker: "0P0001IMY7.ST", isin: "SE0013358181", name: "AuAg Silver Bullet",                   category: "Temafond",          fallbackFee: 1.40, slug: "auag-silver-bullet" }, // ej FI-täckning, källa: auagfunds.com
  { id: 67, ticker: "0P0001Q6FG.ST", isin: "NO0010827819", name: "DNB Teknologi S",                      category: "Temafond",          fallbackFee: 1.20, slug: "dnb-teknologi-s" }, // NO-fond, ej FI-täckning, källa: nordnet.se
  { id: 68, ticker: "0P00000L2Q.ST", isin: "SE0000837338", name: "Länsförsäkringar Fastighetsfond",      category: "Temafond",          fallbackFee: 1.40, slug: "lansforsakringar-fastighetsfond" }, // ej FI-täckning, källa: lf.fondlista.se
  { id: 69, ticker: "0P00005X4X.ST", isin: "FI0008813241", name: "Nordea India A",                       category: "Tillväxtmarknadsfond", fallbackFee: 1.85, slug: "nordea-india-a" }, // FI-fond, ej FI-täckning, källa: nordeafunds.com
  { id: 70, ticker: "0P0000YK7I.ST", isin: "LU0602540527", name: "Nordea Emerging Sustainable Stars Equity BP", category: "Tillväxtmarknadsfond", fallbackFee: 1.50, slug: "nordea-emerging-sustainable-stars-equity-bp" }, // LU-fond, ej FI-täckning, källa: nordeafunds.com
  { id: 71, ticker: "0P0001BSA5.ST", isin: "FI4000261284", name: "Nordea North American Enhanced A",     category: "USA-fond",          fallbackFee: 0.60, slug: "nordea-north-american-enhanced-a" }, // FI-fond, ej FI-täckning, källa: nordeafunds.com
  { id: 72, ticker: "0P0001KW2U.ST", isin: "SE0014991535", name: "PLUS Allabolag Sverige Index",         category: "Sverigefond",       fallbackFee: 0.20, slug: "plus-allabolag-sverige-index" }, // ej FI-täckning, källa: plusfonder.se
  { id: 73, ticker: "0P0001BMMY.ST", isin: "SE0010323642", name: "PLUS Småbolag Sverige Index",          category: "Småbolagsfond",     fallbackFee: 0.40, slug: "plus-smabolag-sverige-index" }, // ej FI-täckning, källa: plusfonder.se
  { id: 74, ticker: "0P00000IAJ.ST", isin: "SE0001112715", name: "Skandia Time Global",                  category: "Globalfond",        fallbackFee: 1.40, slug: "skandia-time-global" }, // ej FI-täckning, källa: nordnet.se
  // Lannebo, Carnegie, Cliens, Nordnet m.fl. (tillägg)
  { id: 75, ticker: "0P0001HI2J.ST", isin: "SE0013041654", name: "Lannebo Global Småbolag A",            category: "Småbolagsfond",     fallbackFee: 1.50, slug: "lannebo-global-smabolag-a" }, // ej FI-täckning, källa: lannebo.se
  { id: 76, ticker: "0P0001AOQO.ST", isin: "SE0010049197", name: "Lannebo Marknad Global A",             category: "Globalfond",        fallbackFee: 0.40, slug: "lannebo-marknad-global-a" }, // ej FI-täckning, källa: lannebo.se
  { id: 77, ticker: "0P0000M4CX.ST", isin: "SE0003039874", name: "Carnegie Listed Private Equity A",     category: "Temafond",          fallbackFee: 1.50, slug: "carnegie-listed-private-equity-a" }, // ej FI-täckning, källa: carnegiefonder.se
  { id: 78, ticker: "0P00018PCO.ST", isin: "SE0008992069", name: "Cliens Småbolag A",                    category: "Småbolagsfond",     fallbackFee: 1.35, slug: "cliens-smabolag-a" }, // ej FI-täckning, + 10 % prestationsavgift över index, källa: cliens.se
  { id: 79, ticker: "0P00001B4C.ST", isin: "SE0001463449", name: "Lannebo Marknad Sverige Bred A",       category: "Sverigefond",       fallbackFee: 0.48, slug: "lannebo-marknad-sverige-bred-a" }, // ej FI-täckning, källa: lannebo.se
  { id: 80, ticker: "0P00000F01.ST", isin: "SE0000428336", name: "D&G Aktiefond",                        category: "Sverigefond",       fallbackFee: 1.23, slug: "dg-aktiefond" }, // ej FI-täckning, källa: carnegiefonder.se
  { id: 81, ticker: "0P00000E0F.ST", isin: "SE0000429789", name: "Carnegie Sverigefond A",               category: "Sverigefond",       fallbackFee: 1.41, slug: "carnegie-sverigefond-a" }, // ej FI-täckning, källa: carnegiefonder.se
  { id: 82, ticker: "0P0001P4AL.ST", isin: "SE0017831977", name: "Nordnet One Balanserad",               category: "Blandfond",         fallbackFee: 0.35, slug: "nordnet-one-balanserad" }, // ej FI-täckning, årlig avgift inkl. underliggande, källa: nordnet.se
  { id: 83, ticker: "0P0001P4AM.ST", isin: "SE0017832413", name: "Nordnet One Offensiv",                 category: "Blandfond",         fallbackFee: 0.35, slug: "nordnet-one-offensiv" }, // ej FI-täckning, årlig avgift inkl. underliggande, källa: nordnet.se
  { id: 84, ticker: "0P000083RV.ST", isin: "SE0000900169", name: "Handelsbanken AstraZeneca Allemansfond", category: "Temafond",        fallbackFee: 0.90, slug: "handelsbanken-astrazeneca-allemansfond" }, // ej FI-täckning, källa: Morningstar
  { id: 85, ticker: "0P0001EC2G.ST", isin: "SE0011527829", name: "MetaSpace Fund A",                     category: "Temafond",          fallbackFee: 1.50, slug: "metaspace-fund-a" }, // ej FI-täckning, källa: fondmarknaden.se
  { id: 86, ticker: "0P0001M5YO.ST", isin: "IE00BNNLSK63", name: "Nordnet Teknologi Index",              category: "Temafond",          fallbackFee: 0.40, slug: "nordnet-teknologi-index" }, // IE-fond, ej FI-täckning, källa: nordnet.se
  // Storebrand, SEB, AMF, Lannebo, LF m.fl. (tillägg)
  { id: 87, ticker: "0P00017TAQ.ST", isin: "SE0008129985", name: "Storebrand Global Plus A",             category: "Globalfond",        fallbackFee: 0.40, slug: "storebrand-global-plus-a" }, // ej FI-täckning, källa: Morningstar
  { id: 88, ticker: "0P0000I3KB.ST", isin: "SE0002593673", name: "SEB Sverige Indexnära A",              category: "Sverigefond",       fallbackFee: 0.20, slug: "seb-sverige-indexnara-a" }, // ej FI-täckning, sänkt 2026-03-01, källa: sebgroup.com
  { id: 89, ticker: "0P0000RYCW.ST", isin: "SE0003455658", name: "Storebrand Emerging Markets A",        category: "Tillväxtmarknadsfond", fallbackFee: 0.40, slug: "storebrand-emerging-markets-a" }, // ej FI-täckning, källa: Morningstar
  { id: 90, ticker: "0P00000K17.ST", isin: "SE0000739153", name: "AMF Aktiefond Europa",                 category: "Europafond",        fallbackFee: 0.40, slug: "amf-aktiefond-europa" }, // ej FI-täckning, källa: amf.se
  { id: 91, ticker: "0P0000WEQ4.ST", isin: "SE0004578615", name: "Lannebo Emerging Markets A",           category: "Tillväxtmarknadsfond", fallbackFee: 0.90, slug: "lannebo-emerging-markets-a" }, // ej FI-täckning, källa: lannebo.se
  { id: 92, ticker: "0P0001D63M.ST", isin: "LU1822851538", name: "Finserve Global Security Fund I SEK R", category: "Temafond",         fallbackFee: 1.60, slug: "finserve-global-security-fund" }, // LU-fond, ej FI-täckning, källa: finserve.se
  { id: 93, ticker: "0P00018JII.ST", isin: "SE0008321780", name: "Aktiespararna Direktavkastning A",     category: "Sverigefond",       fallbackFee: 0.30, slug: "aktiespararna-direktavkastning-a" }, // ej FI-täckning, källa: Morningstar
  { id: 94, ticker: "0P0001D9SX.ST", isin: "LU1777968246", name: "Kavaljer Investmentbolagsfond A",      category: "Sverigefond",       fallbackFee: 0.30, slug: "kavaljer-investmentbolagsfond-a" }, // LU-fond, ej FI-täckning, källa: Morningstar (ej verifierad mot kavaljer.se)
  { id: 95, ticker: "0P0000KBNA.ST", isin: "SE0002793935", name: "Länsförsäkringar Europa Index",        category: "Europafond",        fallbackFee: 0.20, slug: "lansforsakringar-europa-index" }, // ej FI-täckning, källa: lf.fondlista.se
  // Kvartil, Storebrand, Handelsbanken, Proethos (tillägg)
  { id: 96, ticker: "0P0001IISR.ST", isin: "SE0013121456", name: "Kvartil Investmentbolag+ Calculus A",  category: "Sverigefond",       fallbackFee: 0.55, slug: "kvartil-investmentbolag-calculus-a" }, // ej FI-täckning, källa: Morningstar
  { id: 97, ticker: "0P00000FYO.ST", isin: "SE0000621393", name: "Storebrand Japan A",                   category: "Japanfond",         fallbackFee: 0.20, slug: "storebrand-japan-a" }, // ej FI-täckning, källa: storebrand.se handelsrutiner
  { id: 98, ticker: "0P00000F5G.ST", isin: "SE0000735375", name: "Handelsbanken Hälsovård Tema A1",      category: "Temafond",          fallbackFee: 1.50, slug: "handelsbanken-halsovard-tema-a1" }, // ej FI-täckning, källa: Morningstar
  { id: 99, ticker: "0P0001C96Y.ST", isin: "SE0010547778", name: "Proethos Fond",                        category: "Globalfond",        fallbackFee: 0.85, slug: "proethos-fond" }, // ej FI-täckning, källa: proethos.se
];
