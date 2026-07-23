const express = require('express');
const { db, logAudit } = require('../db');
const { ensureCsrf, verifyCsrf } = require('../middleware/auth');
const { handleImageUpload, publicPath, removeUpload } = require('../middleware/uploads');
const { writePrincipals } = require('../scripts/build-pages');

const router = express.Router();

/* Scoped publish — regenerates ONLY principals.html between its markers. */
router.post('/publish', ensureCsrf, verifyCsrf, function (req, res) {
  try {
    writePrincipals();
    const n = db.prepare('SELECT COUNT(*) AS n FROM principals WHERE is_published = 1').get().n;
    logAudit(req.session.user.username, 'publish', 'principals', null, 'count=' + n);
    req.session.flash = [{ kind: 'success', msg: 'Principals page published — ' + n + ' brands live. Nothing else was changed.' }];
  } catch (e) {
    console.error(e);
    req.session.flash = [{ kind: 'error', msg: 'Publish failed: ' + e.message }];
  }
  res.redirect('/admin/principals');
});

const CATEGORIES = [
  { key: 'chemicals',   label: 'Chemicals & Power' },
  { key: 'electrical',  label: 'Electrical' },
  { key: 'instruments', label: 'Instruments & Lab' },
  { key: 'industrial',  label: 'Industrial & Safety' }
];

function parseChips(raw) {
  if (!raw) return [];
  return String(raw).split(/[\n,]/).map(s => s.trim()).filter(Boolean).slice(0, 8);
}

function slugify(s) {
  return String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

router.get('/', ensureCsrf, function (_req, res) {
  const rows = db.prepare(`
    SELECT id, slug, name, country, category, category_label, is_published, sort_order
    FROM principals ORDER BY sort_order ASC, name ASC
  `).all();
  res.render('principals/list', { rows, categories: CATEGORIES, active: 'principals' });
});

router.get('/new', ensureCsrf, function (_req, res) {
  res.render('principals/edit', {
    row: { id: null, slug: '', name: '', country: '', country_lang: '', category: 'chemicals',
           category_label: 'Chemicals & Power', description: '', chips_json: '[]', division_href: '',
           sort_order: 0, is_published: 1 },
    categories: CATEGORIES,
    active: 'principals'
  });
});

router.get('/:id/edit', ensureCsrf, function (req, res) {
  const row = db.prepare('SELECT * FROM principals WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).render('error', { code: 404, msg: 'Not found', active: '' });
  res.render('principals/edit', { row, categories: CATEGORIES, active: 'principals' });
});

router.post('/new', ensureCsrf, handleImageUpload('/admin/principals'), verifyCsrf, function (req, res) {
  const b = req.body;
  const categoryMeta = CATEGORIES.find(c => c.key === b.category) || CATEGORIES[0];
  const chips = parseChips(b.chips);
  const slug = (b.slug && b.slug.trim()) || slugify(b.name);
  const info = db.prepare(`
    INSERT INTO principals (slug, name, country, country_lang, category, category_label, description,
                             chips_json, division_href, image_path, sort_order, is_published)
    VALUES (@slug, @name, @country, @country_lang, @category, @category_label, @description,
            @chips_json, @division_href, @image_path, @sort_order, @is_published)
  `).run({
    slug,
    name: (b.name || '').trim(),
    country: (b.country || '').trim(),
    country_lang: (b.country_lang || '').trim() || null,
    category: categoryMeta.key,
    category_label: categoryMeta.label,
    description: (b.description || '').trim(),
    chips_json: JSON.stringify(chips),
    division_href: (b.division_href || '').trim(),
    image_path: req.file ? publicPath(req.file.filename) : null,
    sort_order: parseInt(b.sort_order, 10) || 0,
    is_published: b.is_published ? 1 : 0
  });
  logAudit(req.session.user.username, 'create', 'principal', info.lastInsertRowid, (b.name || '').slice(0, 80));
  req.session.flash = [{ kind: 'success', msg: 'Principal created. Remember to Publish to regenerate the site.' }];
  res.redirect('/admin/principals');
});

router.post('/:id/edit', ensureCsrf, handleImageUpload('/admin/principals'), verifyCsrf, function (req, res) {
  const b = req.body;
  const row = db.prepare('SELECT * FROM principals WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).render('error', { code: 404, msg: 'Not found', active: '' });
  const categoryMeta = CATEGORIES.find(c => c.key === b.category) || CATEGORIES[0];
  const chips = parseChips(b.chips);
  /* Image: a new upload replaces (and deletes) the old; "remove" clears it;
     otherwise the existing logo is kept. */
  let imagePath = row.image_path;
  if (req.file) {
    if (row.image_path) removeUpload(row.image_path);
    imagePath = publicPath(req.file.filename);
  } else if (b.remove_image) {
    if (row.image_path) removeUpload(row.image_path);
    imagePath = null;
  }
  db.prepare(`
    UPDATE principals SET
      slug = @slug, name = @name, country = @country, country_lang = @country_lang,
      category = @category, category_label = @category_label, description = @description,
      chips_json = @chips_json, division_href = @division_href, image_path = @image_path,
      sort_order = @sort_order, is_published = @is_published
    WHERE id = @id
  `).run({
    id: row.id,
    slug: (b.slug || row.slug).trim(),
    name: (b.name || '').trim(),
    country: (b.country || '').trim(),
    country_lang: (b.country_lang || '').trim() || null,
    category: categoryMeta.key,
    category_label: categoryMeta.label,
    description: (b.description || '').trim(),
    chips_json: JSON.stringify(chips),
    division_href: (b.division_href || '').trim(),
    image_path: imagePath,
    sort_order: parseInt(b.sort_order, 10) || 0,
    is_published: b.is_published ? 1 : 0
  });
  logAudit(req.session.user.username, 'update', 'principal', row.id, row.name);
  req.session.flash = [{ kind: 'success', msg: 'Saved. Click Publish to regenerate the live site.' }];
  res.redirect('/admin/principals/' + row.id + '/edit');
});

router.post('/:id/delete', ensureCsrf, verifyCsrf, function (req, res) {
  const row = db.prepare('SELECT id, name, image_path FROM principals WHERE id = ?').get(req.params.id);
  if (!row) return res.redirect('/admin/principals');
  if (row.image_path) removeUpload(row.image_path);
  db.prepare('DELETE FROM principals WHERE id = ?').run(row.id);
  logAudit(req.session.user.username, 'delete', 'principal', row.id, row.name);
  req.session.flash = [{ kind: 'success', msg: 'Deleted "' + row.name + '".' }];
  res.redirect('/admin/principals');
});

module.exports = router;
