const express = require('express');
const { db, logAudit } = require('../db');
const { ensureCsrf, verifyCsrf } = require('../middleware/auth');
const { writeSectors } = require('../scripts/build-pages');

const router = express.Router();

/* Scoped publish — regenerates ONLY industries.html between its markers. */
router.post('/publish', ensureCsrf, verifyCsrf, function (req, res) {
  try {
    writeSectors();
    const n = db.prepare('SELECT COUNT(*) AS n FROM sectors WHERE is_published = 1').get().n;
    logAudit(req.session.user.username, 'publish', 'sectors', null, 'count=' + n);
    req.session.flash = [{ kind: 'success', msg: 'Industries page published — ' + n + ' sectors live. Nothing else was changed.' }];
  } catch (e) {
    console.error(e);
    req.session.flash = [{ kind: 'error', msg: 'Publish failed: ' + e.message }];
  }
  res.redirect('/admin/sectors');
});

const TIERS = [
  { key: 'primary',  label: 'Primary sector' },
  { key: 'core',     label: 'Core sector' },
  { key: 'adjacent', label: 'Adjacent sector' }
];

router.get('/', ensureCsrf, function (_req, res) {
  const rows = db.prepare(`
    SELECT id, slug, title, tier, tier_label, sort_order, is_published
    FROM sectors ORDER BY sort_order ASC, title ASC
  `).all();
  res.render('sectors/list', { rows, tiers: TIERS, active: 'sectors' });
});

router.get('/new', ensureCsrf, function (_req, res) {
  res.render('sectors/edit', {
    row: { id: null, slug: '', title: '', subtitle: '', tier: 'core', tier_label: 'Core sector',
           lede: '', products: '', principals_list: '', cta_label: 'Request supply',
           icon_svg: '', sort_order: 0, is_published: 1 },
    tiers: TIERS,
    active: 'sectors'
  });
});

router.get('/:id/edit', ensureCsrf, function (req, res) {
  const row = db.prepare('SELECT * FROM sectors WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).render('error', { code: 404, msg: 'Not found', active: '' });
  res.render('sectors/edit', { row, tiers: TIERS, active: 'sectors' });
});

function pick(b, row) {
  const tier = TIERS.find(t => t.key === b.tier) || TIERS[1];
  return {
    slug: (b.slug || (row && row.slug) || '').trim(),
    title: (b.title || '').trim(),
    subtitle: (b.subtitle || '').trim() || null,
    tier: tier.key,
    tier_label: tier.label,
    lede: (b.lede || '').trim(),
    products: (b.products || '').trim(),
    principals_list: (b.principals_list || '').trim(),
    cta_label: (b.cta_label || 'Request supply').trim(),
    icon_svg: (b.icon_svg || '').trim(),
    sort_order: parseInt(b.sort_order, 10) || 0,
    is_published: b.is_published ? 1 : 0
  };
}

router.post('/new', ensureCsrf, verifyCsrf, function (req, res) {
  const v = pick(req.body, null);
  const info = db.prepare(`
    INSERT INTO sectors (slug, title, subtitle, tier, tier_label, lede, products, principals_list,
                         cta_label, icon_svg, sort_order, is_published)
    VALUES (@slug, @title, @subtitle, @tier, @tier_label, @lede, @products, @principals_list,
            @cta_label, @icon_svg, @sort_order, @is_published)
  `).run(v);
  logAudit(req.session.user.username, 'create', 'sector', info.lastInsertRowid, v.title);
  req.session.flash = [{ kind: 'success', msg: 'Sector created.' }];
  res.redirect('/admin/sectors');
});

router.post('/:id/edit', ensureCsrf, verifyCsrf, function (req, res) {
  const row = db.prepare('SELECT * FROM sectors WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).render('error', { code: 404, msg: 'Not found', active: '' });
  const v = pick(req.body, row);
  db.prepare(`
    UPDATE sectors SET slug=@slug, title=@title, subtitle=@subtitle, tier=@tier, tier_label=@tier_label,
      lede=@lede, products=@products, principals_list=@principals_list, cta_label=@cta_label,
      icon_svg=@icon_svg, sort_order=@sort_order, is_published=@is_published
    WHERE id=@id
  `).run(Object.assign({ id: row.id }, v));
  logAudit(req.session.user.username, 'update', 'sector', row.id, v.title);
  req.session.flash = [{ kind: 'success', msg: 'Saved. Click Publish to regenerate the live site.' }];
  res.redirect('/admin/sectors/' + row.id + '/edit');
});

router.post('/:id/delete', ensureCsrf, verifyCsrf, function (req, res) {
  const row = db.prepare('SELECT id, title FROM sectors WHERE id = ?').get(req.params.id);
  if (!row) return res.redirect('/admin/sectors');
  db.prepare('DELETE FROM sectors WHERE id = ?').run(row.id);
  logAudit(req.session.user.username, 'delete', 'sector', row.id, row.title);
  req.session.flash = [{ kind: 'success', msg: 'Deleted "' + row.title + '".' }];
  res.redirect('/admin/sectors');
});

module.exports = router;
