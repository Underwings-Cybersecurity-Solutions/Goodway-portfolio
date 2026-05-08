/**
 * One-shot: strip the "(mobile)" / "(office)" .contact-meta spans from
 * footer (and any other) markup across every HTML page. Numbers stay,
 * labels go. Idempotent — safe to re-run.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function walk(dir, out) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) {
      if (f.name === 'node_modules' || f.name.startsWith('.')) continue;
      walk(p, out);
    } else if (f.isFile() && f.name.endsWith('.html')) {
      out.push(p);
    }
  }
  return out;
}

const files = walk(ROOT, []);
let touched = 0;

for (const file of files) {
  let src = fs.readFileSync(file, 'utf8');
  const before = src;

  /* Remove the labels and the leading single space that precedes them.
     The pattern handles "(mobile)" and "(office)" variants. Anchored on
     the .contact-meta class so we don't accidentally hit prose elsewhere. */
  src = src.replace(/\s*<span class="contact-meta">\(mobile\)<\/span>/g, '');
  src = src.replace(/\s*<span class="contact-meta">\(office\)<\/span>/g, '');

  if (src !== before) {
    fs.writeFileSync(file, src, 'utf8');
    touched++;
    console.log('  ✓ ' + path.relative(ROOT, file).replace(/\\/g, '/'));
  }
}
console.log('\n  ' + touched + ' file(s) updated.');
