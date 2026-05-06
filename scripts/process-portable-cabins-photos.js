/**
 * One-shot: take the photos in _tmp_goodway_zip/GOOD WAY/* and emit
 * web-ready WebP variants into assets/images/sections/divisions/
 * portable-cabins/. Runs `sharp` on each picked photo to resize +
 * compress; the originals (1-3 MB PNG-disguised JPEGs) become
 * 80-200 KB WebPs.
 *
 * Outputs:
 *   - hero.webp           1600x900   (full-bleed editorial)
 *   - card-hero.webp       960x720   (homepage / services / who-we-are)
 *   - detail.webp          960x720   (who-we-are right tile)
 *   - gallery/<slug>.webp  800x600   (one per product category)
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, '_tmp_goodway_zip', 'GOOD WAY');
const OUT = path.join(ROOT, 'assets', 'images', 'sections', 'divisions', 'portable-cabins');
const GAL = path.join(OUT, 'gallery');
fs.mkdirSync(GAL, { recursive: true });

// Pick one hero per category (always IMAGE 1 from the folder).
const picks = [
  { folder: '1',                              slug: 'ablution-unit',         label: 'Goodway portable ablution & shower cabin' },
  { folder: 'CUSTOMIZED MODULE',              slug: 'customized-module',     label: 'Customized modular container build' },
  { folder: 'DATA CENTRE',                    slug: 'data-centre',           label: 'Containerised data centre' },
  { folder: 'E-HOUSE',                        slug: 'e-house',               label: 'Electrical e-house container' },
  { folder: 'ISO DRY CARGO CONTAINER',        slug: 'iso-dry-cargo',         label: 'ISO dry-cargo container' },
  { folder: 'MUD SKIP WASTE SKIP FRAME',      slug: 'mud-skip',              label: 'Mud skip / waste skip frame' },
  { folder: 'OFFSHORE BASKET',                slug: 'offshore-basket',       label: 'Offshore lifting basket' },
  { folder: 'OFFSHORE DRY CARGO CONTAINER',   slug: 'offshore-dry-cargo',    label: 'Offshore dry-cargo container' },
  { folder: 'OFFSHORE REEFER',                slug: 'offshore-reefer',       label: 'Offshore refrigerated container' },
  { folder: 'PRESSURIZED EX CABIN',           slug: 'pressurized-ex-cabin',  label: 'Pressurized Ex (explosion-proof) cabin' },
  { folder: 'RADIOACTIVE BOX',                slug: 'radioactive-box',       label: 'Certified radioactive transport box' },
  { folder: 'SHORE POWER CONTAINER',          slug: 'shore-power',           label: 'Shore-power container' },
];

function pickFile(folder) {
  const dir = path.join(SRC, folder);
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => /\.(png|jpe?g)$/i.test(f)).sort();
  // Prefer the one ending IMAGE 1
  const image1 = files.find(f => /\bIMAGE\s*1\b/i.test(f));
  return path.join(dir, image1 || files[0]);
}

async function emit(src, outPath, w, h) {
  await sharp(src)
    .rotate()
    .resize({ width: w, height: h, fit: 'cover', position: 'attention' })
    .webp({ quality: 78, effort: 5 })
    .toFile(outPath);
  const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log('  ✓', path.relative(ROOT, outPath), kb, 'KB');
}

(async function () {
  // 1. Hero / card-hero / detail come from the "1" folder (the
  //    iconic Goodway ablution-unit photos that started this task).
  const ablutionA = pickFile('1');
  const ablutionAll = fs.readdirSync(path.join(SRC, '1')).filter(f => /\.(png|jpe?g)$/i.test(f)).sort();
  const ablutionB = path.join(SRC, '1', ablutionAll[1] || ablutionAll[0]);

  await emit(ablutionA, path.join(OUT, 'hero.webp'),       1600, 900);
  await emit(ablutionA, path.join(OUT, 'card-hero.webp'),   960, 720);
  await emit(ablutionB, path.join(OUT, 'detail.webp'),      960, 720);

  // 2. Gallery — one card per product category.
  for (const p of picks) {
    const src = pickFile(p.folder);
    if (!src) { console.warn('  · MISSING:', p.folder); continue; }
    await emit(src, path.join(GAL, p.slug + '.webp'), 800, 600);
  }

  // Manifest for the HTML generator below.
  fs.writeFileSync(
    path.join(OUT, 'gallery.json'),
    JSON.stringify(picks, null, 2)
  );
  console.log('\n  Wrote gallery.json with', picks.length, 'entries.');
})().catch(e => { console.error(e); process.exit(1); });
