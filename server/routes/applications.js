const express = require('express');
const fs = require('fs');
const path = require('path');
const { db, logAudit } = require('../db');
const { ensureCsrf, verifyCsrf } = require('../middleware/auth');

const router = express.Router();

const STATUSES = ['new', 'reviewing', 'shortlisted', 'rejected', 'hired', 'archived'];
const CV_DIR = path.resolve(__dirname, '..', 'data', 'cv-uploads');

router.get('/', ensureCsrf, function (req, res) {
  const status = STATUSES.includes(req.query.status) ? req.query.status : 'all';
  const q = (req.query.q || '').trim();

  const where = [];
  const args = {};
  if (status !== 'all') { where.push('status = @status'); args.status = status; }
  if (q) {
    where.push('(name LIKE @q OR email LIKE @q OR job_title LIKE @q OR cover_note LIKE @q)');
    args.q = '%' + q + '%';
  }
  const sql = `SELECT id, received_at, name, email, phone, job_title, cv_stored_name, status
               FROM applications
               ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY received_at DESC
               LIMIT 500`;
  const rows = db.prepare(sql).all(args);
  const counts = {};
  db.prepare('SELECT status, COUNT(*) AS n FROM applications GROUP BY status').all()
    .forEach(r => { counts[r.status] = r.n; });
  res.render('applications/list', { rows, counts, status, q, statuses: STATUSES, active: 'applications' });
});

router.get('/export.csv', function (_req, res) {
  const rows = db.prepare('SELECT * FROM applications ORDER BY received_at DESC').all();
  const cols = ['id','received_at','job_title','name','email','phone','cover_note','cv_original_name','source','status'];
  const esc = v => '"' + String(v == null ? '' : v).replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"';
  const csv = cols.join(',') + '\n' +
    rows.map(r => cols.map(c => esc(r[c])).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="goodway-applications-' + new Date().toISOString().slice(0,10) + '.csv"');
  res.send(csv);
});

/* Stream the stored CV — login-gated (this router is mounted behind requireLogin).
   Files live outside the web root and are never served statically. */
router.get('/:id/cv', function (req, res) {
  const row = db.prepare('SELECT cv_stored_name, cv_original_name FROM applications WHERE id = ?').get(req.params.id);
  if (!row || !row.cv_stored_name) return res.status(404).render('error', { code: 404, msg: 'No CV on file for this application', active: '' });
  /* Guard against path traversal — only ever use the stored basename. */
  const safe = path.basename(row.cv_stored_name);
  const full = path.join(CV_DIR, safe);
  if (!full.startsWith(CV_DIR) || !fs.existsSync(full)) {
    return res.status(404).render('error', { code: 404, msg: 'CV file missing on disk', active: '' });
  }
  logAudit(req.session.user.username, 'download-cv', 'application', req.params.id, row.cv_original_name || safe);
  res.download(full, row.cv_original_name || safe);
});

router.get('/:id', ensureCsrf, function (req, res) {
  const row = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).render('error', { code: 404, msg: 'Not found', active: '' });
  res.render('applications/detail', { row, statuses: STATUSES, active: 'applications' });
});

router.post('/:id/status', ensureCsrf, verifyCsrf, function (req, res) {
  const status = STATUSES.includes(req.body.status) ? req.body.status : 'new';
  const r = db.prepare('UPDATE applications SET status = ? WHERE id = ?').run(status, req.params.id);
  if (r.changes) logAudit(req.session.user.username, 'status:' + status, 'application', req.params.id, null);
  req.session.flash = [{ kind: 'success', msg: 'Status → ' + status }];
  res.redirect('/admin/applications/' + req.params.id);
});

router.post('/:id/delete', ensureCsrf, verifyCsrf, function (req, res) {
  const row = db.prepare('SELECT cv_stored_name FROM applications WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM applications WHERE id = ?').run(req.params.id);
  /* Best-effort: remove the CV file too so we don't leave orphans on disk. */
  if (row && row.cv_stored_name) {
    try { fs.unlinkSync(path.join(CV_DIR, path.basename(row.cv_stored_name))); } catch (e) {}
  }
  logAudit(req.session.user.username, 'delete', 'application', req.params.id, null);
  req.session.flash = [{ kind: 'success', msg: 'Application deleted.' }];
  res.redirect('/admin/applications');
});

module.exports = router;
