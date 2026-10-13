/**
 * seo-holdings.mjs — Sektionen "Vad fonden äger" på de statiska fondsidorna.
 *
 * Se project-docs/HOLDINGS.md avsnitt 5 och mockupen i
 * project-docs/mockups/innehav-v2/ (fondsida.dc.html, tomlagen.dc.html, bolagsfarger.dc.html).
 *
 * Underlaget är src/data/fi-holdings.json (bara fondfakta). Kategorisnittet för
 * sektorer härleds här vid byggtid, aldrig i datafilen. Inga förklarande texter
 * i sektionen — allt sådant ligger bakom "?" (HTML-attributet popover, ingen JS).
 * "Visa alla"-knapparna är <details> som visar extraraderna via :has().
 */

import { getCompanyColor } from "../src/lib/company-colors.js";
import { fmtPlainPct, fmtDateSv, categoryPlural, escapeHtml } from "./seo-format.mjs";

// GICS nivå 1 — Branschkod_instrument i FI-filen (HOLDINGS.md §2 regel 3).
const SECTOR_NAMES = {
  10: "Energi", 15: "Material", 20: "Industri", 25: "Sällanköpsvaror", 30: "Dagligvaror",
  35: "Hälsovård", 40: "Finans", 45: "Informationsteknik", 50: "Kommunikationstjänster",
  55: "Kraftförsörjning", 60: "Fastigheter",
};

// Registrets ISIN-prefix → land, för utländska fonder (status foreign).
const DOMICILE_NAMES = {
  FI: "Finland", NO: "Norge", DK: "Danmark", LU: "Luxemburg", IE: "Irland",
  DE: "Tyskland", FR: "Frankrike", GB: "Storbritannien", NL: "Nederländerna",
};

const ALLOC_LABELS = { aktier: "Aktier", rantor: "Räntor", fondandelar: "Fondandelar", likvida: "Likvida medel" };

const MONTHS_LONG = ["januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti", "september", "oktober", "november", "december"];

const SECTORS_VISIBLE   = 6;   // sex största + "Övriga N sektorer"
const TOP_VISIBLE       = 10;
const FOF_LIST_MAX      = 5;
const MIN_AVG_FUNDS     = 5;   // kategorisnittet kräver minst fem ok-fonder
const ALLOC_MIN_PCT     = 0.5; // segment under 0,5 % utelämnas (utom likvida medel)
const STALE_MONTHS      = 7;
const ALLOC_STEPS       = [1, 0.5, 0.28];
const NEUTRAL_COMPANY   = new Set(["#FFFFFF", "#F3EDE2"]);
const BAR_NEUTRAL       = "#8494ad"; // steel slate
const ALLOC_NEUTRAL     = "#cbd5e6";
const BAR_HEADROOM      = 0.85;      // största stapeln fyller 85 % av spåret

const fmtPct2 = v => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(2).replace(".", ",")} %`;
const fmtCount = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const widthPct = (v, max) => Math.round(Math.max(0, v) / max * 1000) / 10; // en decimal, utan ".0"

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ─── Kategorisnitt — härleds här, aldrig i fi-holdings.json ────────────────────

// Snitt av sectors för fonder i kategorin med status ok och sektordata.
// Returnerar null om färre än MIN_AVG_FUNDS sådana fonder finns.
export function categorySectorAverage(categoryFunds, holdings) {
  const withSectors = categoryFunds
    .map(f => holdings.funds[f.slug])
    .filter(h => h?.status === "ok" && Object.keys(h.sectors).length);
  if (withSectors.length < MIN_AVG_FUNDS) return null;
  const avg = {};
  for (const code of Object.keys(SECTOR_NAMES)) {
    avg[code] = withSectors.reduce((s, h) => s + (h.sectors[code] ?? 0), 0) / withSectors.length;
  }
  return { n: withSectors.length, avg };
}

// ─── Delar ─────────────────────────────────────────────────────────────────────

function infoButton(id, label) {
  return `<button type="button" class="hs-q" popovertarget="${id}" aria-label="Om ${label.toLowerCase()}"><span aria-hidden="true">?</span></button>`;
}

function infoPopover(id, title, paras) {
  return `<div popover id="${id}" class="hs-pop" role="dialog" aria-labelledby="${id}-h">
      <h3 id="${id}-h">${title}</h3>
      ${paras.map(p => `<p>${p}</p>`).join("")}
      <button type="button" class="hs-close" popovertarget="${id}" popovertargetaction="hide">Stäng</button>
    </div>`;
}

function cardHead(label, popId, right = "") {
  return `<div class="hs-cardhead"><span class="hs-label"><span class="label">${label}</span>${popId ? infoButton(popId, label) : ""}</span>${right}</div>`;
}

function sectionHead(asOf, buildDate, withDate = true) {
  if (!withDate) return `<div class="hs-head"><h2 id="own-h">Vad fonden äger</h2></div>`;
  const ageMonths = (buildDate - new Date(`${asOf}T00:00:00Z`)) / (1000 * 60 * 60 * 24 * 30.44);
  const stale = ageMonths > STALE_MONTHS;
  const date = stale
    ? `<span class="hs-stale" title="Nyare innehav har inte publicerats ännu">Per ${fmtDateSv(asOf)}</span>`
    : `Per ${fmtDateSv(asOf)}`;
  return `<div class="hs-head"><h2 id="own-h">Vad fonden äger</h2><span class="hs-asof">${date} <span class="badge fi" title="Finansinspektionen, fondinnehav per kvartal">FI</span></span></div>`;
}

// Nästa kvartalsslut efter asOf, och månaden FI väntas publicera det (två månader senare).
function nextUpdateText(asOf) {
  const d = new Date(`${asOf}T00:00:00Z`);
  const nextEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 4, 0)); // sista dagen tre månader fram
  const publishMonth = (nextEnd.getUTCMonth() + 2) % 12;
  return `Nästa uppdatering, innehav per ${nextEnd.getUTCDate()} ${MONTHS_LONG[nextEnd.getUTCMonth()]}, väntas i slutet av ${MONTHS_LONG[publishMonth]}.`;
}

// ─── Kort ──────────────────────────────────────────────────────────────────────

function allocCard(fund, h, allocBase) {
  const segs = Object.entries(ALLOC_LABELS)
    .map(([key, label]) => ({ key, label, w: h.alloc[key] }))
    .filter(s => s.key === "likvida" || s.w >= ALLOC_MIN_PCT)
    .sort((a, b) => b.w - a.w)
    .map((s, i) => ({ ...s, color: rgba(allocBase, ALLOC_STEPS[Math.min(i, ALLOC_STEPS.length - 1)]) }));

  const aria = segs.map(s => `${s.label} ${fmtPlainPct(s.w)}`).join(", ");
  const bar = segs.map(s => `<span style="width:${Math.max(0, s.w).toFixed(2)}%;background:${s.color}"></span>`).join("");
  const legend = segs.map(s => `<span><i style="background:${s.color}"></i>${s.label} <b class="num">${fmtPlainPct(s.w)}</b></span>`).join("");

  const net = h.alloc.ovrigtNetto;
  const paras = [
    "Aktier och räntor härleds ur fondbolagets rapport till Finansinspektionen. Värdepapper med antal räknas som aktier, värdepapper med nominellt belopp och penningmarknadsinstrument som räntor. Fondandelar är andelar i andra fonder. Likvida medel är fondens kassa och bankmedel.",
    Math.abs(net) >= ALLOC_MIN_PCT
      ? `Derivat och övriga tillgångar och skulder visas inte. För ${escapeHtml(fund.name)} är de netto ${fmtPlainPct(net)}, därför blir summan inte exakt 100 %.`
      : `Derivat och övriga tillgångar och skulder visas inte, och andelar under ${fmtPlainPct(ALLOC_MIN_PCT)} utelämnas.`,
  ];

  return `<div class="hs-card">
      ${cardHead("Tillgångsfördelning", "hs-pop-alloc", `<span class="hs-meta num">${fmtCount(h.holdingsCount)} innehav</span>`)}
      <div class="hs-alloc" role="img" aria-label="${aria}">${bar}</div>
      <div class="hs-alloc-legend">${legend}</div>
      ${infoPopover("hs-pop-alloc", "Tillgångsfördelning", paras)}
    </div>`;
}

function sectorCard(fund, h, catAvg, plural) {
  if (h.status === "no-sector") {
    return `<div class="hs-card">
      ${cardHead("Sektorer")}
      <p class="hs-note">Fondbolaget rapporterar inte sektor till Finansinspektionen.</p>
    </div>`;
  }
  const entries = Object.entries(h.sectors).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return "";

  const collapse = entries.length > SECTORS_VISIBLE + 1;
  const rest = entries.slice(SECTORS_VISIBLE).reduce((s, [, v]) => s + v, 0);
  const avgOf = code => (catAvg ? catAvg.avg[code] : null);
  const max = Math.max(
    ...entries.map(([c, v]) => Math.max(v, avgOf(c) ?? 0)),
    collapse ? rest : 0,
  ) / BAR_HEADROOM;

  // Rad: <span>namn</span><i>spår<i>fyllnad</i><em>snittstreck</em></i><b>värde</b>
  const row = ([code, v], extra = false) => {
    const avg = avgOf(code);
    const title = avg !== null ? ` title="Snitt ${plural} ${fmtPlainPct(avg)}"` : "";
    const mark = avg !== null ? `<em style="left:${widthPct(avg, max)}%"></em>` : "";
    return `<div class="hs-srow${extra ? " hs-extra" : ""}"><span>${SECTOR_NAMES[code]}</span><i${title}><i style="width:${widthPct(v, max)}%"></i>${mark}</i><b>${fmtPlainPct(v)}</b></div>`;
  };

  const rows = collapse
    ? entries.slice(0, SECTORS_VISIBLE).map(e => row(e)).join("")
      + `<div class="hs-srow hs-rest"><span>Övriga ${entries.length - SECTORS_VISIBLE} sektorer</span><i><i style="width:${widthPct(rest, max)}%"></i></i><b>${fmtPlainPct(rest)}</b></div>`
      + entries.slice(SECTORS_VISIBLE).map(e => row(e, true)).join("")
    : entries.map(e => row(e)).join("");

  const legend = catAvg
    ? `<div class="hs-legend"><span><i class="hs-sw"></i>${escapeHtml(fund.name)}</span><span><i class="hs-sw-avg"></i>Snitt ${plural}</span></div>`
    : "";
  const more = collapse
    ? `<details class="hs-more"><summary><span class="hs-closed">Visa alla ${entries.length} sektorer</span><span class="hs-open">Visa färre</span></summary></details>`
    : "";

  const paras = [
    "Andel av hela fonden per sektor, enligt den sektorkod (GICS) fondbolaget rapporterar till Finansinspektionen.",
    ...(catAvg ? [`Det vita strecket är snittet för de ${catAvg.n} ${plural} på sajten som har sektordata.`] : []),
  ];

  return `<div class="hs-card hs-sectors">
      ${cardHead("Sektorer", "hs-pop-sec", '<span class="hs-meta">andel av fonden</span>')}
      <div class="hs-rows">${rows}</div>
      ${legend}
      ${more}
      ${infoPopover("hs-pop-sec", "Sektorer", paras)}
    </div>`;
}

function topCard(h, asOf) {
  const top = h.top;
  if (!top.length) return "";
  const collapse = top.length > TOP_VISIBLE;
  const max = Math.max(...top.map(([, w]) => w)) / BAR_HEADROOM;
  const sum = n => top.slice(0, n).reduce((s, [, w]) => s + w, 0);
  const firstN = Math.min(top.length, TOP_VISIBLE);
  const nWord = n => (n === TOP_VISIBLE ? "tio" : String(n));

  // Rad: <span>namn</span><i>spår<i>fyllnad</i></i><b>vikt</b> — rangen kommer från en CSS-räknare.
  const rows = top.map(([name, w], i) =>
    `<div${i >= TOP_VISIBLE ? ' class="hs-extra"' : ""}><span>${escapeHtml(name)}</span><i><i style="width:${widthPct(w, max)}%"></i></i><b>${fmtPct2(w)}</b></div>`
  ).join("");

  const sumText = collapse
    ? `<span class="hs-closed">De ${nWord(firstN)} största är <b class="num">${fmtPlainPct(sum(firstN))}</b> av fonden</span><span class="hs-open">De ${top.length} största är <b class="num">${fmtPlainPct(sum(top.length))}</b> av fonden</span>`
    : `<span>De ${nWord(firstN)} största är <b class="num">${fmtPlainPct(sum(firstN))}</b> av fonden</span>`;
  const more = collapse
    ? `<details class="hs-more"><summary><span class="hs-closed">Visa ${top.length} största</span><span class="hs-open">Visa ${nWord(TOP_VISIBLE)} största</span></summary></details>`
    : "";

  const paras = [
    "Andel av fonden per värdepapper. Samma värdepapper på flera rader summeras.",
    `Fondbolagen rapporterar innehav varje kvartal och Finansinspektionen publicerar dem två månader senare. ${nextUpdateText(asOf)}`,
  ];

  return `<div class="hs-card hs-top">
      ${cardHead("Största innehav", "hs-pop-top", '<span class="hs-meta">andel av fonden</span>')}
      <div class="hs-trows">${rows}</div>
      <div class="hs-tfoot"><span class="hs-sum">${sumText}</span>${more}</div>
      ${infoPopover("hs-pop-top", "Största innehav", paras)}
    </div>`;
}

// ─── Sektionen ─────────────────────────────────────────────────────────────────

// En fond som saknas i fi-holdings.json (t.ex. nyligen tillagd, före nästa körning)
// visas som missing. verifyBuild varnar men stoppar inte bygget.
export function renderHoldingsSection(fund, holdings, catAvg, buildDate = new Date()) {
  const h = holdings.funds[fund.slug] ?? { status: "missing" };
  const asOf = holdings._meta.asOf;
  const name = escapeHtml(fund.name);

  if (h.status === "foreign") {
    const land = DOMICILE_NAMES[h.country];
    if (!land) throw new Error(`Okänt registreringsland "${h.country}" för ${fund.name} — lägg till i DOMICILE_NAMES`);
    return `<section class="hs" aria-labelledby="own-h">
    ${sectionHead(asOf, buildDate, false)}
    <p class="hs-note">${name} är registrerad i ${land}. Finansinspektionen publicerar innehav bara för fonder registrerade i Sverige.</p>
  </section>`;
  }
  if (h.status === "missing") {
    return `<section class="hs" aria-labelledby="own-h">
    ${sectionHead(asOf, buildDate)}
    <p class="hs-note">Innehav för perioden saknas hos Finansinspektionen.</p>
  </section>`;
  }

  const hex = getCompanyColor(fund).toUpperCase();
  const neutral = NEUTRAL_COMPANY.has(hex);
  const barColor = neutral ? BAR_NEUTRAL : hex;

  if (h.status === "fund-of-funds") {
    const list = h.top.slice(0, FOF_LIST_MAX);
    const lead = list.length === 1 ? "placerar i en annan fond:" : "placerar i andra fonder:";
    return `<section class="hs" aria-labelledby="own-h">
    ${sectionHead(asOf, buildDate)}
    <p class="hs-note">${name} ${lead}</p>
    <div class="hs-fof">${list.map(([n, w]) => `<div><span>${escapeHtml(n)}</span><b class="num">${fmtPlainPct(w)}</b></div>`).join("")}</div>
  </section>`;
  }

  const plural = categoryPlural(fund.categoryMeta);
  return `<section class="hs" aria-labelledby="own-h" style="--bar:${barColor}">
    ${sectionHead(asOf, buildDate)}
    ${allocCard(fund, h, neutral ? ALLOC_NEUTRAL : hex)}
    ${sectorCard(fund, h, catAvg, plural)}
    ${topCard(h, asOf)}
  </section>`;
}

// Komprimerar blanksteg — sektionen ska kosta högst ~15 KB per sida (HOLDINGS.md §6).
function minifyCss(css) {
  return css.replace(/\s+/g, " ").replace(/\s*([{}:;,>+])\s*/g, "$1").replace(/;}/g, "}").trim();
}

// Neutral text överallt — inga accentfärger i sektionen (HOLDINGS.md §5, Färger).
export const HOLDINGS_CSS = minifyCss(`
  .hs { display: flex; flex-direction: column; gap: 14px; }
  .hs-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; }
  .hs-head h2 { margin: 0; }
  .hs-asof { font-size: 12px; color: var(--text-label); display: inline-flex; align-items: center; gap: 6px; }
  .hs-stale { color: var(--warning); }
  .hs-note { margin: 0; color: var(--text-secondary); }
  .hs-card { border: 1px solid var(--border-edge); border-radius: 12px; padding: 14px 18px 16px; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
  .hs-cardhead { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .hs-label { display: inline-flex; align-items: center; }
  .hs-meta { font-size: 12px; color: var(--text-label); }
  .hs-q { width: 28px; height: 28px; margin-left: 2px; padding: 0; border: 0; background: none; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
  .hs-q span { width: 15px; height: 15px; border-radius: 50%; border: 1px solid var(--border-inner); color: var(--text-secondary); font-family: var(--font-display); font-size: 10px; line-height: 13px; text-align: center; }
  .hs-q:hover span { border-color: var(--border-edge); color: var(--text-primary); }
  .hs-q:focus-visible, .hs-more summary:focus-visible, .hs-close:focus-visible { outline: 2px solid var(--text-secondary); outline-offset: 2px; border-radius: 4px; }

  .hs-alloc { display: flex; gap: 2px; height: 10px; border-radius: 5px; overflow: hidden; background: rgba(255,255,255,0.06); }
  .hs-alloc span { flex: 0 0 auto; }
  .hs-alloc-legend, .hs-legend { display: flex; gap: 6px 18px; flex-wrap: wrap; font-size: 13px; color: var(--text-secondary); }
  .hs-alloc-legend span, .hs-legend span { display: inline-flex; align-items: center; gap: 7px; }
  .hs-alloc-legend i { width: 10px; height: 10px; border-radius: 2px; }
  .hs-alloc-legend b, .hs-sum b { font-family: var(--font-display); font-weight: 600; color: var(--text-primary); }

  .hs-rows { display: flex; flex-direction: column; gap: 9px; }
  .hs-srow { display: grid; grid-template-columns: 170px minmax(0, 1fr) 54px; gap: 10px; align-items: center; font-size: 13px; }
  .hs-srow > span { color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hs-srow > i, .hs-trows i { position: relative; display: block; height: 8px; background: rgba(255,255,255,0.06); border-radius: 4px; }
  .hs-srow > i > i, .hs-trows i i { position: absolute; left: 0; top: 0; bottom: 0; height: auto; border-radius: inherit; background: var(--bar); }
  .hs-rest > i > i { opacity: 0.55; }
  .hs-srow em { position: absolute; top: -3px; bottom: -3px; width: 2px; margin-left: -1px; border-radius: 1px; background: #f0ede8; }
  .hs-srow > b, .hs-trows b { text-align: right; font-family: var(--font-display); font-weight: 600; font-variant-numeric: tabular-nums; }
  .hs-legend { font-size: 12px; color: var(--text-label); gap: 6px 16px; }
  .hs-legend span { gap: 6px; }
  .hs-sw { width: 14px; height: 8px; border-radius: 3px; background: var(--bar); }
  .hs-sw-avg { width: 2px; height: 12px; border-radius: 1px; background: #f0ede8; }

  .hs-top { gap: 6px; padding-bottom: 12px; }
  .hs-trows { display: flex; flex-direction: column; counter-reset: hs-rank; }
  .hs-trows > div { display: grid; grid-template-columns: 26px minmax(0, 1fr) minmax(48px, 160px) 58px; gap: 10px; align-items: center; padding: 7px 0; font-size: 13px; counter-increment: hs-rank; }
  .hs-trows > div + div { border-top: 1px solid var(--border-hairline); }
  .hs-trows > div::before { content: counter(hs-rank); font-family: var(--font-display); font-weight: 600; font-size: 12px; color: var(--text-label); }
  .hs-trows span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hs-trows > div > i { height: 6px; border-radius: 3px; }
  .hs-tfoot { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; padding-top: 8px; border-top: 1px solid var(--border-hairline); font-size: 12px; color: var(--text-label); }

  .hs-card .hs-extra, .hs-card .hs-open { display: none; }
  .hs-card:has(details[open]) .hs-extra { display: grid; }
  .hs-card:has(details[open]) .hs-rest, .hs-card:has(details[open]) .hs-closed { display: none; }
  .hs-card:has(details[open]) .hs-open { display: inline; }
  .hs-more summary { list-style: none; cursor: pointer; display: inline-block; padding: 4px 0; font-family: var(--font-display); font-weight: 600; font-size: 12px; color: var(--text-primary); border-bottom: 1px solid rgba(240,237,232,0.35); }
  .hs-more summary::-webkit-details-marker { display: none; }
  .hs-sectors .hs-more { align-self: flex-start; }

  .hs-fof { display: flex; flex-direction: column; gap: 6px; }
  .hs-fof div { display: flex; justify-content: space-between; gap: 12px; padding: 10px 12px; background: rgba(255,255,255,0.03); border-radius: 9px; font-size: 13px; }
  .hs-fof b { font-family: var(--font-display); font-weight: 600; white-space: nowrap; }

  .hs-pop { background: var(--bg-elevated); color: var(--text-primary); border: 1px solid var(--border-soft); border-radius: 16px; padding: 22px 24px 18px; max-width: min(420px, calc(100vw - 40px)); width: 100%; box-sizing: border-box; flex-direction: column; gap: 12px; }
  .hs-pop:popover-open { display: flex; }
  .hs-pop::backdrop { background: rgba(5,8,16,0.62); backdrop-filter: blur(4px); }
  .hs-pop h3 { margin: 0; font-size: 17px; font-weight: 700; }
  .hs-pop p { margin: 0; font-size: 14px; color: var(--text-secondary); }
  .hs-pop p + p { padding-top: 12px; border-top: 1px solid var(--border-hairline); }
  .hs-close { align-self: flex-end; min-height: 36px; padding: 6px 14px; border-radius: 8px; border: 1px solid var(--border-soft); background: rgba(255,255,255,0.07); color: var(--text-primary); font-family: var(--font-display); font-weight: 600; font-size: 12px; cursor: pointer; }

  @media (max-width: 767px) {
    .hs-card { padding: 14px 14px 16px; }
    .hs-srow { grid-template-columns: 128px minmax(0, 1fr) 50px; }
    .hs-trows > div { grid-template-columns: 22px minmax(0, 1fr) 58px; }
    .hs-trows > div > i { display: none; }
  }
`);
