/**
 * One-shot sweep: add a "Careers" link after "Journal" in both the primary
 * nav and the footer quick-links, across every page. Relative path is derived
 * from the adjacent Journal link (journal.html vs ../journal.html), so it works
 * for top-level pages and subpages alike.
 *
 * Idempotent: a file that already has a careers nav link is left untouched.
 * Run: node scripts/sweep-add-careers-nav.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/* Collect all .html files, skipping build/vendor dirs. */
function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'server' || name === 'deploy' || name === 'docs') continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

const NAV_RE = /(<a href="((?:\.\.\/)?)journal\.html"[^>]*class="nav-link w-nav-link[^"]*"[^>]*>Journal<\/a>)/g;
const FOOT_RE = /(<a href="((?:\.\.\/)?)journal\.html" class="footer-link">Journal<\/a>)/g;

let changed = 0, skipped = 0;
for (const file of walk(ROOT, [])) {
  let html = fs.readFileSync(file, 'utf8');
  const isCareers = path.basename(file) === 'careers.html';

  /* Already has a careers nav link → skip (idempotent). Matches both the plain
     and the current-page (aria-current + w--current) variants. */
  if (/href="(?:\.\.\/)?careers\.html"[^>]*class="nav-link/.test(html)) { skipped++; continue; }
  if (!NAV_RE.test(html)) { continue; }
  NAV_RE.lastIndex = 0;

  html = html.replace(NAV_RE, function (_m, journalLink, prefix) {
    const careers = isCareers
      ? '<a href="' + prefix + 'careers.html" aria-current="page" class="nav-link w-nav-link w--current">Careers</a>'
      : '<a href="' + prefix + 'careers.html" class="nav-link w-nav-link">Careers</a>';
    return journalLink + '\n        ' + careers;
  });

  /* Footer link too — skip if this file already has one (e.g. hand-authored careers.html). */
  if (!/href="(?:\.\.\/)?careers\.html" class="footer-link"/.test(html)) {
    html = html.replace(FOOT_RE, function (_m, journalLink, prefix) {
      return journalLink + '\n                <a href="' + prefix + 'careers.html" class="footer-link">Careers</a>';
    });
  }

  fs.writeFileSync(file, html);
  changed++;
  console.log('updated: ' + path.relative(ROOT, file));
}

console.log('\nDone. ' + changed + ' file(s) updated, ' + skipped + ' already had Careers.');
