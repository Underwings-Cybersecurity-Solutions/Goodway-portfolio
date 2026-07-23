const express = require('express');
const { db, logAudit } = require('../db');
const { ensureCsrf, verifyCsrf } = require('../middleware/auth');
const { handleImageUpload, publicPath, removeUpload } = require('../middleware/uploads');
const { writeJournal, removePostPage } = require('../scripts/build-pages');

const router = express.Router();

function slugify(s) {
  return String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
}
function uniqueSlug(base, selfId) {
  let slug = base || 'post', n = 1;
  /* eslint-disable no-constant-condition */
  while (true) {
    const clash = db.prepare('SELECT id FROM posts WHERE slug = ? AND id IS NOT ?').get(slug, selfId == null ? -1 : selfId);
    if (!clash) return slug;
    n += 1; slug = (base || 'post') + '-' + n;
  }
}
function today() { return new Date().toISOString().slice(0, 10); }

/* Scoped publish — regenerates ONLY journal.html + the post pages. */
router.post('/publish', ensureCsrf, verifyCsrf, function (req, res) {
  try {
    const ok = writeJournal();
    const n = db.prepare('SELECT COUNT(*) AS n FROM posts WHERE is_published = 1').get().n;
    logAudit(req.session.user.username, 'publish', 'journal', null, 'count=' + n);
    req.session.flash = [{
      kind: ok ? 'success' : 'error',
      msg: ok
        ? 'Journal published — ' + n + ' post' + (n === 1 ? '' : 's') + ' live (list + article pages). Nothing else was changed.'
        : 'journal.html markers not found — nothing published.'
    }];
  } catch (e) {
    console.error(e);
    req.session.flash = [{ kind: 'error', msg: 'Publish failed: ' + e.message }];
  }
  res.redirect('/admin/posts');
});

router.get('/', ensureCsrf, function (_req, res) {
  const rows = db.prepare(`
    SELECT id, slug, title, category, published_date, is_published, sort_order
    FROM posts ORDER BY published_date DESC, id DESC
  `).all();
  res.render('posts/list', { rows, active: 'posts' });
});

const BLANK = {
  id: null, slug: '', title: '', category: '', published_date: '', excerpt: '', lede: '',
  body: '', image_path: null, meta_description: '', cta_href: '', cta_label: '', sort_order: 0, is_published: 1
};

router.get('/new', ensureCsrf, function (_req, res) {
  res.render('posts/edit', { row: Object.assign({}, BLANK), active: 'posts' });
});

router.get('/:id/edit', ensureCsrf, function (req, res) {
  const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).render('error', { code: 404, msg: 'Not found', active: '' });
  res.render('posts/edit', { row, active: 'posts' });
});

function fields(b) {
  return {
    title: (b.title || '').trim(),
    category: (b.category || '').trim(),
    published_date: (b.published_date || '').trim() || today(),
    excerpt: (b.excerpt || '').trim(),
    lede: (b.lede || '').trim(),
    body: (b.body || '').trim(),
    meta_description: (b.meta_description || '').trim(),
    cta_href: (b.cta_href || '').trim(),
    cta_label: (b.cta_label || '').trim(),
    sort_order: parseInt(b.sort_order, 10) || 0,
    is_published: b.is_published ? 1 : 0
  };
}

router.post('/new', ensureCsrf, handleImageUpload('/admin/posts'), verifyCsrf, function (req, res) {
  const f = fields(req.body);
  const slug = uniqueSlug((req.body.slug && req.body.slug.trim()) || slugify(f.title), null);
  const info = db.prepare(`
    INSERT INTO posts (slug, title, category, published_date, excerpt, lede, body, image_path,
                       meta_description, cta_href, cta_label, sort_order, is_published)
    VALUES (@slug, @title, @category, @published_date, @excerpt, @lede, @body, @image_path,
            @meta_description, @cta_href, @cta_label, @sort_order, @is_published)
  `).run(Object.assign({ slug, image_path: req.file ? publicPath(req.file.filename) : null }, f));
  logAudit(req.session.user.username, 'create', 'post', info.lastInsertRowid, f.title);
  req.session.flash = [{ kind: 'success', msg: 'Post created. Click Publish to update the journal.' }];
  res.redirect('/admin/posts');
});

router.post('/:id/edit', ensureCsrf, handleImageUpload('/admin/posts'), verifyCsrf, function (req, res) {
  const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).render('error', { code: 404, msg: 'Not found', active: '' });
  const f = fields(req.body);
  const slug = uniqueSlug((req.body.slug && req.body.slug.trim()) || slugify(f.title), row.id);
  /* If the slug changed, drop the old generated page so it doesn't linger. */
  if (slug !== row.slug) removePostPage(row.slug);
  let imagePath = row.image_path;
  if (req.file) { if (row.image_path) removeUpload(row.image_path); imagePath = publicPath(req.file.filename); }
  else if (req.body.remove_image) { if (row.image_path) removeUpload(row.image_path); imagePath = null; }
  db.prepare(`
    UPDATE posts SET slug=@slug, title=@title, category=@category, published_date=@published_date,
      excerpt=@excerpt, lede=@lede, body=@body, image_path=@image_path, meta_description=@meta_description,
      cta_href=@cta_href, cta_label=@cta_label, sort_order=@sort_order, is_published=@is_published
    WHERE id=@id
  `).run(Object.assign({ id: row.id, slug, image_path: imagePath }, f));
  logAudit(req.session.user.username, 'update', 'post', row.id, f.title);
  req.session.flash = [{ kind: 'success', msg: 'Saved. Click Publish to regenerate the journal.' }];
  res.redirect('/admin/posts/' + row.id + '/edit');
});

router.post('/:id/delete', ensureCsrf, verifyCsrf, function (req, res) {
  const row = db.prepare('SELECT id, slug, title, image_path FROM posts WHERE id = ?').get(req.params.id);
  if (!row) return res.redirect('/admin/posts');
  if (row.image_path) removeUpload(row.image_path);
  removePostPage(row.slug);
  db.prepare('DELETE FROM posts WHERE id = ?').run(row.id);
  logAudit(req.session.user.username, 'delete', 'post', row.id, row.title);
  req.session.flash = [{ kind: 'success', msg: 'Deleted "' + row.title + '". Click Publish to update the journal list.' }];
  res.redirect('/admin/posts');
});

module.exports = router;
