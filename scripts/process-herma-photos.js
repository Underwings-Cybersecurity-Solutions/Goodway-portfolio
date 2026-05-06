/**
 * Processes HERMA product photos in _tmp_herma_zip/HERMA/* into web-
 * ready WebP files at assets/images/principals/herma/<slug>/NN.webp.
 * Source files use the convention "<CATEGORY KEYWORDS> IMAGE N.<ext>".
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, '_tmp_herma_zip', 'HERMA');
const OUT = path.join(ROOT, 'assets', 'images', 'principals', 'herma');
fs.mkdirSync(OUT, { recursive: true });

const categories = [
  { slug: 'paper',
    title: 'Self-adhesive material &amp; paper rolls',
    lede: 'Coated face material in rolls for converters and label printers &mdash; the raw stock that downstream presses turn into finished labels. Available in paper, polyester, polyethylene and polypropylene faces with a range of adhesives and liners.',
    bullets: ['Paper / PE / PP / PET face material', 'Permanent &amp; removable adhesives', 'Glassine + PET liner options', 'Custom widths &amp; roll diameters', 'Reach / FDA / RoHS compliant', 'Rolls cut to converter spec'],
    matcher: /paper|stock|roll|material/i },
  { slug: 'label',
    title: 'Office, address &amp; industrial labels',
    lede: 'A4 sheet labels for office printing plus industrial-grade labels for asset, cable, pipe and packaging marking. The range covers everything from a 100-pack of mailing labels for a desk inkjet up to UV- and chemical-resistant tags for oilfield equipment.',
    bullets: ['Universal A4 sheet labels (laser / inkjet)', 'Address &amp; mailing labels', 'Filing &amp; archiving', 'Industrial asset / cable / pipe labels', 'UV / water / chemical resistant grades', 'Custom die-cut shapes'],
    matcher: /\blabel\b(?!ing)/i },
  { slug: 'labeling-machine',
    title: 'Labelling machines &amp; applicator systems',
    lede: 'Inline industrial labelling machinery &mdash; wrap-around, top &amp; side application, high-speed inline systems. Built in Germany, supported in the UAE through Goodway as the authorised distribution channel.',
    bullets: ['Roll-fed wrap-around labellers', 'Top &amp; side application heads', 'High-speed inline integration', 'Modular adapters for existing lines', 'Spare parts &amp; consumables stocked', 'Service &amp; commissioning support'],
    matcher: /labelling|labeling.*machine|machine|applicator/i },
];

async function emit(src, outPath, w, h) {
  await sharp(src)
    .rotate()
    .resize({ width: w, height: h, fit: 'cover', position: 'attention' })
    .webp({ quality: 80, effort: 5 })
    .toFile(outPath);
  return fs.statSync(outPath).size;
}

(async function () {
  if (!fs.existsSync(SRC)) {
    console.error('Source folder missing: ' + SRC);
    process.exit(1);
  }
  const files = fs.readdirSync(SRC).filter(f => /\.(png|jpe?g)$/i.test(f));
  console.log('Source files:', files.length);

  for (const c of categories) {
    const dir = path.join(OUT, c.slug);
    fs.mkdirSync(dir, { recursive: true });
    /* match files for this category, then sort by trailing number */
    const matched = files
      .filter(f => c.matcher.test(f))
      /* don't double-count: labels matcher must NOT also match labelling */
      .filter(f => !(c.slug === 'label' && /labelling|labeling/i.test(f)))
      .sort((a, b) => {
        const na = parseInt((a.match(/(\d+)/) || [0, 0])[1], 10);
        const nb = parseInt((b.match(/(\d+)/) || [0, 0])[1], 10);
        return na - nb || a.localeCompare(b);
      });
    c.images = [];
    let i = 1;
    for (const f of matched) {
      const out = path.join(dir, String(i).padStart(2, '0') + '.webp');
      await emit(path.join(SRC, f), out, 1200, 900);
      c.images.push({ file: String(i).padStart(2, '0') + '.webp' });
      i++;
    }
    console.log('  ✓', c.slug, '→', c.images.length, 'photos');
  }

  fs.writeFileSync(path.join(OUT, 'catalogue.json'), JSON.stringify(categories, null, 2));
  console.log('\nWrote catalogue.json');
})().catch(e => { console.error(e); process.exit(1); });
