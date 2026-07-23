/**
 * Goodway admin — Express 5 + SQLite + EJS.
 * Single-admin-user auth (hash in ADMIN_PASSWORD_HASH).
 * Serves:
 *   - Admin UI at /admin/*
 *   - Public lead-capture endpoint at POST /api/leads (accepts quote submissions)
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const multer = require('multer');

const { db } = require('./db');
const auth = require('./middleware/auth');
const rateLimit = require('./middleware/ratelimit');
const security = require('./middleware/security');
const { notifyNewLead, notifyNewApplication } = require('./lib/notify');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 4010;
const IS_PROD = process.env.NODE_ENV === 'production';

/* Trust the first proxy hop so req.ip / X-Forwarded-For works behind Nginx */
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');

app.use(security());
app.use(cookieParser());
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true, limit: '200kb' }));

app.use(session({
  name: 'gw_admin',
  secret: process.env.SESSION_SECRET || 'dev-only-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PROD,
    maxAge: 1000 * 60 * 60 * 8  // 8 hours
  }
}));

/* Flash pattern: one-shot session.flash array drained on render */
app.use(function (req, res, next) {
  res.locals.flash = req.session.flash || [];
  req.session.flash = [];
  res.locals.user = req.session.user || null;
  /* Mint the CSRF token here (before any template reads res.locals.csrf) so
     the very first page render on a fresh session carries a valid token.
     Previously the token was created later by the route-level ensureCsrf,
     leaving the first login form's _csrf empty → guaranteed 403 on first submit. */
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
  res.locals.csrf = req.session.csrf;
  next();
});

app.use('/admin/static', express.static(path.join(__dirname, 'public'), {
  maxAge: '1h', etag: true
}));

/* ----- Public API: quote submissions from the static site -----
   Rate-limited (5 / min / IP) and protected by a honeypot. Any request
   where the `website` field is populated is silently accepted-then-dropped
   (bots fill every field; humans won't touch a hidden input). */
const leadsLimiter = rateLimit({ max: 5, windowMs: 60_000, message: 'Please wait a minute before submitting another enquiry.' });
app.post('/api/leads', leadsLimiter, function (req, res) {
  const b = req.body || {};

  /* Honeypot — if filled, fake success and don't write to DB */
  if (b.website && String(b.website).trim()) {
    return res.json({ ok: true, id: 0 });
  }

  const required = ['name', 'email', 'spec'];
  for (const k of required) {
    if (!b[k] || !String(b[k]).trim()) return res.status(400).json({ ok: false, error: 'Missing ' + k });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(b.email))) {
    return res.status(400).json({ ok: false, error: 'Invalid email' });
  }
  try {
    const stmt = db.prepare(`
      INSERT INTO quotes (name, company, email, phone, sector, division, location, timeline, spec, source, ip, user_agent)
      VALUES (@name, @company, @email, @phone, @sector, @division, @location, @timeline, @spec, @source, @ip, @user_agent)
    `);
    const row = {
      name: String(b.name).slice(0, 200),
      company: String(b.company || '').slice(0, 200),
      email: String(b.email).slice(0, 200),
      phone: String(b.phone || '').slice(0, 100),
      sector: b.sector ? String(b.sector).slice(0, 80) : null,
      division: b.division ? String(b.division).slice(0, 80) : null,
      location: b.location ? String(b.location).slice(0, 120) : null,
      timeline: b.timeline ? String(b.timeline).slice(0, 120) : null,
      spec: String(b.spec).slice(0, 10000),
      source: 'web',
      ip: (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim(),
      user_agent: (req.headers['user-agent'] || '').toString().slice(0, 300)
    };
    const out = stmt.run(row);
    notifyNewLead(Object.assign({ id: out.lastInsertRowid }, row)).catch(e => console.error('notify failed', e));
    res.json({ ok: true, id: out.lastInsertRowid });
  } catch (e) {
    console.error('lead insert failed', e);
    res.status(500).json({ ok: false, error: 'server' });
  }
});

/* ----- Public API: job applications from careers.html -----
   Multipart (CV file + fields). Rate-limited and honeypot-protected like leads.
   CVs are written to server/data/cv-uploads (outside the web root) and are only
   retrievable through the login-gated /admin/applications/:id/cv route. */
const CV_DIR = path.resolve(__dirname, 'data', 'cv-uploads');
if (!fs.existsSync(CV_DIR)) fs.mkdirSync(CV_DIR, { recursive: true });

const CV_ALLOWED_EXT = new Set(['.pdf', '.doc', '.docx']);
const CV_ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream' // some browsers send this for .doc/.docx
]);

const cvStorage = multer.diskStorage({
  destination: function (_req, _file, cb) { cb(null, CV_DIR); },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase().slice(0, 8);
    const rand = crypto.randomBytes(8).toString('hex');
    cb(null, 'cv-' + Date.now() + '-' + rand + ext);
  }
});
const uploadCv = multer({
  storage: cvStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: function (_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (CV_ALLOWED_EXT.has(ext) && CV_ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    cb(new Error('Only PDF, DOC or DOCX files up to 5 MB are accepted.'));
  }
}).single('cv');

const applicationsLimiter = rateLimit({ max: 5, windowMs: 60_000, message: 'Please wait a minute before submitting another application.' });
app.post('/api/applications', applicationsLimiter, function (req, res) {
  uploadCv(req, res, function (uploadErr) {
    const cleanup = function () {
      if (req.file && req.file.path) { try { fs.unlinkSync(req.file.path); } catch (e) {} }
    };
    if (uploadErr) {
      return res.status(400).json({ ok: false, error: uploadErr.message || 'Upload failed' });
    }
    const b = req.body || {};

    /* Honeypot — fake success, drop file + data */
    if (b.website && String(b.website).trim()) { cleanup(); return res.json({ ok: true, id: 0 }); }

    const name = String(b.name || '').trim();
    const email = String(b.email || '').trim();
    if (!name || !email) { cleanup(); return res.status(400).json({ ok: false, error: 'Name and email are required.' }); }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { cleanup(); return res.status(400).json({ ok: false, error: 'Invalid email' }); }

    /* Resolve the job (optional). A valid job_id snapshots its title. */
    let jobId = null, jobTitle = String(b.job_title || '').slice(0, 200).trim();
    if (b.job_id && /^\d+$/.test(String(b.job_id))) {
      const job = db.prepare('SELECT id, title FROM jobs WHERE id = ?').get(parseInt(b.job_id, 10));
      if (job) { jobId = job.id; if (!jobTitle) jobTitle = job.title; }
    }

    try {
      const stmt = db.prepare(`
        INSERT INTO applications (job_id, job_title, name, email, phone, cover_note, cv_original_name, cv_stored_name, source, ip, user_agent)
        VALUES (@job_id, @job_title, @name, @email, @phone, @cover_note, @cv_original_name, @cv_stored_name, @source, @ip, @user_agent)
      `);
      const row = {
        job_id: jobId,
        job_title: jobTitle,
        name: name.slice(0, 200),
        email: email.slice(0, 200),
        phone: String(b.phone || '').slice(0, 100),
        cover_note: String(b.cover_note || '').slice(0, 4000),
        cv_original_name: req.file ? String(req.file.originalname).slice(0, 255) : null,
        cv_stored_name: req.file ? req.file.filename : null,
        source: 'web',
        ip: (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim(),
        user_agent: (req.headers['user-agent'] || '').toString().slice(0, 300)
      };
      const out = stmt.run(row);
      notifyNewApplication(Object.assign({ id: out.lastInsertRowid }, row)).catch(e => console.error('notify failed', e));
      res.json({ ok: true, id: out.lastInsertRowid });
    } catch (e) {
      console.error('application insert failed', e);
      cleanup();
      res.status(500).json({ ok: false, error: 'server' });
    }
  });
});

app.get('/api/health', function (_req, res) {
  res.json({ ok: true, now: new Date().toISOString() });
});

/* Catalogue request — email-gated PDF download */
const catalogueLimiter = rateLimit({ max: 10, windowMs: 60 * 60_000, message: 'Too many catalogue requests from your network. Try later.' });
app.use('/api/catalogue', catalogueLimiter, require('./routes/catalogue'));

/* ----- Admin UI routes -----
   Login is rate-limited at 10 attempts / 5 min / IP to slow brute force. */
const loginLimiter = rateLimit({ max: 10, windowMs: 5 * 60_000, message: 'Too many sign-in attempts. Wait 5 minutes and try again.' });
app.post('/admin/login', loginLimiter);
app.use('/admin', require('./routes/auth'));
app.use('/admin/principals',   auth.requireLogin, require('./routes/principals'));
app.use('/admin/sectors',      auth.requireLogin, require('./routes/sectors'));
app.use('/admin/quotes',       auth.requireLogin, require('./routes/quotes'));
app.use('/admin/jobs',         auth.requireLogin, require('./routes/jobs'));
app.use('/admin/applications', auth.requireLogin, require('./routes/applications'));
app.use('/admin/publish',      auth.requireLogin, require('./routes/publish'));

/* Root of admin — dashboard summary */
app.get('/admin', auth.requireLogin, function (_req, res) {
  const principals = db.prepare('SELECT COUNT(*) AS n FROM principals').get().n;
  const sectors    = db.prepare('SELECT COUNT(*) AS n FROM sectors').get().n;
  const newLeads   = db.prepare("SELECT COUNT(*) AS n FROM quotes WHERE status = 'new'").get().n;
  const openJobs   = db.prepare('SELECT COUNT(*) AS n FROM jobs WHERE is_published = 1').get().n;
  const newApplications = db.prepare("SELECT COUNT(*) AS n FROM applications WHERE status = 'new'").get().n;
  const recent     = db.prepare(
    `SELECT id, received_at, name, company, email, sector
     FROM quotes ORDER BY received_at DESC LIMIT 5`
  ).all();
  const log = db.prepare(
    `SELECT at, actor, action, entity, entity_id FROM audit_log
     ORDER BY id DESC LIMIT 10`
  ).all();
  res.render('dashboard', { principals, sectors, newLeads, openJobs, newApplications, recent, log, active: 'dashboard' });
});

app.get('/', function (_req, res) { res.redirect('/admin'); });

app.use(function (_req, res) {
  res.status(404).render('error', { code: 404, msg: 'Not found', active: '' });
});

app.use(function (err, _req, res, _next) {
  console.error(err);
  res.status(500).render('error', { code: 500, msg: err.message || 'Server error', active: '' });
});

app.listen(PORT, function () {
  console.log('\n  Goodway admin:  http://localhost:' + PORT + '/admin');
  console.log('  Lead endpoint:  POST http://localhost:' + PORT + '/api/leads\n');
});
