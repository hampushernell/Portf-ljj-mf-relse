// Fondbolagens profilfärger. Används för fondlinjen och slutpunkten i fondsidans
// kategorigraf (scripts/seo-chart.mjs). Flera färger ligger under 3:1 mot
// bakgrunden — det är ett medvetet undantag, se DESIGN.md.
export const COMPANY_COLORS = {
  "Aktiespararna": "#185596",
  "AMF": "#0528CA",
  "AuAg": "#96446C",
  "Avanza": "#17B582",
  "Carnegie": "#F3EDE2",
  "Cliens": "#FFFFFF",
  "DNB": "#007582",
  "Finserve": "#FFFFFF",
  "Handelsbanken": "#005C9D",
  "Kavaljer": "#FFFFFF",
  "Kvartil": "#FFFFFF",
  "Lannebo": "#007E85",
  "Länsförsäkringar": "#FF020C",
  "Lysa": "#254DE9",
  "MetaSpace": "#FFFFFF",
  "Nordea": "#0000A0",
  "Nordnet": "#FFFFFF",
  "PLUS": "#E97116",
  "Proethos": "#FFFFFF",
  "SEB": "#003824",
  "Skandia": "#019676",
  "Söderberg & Partners": "#008ECC",
  "Spiltan": "#B8253D",
  "Storebrand": "#DA2A1D",
  "Swedbank Robur": "#FF5F00",
  "TIN": "#39A0ED",
};

// Kastar i stället för att falla tillbaka, så att en fond utan bolag stoppar bygget.
export function getCompanyColor(fund) {
  const color = COMPANY_COLORS[fund.company];
  if (!color) throw new Error(`Saknar bolagsfärg för fond id ${fund.id} (company: ${JSON.stringify(fund.company)}) — se COMPANY_COLORS`);
  return color;
}
