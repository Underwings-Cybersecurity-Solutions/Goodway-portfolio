/**
 * One-shot: replace every occurrence of the old contact email with
 * the new one across the repo. Skip node_modules + .git, but cover
 * HTML, JS, JSON, MD, XML and .env files.
 *
 *   info@goodway.ae  →  info@goodway.ae
 *
 * Idempotent — safe to re-run (a second pass finds nothing).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OLD = 'info@goodway.ae';
const NEW = 'info@goodway.ae';

const EXTS = new Set(['.html', '.js', '.json', '.md', '.xml']);
const ENV_RE = /^\.env(\.|$)/;

function walk(dir, out) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) {
      if (f.name === 'node_modules' || f.name.startsWith('.git')) continue;
      walk(p, out);
    } else if (f.isFile()) {
      const ext = path.extname(f.name).toLowerCase();
      if (EXTS.has(ext) || ENV_RE.test(f.name)) out.push(p);
    }
  }
  return out;
}

const files = walk(ROOT, []);
let touched = 0;
let totalReplacements = 0;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes(OLD)) continue;
  const matches = src.split(OLD).length - 1;
  const next = src.split(OLD).join(NEW);
  fs.writeFileSync(file, next, 'utf8');
  touched++;
  totalReplacements += matches;
  console.log('  ✓ ' + path.relative(ROOT, file).replace(/\\/g, '/') + '  (' + matches + ')');
}
console.log('\n  ' + touched + ' file(s) updated · ' + totalReplacements + ' total replacements.');
