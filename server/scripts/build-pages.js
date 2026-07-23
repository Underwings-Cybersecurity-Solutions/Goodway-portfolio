/**
 * Marker-based site regeneration.
 * Rewrites ONLY the content between:
 *   <!-- GW-PRINCIPALS-START --> ... <!-- GW-PRINCIPALS-END -->   (principals.html)
 *   <!-- GW-INDUSTRIES-START --> ... <!-- GW-INDUSTRIES-END -->   (industries.html)
 * Everything else on the page (hero, footer, scripts, meta) is untouched.
 * CLI:  `npm run build-site`
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { db } = require('../db');

const SITE_ROOT = path.resolve(__dirname, '..', process.env.SITE_ROOT || '..');

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function escAttr(s) { return esc(s); }

/* ---------- Brand grid ---------- */
function renderPrincipalsGrid() {
  const rows = db.prepare(`
    SELECT * FROM principals WHERE is_published = 1
    ORDER BY sort_order ASC, name ASC
  `).all();
  if (!rows.length) return '\n      <!-- no principals published -->\n    ';
  return '\n' + rows.map(function (r) {
    let chips = [];
    try { chips = JSON.parse(r.chips_json || '[]'); } catch (e) {}
    const chipMarkup = chips.map(function (c) {
      return '<span class="gw-chip">' + esc(c) + '</span>';
    }).join('');
    const langAttr = r.country_lang ? ' lang="' + escAttr(r.country_lang) + '"' : '';
    return [
      '        <article class="gw-brand-card" data-category="' + escAttr(r.category) +
        '" data-group="' + escAttr(r.category_label) + '">',
      '          <div class="gw-brand-card__top">',
      '            <div class="gw-brand-card__name">' + esc(r.name) + '</div>',
      '            <span class="gw-brand-card__country"' + langAttr + '>' + esc(r.country) + '</span>',
      '          </div>',
      '          <p class="gw-brand-card__desc">' + r.description + '</p>',
      '          <div class="gw-brand-card__chips">' + chipMarkup + '</div>',
      '          <a class="gw-brand-card__cta" href="' + escAttr(r.division_href) + '">See products in division</a>',
      '        </article>'
    ].join('\n');
  }).join('\n\n') + '\n      ';
}

/* ---------- Sector grid ---------- */
function renderSectorsGrid() {
  const rows = db.prepare(`
    SELECT * FROM sectors WHERE is_published = 1
    ORDER BY sort_order ASC, title ASC
  `).all();
  if (!rows.length) return '\n      <!-- no sectors published -->\n    ';
  return '\n' + rows.map(function (s) {
    const subtitleMarkup = s.subtitle
      ? ' <small style="font-weight:500;color:var(--gw-muted);font-size:0.75em">(' + esc(s.subtitle) + ')</small>'
      : '';
    const productsDd = s.products
      ? '          <div><dt>Products supplied</dt><dd>' + s.products + '</dd></div>\n' : '';
    const principalsDd = s.principals_list
      ? '          <div><dt>Key principals</dt><dd>' + s.principals_list + '</dd></div>\n' : '';
    const metaBlock = (productsDd + principalsDd)
      ? '        <dl class="gw-industry__meta">\n' + productsDd + principalsDd + '        </dl>\n'
      : '';
    return [
      '      <a href="request-a-quote.html?sector=' + escAttr(s.slug) + '" class="gw-industry" data-tier="' + escAttr(s.tier) +
        '" aria-label="' + escAttr(s.title + ' sector — request supply') + '">',
      '        <div class="gw-industry__icon" aria-hidden="true">' + s.icon_svg + '</div>',
      '        <span class="gw-industry__tier">' + esc(s.tier_label) + '</span>',
      '        <h3 class="gw-industry__title">' + s.title.replace(/&/g, '&amp;') + subtitleMarkup + '</h3>',
      '        <p class="gw-industry__lede">' + s.lede + '</p>',
      metaBlock + '        <span class="gw-industry__cta">' + esc(s.cta_label) + '</span>',
      '      </a>'
    ].join('\n');
  }).join('\n\n') + '\n    ';
}

/* ---------- Careers openings ---------- */
function renderCareersList() {
  const rows = db.prepare(`
    SELECT * FROM jobs WHERE is_published = 1
    ORDER BY sort_order ASC, title ASC
  `).all();
  if (!rows.length) {
    return '\n' +
      '        <div class="gw-careers__empty">\n' +
      '          <h3>No current openings</h3>\n' +
      '          <p>We don\'t have a role advertised right now — but we\'re always glad to hear from strong candidates. Send us your CV using the form below and we\'ll keep it on file.</p>\n' +
      '        </div>\n      ';
  }
  const TYPE_LABEL = { 'full-time': 'Full-time', 'part-time': 'Part-time', 'contract': 'Contract', 'internship': 'Internship' };
  return '\n' + rows.map(function (j) {
    const metaBits = [j.department, j.location].filter(Boolean).map(esc).join(' &middot; ');
    const typeLabel = TYPE_LABEL[j.employment_type] || esc(j.employment_type);
    const details = (j.description && j.description.trim())
      ? '          <details class="gw-job__more">\n' +
        '            <summary>Full details</summary>\n' +
        '            <div class="gw-job__desc">' + j.description + '</div>\n' +
        '          </details>\n'
      : '';
    return [
      '        <article class="gw-job" id="job-' + escAttr(j.slug) + '">',
      '          <div class="gw-job__head">',
      '            <h3 class="gw-job__title">' + esc(j.title) + '</h3>',
      '            <span class="gw-job__type">' + typeLabel + '</span>',
      '          </div>',
      (metaBits ? '          <div class="gw-job__meta">' + metaBits + '</div>' : ''),
      '          <p class="gw-job__summary">' + esc(j.summary) + '</p>',
      details +
      '          <button type="button" class="gw-job__apply" data-job-id="' + j.id + '" data-job-title="' + escAttr(j.title) + '">Apply for this role</button>',
      '        </article>'
    ].filter(Boolean).join('\n');
  }).join('\n\n') + '\n      ';
}

function replaceBetween(html, startMarker, endMarker, content) {
  const startIdx = html.indexOf(startMarker);
  const endIdx   = html.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error('Markers not found: ' + startMarker + ' / ' + endMarker);
  }
  return html.slice(0, startIdx + startMarker.length) + content + html.slice(endIdx);
}

function writePrincipals() {
  const file = path.join(SITE_ROOT, 'principals.html');
  let html = fs.readFileSync(file, 'utf8');
  html = replaceBetween(html, '<!-- GW-PRINCIPALS-START -->', '<!-- GW-PRINCIPALS-END -->', renderPrincipalsGrid());
  fs.writeFileSync(file, html);
}

function writeSectors() {
  const file = path.join(SITE_ROOT, 'industries.html');
  let html = fs.readFileSync(file, 'utf8');
  html = replaceBetween(html, '<!-- GW-INDUSTRIES-START -->', '<!-- GW-INDUSTRIES-END -->', renderSectorsGrid());
  fs.writeFileSync(file, html);
}

/* careers.html is optional — only rewrite it if the page + markers exist.
   Returns true if written, false if the page/markers weren't found. */
function writeCareers() {
  const file = path.join(SITE_ROOT, 'careers.html');
  if (!fs.existsSync(file)) return false;
  let html = fs.readFileSync(file, 'utf8');
  if (html.indexOf('<!-- GW-CAREERS-START -->') === -1) return false;
  html = replaceBetween(html, '<!-- GW-CAREERS-START -->', '<!-- GW-CAREERS-END -->', renderCareersList());
  fs.writeFileSync(file, html);
  return true;
}

function rebuildAll() {
  const principalsWritten = db.prepare('SELECT COUNT(*) AS n FROM principals WHERE is_published = 1').get().n;
  const sectorsWritten    = db.prepare('SELECT COUNT(*) AS n FROM sectors    WHERE is_published = 1').get().n;
  const jobsWritten       = db.prepare('SELECT COUNT(*) AS n FROM jobs       WHERE is_published = 1').get().n;
  writePrincipals();
  writeSectors();
  const careersWritten = writeCareers();
  return { principalsWritten, sectorsWritten, jobsWritten, careersWritten };
}

if (require.main === module) {
  const r = rebuildAll();
  console.log('Rebuilt: ' + r.principalsWritten + ' principals, ' + r.sectorsWritten + ' sectors' +
              (r.careersWritten ? ', ' + r.jobsWritten + ' jobs' : ' (careers.html not found — skipped)') + '.');
}

module.exports = { rebuildAll, writePrincipals, writeSectors, writeCareers };
