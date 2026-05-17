/**
 * One-shot: rename the footer/contact address label from
 *   "Yard & Office:" → "Operations:"
 * across every HTML page. Idempotent — safe to re-run.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function walk(dir, out) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) {
      if (f.name === 'node_modules' || f.name.startsWith('.git')) continue;
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
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes('Yard &amp; Office:') && !src.includes('Yard & Office:')) continue;
  const next = src
    .replace(/<strong>Yard &amp; Office:<\/strong>/g, '<strong>Operations:</strong>')
    .replace(/<strong>Yard & Office:<\/strong>/g, '<strong>Operations:</strong>')
    .replace(/Yard &amp; Office:/g, 'Operations:')
    .replace(/Yard & Office:/g, 'Operations:');
  fs.writeFileSync(file, next, 'utf8');
  console.log('  ✓ ' + path.relative(ROOT, file).replace(/\\/g, '/'));
  touched++;
}
console.log('\n  ' + touched + ' file(s) updated.');
