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

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { FUNDS_REGISTRY } from "../src/lib/funds-registry.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist");
const BASE_URL = "https://www.minportfolj.se";

// ─── Kategorimetadata — URL-struktur och etiketter, SEO.md avsnitt 4 ───────────
// Fasta strängar, ingen finansiell data — samma typ av konstant som slug-fältet
// i funds-registry.js.

// label = obestämd plural ("Globalfonder"), pluralDefinite = bestämd plural
// ("globalfonderna") — Swedish "dubbel bestämdhet" kräver båda formerna
// beroende på meningskonstruktion (t.ex. "de tolv globalfonderna" men
// "kategorins tolv globalfonder").
const CATEGORY_META = {
  "Globalfond":            { slug: "globalfonder",           label: "Globalfonder",           singular: "globalfond",           pluralDefinite: "globalfonderna" },
  "Sverigefond":           { slug: "sverigefonder",           label: "Sverigefonder",           singular: "sverigefond",          pluralDefinite: "sverigefonderna" },
  "Räntefond":             { slug: "rantefonder",             label: "Räntefonder",             singular: "räntefond",            pluralDefinite: "räntefonderna" },
  "USA-fond":              { slug: "usa-fonder",              label: "USA-fonder",              singular: "USA-fond",             pluralDefinite: "USA-fonderna" },
  "Småbolagsfond":         { slug: "smabolagsfonder",         label: "Småbolagsfonder",         singular: "småbolagsfond",        pluralDefinite: "småbolagsfonderna" },
  "Tillväxtmarknadsfond":  { slug: "tillvaxtmarknadsfonder",  label: "Tillväxtmarknadsfonder",  singular: "tillväxtmarknadsfond", pluralDefinite: "tillväxtmarknadsfonderna" },
  "Temafond":              { slug: "temafonder",              label: "Temafonder",              singular: "temafond",             pluralDefinite: "temafonderna" },
  "Blandfond":             { slug: "blandfonder",             label: "Blandfonder",             singular: "blandfond",            pluralDefinite: "blandfonderna" },
  "Europafond":            { slug: "europafonder",            label: "Europafonder",            singular: "europafond",           pluralDefinite: "europafonderna" },
};

// ─── Formattering — Swedish decimalkomma, tusentalsavskiljare, tecken ──────────

function fmtSignedPct(v) {
  if (v === null || v === undefined) return "–";
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}${Math.abs(v).toFixed(1).replace(".", ",")} %`;
}

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

function pickPeers(fund, categoryFunds) {
  const others = categoryFunds.__ranked.filter(f => f.id !== fund.id).slice(0, 3);
  return [...others, fund].sort((a, b) => (b.threeYear?.return ?? -Infinity) - (a.threeYear?.return ?? -Infinity));
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

const PAGE_CSS = `
  :root {
    --bg-base: #0a0f1c; --bg-elevated: #141a2b;
    --surface-panel: rgba(255,255,255,0.04); --surface-card: rgba(255,255,255,0.055); --surface-stat: rgba(255,255,255,0.09);
    --surface-sunken: #080d19;
    --border-edge: rgba(255,255,255,0.34); --border-inner: rgba(255,255,255,0.26); --border-soft: rgba(255,255,255,0.20); --border-hairline: rgba(255,255,255,0.12);
    --text-primary: #f0ede8; --text-secondary: #cbd5e6; --text-label: #a9b6cc;
    --accent-light: #7891ff; --accent-b: #38bdf8;
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
  tbody tr.softrow td { background: rgba(255,255,255,0.03); }
  .rowtag { font-family: var(--font-display); font-size: 10px; font-weight: 600; letter-spacing: 0.04em; color: var(--text-label); margin-left: 8px; padding: 2px 7px; border-radius: 20px; border: 1px solid var(--border-hairline); vertical-align: 1px; }
  .badge { display: inline-block; font-family: var(--font-display); font-size: 10px; font-weight: 600; letter-spacing: 0.04em; padding: 2px 7px; border-radius: 20px; vertical-align: 1px; }
  .badge.fi { color: var(--fi); background: var(--tint-fi); border: 1px solid rgba(58,154,168,0.45); }
  .badge.man { color: var(--fallback); background: var(--tint-fallback); border: 1px solid rgba(148,163,184,0.42); }
  .facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(132px, 1fr)); gap: 1px; background: var(--border-hairline); border: 1px solid var(--border-inner); border-radius: 10px; overflow: hidden; }
  .fact { background: var(--bg-base); padding: 13px 15px; display: flex; flex-direction: column; gap: 3px; }
  .fact dt { font-family: var(--font-display); font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-label); }
  .fact dd { margin: 0; font-size: 15px; color: var(--text-primary); font-variant-numeric: tabular-nums; }
  .fact dd.mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 13px; }
  .cost { background: var(--bg-elevated); border: 1px solid var(--border-inner); border-radius: 14px; padding: 20px 22px; display: flex; flex-direction: column; gap: 12px; }
  .cost-kicker { font-family: var(--font-display); font-size: 11px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--text-label); margin: 0; }
  .cost-figure { font-family: var(--font-display); font-weight: 800; font-size: 34px; line-height: 1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
  .cost-figure-sub { font-size: 15px; font-weight: 600; color: var(--text-secondary); letter-spacing: 0; margin-left: 4px; }
  .cost-sub { color: var(--text-secondary); font-size: 13px; max-width: 58ch; margin: 0; }
  .cost-foot { color: var(--text-label); font-size: 12.5px; max-width: 60ch; margin: 2px 0 0; border-top: 1px solid var(--border-hairline); padding-top: 12px; }
  .cost-foot b { color: var(--text-secondary); font-weight: 500; }
  .inline-link { color: var(--accent-light); text-decoration: none; border-bottom: 1px solid rgba(120,145,255,0.45); }
  .datawindow { font-size: 12.5px; color: var(--text-label); margin: 0; max-width: 66ch; border-left: 2px solid var(--border-soft); padding-left: 14px; }
  .verdictline { margin: 0; font-size: 13px; color: var(--text-secondary); background: var(--surface-card); border: 1px solid var(--border-soft); border-radius: 9px; padding: 12px 14px; }
  .verdictline b { color: var(--text-primary); font-weight: 500; }
  .verdictline .sep { color: var(--border-edge); margin: 0 6px; }
  .cost-row { display: flex; gap: 26px; flex-wrap: wrap; }
  .cost-row div { display: flex; flex-direction: column; gap: 2px; }
  .cost-row .k { font-family: var(--font-display); font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-label); }
  .cost-row .v { font-size: 15px; font-variant-numeric: tabular-nums; }
  .cta { display: inline-flex; align-items: center; gap: 9px; align-self: flex-start; font-family: var(--font-display); font-size: 13px; font-weight: 600; color: var(--accent-light); text-decoration: none; background: rgba(0,24,245,0.14); border: 1px solid rgba(120,145,255,0.55); border-radius: 6px; padding: 10px 16px; }
  .cta .arrow { color: var(--accent-b); }
  .cta-note { font-size: 12px; color: var(--text-label); margin: 6px 0 0; }
  .cta-note code { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 11px; color: var(--text-secondary); background: var(--surface-sunken); border: 1px solid var(--border-hairline); border-radius: 4px; padding: 1px 5px; }
  .faq { display: flex; flex-direction: column; gap: 14px; }
  .faq-item { border-left: 2px solid var(--border-soft); padding-left: 14px; }
  .faq-item p { margin: 0; color: var(--text-secondary); font-size: 13px; max-width: 62ch; }
  .peers-note { font-size: 12px; color: var(--text-label); margin: -4px 0 12px; }
  .peers { display: flex; flex-direction: column; gap: 8px; }
  .peer { display: grid; grid-template-columns: 1fr auto auto; gap: 16px; align-items: center; background: var(--surface-card); border: 1px solid var(--border-soft); border-radius: 9px; padding: 10px 14px; font-size: 13px; }
  .peer .pname { color: var(--text-primary); }
  .peer .pfee, .peer .pcagr { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .peer .pcagr { color: var(--positive); }
  .peer.self { border-color: rgba(120,145,255,0.6); background: rgba(120,145,255,0.09); }
  .peer.self .pname::after { content: 'denna sida'; font-family: var(--font-display); font-size: 10px; font-weight: 600; letter-spacing: 0.04em; color: var(--accent-light); margin-left: 9px; padding: 2px 7px; border-radius: 20px; background: rgba(120,145,255,0.16); vertical-align: 1px; }
  .disclaimer { font-size: 12px; color: var(--text-label); border-top: 1px solid var(--border-hairline); padding-top: 14px; margin: 0; max-width: 66ch; }
  a:focus-visible, .cta:focus-visible { outline: 2px solid var(--accent-b); outline-offset: 2px; }
  @media (max-width: 640px) {
    .wrap { padding: 24px 16px 40px; }
    h1 { font-size: 22px; }
    .cost-figure { font-size: 28px; }
    .peer { grid-template-columns: 1fr auto; }
  }
`;

function pageShell({ title, description, canonical, jsonLd, bodyHtml }) {
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
<style>${PAGE_CSS}</style>
</head>
<body>
<div class="wrap">
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
    <a class="cta" href="/?${ctaQuery}">Sätt ihop dem till en portfölj och jämför <span class="arrow">→</span></a>
    <p class="cta-note">
      Det tabellen inte kan: blanda flera fonder, sätta egna andelar och ställa två portföljer mot
      varandra. Går till <code>/?${ctaQuery}</code>.
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

// ─── Fondsida ────────────────────────────────────────────────────────────────────

function renderFundPage(fund, categoryFunds, fiMeta, asOf) {
  const meta = fund.categoryMeta;
  const total = categoryFunds.__ranked.length;
  const rank = fund.rank3y;
  const isBest = rank === 1;
  const isWorst = rank === total;
  const best = categoryFunds.__ranked[0];
  const worst = categoryFunds.__ranked[total - 1];

  // ── Intro ──
  let rankFragment;
  if (isBest) rankFragment = `högst i kategorin ${meta.label.toLowerCase()}`;
  else if (isWorst) rankFragment = `lägst av kategorins ${total} ${meta.label.toLowerCase()}`;
  else rankFragment = `plats ${rank} av ${total} i kategorin ${meta.label.toLowerCase()}`;

  const cheapestInCategory = [...categoryFunds].sort((a, b) => a.fee - b.fee)[0];
  const mostExpensiveInCategory = [...categoryFunds].sort((a, b) => b.fee - a.fee)[0];
  let secondSentence = "";
  if (fund.id === cheapestInCategory.id && !isBest) {
    secondSentence = " Den lägsta avgiften i kategorin har alltså inte gett högst avkastning under perioden.";
  } else if (fund.id === mostExpensiveInCategory.id && !isWorst) {
    secondSentence = " Den högsta avgiften i kategorin har alltså inte gett lägst avkastning under perioden.";
  }

  const feeSourceClause = fund.feeSource === "fi" ? "" : " (avgiften är hämtad manuellt, inte från Finansinspektionen)";

  // ── Period-tabell ──
  const periodRows = [
    `<tr><td>1 år</td><td class="num cagr">${fmtSignedPct(fund.oneYear.return)}</td><td class="num">${fmtPlainPct(fund.oneYear.cagr)}</td><td class="num">${fmtPlainPct(fund.oneYear.maxDrawdown)}</td></tr>`,
    fund.threeYear
      ? `<tr><td>3 år</td><td class="num cagr">${fmtSignedPct(fund.threeYear.return)}</td><td class="num">${fmtPlainPct(fund.threeYear.cagr)}</td><td class="num">${fmtPlainPct(fund.threeYear.maxDrawdown)}</td></tr>`
      : `<tr><td>3 år</td><td class="num">–</td><td class="num">–</td><td class="num">–</td></tr>`,
    `<tr class="softrow"><td>Sedan ${fund.dataFrom} <span class="rowtag">hela datan</span></td><td class="num cagr">${fmtSignedPct(fund.sinceStart.return)}</td><td class="num">${fmtPlainPct(fund.sinceStart.cagr)}</td><td class="num">${fmtPlainPct(fund.sinceStart.maxDrawdown)}</td></tr>`,
  ].join("");

  // ── "Finns det något bättre?"-block ──
  const selfKr = 100000 * (1 + fund.threeYear.return / 100);
  const bestKr = 100000 * (1 + best.threeYear.return / 100);
  const worstKr = 100000 * (1 + worst.threeYear.return / 100);

  let figureText, figureColor, costSub;
  if (isBest) {
    figureText = `1 av ${total}`;
    figureColor = "var(--positive)";
    const second = categoryFunds.__ranked[1];
    costSub = second
      ? `Ingen annan fond i kategorin ${meta.label.toLowerCase()} har gett mer efter avgift de senaste tre åren. Näst bäst var <a href="/fond/${second.slug}" class="inline-link">${escapeHtml(second.name)}</a>, ${fmtSignedPct(second.threeYear.return)} till ${fmtFeePct(second.fee)} i avgift.`
      : `Ingen annan fond i kategorin ${meta.label.toLowerCase()} har gett mer efter avgift de senaste tre åren.`;
  } else {
    const betterCount = rank - 1;
    figureText = `${rank} av ${total}`;
    figureColor = isWorst ? "var(--negative)" : "var(--warning)";
    costSub = `${betterCount} ${meta.label.toLowerCase()} har gett mer efter avgift de senaste tre åren. Mest gav
      <a href="/fond/${best.slug}" class="inline-link">${escapeHtml(best.name)}</a>, ${fmtSignedPct(best.threeYear.return)}
      till ${fmtFeePct(best.fee)} i avgift. Skillnaden ligger inte nödvändigtvis i avgiften utan i
      fondens inriktning och index — kontrollera det innan du byter.`;
  }

  const costRowParts = [];
  costRowParts.push(`<div><span class="k">100 000 kr för 3 år sedan är idag</span><span class="v">${fmtKr(selfKr)}</span></div>`);
  if (!isBest) costRowParts.push(`<div><span class="k">I den bästa</span><span class="v" style="color:var(--positive)">${fmtKr(bestKr)}</span></div>`);
  if (!isWorst) costRowParts.push(`<div><span class="k">I den sämsta</span><span class="v" style="color:var(--negative)">${fmtKr(worstKr)}</span></div>`);

  const feeDiff = categoryFunds.feeAvgCache - fund.fee; // > 0 = billigare än snitt
  let feeFootSentence;
  if (Math.abs(feeDiff) < 0.005) {
    feeFootSentence = `Avgiften ligger i linje med kategorins snittavgift på ${fmtFeePct(categoryFunds.feeAvgCache)}.`;
  } else if (feeDiff > 0) {
    feeFootSentence = `Det den låga avgiften ger dig är säkerhet framåt: ${fmtFeePct(fund.fee)} mot kategorisnittets ${fmtFeePct(categoryFunds.feeAvgCache)} är ${fmtPpFee(feeDiff)} procentenheter per år som du behåller oavsett hur marknaden går.`;
  } else {
    feeFootSentence = `Avgiften ligger ${fmtPpFee(feeDiff)} procentenheter över kategorisnittet på ${fmtFeePct(categoryFunds.feeAvgCache)} — en känd kostnad, till skillnad från avkastningen framåt som ingen kan lova.`;
  }

  // ── Peers ──
  const peers = pickPeers(fund, categoryFunds);
  const peersHtml = peers.map(p => `
    <div class="peer${p.id === fund.id ? " self" : ""}">
      <span class="pname">${escapeHtml(p.name)}</span>
      <span class="pcagr">${p.threeYear ? fmtSignedPct(p.threeYear.return) : "–"}</span>
      <span class="pfee">${fmtFeePct(p.fee)}</span>
    </div>`).join("");

  const body = `
  <p class="crumbs"><a href="/fonder/">Fonder</a> › <a href="/fonder/${meta.slug}">${escapeHtml(meta.label)}</a> › <span>${escapeHtml(fund.name)}</span></p>

  <h1>${escapeHtml(fund.name)}</h1>

  <p class="stamp"><em>${escapeHtml(fund.category)}</em> · Avgift per <em>${fiMeta.published}</em> · Avkastning per <em>${asOf}</em></p>

  <dl class="facts">
    <div class="fact"><dt>Avgift</dt><dd>${fmtFeePct(fund.fee)}</dd></div>
    <div class="fact"><dt>Kategori</dt><dd style="font-size:14px">${escapeHtml(fund.category)}</dd></div>
    <div class="fact"><dt>ISIN</dt><dd class="mono">${escapeHtml(fund.isin)}</dd></div>
    <div class="fact"><dt>Avgiftskälla</dt><dd style="font-size:14px">${fund.feeSource === "fi" ? `<span class="badge fi">FI</span> ${fiMeta.period}` : '<span class="badge man">Manuell</span>'}</dd></div>
  </dl>

  <div class="prose">
    <p>
      ${escapeHtml(fund.name)} har en årlig avgift på ${fmtFeePct(fund.fee)}${feeSourceClause}. De senaste
      tre åren har fonden gett <strong>${fmtSignedPct(fund.threeYear.return)} efter avgift</strong> —
      ${rankFragment}.${secondSentence}
    </p>
  </div>

  <div class="tablewrap">
    <table>
      <thead><tr><th>Period</th><th class="num">Avkastning</th><th class="num">CAGR</th><th class="num">Max nedgång</th></tr></thead>
      <tbody>${periodRows}</tbody>
    </table>
  </div>

  <div class="cost">
    <p class="cost-kicker">Finns det något bättre?</p>
    <div class="cost-figure" style="color:${figureColor}">${figureText} <span class="cost-figure-sub">${meta.label.toLowerCase()}</span></div>
    <p class="cost-sub">${costSub}</p>
    <div class="cost-row">${costRowParts.join("")}</div>
    <p class="cost-foot">
      Siffrorna är <b>efter avgift</b> — avgiften är alltså redan avdragen, inte något du ska räkna
      bort igen. ${feeFootSentence}
    </p>
  </div>

  <section>
    <h2>Andra ${meta.label.toLowerCase()}</h2>
    <p class="peers-note">De tre som gett mest på tre år, plus denna fond. <a href="/fonder/${meta.slug}" class="inline-link">Se hela kategorin</a>.</p>
    <div class="peers">${peersHtml}</div>
  </section>

  <div>
    <a class="cta" href="/?a=${fund.id}:100&span=max&mode=funds">Ställ ${escapeHtml(fund.name)} mot en annan fond <span class="arrow">→</span></a>
    <p class="cta-note">
      I verktyget kan du lägga två fonder i samma graf, blanda flera i en portfölj och köra hela
      den tillgängliga historiken. Går till <code>/?a=${fund.id}:100&amp;span=max&amp;mode=funds</code>.
    </p>
  </div>

  <p class="disclaimer">
    Prisdata från Yahoo Finance, avgift från Finansinspektionens öppna register.
    Historisk avkastning är ingen garanti för framtida avkastning.
    <a href="/om" style="color:var(--text-secondary)">Om datakällorna</a>
  </p>`;

  const canonical = `${BASE_URL}/fond/${fund.slug}`;
  const title = `${fund.name} – avgift ${fmtFeePct(fund.fee)} och historisk avkastning | MinPortfölj`;
  const description = `${fund.name} kostar ${fmtFeePct(fund.fee)} i årlig avgift. Se historisk avkastning 1 och 3 år och jämför mot ${total - 1} andra ${meta.label.toLowerCase()}.`;

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
      { "@type": "PropertyValue", "name": "Avkastning 1 år efter avgift", "value": fmtSignedPct(fund.oneYear.return) },
      ...(fund.threeYear ? [{ "@type": "PropertyValue", "name": "Avkastning 3 år efter avgift", "value": fmtSignedPct(fund.threeYear.return) }] : []),
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
    html: pageShell({ title, description, canonical, jsonLd: [financialProduct, breadcrumbs], bodyHtml: body }),
    title, description, canonical,
    costBlock: { figureText, costSub: costSub.replace(/\s+/g, " ").trim(), rows: costRowParts.map(r => r.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()), feeFootSentence, rank, total },
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

  return { html: pageShell({ title, description, canonical, jsonLd: [], bodyHtml: body }), title, description, canonical };
}

// ─── /fonder/ — index över samtliga fonder ─────────────────────────────────────

function renderFundsIndexPage(funds, fiMeta, asOf) {
  const sorted = [...funds].sort((a, b) => a.name.localeCompare(b.name, "sv"));

  const rows = sorted.map(f => `
    <tr>
      <td><a class="fundname" href="/fond/${f.slug}">${escapeHtml(f.name)}</a></td>
      <td><a href="/fonder/${f.categoryMeta.slug}" class="inline-link" style="font-size:12px">${escapeHtml(f.category)}</a></td>
      <td class="num" data-sort="${f.oneYear.return}">${fmtSignedPct(f.oneYear.return)}</td>
      <td class="num cagr" data-sort="${f.threeYear ? f.threeYear.return : -999}">${f.threeYear ? fmtSignedPct(f.threeYear.return) : "–"}</td>
      <td class="num fee" data-sort="${f.fee}">${fmtFeePct(f.fee)}</td>
      <td>${f.feeSource === "fi" ? '<span class="badge fi">FI</span>' : '<span class="badge man">Manuell</span>'}</td>
    </tr>`).join("");

  const body = `
  <p class="crumbs"><a href="/">MinPortfölj</a> › <span>Fonder</span></p>

  <h1>Alla fonder</h1>

  <p class="stamp">
    <em>${funds.length} fonder</em> · Avgifter per <em>${fiMeta.published}</em> (FI ${fiMeta.period}) · Avkastning per <em>${asOf}</em>
  </p>

  <div class="prose">
    <p>
      Samtliga fonder i registret, sorterbara på avkastning och avgift. Klicka på en fond för
      detaljer, eller på kategorin för att jämföra den mot resten av sin kategori.
    </p>
  </div>

  <div class="tablewrap">
    <table id="fund-table">
      <thead>
        <tr>
          <th>Fond</th>
          <th>Kategori</th>
          <th class="num sortable" data-col="2">1 år</th>
          <th class="num sortable" data-col="3">3 år</th>
          <th class="num sortable" data-col="4">Avgift</th>
          <th>Källa</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <p class="disclaimer">
    Historisk avkastning är ingen garanti för framtida avkastning. Ingenting på den här sidan
    utgör finansiell rådgivning. <a href="/om" style="color:var(--text-secondary)">Om datakällorna</a>
  </p>
  ${SORT_SCRIPT}`;

  const canonical = `${BASE_URL}/fonder/`;
  const title = "Alla fonder – jämför avgifter och avkastning | MinPortfölj";
  const description = `Bläddra bland alla ${funds.length} fonder i registret. Jämför avkastning efter avgift och årlig avgift, uppdaterat ${asOf}.`;

  return { html: pageShell({ title, description, canonical, jsonLd: [], bodyHtml: body }), title, description, canonical };
}

// ─── sitemap.xml — genererad ur de faktiskt skrivna sidorna ────────────────────

function buildSitemap(pages, lastmod) {
  const urls = pages.map(p => `  <url>\n    <loc>${p.canonical}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
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
  // /?a=1:100&mode=funds) räknas inte som statiska sidor och kontrolleras inte.
  const normalize = p => p.replace(/\/+$/, "") || "/";
  const knownPaths = new Set(pagePaths.map(p => normalize(`/${p}`)));
  const brokenLinks = [];
  for (const page of pages) {
    const hrefs = [...page.html.matchAll(/href="(\/[^"]*)"/g)].map(m => m[1]);
    for (const href of hrefs) {
      if (href.includes("?") || href === "/") continue;
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

  // 3. sitemap.xml — antal URL:er === antal genererade sidor.
  const sitemapContent = readFileSync(join(DIST, "sitemap.xml"), "utf8");
  const sitemapCount = [...sitemapContent.matchAll(/<loc>/g)].length;
  if (sitemapCount !== pages.length) {
    ok = false;
    console.log(`  ✗ sitemap.xml har ${sitemapCount} URL:er, men ${pages.length} sidor genererades`);
  } else {
    console.log(`  ✓ sitemap.xml har exakt ${sitemapCount} URL:er, matchar antalet genererade sidor`);
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

  let amfOutcome = null;
  for (const fund of funds) {
    const categoryFunds = byCategory.get(fund.category);
    const result = renderFundPage(fund, categoryFunds, fiFees.meta, asOf);
    writePage(`fond/${fund.slug}`, result);
    if (fund.slug === "amf-aktiefond-global") amfOutcome = { fund, costBlock: result.costBlock };
  }
  console.log(`  ✓ ${funds.length} fondsidor`);

  writePage("fonder", renderFundsIndexPage(funds, fiFees.meta, asOf));
  console.log(`  ✓ /fonder/`);

  writePage("om", renderOmPage(join(ROOT, "project-docs/OM_SIDAN.md")));
  console.log(`  ✓ /om`);

  console.log(`\n📄 ${pages.length} sidor skrivna till dist/`);

  const sitemapXml = buildSitemap(pages, asOf);
  writeFileSync(join(DIST, "sitemap.xml"), sitemapXml);
  console.log(`🗺️  sitemap.xml skriven med ${pages.length} URL:er (lastmod ${asOf})\n`);

  if (amfOutcome) {
    console.log("─────────────────────────────────────────────────────");
    console.log(`🧪 Testfall — utfallsblocket för ${amfOutcome.fund.name} (sist i kategorin, plats ${amfOutcome.costBlock.rank} av ${amfOutcome.costBlock.total}):\n`);
    console.log(`   Siffra:  ${amfOutcome.costBlock.figureText} ${amfOutcome.fund.categoryMeta.label.toLowerCase()}`);
    console.log(`   Text:    ${amfOutcome.costBlock.costSub}`);
    amfOutcome.costBlock.rows.forEach(r => console.log(`   Rad:     ${r}`));
    console.log(`   Fotnot:  ${amfOutcome.costBlock.feeFootSentence}`);
    console.log("─────────────────────────────────────────────────────\n");
  }

  const ok = verifyBuild(pages, funds);
  if (!ok) process.exitCode = 1;
}

main();
