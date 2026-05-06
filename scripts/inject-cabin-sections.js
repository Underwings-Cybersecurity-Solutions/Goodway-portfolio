/**
 * Reads assets/images/sections/divisions/portable-cabins/catalogue.json
 * and writes 12 per-category sections into divisions/portable-cabins.html,
 * replacing the simple <!-- 3b. GALLERY --> block.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOGUE = path.join(ROOT, 'assets', 'images', 'sections', 'divisions', 'portable-cabins', 'catalogue.json');
const PAGE = path.join(ROOT, 'divisions', 'portable-cabins.html');

const cats = JSON.parse(fs.readFileSync(CATALOGUE, 'utf8'));

let i = 0;
const sections = cats.map(c => {
  i++;
  const num = String(i).padStart(2, '0');
  const stripe = i % 2 === 1 ? 'ivory' : 'linen';
  const isFirstImageWide = c.images.length === 2;
  const galleryClass = isFirstImageWide ? 'gw-cabin-cat__gallery gw-cabin-cat__gallery--two' : 'gw-cabin-cat__gallery';
  const imgs = c.images.map((im, idx) => {
    const alt = c.title.replace(/&amp;/g, '&').replace(/&[a-z]+;/g, '') + ' — photo ' + (idx + 1);
    return `          <figure class="gw-cabin-cat__photo">
            <img src="../assets/images/sections/divisions/portable-cabins/${c.slug}/${im.file}" alt="${alt}" loading="lazy" decoding="async" width="1200" height="900">
          </figure>`;
  }).join('\n');

  const bullets = c.bullets.map(b => `          <li>${b}</li>`).join('\n');

  return `  <!-- CATEGORY ${num} · ${c.slug} -->
  <section class="gw-block gw-block--${stripe} gw-cabin-cat" id="cat-${c.slug}" aria-labelledby="cat-${c.slug}-title">
    <div class="container">
      <header class="gw-cabin-cat__head">
        <div class="gw-cabin-cat__num">${num}</div>
        <div class="gw-cabin-cat__heading">
          <div class="gw-block__eyebrow">// Container catalogue</div>
          <h2 id="cat-${c.slug}-title" class="gw-block__title">${c.title}</h2>
          <p class="gw-block__lede">${c.lede}</p>
          <ul class="gw-cabin-cat__bullets">
${bullets}
          </ul>
        </div>
      </header>
      <div class="${galleryClass}">
${imgs}
      </div>
    </div>
  </section>
`;
}).join('\n');

const intro = `  <!-- 3b. CONTAINER CATALOGUE — 12 product sections, one per category -->
  <section class="gw-block gw-block--navy gw-cabin-intro" aria-labelledby="catalogue-intro">
    <div class="container">
      <header class="gw-block__header">
        <div class="gw-block__eyebrow">// The full container range</div>
        <h2 id="catalogue-intro" class="gw-block__title">Twelve container categories &mdash; built in Mussafah, deployed across the UAE.</h2>
        <p class="gw-block__lede">Beyond ablution units and site offices, Goodway fabricates and supplies a wider range of containerised modules. Each category below has its own typical specification, certification context and use cases &mdash; click through or scroll to see the catalogue. All photos are from our Mussafah Industrial Area, M-14 yard.</p>
      </header>
      <nav class="gw-cabin-intro__chips" aria-label="Container categories">
${cats.map((c, idx) => `        <a class="gw-cabin-intro__chip" href="#cat-${c.slug}"><span class="gw-cabin-intro__chip-num">${String(idx + 1).padStart(2, '0')}</span><span>${c.title}</span></a>`).join('\n')}
      </nav>
    </div>
  </section>
`;

const replacement = intro + '\n' + sections;

let html = fs.readFileSync(PAGE, 'utf8');
const startMarker = /  <!-- 3b\. (?:GALLERY|CONTAINER CATALOGUE)[\s\S]*?<!-- 4\. SALE/;
if (!startMarker.test(html)) {
  console.error('Could not find 3b. ... 4. SALE markers — aborting.');
  process.exit(1);
}
html = html.replace(startMarker, replacement + '\n  <!-- 4. SALE');
fs.writeFileSync(PAGE, html, 'utf8');
console.log('Injected', cats.length, 'category sections into', path.relative(ROOT, PAGE));
