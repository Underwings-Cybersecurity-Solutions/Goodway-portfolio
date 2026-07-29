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
      (r.image_path
        ? '          <img class="gw-brand-card__logo" src="' + escAttr(r.image_path) + '" alt="' + escAttr(r.name) + ' logo" loading="lazy" style="max-height:46px;width:auto;margin-bottom:12px;display:block">'
        : ''),
      '          <div class="gw-brand-card__top">',
      '            <div class="gw-brand-card__name">' + esc(r.name) + '</div>',
      '            <span class="gw-brand-card__country"' + langAttr + '>' + esc(r.country) + '</span>',
      '          </div>',
      '          <p class="gw-brand-card__desc">' + r.description + '</p>',
      '          <div class="gw-brand-card__chips">' + chipMarkup + '</div>',
      '          <a class="gw-brand-card__cta" href="' + escAttr(r.division_href) + '">' + esc(r.cta_label || 'See products in division') + '</a>',
      '        </article>'
    ].filter(Boolean).join('\n');
  }).join('\n\n') + '\n\n      ';
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
      ? ' <small class="gw-industry__title-sub">(' + esc(s.subtitle) + ')</small>'
      : '';
    const productsDd = s.products
      ? '          <div><dt>Products supplied</dt><dd>' + s.products + '</dd></div>\n' : '';
    const principalsDd = s.principals_list
      ? '          <div><dt>Key principals</dt><dd>' + s.principals_list + '</dd></div>\n' : '';
    const metaBlock = (productsDd + principalsDd)
      ? '        <dl class="gw-industry__meta">\n' + productsDd + principalsDd + '        </dl>\n'
      : '';
    /* Prefer an uploaded/hero image; fall back to the legacy inline icon SVG. */
    const media = s.image_path
      ? '        <div class="gw-industry__image"><img src="' + escAttr(s.image_path) + '" alt="' + escAttr(s.image_alt || (s.title + ' sector')) + '" loading="lazy" width="480" height="320"></div>'
      : '        <div class="gw-industry__icon" aria-hidden="true">' + s.icon_svg + '</div>';
    return [
      '      <a href="request-a-quote.html?sector=' + escAttr(s.slug) + '" class="gw-industry" data-tier="' + escAttr(s.tier) +
        '" aria-label="' + escAttr(s.title + ' sector — request supply') + '">',
      media,
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
      (j.image_path
        ? '          <img class="gw-job__img" src="' + escAttr(j.image_path) + '" alt="' + escAttr(j.title) + '" loading="lazy">'
        : ''),
      '          <div class="gw-job__head">',
      '            <h3 class="gw-job__title">' + esc(j.title) + '</h3>',
      '            <span class="gw-job__type">' + typeLabel + '</span>',
      '          </div>',
      (metaBits ? '          <div class="gw-job__meta">' + metaBits + '</div>' : ''),
      '          <p class="gw-job__summary">' + esc(j.summary) + '</p>',
      details +
      '          <button type="button" class="gw-job__apply" data-job-slug="' + escAttr(j.slug) + '" data-job-title="' + escAttr(j.title) + '">Apply for this role</button>',
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

/* ---------- Blog / Journal ---------- */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return { day: String(iso || ''), rest: '', full: String(iso || '') };
  const day = String(parseInt(m[3], 10));
  const mon = MONTHS[parseInt(m[2], 10) - 1] || '';
  return { day: day, rest: mon + ' ' + m[1], full: day + ' ' + mon + ' ' + m[1] };
}
function readTime(body) {
  const words = String(body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
  return Math.max(1, Math.round(words / 200)) + ' min read';
}

function publishedPosts() {
  return db.prepare('SELECT * FROM posts WHERE is_published = 1 ORDER BY published_date DESC, id DESC').all();
}

/* The managed items injected between the GW-JOURNAL markers on journal.html. */
function renderJournalList() {
  const rows = publishedPosts();
  if (!rows.length) return '\n          ';
  return '\n' + rows.map(function (p) {
    const d = fmtDate(p.published_date);
    return [
      '          <a href="journal/' + escAttr(p.slug) + '.html" class="gw-journal-item">',
      '            <div class="gw-journal-item__date"><strong>' + esc(d.day) + '</strong><span>' + esc(d.rest) + '</span></div>',
      '            <div class="gw-journal-item__body">',
      '              <h3>' + esc(p.title) + '</h3>',
      '              <div class="gw-journal-item__meta">' + esc(p.category) + ' &middot; ' + esc(readTime(p.body)) + '</div>',
      '              <p class="gw-journal-item__excerpt">' + esc(p.excerpt) + '</p>',
      '            </div>',
      '          </a>'
    ].join('\n');
  }).join('\n\n') + '\n\n          ';
}

/* The site-wide footer, read from index.html (single source of truth) and
   re-pathed with ../ for pages inside the journal/ subfolder. Keeps every
   generated post page's footer identical to the rest of the site. */
function subFooter() {
  try {
    const idx = fs.readFileSync(path.join(SITE_ROOT, 'index.html'), 'utf8');
    const m = idx.match(/<footer class="footer-section">[\s\S]*?<\/footer>/);
    if (!m) return '';
    return m[0].replace(/(href|src)="(?!https?:|mailto:|tel:|#|\.\.\/|\/)([^"]+)"/g, '$1="../$2"');
  } catch (e) { return ''; }
}

/* A complete journal/<slug>.html article page, generated from a post row. */
function renderPostPage(p) {
  const d = fmtDate(p.published_date);
  const rt = readTime(p.body);
  const desc = escAttr(p.meta_description || p.excerpt || '');
  const title = esc(p.title);
  const cover = p.image_path
    ? '          <img class="gw-article__cover" src="../' + escAttr(p.image_path) + '" alt="' + title + '" loading="lazy" style="width:100%;border-radius:14px;margin:0 0 1.6rem;display:block">\n'
    : '';
  const ctaButton = (p.cta_href && p.cta_label)
    ? '            <a href="../' + escAttr(p.cta_href) + '" class="main-button-white w-inline-block gw-article-cta__primary"><div class="p1-default semibold-white">' + esc(p.cta_label) + '</div></a>\n'
    : '';
  const nav = [
    '  <div data-animation="over-right" data-collapse="medium" data-duration="400" role="banner" class="navbar w-nav">',
    '    <div class="container"><div class="navbar-wrap">',
    '      <a href="../index.html" class="logo-brand w-nav-brand"><img src="../images/goodway-logo.png" width="180" alt="Good Way General Trading"></a>',
    '      <nav role="navigation" aria-label="Primary" class="nav-menu w-nav-menu"><div class="nav-menu-item">',
    '        <a href="../about.html" class="nav-link w-nav-link">About Us</a>',
    '        <a href="../services.html" class="nav-link w-nav-link">What We Do</a>',
    '        <a href="../principals.html" class="nav-link w-nav-link">Principals</a>',
    '        <a href="../industries.html" class="nav-link w-nav-link">Industries</a>',
    '        <a href="../journal.html" aria-current="page" class="nav-link w-nav-link w--current">Journal</a>',
    '        <a href="../careers.html" class="nav-link w-nav-link">Careers</a>',
    '      </div><div class="button-menu"><a href="../contact.html" class="button-outline w-inline-block"><div class="p1-default">Contact Us</div></a></div></nav>',
    '      <div class="menu-button w-nav-button"><div class="menu-icon-line"><div class="menu-line-top"></div><div class="menu-line-middle"></div><div class="menu-line-bottom"></div></div></div>',
    '    </div></div>',
    '  </div>'
  ].join('\n');
  const footer = subFooter();
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <title>' + title + ' | Goodway Journal</title>',
    '  <meta name="description" content="' + desc + '">',
    '  <meta property="og:title" content="' + title + ' | Goodway Journal">',
    '  <meta property="og:description" content="' + desc + '">',
    '  <meta property="og:type" content="article">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    '  <link rel="canonical" href="https://goodway.ae/journal/' + escAttr(p.slug) + '">',
    '  <meta property="og:image" content="https://goodway.ae/images/goodway-logo.png">',
    '  <link href="../css/normalize.min.css" rel="stylesheet" type="text/css">',
    '  <link href="../css/webflow.min.css" rel="stylesheet" type="text/css">',
    '  <link href="../css/green-crescent-consultant.webflow.min.css" rel="stylesheet" type="text/css">',
    '  <link href="../css/goodway-brand.min.css" rel="stylesheet" type="text/css"><link href="../css/goodway-enhance.min.css" rel="stylesheet">',
    '  <link href="https://fonts.googleapis.com" rel="preconnect"><link href="https://fonts.gstatic.com" rel="preconnect" crossorigin="anonymous">',
    '  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" fetchpriority="high">',
    '  <link href="../images/goodway-logo.png" rel="shortcut icon" type="image/x-icon"><link href="../images/goodway-logo.png" rel="apple-touch-icon"><link href="../site.webmanifest" rel="manifest"><meta name="theme-color" content="#0e1a2b"><meta name="robots" content="index,follow"><meta name="twitter:card" content="summary_large_image">',
    '  <script type="application/ld+json">',
    '  {"@context":"https://schema.org","@type":"Article","headline":' + JSON.stringify(p.title) + ',"author":{"@type":"Organization","name":"Good Way General Trading"},"publisher":{"@type":"Organization","name":"Good Way General Trading","logo":{"@type":"ImageObject","url":"https://goodway.ae/images/goodway-logo.png"}},"datePublished":' + JSON.stringify(p.published_date) + ',"mainEntityOfPage":"https://goodway.ae/journal/' + p.slug + '.html"}',
    '  </script>',
    '</head>',
    '<body>',
    '  <a class="gw-skip-link" href="#main">Skip to main content</a>',
    nav,
    '',
    '  <main id="main">',
    '    <section class="gw-industries-hero gw-u-hero-tight">',
    '      <div class="container">',
    '        <div class="gw-industries-hero__eyebrow">// ' + esc(p.category) + ' &middot; ' + esc(d.full) + ' &middot; ' + esc(rt) + '</div>',
    '        <h1 class="gw-industries-hero__title">' + title + '</h1>',
    '        <p class="gw-industries-hero__lede">' + esc(p.lede || p.excerpt) + '</p>',
    '      </div>',
    '    </section>',
    '',
    '    <section class="services-section gw-band--linen-soft">',
    '      <div class="container">',
    '        <article class="gw-article">',
    cover + '          ' + (p.body || '') ,
    '          <p class="gw-article-cta">',
    ctaButton + '            <a href="../journal.html" class="gw-article-cta__back">&larr; More journal posts</a>',
    '          </p>',
    '        </article>',
    '      </div>',
    '    </section>',
    '  </main>',
    '',
    footer,
    '  <script src="../js/goodway-enhance.js" defer></script>',
    '</body>',
    '</html>',
    ''
  ].join('\n');
}

const JOURNAL_DIR = path.join(SITE_ROOT, 'journal');

/** Write journal/<slug>.html for every published post. Returns the count. */
function writePostPages() {
  if (!fs.existsSync(JOURNAL_DIR)) fs.mkdirSync(JOURNAL_DIR, { recursive: true });
  const rows = publishedPosts();
  rows.forEach(function (p) {
    fs.writeFileSync(path.join(JOURNAL_DIR, p.slug + '.html'), renderPostPage(p));
  });
  return rows.length;
}

/** Remove a generated post page (called on delete/unpublish). */
function removePostPage(slug) {
  if (!slug) return;
  try { fs.unlinkSync(path.join(JOURNAL_DIR, path.basename(slug) + '.html')); } catch (e) {}
}

/** journal.html list + all post pages. Skips if journal.html/markers are absent. */
function writeJournal() {
  const file = path.join(SITE_ROOT, 'journal.html');
  if (!fs.existsSync(file)) return false;
  let html = fs.readFileSync(file, 'utf8');
  if (html.indexOf('<!-- GW-JOURNAL-START -->') === -1) return false;
  html = replaceBetween(html, '<!-- GW-JOURNAL-START -->', '<!-- GW-JOURNAL-END -->', renderJournalList());
  fs.writeFileSync(file, html);
  writePostPages();
  return true;
}

function rebuildAll() {
  const principalsWritten = db.prepare('SELECT COUNT(*) AS n FROM principals WHERE is_published = 1').get().n;
  const sectorsWritten    = db.prepare('SELECT COUNT(*) AS n FROM sectors    WHERE is_published = 1').get().n;
  const jobsWritten       = db.prepare('SELECT COUNT(*) AS n FROM jobs       WHERE is_published = 1').get().n;
  const postsWritten      = db.prepare('SELECT COUNT(*) AS n FROM posts      WHERE is_published = 1').get().n;
  writePrincipals();
  writeSectors();
  const careersWritten = writeCareers();
  const journalWritten = writeJournal();
  return { principalsWritten, sectorsWritten, jobsWritten, careersWritten, postsWritten, journalWritten };
}

if (require.main === module) {
  const r = rebuildAll();
  console.log('Rebuilt: ' + r.principalsWritten + ' principals, ' + r.sectorsWritten + ' sectors' +
              (r.careersWritten ? ', ' + r.jobsWritten + ' jobs' : ' (careers.html not found — skipped)') + '.');
}

module.exports = { rebuildAll, writePrincipals, writeSectors, writeCareers, writeJournal, removePostPage };
