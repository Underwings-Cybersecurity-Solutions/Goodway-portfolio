/**
 * One-shot sweep: move "Portable Cabins & Site Containers" from
 * position 10 to position 3 in the Divisions dropdown across every
 * page that carries the dropdown.
 *
 * New order:
 *   01. Scientific & Lab Instrumentation
 *   02. Mechanical Items
 *   03. Portable Cabins & Site Containers   ← promoted (was #10)
 *   04. Electrical
 *   05. Instrumentation
 *   06. Building Material
 *   07. Chemicals & Power
 *   08. Heavy Equipment & Spares
 *   09. Road & Industrial Safety
 *   10. Office Equipment & Stationery
 *
 * Idempotent — safe to re-run.
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

  if (!src.includes('class="nav-menu w-nav-menu"')) continue;

  // Match the entire dropdown nav block; pull out lines and reorder.
  const blockRe = /(<nav class="w-dropdown-list" aria-label="Divisions">)([\s\S]*?)(<\/nav>\s*<\/div>)/;
  const m = src.match(blockRe);
  if (!m) continue;

  const inner = m[2];
  const lines = inner.match(/<a [^>]*class="w-dropdown-link[^"]*"[^>]*>[^<]*<\/a>/g);
  if (!lines || lines.length < 2) continue;

  // Find the Portable Cabins line. If it's missing or already at index 2, no-op.
  const cabinIdx = lines.findIndex(l => /portable-cabins/i.test(l));
  if (cabinIdx === -1) continue;
  if (cabinIdx === 2) continue; // already in position 3 (0-indexed = 2)

  const cabinLine = lines.splice(cabinIdx, 1)[0];
  lines.splice(2, 0, cabinLine);

  const newInner = '\n            ' + lines.join('\n            ') + '\n          ';
  const replacement = m[1] + newInner + m[3];
  src = src.replace(blockRe, replacement);

  if (src !== before) {
    fs.writeFileSync(file, src, 'utf8');
    touched++;
    console.log('  ✓', path.relative(ROOT, file).replace(/\\/g, '/'));
  }
}
console.log('\n  ' + touched + ' file(s) updated.');
