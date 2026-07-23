const express = require('express');
const { db, logAudit } = require('../db');
const { ensureCsrf, verifyCsrf } = require('../middleware/auth');

const router = express.Router();

const TYPES = [
  { key: 'full-time', label: 'Full-time' },
  { key: 'part-time', label: 'Part-time' },
  { key: 'contract',  label: 'Contract' },
  { key: 'internship', label: 'Internship' }
];

function slugify(s) {
  return String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

/** Ensure the slug is unique; append -2, -3… on collision (ignoring self). */
function uniqueSlug(base, selfId) {
  let slug = base || 'role';
  let n = 1;
  /* eslint-disable no-constant-condition */
  while (true) {
    const clash = db.prepare('SELECT id FROM jobs WHERE slug = ? AND id IS NOT ?').get(slug, selfId == null ? -1 : selfId);
    if (!clash) return slug;
    n += 1;
    slug = (base || 'role') + '-' + n;
  }
}

router.get('/', ensureCsrf, function (_req, res) {
  const rows = db.prepare(`
    SELECT id, slug, title, department, location, employment_type, is_published, sort_order
    FROM jobs ORDER BY sort_order ASC, title ASC
  `).all();
  res.render('jobs/list', { rows, types: TYPES, active: 'jobs' });
});

router.get('/new', ensureCsrf, function (_req, res) {
  res.render('jobs/edit', {
    row: { id: null, slug: '', title: '', department: '', location: '', employment_type: 'full-time',
           summary: '', description: '', sort_order: 0, is_published: 1 },
    types: TYPES,
    active: 'jobs'
  });
});

router.get('/:id/edit', ensureCsrf, function (req, res) {
  const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).render('error', { code: 404, msg: 'Not found', active: '' });
  res.render('jobs/edit', { row, types: TYPES, active: 'jobs' });
});

function typeMeta(key) { return TYPES.find(t => t.key === key) || TYPES[0]; }

router.post('/new', ensureCsrf, verifyCsrf, function (req, res) {
  const b = req.body;
  const slug = uniqueSlug((b.slug && b.slug.trim()) || slugify(b.title), null);
  const info = db.prepare(`
    INSERT INTO jobs (slug, title, department, location, employment_type, summary, description, sort_order, is_published)
    VALUES (@slug, @title, @department, @location, @employment_type, @summary, @description, @sort_order, @is_published)
  `).run({
    slug,
    title: (b.title || '').trim(),
    department: (b.department || '').trim(),
    location: (b.location || '').trim(),
    employment_type: typeMeta(b.employment_type).key,
    summary: (b.summary || '').trim(),
    description: (b.description || '').trim(),
    sort_order: parseInt(b.sort_order, 10) || 0,
    is_published: b.is_published ? 1 : 0
  });
  logAudit(req.session.user.username, 'create', 'job', info.lastInsertRowid, (b.title || '').slice(0, 80));
  req.session.flash = [{ kind: 'success', msg: 'Job created. Click Publish to update careers.html.' }];
  res.redirect('/admin/jobs');
});

router.post('/:id/edit', ensureCsrf, verifyCsrf, function (req, res) {
  const b = req.body;
  const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).render('error', { code: 404, msg: 'Not found', active: '' });
  const slug = uniqueSlug((b.slug && b.slug.trim()) || slugify(b.title), row.id);
  db.prepare(`
    UPDATE jobs SET
      slug = @slug, title = @title, department = @department, location = @location,
      employment_type = @employment_type, summary = @summary, description = @description,
      sort_order = @sort_order, is_published = @is_published
    WHERE id = @id
  `).run({
    id: row.id,
    slug,
    title: (b.title || '').trim(),
    department: (b.department || '').trim(),
    location: (b.location || '').trim(),
    employment_type: typeMeta(b.employment_type).key,
    summary: (b.summary || '').trim(),
    description: (b.description || '').trim(),
    sort_order: parseInt(b.sort_order, 10) || 0,
    is_published: b.is_published ? 1 : 0
  });
  logAudit(req.session.user.username, 'update', 'job', row.id, row.title);
  req.session.flash = [{ kind: 'success', msg: 'Saved. Click Publish to regenerate careers.html.' }];
  res.redirect('/admin/jobs/' + row.id + '/edit');
});

router.post('/:id/delete', ensureCsrf, verifyCsrf, function (req, res) {
  const row = db.prepare('SELECT id, title FROM jobs WHERE id = ?').get(req.params.id);
  if (!row) return res.redirect('/admin/jobs');
  db.prepare('DELETE FROM jobs WHERE id = ?').run(row.id);
  logAudit(req.session.user.username, 'delete', 'job', row.id, row.title);
  req.session.flash = [{ kind: 'success', msg: 'Deleted "' + row.title + '". Click Publish to update the site.' }];
  res.redirect('/admin/jobs');
});

module.exports = router;
