/**
 * Processes EVERY photo in _tmp_goodway_zip/GOOD WAY/<category>/* into
 * web-ready WebP files at assets/images/sections/divisions/portable-
 * cabins/<slug>/NN.webp, plus the three top-of-page hero variants.
 *
 *   65 source PNG-disguised JPEGs (~120 MB) → ~70 WebPs (~3 MB)
 *
 * Slug + display-name + description manifest is the source of truth
 * for the page generator script (process-portable-cabins-html.js).
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, '_tmp_goodway_zip', 'GOOD WAY');
const OUT = path.join(ROOT, 'assets', 'images', 'sections', 'divisions', 'portable-cabins');
fs.mkdirSync(OUT, { recursive: true });

const categories = [
  { folder: '1',                              slug: 'ablution-unit',         title: 'Ablution &amp; shower cabins',
    lede: 'Single and multi-stall portable toilet/shower units for construction sites, oilfield camps and remote yards. Each unit ships with an integrated 1,000 L water tank, septic tank, wall-mounted split A/C, external staircase with handrail and Goodway branding.',
    bullets: [
      'Single-stall WC cabins (man-portable)',
      '2-, 4- and 6-stall ablution + shower blocks',
      'Integrated water tank + septic tank',
      'Wall-mounted split A/C standard',
      'External staircase with handrail',
      'Goodway-branded label plate'
    ] },
  { folder: 'CUSTOMIZED MODULE',              slug: 'customized-module',     title: 'Customized modular builds',
    lede: 'Bespoke module fabrication to client specification &mdash; mixed-use cabins, multi-room layouts, branded exteriors, integrated services. Send us a sketch or BOQ and we build to drawing in 2&ndash;4 weeks.',
    bullets: [
      'Build-to-drawing fabrication',
      'Mixed-use layouts (office + store + plant)',
      'Custom widths, partitioning, doors',
      'Client livery &amp; branding',
      'Integrated services (water, power, HVAC)',
      'Two- to four-week typical lead time'
    ] },
  { folder: 'DATA CENTRE',                    slug: 'data-centre',           title: 'Containerised data centres',
    lede: 'Plug-and-play modular data halls for edge computing, oilfield IT and remote operations centres. Factory-built, ruggedised, climate-controlled with redundant cooling and fire suppression. Deployed to site as a single craned lift.',
    bullets: [
      'Pre-cabled racks &amp; cable trays',
      'Precision in-row cooling',
      'FM-200 / inert-gas fire suppression',
      'UPS + generator interface ready',
      'Access control &amp; CCTV-ready',
      'Climate-rated for UAE outdoor deployment'
    ] },
  { folder: 'E-HOUSE',                        slug: 'e-house',               title: 'Electrical e-houses',
    lede: 'Pre-fabricated electrical substation / MCC buildings housing switchgear, transformers and control systems. Factory-tested as a single unit before delivery, dramatically reducing on-site electrical work for oil &amp; gas, power, mining and large industrial projects.',
    bullets: [
      'LV / MV switchgear &amp; MCC packages',
      'Dry-type / oil-filled transformers',
      'Integrated control rooms &amp; cable galleries',
      'HVAC, lighting, fire detection',
      'FAT (factory acceptance test) before shipping',
      'Single-lift deployment to site'
    ] },
  { folder: 'ISO DRY CARGO CONTAINER',        slug: 'iso-dry-cargo',         title: 'ISO dry-cargo containers',
    lede: 'Standard 20 ft and 40 ft ISO-spec containers for general cargo, project freight and storage. Can be modified for spares stores, deployment kits, document archives or one-off project equipment crates.',
    bullets: [
      '20 ft and 40 ft ISO certified',
      'CSC plate, weather-tight gaskets',
      'Lockable double cargo doors',
      'Optional ventilation, lighting, racks',
      'Custom paint &amp; livery on request',
      'CW-grade hardwood flooring'
    ] },
  { folder: 'MUD SKIP WASTE SKIP FRAME',      slug: 'mud-skip',              title: 'Mud skips &amp; waste skip frames',
    lede: 'Drilling waste collection skips and frames for oil &amp; gas operations. Designed to handle drilling mud, rock cuttings and hazardous waste at active well sites. Crane-liftable, sealed, certified for offshore handling.',
    bullets: [
      'Drilling-mud and cuttings collection',
      'Sealed, leak-tight construction',
      'Crane-lift padeyes &amp; forklift pockets',
      'Frame variants for skip-stacking',
      'DNV / EN 12079 certified options',
      'Sized for rig-deck rotation'
    ] },
  { folder: 'OFFSHORE BASKET',                slug: 'offshore-basket',       title: 'Offshore lifting baskets',
    lede: 'DNV / EN-12079-certified lifting baskets for offshore platform supply. Used to transfer cargo from supply vessels to rig decks via crane &mdash; the workhorse asset of any offshore logistics operation.',
    bullets: [
      'DNV 2.7-1 / EN 12079 certified',
      'Cargo capacities from 2 t to 12 t',
      'Half-height, full-height &amp; mesh variants',
      'Heavy-duty padeyes + sling sets',
      'Forklift pockets for yard handling',
      'Periodic re-certification supported'
    ] },
  { folder: 'OFFSHORE DRY CARGO CONTAINER',   slug: 'offshore-dry-cargo',    title: 'Offshore dry-cargo containers',
    lede: 'DNV-certified containers reinforced for offshore use &mdash; rated for crane lifting in sea state, marine transport and rig-deck stacking. For tools, spares and project equipment heading to platforms or supply yards.',
    bullets: [
      'DNV 2.7-1 offshore rated',
      'Reinforced corner posts &amp; padeyes',
      'Lashing points for sea fastening',
      '10 ft, 20 ft and bespoke footprints',
      'Marine-grade paint system',
      'Periodic re-certification supported'
    ] },
  { folder: 'OFFSHORE REEFER',                slug: 'offshore-reefer',       title: 'Offshore refrigerated containers',
    lede: 'DNV-certified refrigerated containers for offshore use. Temperature-controlled storage of food, samples and perishables on platforms and supply vessels. Built for the marine environment, certified for crane lift in sea state.',
    bullets: [
      'DNV 2.7-1 offshore rated',
      'Temperature range -25&deg;C to +25&deg;C',
      'Marine-rated refrigeration unit',
      'Stainless / GRP interior options',
      'Heavy-duty padeyes &amp; lashing points',
      'Onboard data-logger option'
    ] },
  { folder: 'PRESSURIZED EX CABIN',           slug: 'pressurized-ex-cabin',  title: 'Pressurized Ex (explosion-proof) cabins',
    lede: 'Explosion-proof pressurised cabins for hazardous-area work in Zone 1 / Zone 2 atmospheres. Internal positive pressurisation prevents flammable gas ingress, certifying the interior as safe for personnel and electronics in oil &amp; gas, petrochemical and refinery environments.',
    bullets: [
      'ATEX / IECEx Zone 1 / Zone 2 certified',
      'Continuous pressurisation system',
      'Gas-detection interlock with shutdown',
      'Use cases: control rooms, analyzer shelters',
      'Welding habitats &amp; technician shelters',
      'Air-conditioning sized for hot climate'
    ] },
  { folder: 'RADIOACTIVE BOX',                slug: 'radioactive-box',       title: 'Certified radioactive transport boxes',
    lede: 'IAEA / ADR-compliant containers for radioactive-material transport &mdash; including NORM (Naturally Occurring Radioactive Material) waste from oilfield operations and sealed industrial gamma sources. Lead-shielded, sealed, regulator-approved for road and sea transit.',
    bullets: [
      'IAEA SSR-6 / ADR Class 7 compliant',
      'Lead / steel shielded as specified',
      'Tamper-evident closure',
      'NORM disposal &amp; sealed-source transport',
      'Activity placards / labelling',
      'Documentation pack on request'
    ] },
  { folder: 'SHORE POWER CONTAINER',          slug: 'shore-power',           title: 'Shore-power containers',
    lede: 'Containerised shore-power supply for vessels at port. Lets ships shut down on-board generators while berthed, drastically cutting fuel use, emissions and noise. Built to ISO / IEC 80005 cold-ironing standard.',
    bullets: [
      'IEC / ISO 80005 cold-ironing compliant',
      'HV / LV variants &amp; multi-vessel feeds',
      'Frequency converter (50 / 60 Hz)',
      'Containerised plug-and-play deployment',
      'Switchgear, protection, metering integrated',
      'Reduces port emissions &amp; fuel burn'
    ] },
];

async function emit(src, outPath, w, h, fit) {
  await sharp(src)
    .rotate()
    .resize({ width: w, height: h, fit: fit || 'cover', position: 'attention' })
    .webp({ quality: 78, effort: 5 })
    .toFile(outPath);
  return fs.statSync(outPath).size;
}

(async function () {
  let totalKB = 0;
  let count = 0;

  // Hero / card-hero / detail come from the ablution folder.
  const ablutionDir = path.join(SRC, '1');
  const ablutionFiles = fs.readdirSync(ablutionDir).filter(f => /\.(png|jpe?g)$/i.test(f)).sort();
  totalKB += await emit(path.join(ablutionDir, ablutionFiles[0]), path.join(OUT, 'hero.webp'),       1600, 900);
  totalKB += await emit(path.join(ablutionDir, ablutionFiles[0]), path.join(OUT, 'card-hero.webp'),   960, 720);
  totalKB += await emit(path.join(ablutionDir, ablutionFiles[1] || ablutionFiles[0]), path.join(OUT, 'detail.webp'), 960, 720);
  count += 3;

  // Per-category folders — ALL photos.
  for (const c of categories) {
    const dir = path.join(SRC, c.folder);
    if (!fs.existsSync(dir)) { console.warn('  · MISSING:', c.folder); continue; }
    const files = fs.readdirSync(dir)
      .filter(f => /\.(png|jpe?g)$/i.test(f))
      .sort((a, b) => {
        // Natural sort so IMAGE 2 comes before IMAGE 10.
        const na = parseInt((a.match(/(\d+)/) || [0,0])[1], 10);
        const nb = parseInt((b.match(/(\d+)/) || [0,0])[1], 10);
        return na - nb || a.localeCompare(b);
      });
    const catOut = path.join(OUT, c.slug);
    fs.mkdirSync(catOut, { recursive: true });
    c.images = [];
    let i = 1;
    for (const f of files) {
      const out = path.join(catOut, String(i).padStart(2, '0') + '.webp');
      const sz = await emit(path.join(dir, f), out, 1200, 900);
      c.images.push({ file: String(i).padStart(2, '0') + '.webp', kb: (sz / 1024).toFixed(1) });
      totalKB += sz;
      count++;
      i++;
    }
    console.log('  ✓', c.slug, '·', c.images.length, 'photos');
  }

  fs.writeFileSync(
    path.join(OUT, 'catalogue.json'),
    JSON.stringify(categories, null, 2)
  );
  console.log('\n  Wrote catalogue.json');
  console.log('  Total: ' + count + ' WebPs, ' + (totalKB / 1024 / 1024).toFixed(2) + ' MB');
})().catch(e => { console.error(e); process.exit(1); });
