/**
 * Insert the "Skip to main content" link immediately after <body> on any
 * page that has a `<main id="main">` target but is missing the skip link.
 * Idempotent — safe to re-run. (Pages without a #main target, e.g. the
 * request-a-quote redirect stub, are correctly left untouched.)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKIP = '<a class="gw-skip-link" href="#main">Skip to main content</a>';

function walk(dir, out) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) {
      if (f.name === 'node_modules' || f.name.startsWith('.git') || f.name === 'server') continue;
      walk(p, out);
    } else if (f.isFile() && f.name.endsWith('.html')) {
      out.push(p);
    }
  }
  return out;
}

let touched = 0;
for (const file of walk(ROOT, [])) {
  const src = fs.readFileSync(file, 'utf8');
  if (src.includes('gw-skip-link')) continue;       // already present
  if (!/<main[^>]*id="main"/.test(src)) continue;   // no target → no skip link
  const next = src.replace(/<body([^>]*)>/, '<body$1>\n  ' + SKIP);
  if (next === src) continue;
  fs.writeFileSync(file, next, 'utf8');
  console.log('  ✓ ' + path.relative(ROOT, file).replace(/\\/g, '/'));
  touched++;
}
console.log('\n  ' + touched + ' file(s) updated.');
