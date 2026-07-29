/**
 * One-shot seed: parses the existing principals.html + industries.html
 * and loads the DB with current content. Idempotent — clears + re-inserts
 * when run again. Run with: `npm run seed`.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { db } = require('../db');

const SITE_ROOT = path.resolve(__dirname, '..', process.env.SITE_ROOT || '..');

/* Decode HTML entities for fields stored as plain text (title, subtitle, name,
   country, cta label, chips). Fields that can carry inline HTML (description,
   lede, products, principals_list, icon_svg) stay as-is in the DB. */
function decodePlain(s) {
  return String(s || '')
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
    .replace(/&middot;/g, '·')
    .replace(/&mdash;/g,  '—')
    .replace(/&ndash;/g,  '–')
    .replace(/&nbsp;/g,   ' ')
    .replace(/&egrave;/g, 'è')
    .replace(/&eacute;/g, 'é')
    .replace(/&uuml;/g,   'ü');
}

/* ---------- Principals parsing ---------- */
function parsePrincipalsHtml() {
  const html = fs.readFileSync(path.join(SITE_ROOT, 'principals.html'), 'utf8');
  const cards = [];
  const re = /<article class="gw-brand-card" data-category="([^"]+)" data-group="([^"]+)">([\s\S]*?)<\/article>/g;
  let m, order = 10;
  while ((m = re.exec(html)) !== null) {
    const [, category, group, inner] = m;
    const name    = (inner.match(/<div class="gw-brand-card__name">([\s\S]*?)<\/div>/) || [])[1] || '';
    const countryMatch = inner.match(/<span class="gw-brand-card__country"(?:\s+lang="([^"]+)")?>([^<]+)<\/span>/) || [];
    const countryLang = countryMatch[1] || null;
    const country = countryMatch[2] || '';
    const desc    = (inner.match(/<p class="gw-brand-card__desc">([\s\S]*?)<\/p>/) || [])[1] || '';
    const chipsBlock = (inner.match(/<div class="gw-brand-card__chips">([\s\S]*?)<\/div>/) || [])[1] || '';
    const chips = [...chipsBlock.matchAll(/<span class="gw-chip">([^<]+)<\/span>/g)].map(x => x[1].trim());
    const href    = (inner.match(/<a class="gw-brand-card__cta" href="([^"]+)"/) || [])[1] || '';
    const ctaLabel = (inner.match(/<a class="gw-brand-card__cta"[^>]*>([\s\S]*?)<\/a>/) || [])[1] || 'See products in division';
    const logoSrc = (inner.match(/<img class="gw-brand-card__logo" src="([^"]+)"/) || [])[1] || null;
    cards.push({
      category,
      category_label: decodePlain(group).trim(),
      name: decodePlain(name).trim(),
      country: decodePlain(country).trim(),
      country_lang: countryLang,
      description: desc.trim(),              /* HTML — keep as-is */
      chips: chips.map(decodePlain),
      division_href: href,
      cta_label: decodePlain(ctaLabel).trim(),
      image_path: logoSrc,
      sort_order: order
    });
    order += 10;
  }
  return cards;
}

/* ---------- Sectors parsing ---------- */
function parseIndustriesHtml() {
  const html = fs.readFileSync(path.join(SITE_ROOT, 'industries.html'), 'utf8');
  const items = [];
  const re = /<a href="request-a-quote\.html\?sector=([^"]+)" class="gw-industry" data-tier="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m, order = 10;
  while ((m = re.exec(html)) !== null) {
    const [, slug, tier, inner] = m;
    const iconSvg  = (inner.match(/<div class="gw-industry__icon"[^>]*>([\s\S]*?)<\/div>/) || [])[1] || '';
    const imgMatch = inner.match(/<div class="gw-industry__image"><img src="([^"]+)"[^>]*alt="([^"]*)"/) || [];
    const imagePath = imgMatch[1] || null;
    const imageAlt  = imgMatch[2] || null;
    const tierLabel = (inner.match(/<span class="gw-industry__tier">([^<]+)<\/span>/) || [])[1] || '';
    const titleRaw = (inner.match(/<h3 class="gw-industry__title">([\s\S]*?)<\/h3>/) || [])[1] || '';
    const subMatch = titleRaw.match(/<small[^>]*>\(?([^<]+?)\)?<\/small>/);
    const subtitle = subMatch ? subMatch[1].trim() : null;
    const title    = titleRaw.replace(/<small[\s\S]*?<\/small>/, '').trim();
    const lede     = (inner.match(/<p class="gw-industry__lede">([\s\S]*?)<\/p>/) || [])[1] || '';
    const metaBlock = inner.match(/<dl class="gw-industry__meta">([\s\S]*?)<\/dl>/) || [];
    const dds = [...(metaBlock[1] || '').matchAll(/<dt>([^<]+)<\/dt><dd>([\s\S]*?)<\/dd>/g)];
    const products = (dds.find(d => /products/i.test(d[1])) || [])[2] || '';
    const principalsList = (dds.find(d => /principal/i.test(d[1])) || [])[2] || '';
    const ctaLabel = (inner.match(/<span class="gw-industry__cta">([^<]+)<\/span>/) || [])[1] || 'Request supply';
    items.push({
      slug,
      title: decodePlain(title).trim(),
      subtitle: subtitle ? decodePlain(subtitle).trim() : null,
      tier,
      tier_label: decodePlain(tierLabel).trim(),
      lede: lede.trim(),                         /* HTML-capable — keep raw */
      products: products.trim(),                 /* HTML-capable — keep raw */
      principals_list: principalsList.trim(),    /* HTML-capable — keep raw */
      cta_label: decodePlain(ctaLabel).trim(),
      icon_svg: iconSvg.trim(),
      image_path: imagePath,
      image_alt: imageAlt,
      sort_order: order
    });
    order += 10;
  }
  return items;
}

/* ---------- Careers parsing (managed job cards on careers.html) ---------- */
function parseCareersHtml() {
  const file = path.join(SITE_ROOT, 'careers.html');
  if (!fs.existsSync(file)) return [];
  const html = fs.readFileSync(file, 'utf8');
  const start = html.indexOf('<!-- GW-CAREERS-START -->');
  const end = html.indexOf('<!-- GW-CAREERS-END -->');
  if (start === -1 || end === -1 || end < start) return [];
  const block = html.slice(start, end);
  const TYPE_KEY = { 'Full-time': 'full-time', 'Part-time': 'part-time', 'Contract': 'contract', 'Internship': 'internship' };
  const jobs = [];
  const re = /<article class="gw-job" id="job-([^"]+)"([^>]*)>([\s\S]*?)<\/article>/g;
  let m, order = 10;
  while ((m = re.exec(block)) !== null) {
    const slug = m[1], attrs = m[2] || '', inner = m[3];
    const closing_date = (attrs.match(/data-closes="([^"]+)"/) || [])[1] || '';
    const title = decodePlain((inner.match(/<h3 class="gw-job__title">([\s\S]*?)<\/h3>/) || [])[1] || '').trim();
    const typeLabel = (inner.match(/<span class="gw-job__type">([^<]*)<\/span>/) || [])[1] || 'Full-time';
    const metaParts = ((inner.match(/<div class="gw-job__meta">([\s\S]*?)<\/div>/) || [])[1] || '')
      .split('&middot;').map(s => decodePlain(s).trim());
    const summary = decodePlain((inner.match(/<p class="gw-job__summary">([\s\S]*?)<\/p>/) || [])[1] || '').trim();
    const description = ((inner.match(/<div class="gw-job__desc">([\s\S]*?)<\/div>\s*<\/details>/) || [])[1] || '').trim();
    jobs.push({
      slug: slug,
      title: title,
      department: metaParts[0] || '',
      location: metaParts[1] || '',
      employment_type: TYPE_KEY[typeLabel.trim()] || 'full-time',
      closing_date: closing_date,
      summary: summary,
      description: description,        /* HTML — keep raw */
      sort_order: order
    });
    order += 10;
  }
  return jobs;
}

/* ---------- Run ---------- */
function slugify(s) {
  return String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

const principals = parsePrincipalsHtml();
const sectors    = parseIndustriesHtml();
const jobs       = parseCareersHtml();

console.log('Parsed ' + principals.length + ' principals + ' + sectors.length + ' sectors + ' + jobs.length + ' jobs.');

const tx = db.transaction(function () {
  db.exec('DELETE FROM principals; DELETE FROM sectors;');
  const insP = db.prepare(`
    INSERT INTO principals (slug, name, country, country_lang, category, category_label, description,
                             chips_json, division_href, cta_label, image_path, sort_order, is_published)
    VALUES (@slug, @name, @country, @country_lang, @category, @category_label, @description,
            @chips_json, @division_href, @cta_label, @image_path, @sort_order, 1)
  `);
  principals.forEach(function (p) {
    insP.run({
      slug: slugify(p.name),
      name: p.name,
      country: p.country,
      country_lang: p.country_lang,
      category: p.category,
      category_label: p.category_label,
      description: p.description,
      chips_json: JSON.stringify(p.chips),
      division_href: p.division_href,
      cta_label: p.cta_label,
      image_path: p.image_path,
      sort_order: p.sort_order
    });
  });

  const insS = db.prepare(`
    INSERT INTO sectors (slug, title, subtitle, tier, tier_label, lede, products, principals_list,
                         cta_label, icon_svg, image_path, image_alt, sort_order, is_published)
    VALUES (@slug, @title, @subtitle, @tier, @tier_label, @lede, @products, @principals_list,
            @cta_label, @icon_svg, @image_path, @image_alt, @sort_order, 1)
  `);
  sectors.forEach(function (s) { insS.run(s); });

  db.exec('DELETE FROM jobs;');
  const insJ = db.prepare(`
    INSERT INTO jobs (slug, title, department, location, employment_type, closing_date, summary, description, sort_order, is_published)
    VALUES (@slug, @title, @department, @location, @employment_type, @closing_date, @summary, @description, @sort_order, 1)
  `);
  jobs.forEach(function (j) { insJ.run(j); });
});
tx();

console.log('Seed complete. DB at ' + require('../db').DB_PATH);
