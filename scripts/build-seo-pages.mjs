/**
 * build-seo-pages.mjs — Genererar statiska SEO-sidor till dist/.
 *
 * Se project-docs/SEO.md avsnitt 2, 4, 5, 6 för full specifikation, och
 * project-docs/mockups/seo-sidor.html för facit på struktur, ordning och copy
 * (byggd på riktig data ur src/data/seo-snapshot.json, så exemplen där matchar
 * beräkningarna här nästan siffra för siffra).
 *
 * Absolut krav (samma som build-seo-snapshot.mjs, se SEO.md 6.1 "Två saker som
 * går sönder tyst"): ingen siffra i prosan får vara en literal. Allt — avgift,
 * avkastning, rank, spann, snitt — läses ur funds-registry.js, fi-fees.json och
 * seo-snapshot.json, eller härleds här vid byggtid. Kategoristatistik (spann,
 * snitt, vinnare, placering) hör hemma i generatorn, inte i snapshotten
 * (SEO.md 6.2 "Endast fondfakta").
 *
 * Fas B4 (SEO.md avsnitt 9) — bygger alla kategorisidor, alla fondsidor,
 * /fonder/ (index) och /om, skriver sitemap.xml, och verifierar resultatet
 * (verifyBuild, sist i filen) innan skriptet avslutas med felkod om något
 * brister: dubblettslugs, döda interna länkar, sitemap/sid-antal som inte
 * stämmer, eller identiska title/description.
 *
 * Körning: node scripts/build-seo-pages.mjs (eller via npm run build)
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { FUNDS_REGISTRY } from "../src/lib/funds-registry.js";
import { renderCategoryChart, CHART_CSS } from "./seo-chart.mjs";
import { fmtSignedPct, fmtDateSv, categoryPlural } from "./seo-format.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist");
const BASE_URL = "https://www.minportfolj.se";

// Sökvägen till verktyget (SPA:n). Används av headern, fondsidan, kategorisidan och
// fondlistan. När appen flyttar till /jamfor räcker det att ändra den här raden.
const APP_PATH = "/";

// ─── Kategorimetadata — URL-struktur och etiketter, SEO.md avsnitt 4 ───────────
// Fasta strängar, ingen finansiell data — samma typ av konstant som slug-fältet
// i funds-registry.js.

// label = obestämd plural ("Globalfonder"), pluralDefinite = bestämd plural
// ("globalfonderna") — Swedish "dubbel bestämdhet" kräver båda formerna
// beroende på meningskonstruktion (t.ex. "de tolv globalfonderna" men
// "kategorins tolv globalfonder").
// Objektordningen är också chipordningen på /fonder/. chip = kortare etikett
// där den fulla pluralformen blir för bred som chip.
const CATEGORY_META = {
  "Globalfond":            { slug: "globalfonder",           label: "Globalfonder",           singular: "globalfond",           pluralDefinite: "globalfonderna" },
  "Sverigefond":           { slug: "sverigefonder",           label: "Sverigefonder",           singular: "sverigefond",          pluralDefinite: "sverigefonderna" },
  "USA-fond":              { slug: "usa-fonder",              label: "USA-fonder",              singular: "USA-fond",             pluralDefinite: "USA-fonderna" },
  "Europafond":            { slug: "europafonder",            label: "Europafonder",            singular: "europafond",           pluralDefinite: "europafonderna" },
  "Tillväxtmarknadsfond":  { slug: "tillvaxtmarknadsfonder",  label: "Tillväxtmarknadsfonder",  singular: "tillväxtmarknadsfond", pluralDefinite: "tillväxtmarknadsfonderna", chip: "Tillväxtmarknad" },
  "Japanfond":             { slug: "japanfonder",             label: "Japanfonder",             singular: "japanfond",            pluralDefinite: "japanfonderna" },
  "Småbolagsfond":         { slug: "smabolagsfonder",         label: "Småbolagsfonder",         singular: "småbolagsfond",        pluralDefinite: "småbolagsfonderna", chip: "Småbolag" },
  "Temafond":              { slug: "temafonder",              label: "Temafonder",              singular: "temafond",             pluralDefinite: "temafonderna" },
  "Blandfond":             { slug: "blandfonder",             label: "Blandfonder",             singular: "blandfond",            pluralDefinite: "blandfonderna" },
  "Räntefond":             { slug: "rantefonder",             label: "Räntefonder",             singular: "räntefond",            pluralDefinite: "räntefonderna" },
};

// ─── Formattering — Swedish decimalkomma, tusentalsavskiljare, tecken ──────────

function fmtPlainPct(v) {
  if (v === null || v === undefined) return "–";
  const sign = v < 0 ? "−" : "";
  return `${sign}${Math.abs(v).toFixed(1).replace(".", ",")} %`;
}

function fmtFeePct(v) {
  return `${v.toFixed(2).replace(".", ",")} %`;
}

function fmtKr(v) {
  return `${Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} kr`;
}

// Rundar snyggt till heltal när avrundningen inte tappar information (t.ex. en
// skillnad som råkar landa exakt på 9,0), annars en decimal. Används bara i
// prosan där en decimal som ".0" läses konstigt ("9,0 procentenheter").
function fmtPpSmart(v) {
  const rounded1 = Math.round(v * 10) / 10;
  const asInt = Math.round(rounded1);
  return Math.abs(rounded1 - asInt) < 0.05 ? `${asInt}` : rounded1.toFixed(1).replace(".", ",");
}

function fmtPpFee(v) {
  return Math.abs(v).toFixed(2).replace(".", ",");
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─── Data — registret berikat med avgift och snapshot ──────────────────────────

function loadFiFees() {
  const raw = JSON.parse(readFileSync(join(ROOT, "src/data/fi-fees.json"), "utf8"));
  const { _meta, ...fees } = raw;
  return { fees, meta: _meta };
}

function loadSnapshot() {
  return JSON.parse(readFileSync(join(ROOT, "src/data/seo-snapshot.json"), "utf8"));
}

function buildFunds(registry, fiFees, snapshot) {
  return registry.map(f => {
    const isFi = fiFees.fees[f.isin] !== undefined;
    const fee = isFi ? fiFees.fees[f.isin] : f.fallbackFee;
    const feeSource = isFi ? "fi" : "fallback";
    const snap = snapshot.funds[String(f.id)] ?? null;
    const meta = CATEGORY_META[f.category];
    if (!meta) throw new Error(`Okänd kategori "${f.category}" för fond id ${f.id} — saknas i CATEGORY_META`);
    return {
      id: f.id,
      slug: f.slug,
      name: f.name,
      isin: f.isin,
      category: f.category,
      categoryMeta: meta,
      fee,
      feeSource,
      oneYear: snap?.oneYear ?? null,
      threeYear: snap?.threeYear ?? null,
      sinceStart: snap?.sinceStart ?? null,
      dataFrom: snap?.dataFrom ?? null,
      dataTo: snap?.dataTo ?? null,
      stale: snap?.stale ?? true,
      rank3y: null,
      url: `/fond/${f.slug}`,
    };
  });
}

function groupByCategory(funds) {
  const map = new Map();
  for (const f of funds) {
    if (!map.has(f.category)) map.set(f.category, []);
    map.get(f.category).push(f);
  }
  for (const [, list] of map) {
    const ranked = list.filter(f => f.threeYear).sort((a, b) => b.threeYear.return - a.threeYear.return);
    ranked.forEach((f, i) => { f.rank3y = i + 1; });
    const unranked = list.filter(f => !f.threeYear).sort((a, b) => (b.dataFrom ?? "").localeCompare(a.dataFrom ?? ""));
    list.__ranked = ranked;
    list.__unranked = unranked;
  }
  return map;
}

// Kategoristatistik härledd här, aldrig i snapshotten (SEO.md 6.2).
function categoryStats(categoryFunds) {
  const ranked = categoryFunds.__ranked;
  const total = ranked.length;
  const best3y = ranked[0];
  const worst3y = ranked[total - 1];
  const gap3y = best3y.threeYear.return - worst3y.threeYear.return;

  const withOneYear = categoryFunds.filter(f => f.oneYear);
  const best1y = withOneYear.reduce((a, b) => (a.oneYear.return >= b.oneYear.return ? a : b));

  const byFee = [...categoryFunds].sort((a, b) => a.fee - b.fee);
  const cheapest = byFee[0];
  const mostExpensive = byFee[byFee.length - 1];
  const feeSum = categoryFunds.reduce((sum, f) => sum + f.fee, 0);
  const feeAvg = feeSum / categoryFunds.length;

  return { total, ranked, best3y, worst3y, gap3y, best1y, cheapest, mostExpensive, feeMin: cheapest.fee, feeMax: mostExpensive.fee, feeAvg };
}

function equalWeights(n) {
  const base = Math.floor(100 / n);
  const remainder = 100 - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

// ─── FAQ — en källa, återanvänd i både synlig HTML och FAQPage JSON-LD ─────────

function buildFaq(stats, meta) {
  const label = meta.label.toLowerCase();
  const labelCap = meta.label; // sentence-initial position i FAQ 2 — versalt
  const singular = meta.singular;

  const rankPart = stats.best1y.id === stats.best3y.id
    ? `Samma fond, ${stats.best3y.name}, toppar även på ett års sikt.`
    : `På ett års sikt ligger ${stats.best1y.name} först i stället, på ${fmtSignedPct(stats.best1y.oneYear.return)}.`;

  const feeOrderNote = stats.mostExpensive.rank3y !== null && stats.cheapest.rank3y !== null
    ? `Kategorins billigaste fond ligger på plats ${stats.cheapest.rank3y} av ${stats.total}, och den dyraste på plats ${stats.mostExpensive.rank3y} av ${stats.total}.`
    : "";

  return [
    {
      q: `Vilken ${singular} har gett mest?`,
      a: `${stats.best3y.name}, ${fmtSignedPct(stats.best3y.threeYear.return)} efter avgift de senaste tre åren. ${rankPart} Tre år är en kort period och säger mer om vilket index eller vilken inriktning som gått bra än om vem som är skickligast.`,
    },
    {
      q: `Vilken ${singular} är billigast?`,
      a: `${stats.cheapest.name} med ${fmtFeePct(stats.cheapest.fee)} i årlig förvaltningsavgift. Billigast är dock inte samma sak som bäst: ${stats.cheapest.name} ligger på plats ${stats.cheapest.rank3y} av ${stats.total} på tre års avkastning efter avgift. ${labelCap} rymmer fonder med olika inriktning och förvaltningsstrategi, och det kan påverka utfallet mer än avgiften över en så kort period.`,
    },
    {
      q: "Ska jag välja fonden med lägst avgift?",
      a: `Inte automatiskt — avkastningen ovan är redan efter avgift, så en dyrare fond som gett mer har gett mer på riktigt. ${feeOrderNote} Men avgiften är det enda du vet i förväg: den står i avtalet, medan avkastningen framåt vet ingen.`,
    },
    {
      q: 'Varför har vissa fonder märkningen "Manuell"?',
      a: "Fonden saknas i Finansinspektionens register, oftast för att den är registrerad utomlands. Avgiften är då inlagd från fondbolagets publika information och bör betraktas som indikativ.",
    },
  ];
}

// ─── Delad CSS — tokens kopierade ur src/lib/tokens.js via mockens facit ───────

// Accenttokens och accentknapp delas av fondsidan och fondlistan så att de inte
// glider isär. #0018f5 (--accent-a) används bara som kant och fyllnadston —
// aldrig som linje eller text (2,2:1 mot bakgrunden); där gäller --accent-light.
const ACCENT_TOKENS = `--accent-a: #0018f5; --accent-light: #7891ff;
    --tint-sel: rgba(0,24,245,0.16); --tint-sel-hover: rgba(0,24,245,0.26); --tint-row: rgba(0,24,245,0.08);`;

const ACCENT_BUTTON_CSS = `
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-family: var(--font-display); font-weight: 600; font-size: 13px; text-decoration: none; border-radius: 8px; padding: 9px 16px; white-space: nowrap; cursor: pointer; transition: background .15s; }
  .btn-accent { color: var(--text-primary); background: var(--tint-sel); border: 1px solid var(--accent-a); }
  .btn-accent:hover { background: var(--tint-sel-hover); }`;

const PAGE_CSS = `
  :root {
    --bg-base: #0a0f1c; --bg-elevated: #141a2b;
    --surface-panel: rgba(255,255,255,0.04); --surface-card: rgba(255,255,255,0.055); --surface-stat: rgba(255,255,255,0.09);
    --surface-sunken: #080d19;
    --border-edge: rgba(255,255,255,0.34); --border-inner: rgba(255,255,255,0.26); --border-soft: rgba(255,255,255,0.20); --border-hairline: rgba(255,255,255,0.12);
    --text-primary: #f0ede8; --text-secondary: #cbd5e6; --text-label: #a9b6cc;
    ${ACCENT_TOKENS} --accent-b: #38bdf8;
    --surface-tab: rgba(255,255,255,0.07); --surface-active: rgba(255,255,255,0.13);
    --positive: #56ec8d; --negative: #f87171; --warning: #fbbf24;
    --fi: #3a9aa8; --fallback: #94a3b8;
    --tint-fi: rgba(58,154,168,0.12); --tint-fallback: rgba(148,163,184,0.12);
    --font-display: 'Syne', 'Trebuchet MS', sans-serif; --font-body: 'DM Sans', 'Helvetica Neue', Arial, sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg-base); color: var(--text-primary); font-family: var(--font-body); font-size: 14px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
  .wrap { max-width: 760px; margin: 0 auto; padding: 32px 20px 64px; display: flex; flex-direction: column; gap: 26px; }
  .crumbs { font-size: 12px; color: var(--text-label); margin: 0; }
  .crumbs a { color: var(--text-label); text-decoration: none; border-bottom: 1px solid var(--border-hairline); }
  .crumbs span { color: var(--text-secondary); }
  h1 { font-family: var(--font-display); font-weight: 800; font-size: 26px; line-height: 1.12; letter-spacing: -0.02em; margin: 0; text-wrap: balance; }
  h2 { font-family: var(--font-display); font-weight: 700; font-size: 17px; line-height: 1.3; margin: 0 0 10px; }
  h3 { font-family: var(--font-display); font-weight: 600; font-size: 14px; line-height: 1.4; margin: 0 0 4px; }
  .prose { max-width: 66ch; color: var(--text-secondary); }
  .prose p { margin: 0 0 12px; }
  .prose p:last-child { margin-bottom: 0; }
  .prose strong { color: var(--text-primary); font-weight: 500; }
  .stamp { font-size: 12px; color: var(--text-label); margin: 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .stamp em { font-style: normal; color: var(--text-secondary); }
  .tablewrap { overflow-x: auto; border: 1px solid var(--border-inner); border-radius: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 480px; }
  thead th { font-family: var(--font-display); font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-label); text-align: left; padding: 11px 14px; background: rgba(255,255,255,0.045); border-bottom: 1px solid var(--border-soft); white-space: nowrap; }
  thead th.num, tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
  thead th.sortable { cursor: pointer; user-select: none; }
  thead th .sortmark { color: var(--accent-light); margin-left: 5px; }
  tbody td { padding: 11px 14px; border-bottom: 1px solid var(--border-hairline); vertical-align: middle; }
  tbody tr:last-child td { border-bottom: none; }
  .fundname { color: var(--text-primary); text-decoration: none; border-bottom: 1px solid rgba(120,145,255,0.45); }
  .fee { color: var(--text-primary); font-weight: 500; }
  .cagr { color: var(--positive); font-weight: 500; }
  .rowtag { font-family: var(--font-display); font-size: 10px; font-weight: 600; letter-spacing: 0.04em; color: var(--text-label); margin-left: 8px; padding: 2px 7px; border-radius: 20px; border: 1px solid var(--border-hairline); vertical-align: 1px; }
  .badge { display: inline-block; font-family: var(--font-display); font-size: 10px; font-weight: 600; letter-spacing: 0.04em; padding: 2px 7px; border-radius: 20px; vertical-align: 1px; }
  .badge.fi { color: var(--fi); background: var(--tint-fi); border: 1px solid rgba(58,154,168,0.45); }
  .badge.man { color: var(--fallback); background: var(--tint-fallback); border: 1px solid rgba(148,163,184,0.42); }
  .inline-link { color: var(--accent-light); text-decoration: none; border-bottom: 1px solid rgba(120,145,255,0.45); }
  .datawindow { font-size: 12.5px; color: var(--text-label); margin: 0; max-width: 66ch; border-left: 2px solid var(--border-soft); padding-left: 14px; }
  .verdictline { margin: 0; font-size: 13px; color: var(--text-secondary); background: var(--surface-card); border: 1px solid var(--border-soft); border-radius: 9px; padding: 12px 14px; }
  .verdictline b { color: var(--text-primary); font-weight: 500; }
  .verdictline .sep { color: var(--border-edge); margin: 0 6px; }
  .cta { display: inline-flex; align-items: center; gap: 9px; align-self: flex-start; font-family: var(--font-display); font-size: 13px; font-weight: 600; color: var(--accent-light); text-decoration: none; background: rgba(0,24,245,0.14); border: 1px solid rgba(120,145,255,0.55); border-radius: 6px; padding: 10px 16px; }
  .cta .arrow { color: var(--accent-b); }
  .cta-note { font-size: 12px; color: var(--text-label); margin: 6px 0 0; }
  .cta-note code { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 11px; color: var(--text-secondary); background: var(--surface-sunken); border: 1px solid var(--border-hairline); border-radius: 4px; padding: 1px 5px; }
  .faq { display: flex; flex-direction: column; gap: 14px; }
  .faq-item { border-left: 2px solid var(--border-soft); padding-left: 14px; }
  .faq-item p { margin: 0; color: var(--text-secondary); font-size: 13px; max-width: 62ch; }
  .disclaimer { font-size: 12px; color: var(--text-label); border-top: 1px solid var(--border-hairline); padding-top: 14px; margin: 0; max-width: 66ch; }
  a:focus-visible, .cta:focus-visible { outline: 2px solid var(--accent-b); outline-offset: 2px; }
  @media (max-width: 640px) {
    .wrap { padding: 24px 16px 40px; }
    h1 { font-size: 22px; }
  }
`;

// ─── Gemensam header — samma som src/components/SiteHeader.jsx ─────────────────
// Se project-docs/mockups/header.html. Markupen finns bara här; pageShell lägger
// den överst på varje statisk sida. active: "jamfor" | "fonder" | null (t.ex. /om).
// Klasserna har prefixet sh- så att de inte krockar med sidornas egen CSS.

const SITE_HEADER_CSS = `
  .sh { display: flex; align-items: center; gap: 36px; height: 64px; padding-inline: 36px; border-bottom: 1px solid rgba(255,255,255,0.12); font-family: 'Syne', 'Trebuchet MS', sans-serif; }
  .sh-logo { display: inline-flex; align-items: center; gap: 10px; font-weight: 800; font-size: 20px; letter-spacing: -0.02em; color: #f0ede8; text-decoration: none; white-space: nowrap; }
  .sh-mark { width: 24px; height: 22px; display: block; flex-shrink: 0; }
  .sh-links { display: flex; gap: 4px; height: 100%; }
  .sh-links a { position: relative; display: flex; align-items: center; padding-inline: 12px; font-size: 13px; font-weight: 600; text-decoration: none; color: #a9b6cc; transition: color .15s; }
  .sh-links a:hover, .sh-links a[aria-current="page"] { color: #f0ede8; }
  .sh-links a[aria-current="page"]::after { content: ""; position: absolute; left: 12px; right: 12px; bottom: -1px; height: 2px; border-radius: 2px 2px 0 0; background: #0018f5; }
  .sh-right { margin-left: auto; display: flex; align-items: center; gap: 10px; }
  .sh-om { display: inline-flex; align-items: center; font-size: 12px; font-weight: 600; color: #cbd5e6; text-decoration: none; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.14); border-radius: 20px; padding: 5px 14px; transition: border-color .15s; }
  .sh-om:hover { border-color: rgba(255,255,255,0.34); }
  .sh a:focus-visible { outline: 2px solid #7891ff; outline-offset: 2px; border-radius: 4px; }
  @media (max-width: 767px) {
    .sh { height: 56px; padding-inline: 16px; gap: 8px; }
    .sh-logo { font-size: 15px; gap: 7px; }
    .sh-mark { width: 18px; height: 16px; }
    .sh-links { margin-left: auto; gap: 0; }
    .sh-links a { padding-inline: 6px; }
    .sh-links a[aria-current="page"]::after { left: 6px; right: 6px; }
    .sh-om { padding-inline: 10px; }
    .sh-right { margin-left: 4px; }
  }
  @media (prefers-reduced-motion: reduce) { .sh * { transition: none !important; } }
`;

function siteHeader(active) {
  const link = (key, href, label) => `<a href="${href}"${key === active ? ' aria-current="page"' : ""}>${label}</a>`;
  return `<header class="sh">
  <a class="sh-logo" href="/"><svg class="sh-mark" viewBox="0 0 44 40" aria-hidden="true"><rect x="0" y="0" width="16" height="40" rx="5" fill="#5a6e8a"/><rect x="20" y="0" width="24" height="40" rx="6" fill="#94a3b8"/></svg><span>MinPortfölj</span></a>
  <nav class="sh-links" aria-label="Huvudmeny">${link("jamfor", APP_PATH, "Jämför")}${link("fonder", "/fonder/", "Fonder")}</nav>
  <div class="sh-right"><a class="sh-om" href="/om">Om</a></div>
</header>`;
}

function pageShell({ title, description, canonical, jsonLd, bodyHtml, css = PAGE_CSS, wrapClass = "wrap", active = "fonder" }) {
  return `<!doctype html>
<html lang="sv">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="theme-color" content="#0a0f1c" />
<meta name="robots" content="index, follow" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<link rel="canonical" href="${canonical}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${canonical}" />
<meta property="og:site_name" content="minportfölj.se" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:locale" content="sv_SE" />
<meta property="og:image" content="${BASE_URL}/og-image.png" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
${jsonLd.map(obj => `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`).join("\n")}
<style>${css}${SITE_HEADER_CSS}</style>
</head>
<body>
${siteHeader(active)}
<div class="${wrapClass}">
${bodyHtml}
</div>
</body>
</html>
`;
}

// ~30 rader vanilla JS, SEO.md 5.2 — klick på kolumnrubrik sorterar tabellen på
// numeriska data-attribut (aldrig på formatterad text, som har komma/tecken).
const SORT_SCRIPT = `
<script>
(function () {
  var table = document.getElementById('fund-table');
  if (!table) return;
  var tbody = table.tBodies[0];
  var headers = table.querySelectorAll('th.sortable');
  var state = { col: null, dir: 1 };
  headers.forEach(function (th) {
    th.addEventListener('click', function () {
      var col = Number(th.dataset.col);
      state.dir = state.col === col ? -state.dir : -1;
      state.col = col;
      var rows = Array.prototype.slice.call(tbody.rows);
      rows.sort(function (a, b) {
        var av = Number(a.cells[col].dataset.sort);
        var bv = Number(b.cells[col].dataset.sort);
        return (av - bv) * state.dir;
      });
      rows.forEach(function (r) { tbody.appendChild(r); });
      headers.forEach(function (h) { h.querySelector('.sortmark') && h.querySelector('.sortmark').remove(); });
      var mark = document.createElement('span');
      mark.className = 'sortmark';
      mark.textContent = state.dir === 1 ? '▲' : '▼';
      th.appendChild(mark);
    });
  });
})();
</script>`;

// ─── Kategorisida ───────────────────────────────────────────────────────────────

function renderCategoryPage(category, categoryFunds, fiMeta, asOf) {
  const meta = CATEGORY_META[category];
  const stats = categoryStats(categoryFunds);
  const faq = buildFaq(stats, meta);
  const cheapThree = [...categoryFunds].sort((a, b) => a.fee - b.fee).slice(0, 3);
  const weights = equalWeights(cheapThree.length);
  const ctaQuery = cheapThree.map((f, i) => `a=${f.id}:${weights[i]}`).join("&") + "&span=3y&mode=compare";

  const rows = stats.ranked.map(f => `
    <tr>
      <td><a class="fundname" href="/fond/${f.slug}">${escapeHtml(f.name)}</a></td>
      <td class="num" data-sort="${f.oneYear.return}">${fmtSignedPct(f.oneYear.return)}</td>
      <td class="num cagr" data-sort="${f.threeYear.return}">${fmtSignedPct(f.threeYear.return)}</td>
      <td class="num fee" data-sort="${f.fee}">${fmtFeePct(f.fee)}</td>
      <td>${f.feeSource === "fi" ? '<span class="badge fi">FI</span>' : '<span class="badge man">Manuell</span>'}</td>
    </tr>`).join("");

  const unrankedRows = categoryFunds.__unranked.map(f => `
    <tr>
      <td><a class="fundname" href="/fond/${f.slug}">${escapeHtml(f.name)}</a></td>
      <td class="num" data-sort="${f.oneYear ? f.oneYear.return : -Infinity}">${f.oneYear ? fmtSignedPct(f.oneYear.return) : "–"}</td>
      <td class="num" data-sort="-999">– <span class="rowtag">sedan ${f.dataFrom ?? "okänt"}</span></td>
      <td class="num fee" data-sort="${f.fee}">${fmtFeePct(f.fee)}</td>
      <td>${f.feeSource === "fi" ? '<span class="badge fi">FI</span>' : '<span class="badge man">Manuell</span>'}</td>
    </tr>`).join("");

  const oneYearNote = stats.best1y.id === stats.best3y.id
    ? `Samma fond toppar även på ett års sikt.`
    : `På ett års sikt toppar ${escapeHtml(stats.best1y.name)} i stället.`;

  const faqHtml = faq.map(item => `
    <div class="faq-item">
      <h3>${escapeHtml(item.q)}</h3>
      <p>${escapeHtml(item.a)}</p>
    </div>`).join("");

  const body = `
  <p class="crumbs"><a href="/fonder/">Fonder</a> › <span>${escapeHtml(meta.label)}</span></p>

  <h1>${escapeHtml(meta.label)} – jämför avkastning efter avgift</h1>

  <p class="stamp">
    <em>${stats.total} fonder</em> · Avgifter per <em>${fiMeta.published}</em> (FI ${fiMeta.period}) · Avkastning per <em>${asOf}</em>
  </p>

  <div class="prose">
    <p>
      De ${stats.total} ${meta.pluralDefinite} nedan äger till stor del samma bolag. Ändå är spannet
      <strong>${fmtPpSmart(stats.gap3y)} procentenheter</strong> i avkastning efter avgift de senaste tre
      åren — och skillnaden följer inte avgiften. Kategorins billigaste fond,
      ${escapeHtml(stats.cheapest.name)}, ligger på plats ${stats.cheapest.rank3y}
      av ${stats.total}, medan den dyraste, ${escapeHtml(stats.mostExpensive.name)}, ligger på plats
      ${stats.mostExpensive.rank3y} av ${stats.total}.
    </p>
    <p>
      Förklaringen är sannolikt att fonderna följer olika index eller har olika inriktning inom
      kategorin, och över en så här kort period kan det påverka utfallet mer än avgiften gör.
      <strong>Listan är alltså ingen kvalitetsordning</strong> — kontrollera fondens inriktning innan
      du byter.
    </p>
    <p>
      Avkastningen i tabellen är <strong>efter avgift</strong>, precis som i verktyget. Du behöver
      alltså inte dra bort avgiften själv. Att avgiften ändå står med beror på att den är det enda
      som är känt i förväg. Avgifterna i kategorin spänner från ${fmtFeePct(stats.feeMin)} till
      ${fmtFeePct(stats.feeMax)}, med ett snitt på ${fmtFeePct(stats.feeAvg)}.
    </p>
  </div>

  <p class="verdictline">
    <b>Högst efter avgift 3 år:</b> ${escapeHtml(stats.best3y.name)}, ${fmtSignedPct(stats.best3y.threeYear.return)}
    till ${fmtFeePct(stats.best3y.fee)} i avgift.
    <span class="sep">·</span>
    <b>Lägst avgift:</b> ${escapeHtml(stats.cheapest.name)}, ${fmtFeePct(stats.cheapest.fee)} — men
    ${fmtSignedPct(stats.cheapest.threeYear ? stats.cheapest.threeYear.return : null)}, plats
    ${stats.cheapest.rank3y ?? "–"} av ${stats.total}.
    <span class="sep">·</span>
    ${oneYearNote}
  </p>

  <div class="tablewrap">
    <table id="fund-table">
      <thead>
        <tr>
          <th>Fond</th>
          <th class="num sortable" data-col="1">1 år</th>
          <th class="num sortable" data-col="2">3 år <span class="sortmark">▼</span></th>
          <th class="num sortable" data-col="3">Avgift</th>
          <th>Källa</th>
        </tr>
      </thead>
      <tbody>${rows}${unrankedRows}</tbody>
    </table>
  </div>

  <p class="datawindow">
    Perioderna är 1 och 3 år för att alla ${stats.total} fonderna ska mätas över exakt samma
    tidsspann. Prisdatan från Yahoo Finance börjar för de flesta svenska fonder i mars 2022, och
    startdatumet skiljer sig mellan fonder — en ranking "sedan start" hade jämfört olika
    tidsperioder med varandra. I verktyget kan du köra varje fond över hela sin egen historik.
  </p>

  <div>
    <a class="cta" href="${APP_PATH}?${ctaQuery}">Sätt ihop dem till en portfölj och jämför <span class="arrow">→</span></a>
    <p class="cta-note">
      Det tabellen inte kan: blanda flera fonder, sätta egna andelar och ställa två portföljer mot
      varandra. Går till <code>${APP_PATH}?${ctaQuery}</code>.
    </p>
  </div>

  <section>
    <h2>Vanliga frågor om ${meta.label.toLowerCase()}</h2>
    <div class="faq">${faqHtml}</div>
  </section>

  <p class="disclaimer">
    Historisk avkastning är ingen garanti för framtida avkastning. Ingenting på den här sidan
    utgör finansiell rådgivning. <a href="/om" style="color:var(--text-secondary)">Om datakällorna</a>
  </p>
  ${SORT_SCRIPT}`;

  const canonical = `${BASE_URL}/fonder/${meta.slug}`;
  const title = `${meta.label} – jämför avgifter och avkastning | MinPortfölj`;
  const description = `Jämför avkastning efter avgift för ${stats.total} ${meta.label.toLowerCase()}. Avgifter från ${fmtFeePct(stats.feeMin)} till ${fmtFeePct(stats.feeMax)}. Uppdaterat ${asOf}.`;

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `${meta.label} rankade efter avkastning efter avgift, 3 år`,
    "itemListElement": stats.ranked.map((f, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "url": `${BASE_URL}/fond/${f.slug}`,
      "name": f.name,
    })),
  };
  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faq.map(item => ({
      "@type": "Question",
      "name": item.q,
      "acceptedAnswer": { "@type": "Answer", "text": item.a },
    })),
  };

  return { html: pageShell({ title, description, canonical, jsonLd: [itemList, faqPage], bodyHtml: body }), stats, title, description, canonical };
}

// ─── Fondsida ───────────────────────────────────────────────────────────────────
// Se project-docs/mockups/fondsida.html för ordning, copy och layout.
// "Efter avgift" står bara i fotnoten (SEO.md 5.1).

const FUND_PAGE_CSS = `
  .wrap.fp { max-width: 880px; gap: 36px; }
  .fp h1 { font-size: 32px; line-height: 1.1; }
  .fp-head { display: flex; flex-direction: column; gap: 22px; }
  .fp-title { display: flex; flex-direction: column; gap: 6px; }
  .fp-meta { font-size: 13px; color: var(--text-label); display: flex; gap: 8px; flex-wrap: wrap; margin: 0; }
  .fp-meta code { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 12.5px; color: var(--text-secondary); }
  .fp .label { font-family: var(--font-display); font-size: 11px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--text-label); }
  .fp .pos { color: var(--positive); }
  .fp .neg { color: var(--negative); }
  .num { font-variant-numeric: tabular-nums; }

  .stats { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid var(--border-edge); border-radius: 12px; }
  .stat { padding: 14px 18px; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .stat + .stat { border-left: 1px solid var(--border-hairline); }
  .stat-val { font-family: var(--font-display); font-size: 24px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.3; display: flex; align-items: center; gap: 8px; }
  .stat-sub { font-size: 12px; color: var(--text-label); }

  .chart-card { position: relative; border: 1px solid var(--border-edge); border-radius: 12px; padding: 16px 18px 12px; display: flex; flex-direction: column; gap: 10px; }
  .chart-top { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  .chart-top h2 { font-size: 16px; margin: 0; }
  .sc-radio { position: absolute; opacity: 0; width: 1px; height: 1px; margin: 0; pointer-events: none; }
  .tabs { display: flex; gap: 2px; background: var(--surface-tab); border: 1px solid var(--border-soft); border-radius: 8px; padding: 2px; }
  .tabs label, .tabs span { border-radius: 6px; padding: 4px 12px; font-family: var(--font-display); font-weight: 600; font-size: 12px; color: var(--text-label); cursor: pointer; }
  .tabs span { cursor: default; }
  .tabs span, #sc-1y:checked ~ .chart-top label[for="sc-1y"], #sc-3y:checked ~ .chart-top label[for="sc-3y"] { background: var(--tint-sel); box-shadow: inset 0 0 0 1px var(--accent-a); color: var(--text-primary); }
  #sc-1y:focus-visible ~ .chart-top label[for="sc-1y"], #sc-3y:focus-visible ~ .chart-top label[for="sc-3y"] { outline: 2px solid var(--accent-light); outline-offset: 2px; }
  #sc-1y:checked ~ .sc-3y, #sc-3y:checked ~ .sc-1y { display: none; }
  .legend { display: flex; gap: 18px; font-size: 12px; color: var(--text-secondary); flex-wrap: wrap; }
  .legend span { display: inline-flex; align-items: center; gap: 6px; }
  .legend i { display: inline-block; width: 16px; height: 2px; border-radius: 1px; }
  .chart-foot { font-size: 12px; color: var(--text-label); margin: 0; }

  .fp-sec { display: flex; flex-direction: column; gap: 12px; }
  .fp-sec > h2 { margin: 0; }
  .fp-lede { margin: 0; color: var(--text-secondary); max-width: 62ch; }

  .ptable { border: 1px solid var(--border-edge); border-radius: 12px; overflow: hidden; }
  .prow { display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr; padding: 11px 18px; align-items: center; }
  .prow + .prow { border-top: 1px solid var(--border-hairline); }
  .prow > :not(:first-child), .pmeta > * { text-align: right; }
  .prow.head { padding-block: 9px; }
  .pmeta { display: contents; }
  .pname { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .pname small { font-size: 11px; color: var(--text-label); }
  .pcell .k { display: none; }

  .kr { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .kr > div { background: var(--surface-panel); border: 1px solid var(--border-soft); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .kr > div.me { border-color: var(--accent-a); background: var(--tint-sel); }
  .kr .v { font-family: var(--font-display); font-size: 20px; font-weight: 700; }
  .kr .who { font-size: 12px; color: var(--text-secondary); overflow-wrap: anywhere; }
  .fp-aside { font-size: 13px; color: var(--text-secondary); border-left: 2px solid var(--border-soft); padding-left: 12px; margin: 0; max-width: 64ch; }

  .rank { display: flex; flex-direction: column; }
  .rrow { display: grid; grid-template-columns: 28px 1fr 84px 60px; gap: 10px; padding: 10px 12px; align-items: center; border-radius: 8px; text-decoration: none; color: inherit; }
  a.rrow:not(.me):hover { background: var(--tint-row); }
  .rrow.head { padding-block: 4px; }
  .rrow .r { color: var(--text-label); font-family: var(--font-display); font-weight: 600; font-size: 12px; }
  .rrow .n { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rrow > :nth-child(3), .rrow > :nth-child(4) { text-align: right; }
  .rrow.me { background: var(--tint-sel); box-shadow: inset 0 0 0 1px var(--accent-a); }
  .rrow.me .n { font-weight: 500; }
  .rrow.gap { padding-block: 0; color: var(--text-label); }
  .rank-foot { padding: 8px 12px 0; font-size: 13px; margin: 0; }

  .fp-cta { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .fp-cta p { margin: 0; font-size: 13px; color: var(--text-label); max-width: 44ch; }
${ACCENT_BUTTON_CSS}
  .btn:focus-visible { outline: 2px solid var(--accent-light); outline-offset: 2px; }
  .fp-foot { border-top: 1px solid var(--border-hairline); padding-top: 16px; font-size: 12px; color: var(--text-label); margin: 0; }
  .fp-foot a { color: var(--text-secondary); }

  @media (max-width: 767px) {
    .wrap.fp { gap: 30px; padding-top: 18px; }
    .fp h1 { font-size: 26px; }
    .stats { grid-template-columns: 1fr 1fr; }
    .stat:first-child { grid-column: 1 / -1; border-bottom: 1px solid var(--border-hairline); }
    .stat + .stat { border-left: 0; }
    .stat:last-child { border-left: 1px solid var(--border-hairline); }
    .stat-val { font-size: 21px; }
    .chart-card { padding: 14px 12px 10px; }
    .prow.head { display: none; }
    .prow { grid-template-columns: 1fr auto; row-gap: 2px; padding: 11px 14px; }
    .prow .pret { font-family: var(--font-display); font-weight: 700; font-size: 16px; }
    .pmeta { display: flex; flex-wrap: wrap; column-gap: 6px; grid-column: 1 / -1; font-size: 12px; color: var(--text-label); }
    .pmeta > * { text-align: left; }
    .pcell .k { display: inline; }
    .pcell + .pcell::before { content: "· "; }
    .kr { grid-template-columns: 1fr; }
    .kr > div { flex-direction: row; justify-content: space-between; align-items: baseline; gap: 10px; }
    .kr .v { font-size: 17px; order: 2; white-space: nowrap; }
    .rrow { grid-template-columns: 22px 1fr auto 46px; gap: 8px; padding: 10px 8px; }
  }
`;

const signClass = v => (v > 0 ? "pos" : v < 0 ? "neg" : "");
const fundLink = (f, cls = "inline-link") => `<a href="/fond/${f.slug}" class="${cls}">${escapeHtml(f.name)}</a>`;
const fmtKrRounded = v => fmtKr(Math.round(v / 100) * 100);

// Kronrutorna: denna fond, bäst och sämst i fönstret. Är fonden själv bäst eller
// sämst visas näst bäst/näst sämst i stället, så att ingen ruta upprepas.
function krBoxes(fund, sorted, key) {
  const box = (f, who, me = false) => {
    const ret = f[key].return;
    return `<div${me ? ' class="me"' : ""}><span class="who">${who}</span><span class="v num${me ? "" : ` ${signClass(ret)}`.trimEnd()}">${fmtKrRounded(100000 * (1 + ret / 100))}</span></div>`;
  };
  const n = sorted.length;
  const idx = sorted.findIndex(f => f.id === fund.id);
  const name = escapeHtml(fund.name);
  // På 1 år (fonder utan tre års historik) är fonden inte rankad, så "i kategorin" vore fel.
  const where = key === "threeYear" ? "i kategorin" : "senaste året";
  if (n < 2) return box(fund, name, true);
  if (n === 2) return box(fund, name, true) + box(sorted[1 - idx], escapeHtml(sorted[1 - idx].name));
  if (idx === 0) return box(fund, `${name} · bäst ${where}`, true) + box(sorted[1], `Näst bäst: ${escapeHtml(sorted[1].name)}`) + box(sorted[n - 1], `Sämst: ${escapeHtml(sorted[n - 1].name)}`);
  if (idx === n - 1) return box(fund, `${name} · sämst ${where}`, true) + box(sorted[0], `Bäst: ${escapeHtml(sorted[0].name)}`) + box(sorted[n - 2], `Näst sämst: ${escapeHtml(sorted[n - 2].name)}`);
  return box(fund, name, true) + box(sorted[0], `Bäst: ${escapeHtml(sorted[0].name)}`) + box(sorted[n - 1], `Sämst: ${escapeHtml(sorted[n - 1].name)}`);
}

// "Finns det något bättre?" — stycket. Meningsmallarna täcker bäst, sämst, tvåa och
// kategorier med bara två fonder, så att "0 fonder" eller "1 globalfonder" aldrig uppstår.
function betterLede(fund, categoryFunds) {
  const meta = fund.categoryMeta;
  const plural = categoryPlural(meta);
  const ranked = categoryFunds.__ranked;
  const total = ranked.length;
  const why = "Skillnaden kommer från fondernas inriktning lika mycket som från avgiften, så titta på vad fonden äger innan du byter.";
  const about = f => `${fundLink(f)}, ${fmtSignedPct(f.threeYear.return)} med ${fmtFeePct(f.fee)} i avgift`;

  if (!fund.threeYear) {
    return `${escapeHtml(fund.name)} har historik sedan ${fmtDateSv(fund.dataFrom)}, för kort tid för att jämföras på tre år med de ${total} ${plural} som har så lång historik. Det senaste året gav fonden ${fmtSignedPct(fund.oneYear.return)}.`;
  }
  const rank = fund.rank3y;
  const best = ranked[0];
  if (total === 1) return `${escapeHtml(fund.name)} är ensam bland ${plural} med tre års historik på sajten, så det finns ingen att jämföra med än.`;
  if (rank === 1) {
    return `Ingen annan ${meta.singular} har gett mer de senaste tre åren. Närmast kom ${about(ranked[1])}. Tre år är en kort period, och ett försprång som det här säger mer om vad fonden äger än om hur det går framåt.`;
  }
  if (rank === total) {
    return total === 2
      ? `Den andra ${meta.singular}en i kategorin har gett mer de senaste tre åren: ${about(best)}. ${why}`
      : `Alla andra ${total - 1} ${plural} har gett mer de senaste tre åren. Mest gav ${about(best)}. ${why}`;
  }
  if (rank === 2) return `En ${meta.singular} har gett mer de senaste tre åren: ${about(best)}. ${why}`;
  return `${rank - 1} ${plural} har gett mer de senaste tre åren. Mest gav ${about(best)}. ${why}`;
}

function feeAside(fund, feeAvg) {
  const diff = feeAvg - fund.fee; // > 0 = billigare än snittet
  const lead = "Avgiften är det enda som är känt i förväg.";
  if (Math.abs(diff) < 0.005) return `${lead} ${fmtFeePct(fund.fee)} ligger i nivå med kategorisnittet.`;
  return `${lead} ${fmtFeePct(fund.fee)} mot kategorisnittet ${fmtFeePct(feeAvg)} är ${fmtPpFee(diff)} procentenheter ${diff > 0 ? "mindre" : "mer"} per år, oavsett hur marknaden går.`;
}

// Topp 3, sedan fonden med grannen över och under. Raderna slås ihop utan dubbletter,
// och "…" sätts bara där placeringarna faktiskt hoppar.
function rankingRows(fund, categoryFunds) {
  const ranked = categoryFunds.__ranked;
  const row = (f, r) => {
    const cells = `<span class="r">${r ?? "–"}</span><span class="n">${escapeHtml(f.name)}</span><span class="num ${f.threeYear ? signClass(f.threeYear.return) : ""}">${f.threeYear ? fmtSignedPct(f.threeYear.return) : "–"}</span><span class="num">${fmtFeePct(f.fee)}</span>`;
    return f.id === fund.id
      ? `<div class="rrow me" aria-current="page">${cells}</div>`
      : `<a class="rrow" href="/fond/${f.slug}">${cells}</a>`;
  };
  const gap = '<div class="rrow gap" aria-hidden="true"><span></span><span>…</span><span></span><span></span></div>';

  const indices = new Set([0, 1, 2].filter(i => i < ranked.length));
  if (fund.rank3y) [fund.rank3y - 2, fund.rank3y - 1, fund.rank3y].forEach(i => { if (i >= 0 && i < ranked.length) indices.add(i); });
  const sorted = [...indices].sort((a, b) => a - b);

  let html = "";
  sorted.forEach((i, k) => {
    if (k > 0 && i !== sorted[k - 1] + 1) html += gap;
    html += row(ranked[i], i + 1);
  });
  if (!fund.rank3y) html += gap + row(fund, null);
  return html;
}

function renderFundPage(fund, categoryFunds, fiMeta, asOf) {
  const meta = fund.categoryMeta;
  const plural = categoryPlural(meta);
  const total = categoryFunds.__ranked.length;
  const name = escapeHtml(fund.name);
  const feeAvg = categoryFunds.feeAvgCache;

  // ── 2. Nyckeltal ──
  const headline = fund.threeYear
    ? { label: "Avkastning 3 år", val: fund.threeYear.return, sub: `${fmtSignedPct(fund.oneYear.return)} senaste året` }
    : { label: "Avkastning 1 år", val: fund.oneYear.return, sub: `Historik sedan ${fmtDateSv(fund.dataFrom)}` };
  const feeBadge = fund.feeSource === "fi"
    ? `<span class="badge fi" title="Finansinspektionen ${fiMeta.period}">FI</span>`
    : '<span class="badge man" title="Från fondbolaget, saknas i Finansinspektionens register">Manuell</span>';

  // ── 3. Graf ──
  const chart1 = renderCategoryChart(fund, categoryFunds, "1y", asOf);
  const chart3 = renderCategoryChart(fund, categoryFunds, "3y", asOf);
  const tabs = chart1 && chart3
    ? `<div class="tabs"><label for="sc-1y">1 år</label><label for="sc-3y">3 år</label></div>`
    : `<div class="tabs"><span>${chart3 ? "3 år" : "1 år"}</span></div>`;
  const radios = chart1 && chart3
    ? `<input type="radio" class="sc-radio" name="sc-span" id="sc-1y"><input type="radio" class="sc-radio" name="sc-span" id="sc-3y" checked>`
    : "";
  const chartCard = chart1 || chart3 ? `
  <section class="chart-card" aria-labelledby="chart-h">
    ${radios}
    <div class="chart-top">
      <h2 id="chart-h">Bland ${categoryFunds.length} ${plural}</h2>
      ${tabs}
    </div>
    <div class="legend"><span><i style="background:#7891ff"></i>${name}</span><span><i style="background:rgba(203,213,230,0.35)"></i>Övriga ${plural}</span></div>
    ${chart1}${chart3}
    <p class="chart-foot">Utveckling t.o.m. ${fmtDateSv(asOf)}</p>
  </section>` : "";

  // ── 4. Avkastning per period ──
  const periodRow = (label, w) => w
    ? `<div class="prow" role="row"><span class="pname" role="rowheader">${label}</span><span class="pret num ${signClass(w.return)}" role="cell">${fmtSignedPct(w.return)}</span><span class="pmeta"><span class="pcell num" role="cell"><span class="k">Per år </span>${fmtPlainPct(w.cagr)}</span><span class="pcell num" role="cell"><span class="k">Största nedgång </span>${fmtPlainPct(w.maxDrawdown)}</span></span></div>`
    : `<div class="prow" role="row"><span class="pname" role="rowheader">${label}</span><span class="pret num" role="cell">–</span><span class="pmeta"><span class="pcell num" role="cell"><span class="k">Per år </span>–</span><span class="pcell num" role="cell"><span class="k">Största nedgång </span>–</span></span></div>`;
  const periodRows = [
    periodRow("1 år", fund.oneYear),
    periodRow("3 år", fund.threeYear),
    fund.sinceStart ? periodRow(`Sedan ${fmtDateSv(fund.dataFrom)} <small>hela historiken</small>`, fund.sinceStart) : "",
  ].join("");

  // ── 5. Finns det något bättre? ──
  const krKey = fund.threeYear ? "threeYear" : "oneYear";
  const krSorted = categoryFunds.filter(f => f[krKey]).sort((a, b) => b[krKey].return - a[krKey].return);
  const krLabel = fund.threeYear ? "100 000 kr för tre år sedan" : "100 000 kr för ett år sedan";

  const appLink = `${APP_PATH}?a=${fund.id}:100&amp;mode=fund`;
  const feeSourceText = fund.feeSource === "fi"
    ? `Finansinspektionens öppna register (${fiMeta.period})`
    : "fondbolagets publika information";

  const body = `
  <div class="fp-head">
    <p class="crumbs"><a href="/fonder/">Fonder</a> › <a href="/fonder/${meta.slug}">${escapeHtml(meta.label)}</a> › <span>${name}</span></p>
    <div class="fp-title">
      <h1>${name}</h1>
      <p class="fp-meta"><code>${escapeHtml(fund.isin)}</code><span aria-hidden="true">·</span><span>${escapeHtml(fund.category)}</span></p>
    </div>
    <div class="stats">
      <div class="stat"><span class="label">${headline.label}</span><span class="stat-val num ${signClass(headline.val)}">${fmtSignedPct(headline.val)}</span><span class="stat-sub">${headline.sub}</span></div>
      <div class="stat"><span class="label">Avgift</span><span class="stat-val num">${fmtFeePct(fund.fee)} ${feeBadge}</span><span class="stat-sub">Snitt i kategorin ${fmtFeePct(feeAvg)}</span></div>
      <div class="stat"><span class="label">Plats i kategorin</span><span class="stat-val num">${fund.rank3y ? `${fund.rank3y} av ${total}` : "–"}</span><span class="stat-sub">${fund.rank3y ? "Avkastning 3 år" : "Kräver tre års historik"}</span></div>
    </div>
  </div>
  ${chartCard}

  <section class="fp-sec">
    <h2>Avkastning per period</h2>
    <div class="ptable" role="table" aria-label="Avkastning per period">
      <div class="prow head" role="row"><span class="label" role="columnheader">Period</span><span class="label" role="columnheader">Avkastning</span><span class="pmeta"><span class="label" role="columnheader">Per år</span><span class="label" role="columnheader">Största nedgång</span></span></div>
      ${periodRows}
    </div>
  </section>

  <section class="fp-sec">
    <h2>Finns det något bättre?</h2>
    <p class="fp-lede">${betterLede(fund, categoryFunds)}</p>
    <div>
      <div class="label" style="margin-bottom:8px">${krLabel}</div>
      <div class="kr">${krBoxes(fund, krSorted, krKey)}</div>
    </div>
    <p class="fp-aside">${feeAside(fund, feeAvg)}</p>
  </section>

  <section class="fp-sec">
    <h2>${escapeHtml(meta.label)} efter avkastning</h2>
    <div class="rank">
      <div class="rrow head"><span class="label">#</span><span class="label">Fond</span><span class="label">3 år</span><span class="label">Avgift</span></div>
      ${rankingRows(fund, categoryFunds)}
      <p class="rank-foot"><a href="/fonder/${meta.slug}" class="inline-link">Se alla ${categoryFunds.length} ${plural}</a></p>
    </div>
  </section>

  <section class="fp-cta">
    <a class="btn btn-accent" href="${appLink}">Jämför med en annan fond →</a>
    <p>Lägg ${name} bredvid valfri fond i samma graf, eller bygg en portfölj.</p>
  </section>

  <p class="fp-foot">All avkastning är efter avgift. Prisdata från Yahoo Finance, avgift från ${feeSourceText}. Historisk avkastning är ingen garanti för framtida avkastning. <a href="/om">Om datakällorna</a></p>`;

  const canonical = `${BASE_URL}/fond/${fund.slug}`;
  const title = `${fund.name} – avgift ${fmtFeePct(fund.fee)} och historisk avkastning | MinPortfölj`;
  const description = fund.threeYear
    ? `${fund.name} kostar ${fmtFeePct(fund.fee)} i årlig avgift. Se historisk avkastning 1 och 3 år och jämför mot ${categoryFunds.length - 1} andra ${plural}.`
    : `${fund.name} kostar ${fmtFeePct(fund.fee)} i årlig avgift. Se historisk avkastning sedan ${fund.dataFrom} och jämför mot andra ${plural}.`;

  const financialProduct = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    "name": fund.name,
    "category": fund.category,
    "url": canonical,
    "description": description,
    "additionalProperty": [
      { "@type": "PropertyValue", "name": "ISIN", "value": fund.isin },
      { "@type": "PropertyValue", "name": "Årlig avgift", "value": fmtFeePct(fund.fee) },
      { "@type": "PropertyValue", "name": "Avkastning 1 år", "value": fmtSignedPct(fund.oneYear.return) },
      ...(fund.threeYear ? [{ "@type": "PropertyValue", "name": "Avkastning 3 år", "value": fmtSignedPct(fund.threeYear.return) }] : []),
    ],
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Fonder", "item": `${BASE_URL}/fonder/` },
      { "@type": "ListItem", "position": 2, "name": meta.label, "item": `${BASE_URL}/fonder/${meta.slug}` },
      { "@type": "ListItem", "position": 3, "name": fund.name, "item": canonical },
    ],
  };

  return {
    html: pageShell({
      title, description, canonical,
      jsonLd: [financialProduct, breadcrumbs],
      bodyHtml: body,
      css: PAGE_CSS + CHART_CSS + FUND_PAGE_CSS,
      wrapClass: "wrap fp",
    }),
    title, description, canonical,
  };
}

// ─── /om — minimal markdown → HTML för project-docs/OM_SIDAN.md ───────────────
// Bara det OM_SIDAN.md faktiskt använder: #, ##, **fet stil**, stycken. Ingen
// markdown-lib — innehållet är litet och fast, ett eget beroende hade varit
// overkill för fyra konstruktioner.

function mdInline(text) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function parseMarkdown(md) {
  return md.trim().split(/\n\s*\n/).map(block => {
    const line = block.trim();
    if (line.startsWith("## ")) return { type: "h2", text: line.slice(3).trim() };
    if (line.startsWith("# ")) return { type: "h1", text: line.slice(2).trim() };
    return { type: "p", text: line.replace(/\s*\n\s*/g, " ") };
  });
}

function renderOmPage(markdownPath) {
  const blocks = parseMarkdown(readFileSync(markdownPath, "utf8"));
  let h1 = null;
  let bodyHtml = "";
  let proseOpen = false;
  for (const b of blocks) {
    if (b.type === "h1" && h1 === null) { h1 = b.text; continue; }
    if (b.type === "h2") {
      if (proseOpen) { bodyHtml += "</div>\n"; proseOpen = false; }
      bodyHtml += `<h2>${mdInline(b.text)}</h2>\n`;
    } else {
      if (!proseOpen) { bodyHtml += '<div class="prose">\n'; proseOpen = true; }
      bodyHtml += `<p>${mdInline(b.text)}</p>\n`;
    }
  }
  if (proseOpen) bodyHtml += "</div>\n";

  const canonical = `${BASE_URL}/om`;
  const title = `${h1} – källor och begränsningar | MinPortfölj`;
  const description = "Så fungerar minportfölj.se: varifrån prisdata och avgifter kommer, och vilka begränsningar det innebär.";
  const body = `
  <p class="crumbs"><a href="/">MinPortfölj</a> › <span>Om</span></p>
  <h1>${mdInline(h1)}</h1>
  ${bodyHtml}`;

  return { html: pageShell({ title, description, canonical, jsonLd: [], bodyHtml: body, active: null }), title, description, canonical };
}

// ─── /fonder/ — fondlistan, project-docs/FONDLISTA.md ──────────────────────────
// Visuell referens: project-docs/mockups/fondlista.html. Statisk HTML: raderna
// renderas här i standardordningen (läsbara utan JS och för sökmotorer), och ett
// litet inline-skript tar över sök, kategorier, sortering och jämförelsefältet.
// Skriptet återanvänder generatorns egna funktioner via .toString() — samma
// formattering, sortering och viktning på servern och i webbläsaren.

// Filterknappen: innehållet byggs i ett senare steg, så knappen renderas inte i
// produktion än. FONDLISTA_FILTER=1 npm run build visar den lokalt.
const SHOW_FUND_FILTER = process.env.FONDLISTA_FILTER === "1";

// Tak för jämförelsefältet = det Fondläget i verktyget visar läsbart. Fondläget
// har inget hårt tak, men FUND_COLORS (src/lib/utils.js) har bara fem färger som
// skiljer sig tydligt från varandra och från semantiska färger; från sjätte
// linjen (grå ≈ label, mint ≈ positiv, blush ≈ rosa) går linjerna i varandra.
const MAX_COMPARE = 5;

// Sortering — delas av servern (startordning) och skriptet. dir -1 = fallande.
// Saknat värde hamnar alltid sist oavsett riktning; lika värden sorteras A–Ö.
function compareFundRows(a, b, key, dir) {
  if (key === "n") return dir * a.n.localeCompare(b.n, "sv");
  const av = a[key], bv = b[key];
  if (av === null && bv === null) return a.n.localeCompare(b.n, "sv");
  if (av === null) return 1;
  if (bv === null) return -1;
  return dir * (av - bv) || a.n.localeCompare(b.n, "sv");
}

// En rad i listan — delas av servern och skriptet. Beror bara på escapeHtml,
// fmtSignedPct och fmtFeePct, som skickas med till skriptet.
function fundListRow(f, selected, full) {
  const plus = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M7 2.5v9M2.5 7h9"/></svg>';
  const check = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 7.2 2.6 2.6L11 4.4"/></svg>';
  const tone = v => v === null ? "na" : v >= 0 ? "pos" : "neg";
  const name = escapeHtml(f.n);
  const url = "/fond/" + f.s;
  const badge = long => `<span class="badge ${f.src}">${f.src === "fi" ? "FI" : long ? "Manuell" : "Man."}</span>`;
  const label = selected ? `Ta bort ${name} från jämförelsen` : `Lägg till ${name} i jämförelsen`;
  const blocked = full && !selected;
  return `<div class="lr${selected ? " sel" : ""}" role="row">
      <span class="fname" role="cell"><a class="rowlink" href="${url}"><b>${name}</b></a><small><span class="isin">${f.i}</span> · ${escapeHtml(f.c)}</small><small class="mcol">Avgift ${fmtFeePct(f.fee)} ${badge(true)}</small></span>
      <span class="num" role="cell"><small class="mcol">1 år</small><span class="val ${tone(f.r1)}">${fmtSignedPct(f.r1)}</span></span>
      <span class="num" role="cell"><small class="mcol">3 år</small><span class="val ${tone(f.r3)}">${fmtSignedPct(f.r3)}</span></span>
      <span class="num col-fee" role="cell"><span class="fee">${fmtFeePct(f.fee)} ${badge(false)}</span></span>
      <span class="addcell" role="cell"><button type="button" class="add" data-add="${f.id}" aria-pressed="${selected}" aria-label="${label}"${blocked ? ' aria-disabled="true" title="Jämförelsen är full"' : ""}>${selected ? check : plus}</button></span>
    </div>`;
}

const FUND_LIST_CSS = `
  :root {
    --bg-base: #0a0f1c; --bg-elevated: #141a2b;
    --surface-row: rgba(255,255,255,0.03); --surface-hover: rgba(255,255,255,0.06); --surface-tab: rgba(255,255,255,0.07); --surface-active: rgba(255,255,255,0.13);
    --surface-input: #080d19;
    --border-edge: rgba(255,255,255,0.34); --border-inner: rgba(255,255,255,0.26); --border-soft: rgba(255,255,255,0.20); --border-hairline: rgba(255,255,255,0.12);
    --text-primary: #f0ede8; --text-secondary: #cbd5e6; --text-label: #a9b6cc;
    ${ACCENT_TOKENS}
    --positive: #56ec8d; --negative: #f87171;
    --fi: #3a9aa8; --fallback: #94a3b8;
    --tint-fi: rgba(58,154,168,0.12); --tint-fallback: rgba(148,163,184,0.12);
    --font-display: 'Syne', 'Trebuchet MS', sans-serif; --font-body: 'DM Sans', 'Helvetica Neue', Arial, sans-serif;
    --ease-out: cubic-bezier(.2,.7,.2,1);
    color-scheme: dark;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg-base); color: var(--text-primary); font-family: var(--font-body); font-size: 14px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
  a { color: inherit; }
  button { font: inherit; color: inherit; }
  :focus-visible { outline: 2px solid var(--accent-light); outline-offset: 2px; border-radius: 4px; }

  .fl { max-width: 1120px; margin: 0 auto; padding: 0 40px 112px; }
${ACCENT_BUTTON_CSS}

  .page-head { display: flex; flex-direction: column; gap: 8px; padding-block: 32px 24px; }
  .page-head h1 { font-family: var(--font-display); font-weight: 800; font-size: 36px; line-height: 1.08; letter-spacing: -0.025em; margin: 0; }
  .stamp { margin: 0; font-size: 13px; color: var(--text-label); font-variant-numeric: tabular-nums; }
  .stamp b { color: var(--text-secondary); font-weight: 500; }

  .controls { display: flex; flex-direction: column; gap: 12px; padding-bottom: 16px; }
  .row-1 { display: flex; gap: 12px; align-items: center; }
  .search { position: relative; flex: 1 1 320px; min-width: 0; }
  .search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: var(--text-label); pointer-events: none; }
  .search input { width: 100%; font-family: var(--font-display); font-size: 13px; color: var(--text-primary); background: var(--surface-input); border: 1px solid var(--border-inner); border-radius: 9px; padding: 10px 12px 10px 36px; outline: none; transition: border-color .15s; }
  .search input::placeholder { color: var(--text-label); }
  .search input:focus { border-color: var(--accent-light); }
  .filter-btn { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font-family: var(--font-display); font-size: 13px; font-weight: 600; color: var(--text-secondary); background: var(--surface-row); border: 1px solid var(--border-inner); border-radius: 9px; padding: 10px 16px; transition: background .15s, border-color .15s, color .15s; }
  .filter-btn svg { width: 16px; height: 16px; }
  .filter-btn:hover { color: var(--text-primary); border-color: var(--border-edge); background: var(--surface-tab); }
  .cats { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip { display: inline-flex; align-items: center; gap: 7px; cursor: pointer; font-family: var(--font-display); font-size: 12px; font-weight: 600; color: var(--text-secondary); background: var(--surface-row); border: 1px solid var(--border-soft); border-radius: 20px; padding: 5px 12px; white-space: nowrap; transition: background .15s, border-color .15s, color .15s; }
  .chip span { color: var(--text-label); font-variant-numeric: tabular-nums; }
  .chip:hover { border-color: var(--border-edge); color: var(--text-primary); }
  .chip[aria-pressed="true"] { background: var(--tint-sel); border-color: var(--accent-a); color: var(--text-primary); }
  .chip[aria-pressed="true"]:hover { background: var(--tint-sel-hover); }
  .chip[aria-pressed="true"] span { color: var(--text-secondary); }
  .result { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 13px; color: var(--text-label); font-variant-numeric: tabular-nums; min-height: 28px; }
  .result b { color: var(--text-primary); font-weight: 500; }
  .linkbtn { border: 0; background: none; padding: 0; cursor: pointer; font-family: var(--font-display); font-size: 12px; font-weight: 600; color: var(--accent-light); }
  .linkbtn:hover { text-decoration: underline; }
  .seg { display: none; align-items: center; gap: 2px; background: var(--surface-tab); border-radius: 8px; padding: 3px; }
  .seg-label { font-family: var(--font-display); font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-label); padding: 0 8px 0 6px; }
  .seg button { border: 0; background: transparent; cursor: pointer; font-family: var(--font-display); font-size: 12px; font-weight: 600; color: var(--text-label); padding: 5px 10px; border-radius: 6px; white-space: nowrap; transition: background .15s, color .15s; }
  .seg button:hover { color: var(--text-primary); }
  .seg button[aria-pressed="true"] { background: var(--surface-active); color: var(--text-primary); }

  .list { border: 1px solid var(--border-soft); border-radius: 14px; overflow: clip; }
  .lh, .lr { display: grid; grid-template-columns: minmax(0,1fr) 96px 96px 104px 40px; align-items: center; column-gap: 8px; padding-inline: 16px; }
  .lh { position: sticky; top: 0; z-index: 2; background: #0f1424; border-bottom: 1px solid var(--border-soft); padding-block: 10px; }
  .lh button { border: 0; background: none; padding: 0; cursor: pointer; font-family: var(--font-display); font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-label); display: inline-flex; align-items: center; gap: 4px; }
  .lh button:hover, .lh [aria-sort="ascending"] button, .lh [aria-sort="descending"] button { color: var(--text-primary); }
  .lh .dir { width: 10px; display: inline-block; text-align: center; opacity: 0; }
  .lh [aria-sort="ascending"] .dir, .lh [aria-sort="descending"] .dir { opacity: 1; }
  .lh .num, .lr .num { justify-self: end; text-align: right; }
  .lr { position: relative; padding-block: 11px; border-bottom: 1px solid var(--border-hairline); transition: background .12s; }
  .lr:last-child { border-bottom: 0; }
  .lr:hover { background: var(--surface-hover); }
  .lr.sel { background: var(--tint-row); }
  .fname { display: flex; flex-direction: column; min-width: 0; }
  .fname b { font-family: var(--font-display); font-size: 14px; font-weight: 600; line-height: 1.35; display: block; }
  .fname small { font-size: 12px; color: var(--text-label); }
  .fname small.mcol { white-space: nowrap; }
  .isin { font-variant-numeric: tabular-nums; letter-spacing: 0.01em; }
  .rowlink { text-decoration: none; }
  .rowlink::after { content: ""; position: absolute; inset: 0; }
  .rowlink:focus-visible { outline: none; }
  .rowlink:focus-visible::after { outline: 2px solid var(--accent-light); outline-offset: -2px; }
  .val { font-family: var(--font-display); font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .val.pos { color: var(--positive); } .val.neg { color: var(--negative); } .val.na { color: var(--text-label); font-weight: 600; }
  .fee { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-display); font-size: 13px; font-weight: 600; color: var(--text-secondary); font-variant-numeric: tabular-nums; }
  .badge { font-family: var(--font-display); font-size: 9px; font-weight: 600; text-transform: uppercase; border-radius: 4px; padding: 1px 5px; }
  .badge.fi { color: var(--fi); background: var(--tint-fi); }
  .badge.man { color: var(--fallback); background: var(--tint-fallback); }
  .addcell { justify-self: end; position: relative; z-index: 1; }
  .add { width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--border-soft); background: transparent; color: var(--text-secondary); cursor: pointer; display: grid; place-items: center; transition: background .15s, border-color .15s, color .15s; }
  .add svg { width: 14px; height: 14px; }
  .add:hover { border-color: var(--border-edge); color: var(--text-primary); background: var(--surface-tab); }
  .add[aria-pressed="true"] { background: transparent; border-color: var(--accent-a); color: var(--text-primary); }
  .add[aria-pressed="true"]:hover { background: var(--tint-sel); }
  .add[aria-disabled="true"] { opacity: 0.4; cursor: not-allowed; }
  .add[aria-disabled="true"]:hover { border-color: var(--border-soft); color: var(--text-secondary); background: transparent; }
  .mcol { display: none; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .empty { padding: 48px 16px; text-align: center; display: flex; flex-direction: column; gap: 8px; align-items: center; color: var(--text-secondary); }
  .empty b { font-family: var(--font-display); font-size: 15px; color: var(--text-primary); }

  .tray { position: fixed; left: 50%; bottom: calc(16px + env(safe-area-inset-bottom, 0px)); z-index: 5; width: min(760px, calc(100% - 32px)); display: flex; align-items: center; gap: 12px; padding: 10px 10px 10px 16px; border-radius: 12px;
    background: rgba(20,26,43,0.92); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid var(--border-edge); box-shadow: 0 12px 32px rgba(0,0,0,0.5);
    transform: translate(-50%, 0); opacity: 1; transition: transform .35s var(--ease-out), opacity .35s var(--ease-out), visibility .35s; }
  .tray[hidden] { display: flex !important; transform: translate(-50%, 24px); opacity: 0; visibility: hidden; pointer-events: none; }
  .tray-list { flex: 1; min-width: 0; display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
  .tray-item { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-display); font-size: 12px; font-weight: 600; background: var(--surface-tab); border-radius: 6px; padding: 4px 6px 4px 10px; white-space: nowrap; }
  .tray-item button { border: 0; background: none; cursor: pointer; color: var(--text-label); padding: 0 2px; line-height: 1; font-size: 14px; }
  .tray-item button:hover { color: var(--text-primary); }
  .tray-count { font-family: var(--font-display); font-size: 12px; font-weight: 600; color: var(--text-label); white-space: nowrap; font-variant-numeric: tabular-nums; }

  .disclaimer { font-size: 12px; color: var(--text-label); border-top: 1px solid var(--border-hairline); padding-top: 14px; margin: 32px 0 0; max-width: 66ch; }
  .disclaimer a { color: var(--text-secondary); }

  @media (max-width: 767px) {
    .fl { padding-inline: 16px; padding-bottom: 96px; }
    .page-head { padding-block: 16px; }
    .page-head h1 { font-size: 28px; }
    .filter-btn { padding-inline: 12px; }
    .cats { flex-wrap: nowrap; overflow-x: auto; margin-inline: -16px; padding-inline: 16px; scrollbar-width: none; }
    .cats::-webkit-scrollbar { display: none; }
    .seg { display: inline-flex; }
    .result { flex-wrap: wrap; }
    .list { border-inline: 0; border-radius: 0; margin-inline: -16px; }
    .lh { display: none; }
    .lr { grid-template-columns: minmax(0,1fr) 60px 72px 34px; column-gap: 6px; padding-block: 12px; }
    .lr .num.col-fee { display: none; }
    .mcol { display: inline; }
    .fname small.mcol { display: block; }
    .fname b { font-size: 13px; }
    .val { font-size: 13px; }
    .lr .num { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.3; }
    .lr .num small { font-family: var(--font-display); font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-label); }
    .tray { bottom: calc(12px + env(safe-area-inset-bottom, 0px)); padding: 8px 8px 8px 12px; }
    .tray-list { display: none; }
    .tray-count { flex: 1; color: var(--text-secondary); }
  }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`;

function renderFundsIndexPage(funds, fiMeta, asOf) {
  const total = funds.length;
  const data = funds.map(f => ({
    id: f.id, n: f.name, s: f.slug, i: f.isin, c: f.category,
    fee: f.fee, src: f.feeSource === "fi" ? "fi" : "man",
    r1: f.oneYear ? f.oneYear.return : null,
    r3: f.threeYear ? f.threeYear.return : null,
  }));
  const initialRows = [...data].sort((a, b) => compareFundRows(a, b, "r3", -1));

  const counts = new Map();
  for (const f of funds) counts.set(f.category, (counts.get(f.category) ?? 0) + 1);
  const chips = Object.entries(CATEGORY_META)
    .filter(([category]) => counts.has(category))
    .map(([category, meta]) => `<button type="button" class="chip" data-cat="${escapeHtml(category)}" aria-pressed="false">${escapeHtml(meta.chip ?? meta.label)} <span>${counts.get(category)}</span></button>`)
    .join("");

  const filterButton = SHOW_FUND_FILTER
    ? `<button type="button" class="filter-btn" data-filter aria-haspopup="dialog"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M2.5 4.5h11M4.5 8h7M6.5 11.5h3"/></svg>Filter</button>`
    : "";

  const sortHeader = (key, label, num) => {
    const sorted = key === "r3";
    return `<span${num ? ' class="num"' : ""} role="columnheader"${sorted ? ' aria-sort="descending"' : ""}><button type="button" data-k="${key}">${label} <span class="dir" aria-hidden="true">↓</span></button></span>`;
  };

  // JSON i <script>: "<" escapas så att ett fondnamn aldrig kan stänga taggen.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  const script = `
<script>
(() => {
  const FUNDS = ${json};
  const MAX = ${MAX_COMPARE};
  ${escapeHtml}
  ${fmtSignedPct}
  ${fmtFeePct}
  ${equalWeights}
  ${compareFundRows}
  ${fundListRow}
  const byId = new Map(FUNDS.map(f => [f.id, f]));
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
  const st = { q: "", cats: new Set(), key: "r3", dir: -1, sel: [] };
  const root = document.querySelector(".fl");
  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];

  function render(refocus) {
    const q = norm(st.q.trim());
    const rows = FUNDS
      .filter(f => (!q || norm(f.n).includes(q) || f.i.toLowerCase().includes(q)) && (!st.cats.size || st.cats.has(f.c)))
      .sort((a, b) => compareFundRows(a, b, st.key, st.dir));
    const full = st.sel.length >= MAX;
    $("[data-count]").innerHTML = st.q || st.cats.size
      ? \`Visar <b>\${rows.length}</b> av \${FUNDS.length} fonder · <button type="button" class="linkbtn" data-clear>Rensa filter</button>\`
      : \`Visar alla <b>\${FUNDS.length}</b> fonder\`;
    $("[data-rows]").innerHTML = rows.length
      ? rows.map(f => fundListRow(f, st.sel.includes(f.id), full)).join("")
      : '<div class="empty"><b>Inga fonder matchar</b><span>Prova ett annat sökord eller ta bort ett filter.</span><button type="button" class="linkbtn" data-clear>Rensa filter</button></div>';
    $$("[data-cat]").forEach(c => c.setAttribute("aria-pressed", c.dataset.cat ? st.cats.has(c.dataset.cat) : !st.cats.size));
    $$(".lh [role=columnheader]").forEach(h => {
      const b = h.querySelector("button");
      if (!b) return;
      const on = b.dataset.k === st.key;
      if (on) h.setAttribute("aria-sort", st.dir === 1 ? "ascending" : "descending"); else h.removeAttribute("aria-sort");
      b.querySelector(".dir").textContent = on && st.dir === 1 ? "↑" : "↓";
    });
    $$("[data-msort] button").forEach(b => b.setAttribute("aria-pressed", b.dataset.k === st.key));
    $("[data-tray]").hidden = !st.sel.length;
    $("[data-tray-list]").innerHTML = st.sel.map(id => {
      const name = escapeHtml(byId.get(id).n);
      return \`<span class="tray-item">\${name}<button type="button" data-rm="\${id}" aria-label="Ta bort \${name} från jämförelsen">×</button></span>\`;
    }).join("");
    $("[data-tray-count]").textContent = \`\${st.sel.length} av \${MAX} valda\`;
    const weights = equalWeights(st.sel.length);
    $("[data-compare]").href = "${APP_PATH}?a=" + st.sel.map((id, i) => id + ":" + weights[i]).join(",") + "&mode=fund";
    if (refocus) { const el = $(refocus); if (el) el.focus(); }
  }

  $("[data-q]").addEventListener("input", e => { st.q = e.target.value; render(); });
  root.addEventListener("click", e => {
    const t = e.target.closest("button"); if (!t || !root.contains(t)) return;
    let refocus = null;
    if (t.hasAttribute("data-cat")) {
      const c = t.dataset.cat;
      if (!c) st.cats.clear(); else if (st.cats.has(c)) st.cats.delete(c); else st.cats.add(c);
    } else if (t.dataset.k) {
      if (st.key === t.dataset.k && t.closest(".lh")) st.dir *= -1;
      else { st.key = t.dataset.k; st.dir = st.key === "fee" || st.key === "n" ? 1 : -1; }
    } else if (t.dataset.add) {
      const id = Number(t.dataset.add), i = st.sel.indexOf(id);
      if (i >= 0) st.sel.splice(i, 1); else if (st.sel.length < MAX) st.sel.push(id); else return;
      refocus = \`[data-add="\${id}"]\`;
    } else if (t.dataset.rm) {
      st.sel = st.sel.filter(id => id !== Number(t.dataset.rm));
      refocus = st.sel.length ? "[data-tray-list] button" : "[data-q]";
    } else if (t.hasAttribute("data-clear")) {
      st.q = ""; st.cats.clear(); $("[data-q]").value = ""; refocus = "[data-q]";
    } else return; // t.ex. Filter — innehållet byggs i ett senare steg
    render(refocus);
  });
})();
</script>`;

  const body = `
  <main>
    <header class="page-head">
      <h1>Alla fonder</h1>
      <p class="stamp"><b>${total} fonder</b> · Avkastning per <b>${asOf}</b> · Avgifter från Finansinspektionen, <b>${fiMeta.period}</b></p>
    </header>

    <div class="controls">
      <div class="row-1">
        <label class="search"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.75"/><path d="M10.5 10.5 14 14"/></svg><input type="search" data-q placeholder="Sök fond eller ISIN" aria-label="Sök fond eller ISIN" autocomplete="off"></label>
        ${filterButton}
      </div>
      <div class="cats" role="group" aria-label="Kategorier"><button type="button" class="chip" data-cat="" aria-pressed="true">Alla <span>${total}</span></button>${chips}</div>
      <div class="result">
        <span data-count aria-live="polite">Visar alla <b>${total}</b> fonder</span>
        <div class="seg" role="group" aria-label="Sortera" data-msort>
          <span class="seg-label">Sortera</span>
          <button type="button" data-k="r1" aria-pressed="false">1 år</button>
          <button type="button" data-k="r3" aria-pressed="true">3 år</button>
          <button type="button" data-k="fee" aria-pressed="false">Avgift</button>
        </div>
      </div>
    </div>

    <div class="list" role="table" aria-label="Fonder">
      <div class="lh" role="row">
        ${sortHeader("n", "Fond", false)}
        ${sortHeader("r1", "1 år", true)}
        ${sortHeader("r3", "3 år", true)}
        ${sortHeader("fee", "Avgift", true)}
        <span role="columnheader"><span class="sr">Jämförelse</span></span>
      </div>
      <div data-rows role="rowgroup">${initialRows.map(f => fundListRow(f, false, false)).join("")}</div>
    </div>

    <p class="disclaimer">
      Avkastningen är efter avgift. Historisk avkastning är ingen garanti för framtida avkastning.
      Ingenting på den här sidan utgör finansiell rådgivning. <a href="/om">Om datakällorna</a>
    </p>
  </main>

  <div class="tray" data-tray hidden>
    <div class="tray-list" data-tray-list></div>
    <span class="tray-count" data-tray-count></span>
    <a class="btn btn-accent" data-compare href="${APP_PATH}">Jämför i verktyget →</a>
  </div>
  ${script}`;

  const canonical = `${BASE_URL}/fonder/`;
  const title = "Alla fonder – jämför avgifter och avkastning | MinPortfölj";
  const description = `Bläddra bland alla ${total} fonder i registret. Jämför avkastning efter avgift och årlig avgift, uppdaterat ${asOf}.`;

  return { html: pageShell({ title, description, canonical, jsonLd: [], bodyHtml: body, css: FUND_LIST_CSS, wrapClass: "fl" }), title, description, canonical };
}

// ─── sitemap.xml — genererad ur de faktiskt skrivna sidorna ────────────────────
// Startsidan (dist/index.html, byggd av vite build innan det här skriptet körs)
// ingår med priority 1.0 — den räknas som en genererad sida precis som de
// statiska SEO-sidorna, och ska därför finnas med i sitemapen.

function buildSitemap(entries) {
  const urls = entries.map(e => {
    const priorityTag = e.priority ? `\n    <priority>${e.priority}</priority>` : "";
    return `  <url>\n    <loc>${e.loc}</loc>\n    <lastmod>${e.lastmod}</lastmod>${priorityTag}\n  </url>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

// Räknar alla index.html rekursivt under dist/, inklusive den vite skriver i
// roten — den oberoende sanningen som sitemap.xml verifieras mot.
function countIndexHtmlFiles(dir) {
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) count += countIndexHtmlFiles(full);
    else if (entry.name === "index.html") count++;
  }
  return count;
}

// ─── Verifiering — körs sist, avslutar med felkod om något brister ─────────────

function verifyBuild(pages, funds) {
  console.log("─────────────────────────────────────────────────────");
  console.log("🔎 Verifiering\n");
  let ok = true;

  // 1. Inga dubbletter bland slugs (fondidentitet, SEO.md 6.1) eller sidvägar.
  const fundSlugs = funds.map(f => f.slug);
  const dupFundSlugs = [...new Set(fundSlugs.filter((s, i) => fundSlugs.indexOf(s) !== i))];
  const pagePaths = pages.map(p => p.path);
  const dupPaths = [...new Set(pagePaths.filter((s, i) => pagePaths.indexOf(s) !== i))];
  if (dupFundSlugs.length || dupPaths.length) {
    ok = false;
    if (dupFundSlugs.length) console.log(`  ✗ Dubbletter bland fondslugs: ${dupFundSlugs.join(", ")}`);
    if (dupPaths.length) console.log(`  ✗ Dubbletter bland sidvägar: ${dupPaths.join(", ")}`);
  } else {
    console.log(`  ✓ Inga dubbletter bland slugs (${fundSlugs.length} fonder, ${pagePaths.length} sidor)`);
  }

  // 2. Varje intern länk motsvarar en fil som faktiskt skrevs. "/" (SPA-roten,
  // byggd av vite build) och querysträngar (appens djuplänkar, t.ex.
  // /?a=1:100&mode=fund) och APP_PATH räknas inte som statiska sidor och kontrolleras inte.
  const normalize = p => p.replace(/\/+$/, "") || "/";
  const knownPaths = new Set(pagePaths.map(p => normalize(`/${p}`)));
  const brokenLinks = [];
  for (const page of pages) {
    const hrefs = [...page.html.matchAll(/href="(\/[^"]*)"/g)].map(m => m[1]);
    for (const href of hrefs) {
      if (href.includes("?") || href === "/" || href === APP_PATH) continue;
      const norm = normalize(href);
      if (!knownPaths.has(norm)) brokenLinks.push(`${href} (länkad från /${page.path})`);
    }
  }
  if (brokenLinks.length) {
    ok = false;
    console.log(`  ✗ ${brokenLinks.length} interna länkar utan motsvarande sida:`);
    [...new Set(brokenLinks)].slice(0, 20).forEach(l => console.log(`      ${l}`));
  } else {
    console.log(`  ✓ Alla interna länkar motsvarar en genererad sida`);
  }

  // 3. sitemap.xml — antal URL:er === antal index.html-filer på disk, räknat
  // oberoende av hur sidorna skrevs (fångar t.ex. att vite build's dist/index.html
  // glöms bort, inte bara att skriptets egen bokföring stämmer mot sig själv).
  const sitemapContent = readFileSync(join(DIST, "sitemap.xml"), "utf8");
  const sitemapCount = [...sitemapContent.matchAll(/<loc>/g)].length;
  const diskCount = countIndexHtmlFiles(DIST);
  if (sitemapCount !== diskCount) {
    ok = false;
    console.log(`  ✗ sitemap.xml har ${sitemapCount} URL:er, men ${diskCount} index.html-filer finns i dist/`);
  } else {
    console.log(`  ✓ sitemap.xml har exakt ${sitemapCount} URL:er, matchar ${diskCount} index.html-filer i dist/`);
  }

  // 4. Ingen <title> eller <meta description> identisk på två sidor.
  const titles = pages.map(p => p.title);
  const dupTitles = [...new Set(titles.filter((t, i) => titles.indexOf(t) !== i))];
  const descriptions = pages.map(p => p.description);
  const dupDescriptions = [...new Set(descriptions.filter((d, i) => descriptions.indexOf(d) !== i))];
  if (dupTitles.length || dupDescriptions.length) {
    ok = false;
    if (dupTitles.length) console.log(`  ✗ Identiska <title> på flera sidor: ${dupTitles.join(" | ")}`);
    if (dupDescriptions.length) console.log(`  ✗ Identiska <meta description> på flera sidor: ${dupDescriptions.join(" | ")}`);
  } else {
    console.log(`  ✓ Alla ${titles.length} titlar och beskrivningar är unika`);
  }

  // 5. Grafens veckoserie slutar där fönstrets return säger (SEO.md 6.2). Samma
  // invariant som build-seo-snapshot.mjs kontrollerar innan filen skrivs.
  const seriesViolations = [];
  for (const f of funds) {
    for (const key of ["oneYear", "threeYear"]) {
      const pts = f[key]?.series?.points;
      if (!pts) continue;
      if (pts[0] !== 100 || Math.abs((pts[pts.length - 1] - 100) - f[key].return) > 0.05) {
        seriesViolations.push(`${f.name} ${key}`);
      }
    }
  }
  if (seriesViolations.length) {
    ok = false;
    console.log(`  ✗ ${seriesViolations.length} serier slutar inte på fönstrets avkastning: ${seriesViolations.join(", ")}`);
  } else {
    console.log(`  ✓ Alla veckoserier börjar på 100 och slutar på fönstrets avkastning (±0,05)`);
  }

  console.log(ok ? "\n✅ Verifiering godkänd\n" : "\n❌ Verifiering misslyckades\n");
  console.log("─────────────────────────────────────────────────────\n");
  return ok;
}

// ─── Main ────────────────────────────────────────────────────────────────────────

function main() {
  const fiFees = loadFiFees();
  const snapshot = loadSnapshot();
  const asOf = snapshot._meta.asOf;
  const funds = buildFunds(FUNDS_REGISTRY, fiFees, snapshot);
  const byCategory = groupByCategory(funds);

  // Cacha snittavgift per kategori på listan, så fondsidan kan läsa den utan att räkna om.
  for (const [, list] of byCategory) {
    const sum = list.reduce((s, f) => s + f.fee, 0);
    list.feeAvgCache = sum / list.length;
  }

  console.log(`\n🏗️  Bygger hela sajten — ${byCategory.size} kategorier, ${funds.length} fonder, /fonder/, /om\n`);

  const pages = [];
  function writePage(relPath, result) {
    const outDir = join(DIST, relPath);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "index.html"), result.html);
    pages.push({ path: relPath, canonical: result.canonical, title: result.title, description: result.description, html: result.html });
  }

  for (const category of byCategory.keys()) {
    const categoryFunds = byCategory.get(category);
    const result = renderCategoryPage(category, categoryFunds, fiFees.meta, asOf);
    writePage(`fonder/${CATEGORY_META[category].slug}`, result);
  }
  console.log(`  ✓ ${byCategory.size} kategorisidor`);

  for (const fund of funds) {
    const categoryFunds = byCategory.get(fund.category);
    writePage(`fond/${fund.slug}`, renderFundPage(fund, categoryFunds, fiFees.meta, asOf));
  }
  console.log(`  ✓ ${funds.length} fondsidor`);

  writePage("fonder", renderFundsIndexPage(funds, fiFees.meta, asOf));
  console.log(`  ✓ /fonder/`);

  writePage("om", renderOmPage(join(ROOT, "project-docs/OM_SIDAN.md")));
  console.log(`  ✓ /om`);

  console.log(`\n📄 ${pages.length} sidor skrivna till dist/ (plus startsidan, byggd av vite build)`);

  const sitemapEntries = [
    { loc: `${BASE_URL}/`, lastmod: asOf, priority: "1.0" },
    ...pages.map(p => ({ loc: p.canonical, lastmod: asOf })),
  ];
  const sitemapXml = buildSitemap(sitemapEntries);
  writeFileSync(join(DIST, "sitemap.xml"), sitemapXml);
  console.log(`🗺️  sitemap.xml skriven med ${sitemapEntries.length} URL:er (lastmod ${asOf})\n`);

  const ok = verifyBuild(pages, funds);
  if (!ok) process.exitCode = 1;
}

main();
