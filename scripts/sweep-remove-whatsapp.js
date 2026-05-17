/**
 * One-shot: remove the footer-block WhatsApp link
 *   "+971 2 245 0497 · WhatsApp"  →  "+971 2 245 0497"
 * Strips the " &middot; <a href="https://wa.me/...">WhatsApp</a>" suffix
 * that follows the office-phone tel: link in every footer.
 *
 * Does NOT touch:
 *   - The floating WhatsApp bubble (different markup)
 *   - The contact-page CTA "WhatsApp" link in the main panel
 *
 * Idempotent.
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
  let src = fs.readFileSync(file, 'utf8');
  const before = src;

  /* Match the office-phone line trailing with " &middot; <a ...wa.me...>WhatsApp</a>"
     and trim the separator + link, keeping the phone tel: link intact. */
  src = src.replace(
    /(<a href="tel:\+97122450497">\+971 2 245 0497<\/a>)\s*&middot;\s*<a href="https:\/\/wa\.me\/971564423539[^"]*"[^>]*>WhatsApp<\/a>/g,
    '$1'
  );

  if (src !== before) {
    fs.writeFileSync(file, src, 'utf8');
    touched++;
    console.log('  ✓ ' + path.relative(ROOT, file).replace(/\\/g, '/'));
  }
}
console.log('\n  ' + touched + ' file(s) updated.');
