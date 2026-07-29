/**
 * SQLite connection + schema bootstrap.
 * Single file DB in ./data/goodway.db. No migration framework —
 * idempotent CREATE TABLE IF NOT EXISTS runs at boot.
 */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_DIR  = path.resolve(__dirname, 'data');
const DB_PATH = path.join(DB_DIR, 'goodway.db');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS principals (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    slug            TEXT    NOT NULL UNIQUE,
    name            TEXT    NOT NULL,
    country         TEXT    NOT NULL DEFAULT '',
    country_lang    TEXT    DEFAULT NULL,
    category        TEXT    NOT NULL,
    category_label  TEXT    NOT NULL,
    description     TEXT    NOT NULL DEFAULT '',
    chips_json      TEXT    NOT NULL DEFAULT '[]',
    division_href   TEXT    NOT NULL DEFAULT '',
    cta_label       TEXT    NOT NULL DEFAULT 'See products in division',
    image_path      TEXT    DEFAULT NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_published    INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sectors (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    slug            TEXT    NOT NULL UNIQUE,
    title           TEXT    NOT NULL,
    subtitle        TEXT    DEFAULT NULL,
    tier            TEXT    NOT NULL DEFAULT 'core',
    tier_label      TEXT    NOT NULL DEFAULT 'Core sector',
    lede            TEXT    NOT NULL DEFAULT '',
    products        TEXT    NOT NULL DEFAULT '',
    principals_list TEXT    NOT NULL DEFAULT '',
    cta_label       TEXT    NOT NULL DEFAULT 'Request supply',
    icon_svg        TEXT    NOT NULL DEFAULT '',
    image_path      TEXT    DEFAULT NULL,
    image_alt       TEXT    DEFAULT NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_published    INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS quotes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    received_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    name            TEXT    NOT NULL,
    company         TEXT    NOT NULL DEFAULT '',
    email           TEXT    NOT NULL,
    phone           TEXT    NOT NULL DEFAULT '',
    sector          TEXT    DEFAULT NULL,
    division        TEXT    DEFAULT NULL,
    location        TEXT    DEFAULT NULL,
    timeline        TEXT    DEFAULT NULL,
    spec            TEXT    NOT NULL DEFAULT '',
    source          TEXT    NOT NULL DEFAULT 'web',
    ip              TEXT    DEFAULT NULL,
    user_agent      TEXT    DEFAULT NULL,
    status          TEXT    NOT NULL DEFAULT 'new'
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    at              TEXT    NOT NULL DEFAULT (datetime('now')),
    actor           TEXT    NOT NULL,
    action          TEXT    NOT NULL,
    entity          TEXT    NOT NULL,
    entity_id       TEXT    DEFAULT NULL,
    detail          TEXT    DEFAULT NULL
  );

  /* Careers — job openings shown on careers.html between the GW-CAREERS markers */
  CREATE TABLE IF NOT EXISTS jobs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    slug            TEXT    NOT NULL UNIQUE,
    title           TEXT    NOT NULL,
    department      TEXT    NOT NULL DEFAULT '',
    location        TEXT    NOT NULL DEFAULT '',
    employment_type TEXT    NOT NULL DEFAULT 'full-time',
    closing_date    TEXT    NOT NULL DEFAULT '',
    summary         TEXT    NOT NULL DEFAULT '',
    description     TEXT    NOT NULL DEFAULT '',
    image_path      TEXT    DEFAULT NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_published    INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  /* Blog / Journal — posts rendered into journal.html + a generated page each */
  CREATE TABLE IF NOT EXISTS posts (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    slug             TEXT    NOT NULL UNIQUE,
    title            TEXT    NOT NULL,
    category         TEXT    NOT NULL DEFAULT '',
    published_date   TEXT    NOT NULL DEFAULT (date('now')),
    excerpt          TEXT    NOT NULL DEFAULT '',
    lede             TEXT    NOT NULL DEFAULT '',
    body             TEXT    NOT NULL DEFAULT '',
    image_path       TEXT    DEFAULT NULL,
    meta_description TEXT    NOT NULL DEFAULT '',
    cta_href         TEXT    NOT NULL DEFAULT '',
    cta_label        TEXT    NOT NULL DEFAULT '',
    sort_order       INTEGER NOT NULL DEFAULT 0,
    is_published     INTEGER NOT NULL DEFAULT 1,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  /* Careers — inbound job applications (from POST /api/applications) */
  CREATE TABLE IF NOT EXISTS applications (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    received_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    job_id            INTEGER DEFAULT NULL REFERENCES jobs(id) ON DELETE SET NULL,
    job_title         TEXT    NOT NULL DEFAULT '',
    name              TEXT    NOT NULL,
    email             TEXT    NOT NULL,
    phone             TEXT    NOT NULL DEFAULT '',
    cover_note        TEXT    NOT NULL DEFAULT '',
    cv_original_name  TEXT    DEFAULT NULL,
    cv_stored_name    TEXT    DEFAULT NULL,
    source            TEXT    NOT NULL DEFAULT 'web',
    ip                TEXT    DEFAULT NULL,
    user_agent        TEXT    DEFAULT NULL,
    status            TEXT    NOT NULL DEFAULT 'new'
  );

  CREATE INDEX IF NOT EXISTS idx_principals_category ON principals(category);
  CREATE INDEX IF NOT EXISTS idx_principals_sort     ON principals(sort_order);
  CREATE INDEX IF NOT EXISTS idx_sectors_sort        ON sectors(sort_order);
  CREATE INDEX IF NOT EXISTS idx_quotes_received     ON quotes(received_at DESC);
  CREATE INDEX IF NOT EXISTS idx_quotes_status       ON quotes(status);
  CREATE INDEX IF NOT EXISTS idx_jobs_sort           ON jobs(sort_order);
  CREATE INDEX IF NOT EXISTS idx_posts_date          ON posts(published_date DESC);
  CREATE INDEX IF NOT EXISTS idx_posts_sort          ON posts(sort_order);
  CREATE INDEX IF NOT EXISTS idx_applications_recv    ON applications(received_at DESC);
  CREATE INDEX IF NOT EXISTS idx_applications_status  ON applications(status);
  CREATE INDEX IF NOT EXISTS idx_applications_job     ON applications(job_id);
`);

/** Stamp updated_at on every UPDATE against content tables. */
function bumpUpdatedAt(table) {
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_${table}_updated
    AFTER UPDATE ON ${table}
    FOR EACH ROW BEGIN
      UPDATE ${table} SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
  `);
}
bumpUpdatedAt('principals');
bumpUpdatedAt('sectors');
bumpUpdatedAt('jobs');
bumpUpdatedAt('posts');

/** Lightweight migration: add a column to an existing table if it's missing.
 *  Keeps older databases in sync without a migration framework. */
function ensureColumn(table, column, ddl) {
  const has = db.prepare('PRAGMA table_info(' + table + ')').all().some(c => c.name === column);
  if (!has) db.exec('ALTER TABLE ' + table + ' ADD COLUMN ' + column + ' ' + ddl);
}
ensureColumn('principals', 'cta_label', "TEXT NOT NULL DEFAULT 'See products in division'");
ensureColumn('principals', 'image_path', 'TEXT DEFAULT NULL');
ensureColumn('jobs', 'image_path', 'TEXT DEFAULT NULL');
ensureColumn('jobs', 'closing_date', "TEXT NOT NULL DEFAULT ''");
ensureColumn('sectors', 'image_path', 'TEXT DEFAULT NULL');
ensureColumn('sectors', 'image_alt', 'TEXT DEFAULT NULL');

function logAudit(actor, action, entity, entityId, detail) {
  db.prepare(
    `INSERT INTO audit_log (actor, action, entity, entity_id, detail)
     VALUES (?, ?, ?, ?, ?)`
  ).run(actor || 'system', action, entity, entityId == null ? null : String(entityId), detail || null);
}

module.exports = { db, logAudit, DB_PATH };
