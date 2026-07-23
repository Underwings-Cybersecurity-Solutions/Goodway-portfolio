# Careers Module — Design Spec

**Date:** 2026-07-23
**Status:** Approved for build
**Phase:** 1 of the Goodway CMS roadmap (Careers → Blog → Team/Divisions → Settings)

## Goal

Let the client post/edit/close job openings from the existing admin panel, publish
them to a public `careers.html` page, and receive job applications (basic fields +
CV file) into an admin inbox with an email/webhook notification.

This mirrors the existing admin pattern exactly: SQLite tables → CRUD routes behind
`requireLogin` + CSRF → `audit_log` on every change → marker-based publish that
rewrites only a fenced block of the static HTML.

## Data model (new tables in `server/db.js`)

### `jobs`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| slug | TEXT UNIQUE | url/anchor id, e.g. `sales-engineer-mussafah` |
| title | TEXT | e.g. "Sales Engineer" |
| department | TEXT | e.g. "Sales", "Operations" |
| location | TEXT | e.g. "Mussafah, Abu Dhabi" |
| employment_type | TEXT | full-time / part-time / contract |
| summary | TEXT | one-line teaser for the card |
| description | TEXT | full HTML/long description |
| is_published | INTEGER default 1 | draft toggle |
| sort_order | INTEGER default 0 | |
| created_at / updated_at | TEXT | with updated_at trigger (bumpUpdatedAt) |

### `applications`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| received_at | TEXT default now | |
| job_id | INTEGER FK→jobs(id) nullable | null = spontaneous / "no current opening" |
| job_title | TEXT | denormalized snapshot so it survives if the job is deleted |
| name | TEXT NOT NULL | |
| email | TEXT NOT NULL | |
| phone | TEXT | mobile |
| cover_note | TEXT | optional message |
| cv_original_name | TEXT | applicant's filename (display only) |
| cv_stored_name | TEXT | sanitized name on disk |
| ip / user_agent | TEXT | |
| status | TEXT default 'new' | new / reviewing / shortlisted / rejected / hired |

Indexes on `jobs(sort_order)`, `applications(received_at DESC)`, `applications(status)`,
`applications(job_id)`. Tables created idempotently at boot (same as existing schema).

## Admin (new routes + views, mirroring principals/quotes)

- `GET/POST /admin/jobs` — list + create/edit/delete openings, publish toggle, sort.
  View pair `views/jobs/list.ejs` + `views/jobs/edit.ejs` (copy of principals views).
- `GET /admin/applications` — inbox list, filter by job + status, search.
  `GET /admin/applications/:id` — detail with a **Download CV** link and status control.
  `GET /admin/applications/:id/cv` — streams the stored file (login-gated).
  `GET /admin/applications.csv` — CSV export (like quotes).
- Nav: add "Careers" and "Applications" to `views/partials/nav.ejs`.
- Dashboard: add open-jobs count + new-applications count tiles.
- All writes call `logAudit(...)`.

## CV upload (safety)

- `multer` (new dependency in `server/package.json`) with **disk storage**.
- Stored **outside the web root**: `server/data/cv-uploads/` (gitignored, like the DB).
- Accept **PDF / DOC / DOCX only** (mimetype + extension check); **max 5 MB**; one file.
- Stored filename sanitized + prefixed with the application id/timestamp; original name
  kept only as a display string in the DB.
- Files are downloadable **only** through the login-gated `/admin/applications/:id/cv`
  route — never served statically/publicly.

## Public endpoint

- `POST /api/applications` (multipart) in `server.js`, next to `/api/leads`:
  - same rate-limit recipe (5/min/IP) + honeypot (`website` field) as leads.
  - validates name, email, and either a `job_title` or job_id; CV optional-but-encouraged.
  - inserts a row, moves the uploaded CV into `cv-uploads/`, fires
    `notifyNewApplication(...)`.
- `server/lib/notify.js`: add `notifyNewApplication(app)` alongside `notifyNewLead`
  (same provider plumbing: Resend / Postmark / webhook / local inbox log). No email is
  sent until a provider is configured — identical behaviour to leads today.

## Public page `careers.html`

- Same shell as other pages: nav, hero, footer (copied from an existing page so the
  Footer auto-linker + form JS load identically).
- Sections:
  1. Hero — "Careers at Good Way General Trading".
  2. "Why join / life at Goodway" intro (static copy).
  3. **Openings list** between `<!-- GW-CAREERS-START -->` / `<!-- GW-CAREERS-END -->`,
     rendered from the DB on publish. Each card: title, department · location · type,
     summary, and an "Apply" button that targets the application form and pre-fills the role.
     Empty state: "No current openings — send us your CV and we'll keep it on file."
  4. **Application form**: name, email, mobile, position (auto-filled from the chosen
     job), cover note, CV file input, honeypot. `enctype="multipart/form-data"`.
- Nav/footer link: add "Careers" to the shared footer link list (`footer-menu`). Primary
  nav is full; footer placement is the low-risk choice and matches Journal/Contact there.

## Frontend JS (new IIFE in `js/goodway-enhance.js`)

- A dedicated `gwCareersForm()` handler (the existing `gwFormSubmit` sends JSON and can't
  carry a file, so it must not intercept this form — give the careers form a distinct
  selector, e.g. `data-gw-form="application"` is **excluded** from the JSON handler).
- Posts `FormData` to `window.GW_APPLICATIONS_API || '/api/applications'`.
- On success: success toast + reset. On failure/unreachable: fall back to a `mailto:`
  to careers@/info@ prefilled with the text fields plus "please attach your CV" (email
  can't auto-attach), so the applicant still gets through in static-only mode.
- "Apply" buttons set the hidden `job_title`/`job_id` and focus the form.

## Publish integration (`server/scripts/build-pages.js`)

- Add `renderCareersList()` + `writeCareers()` (writes `careers.html` between the CAREERS
  markers). Add to `rebuildAll()`; update the publish route's success flash to include the
  jobs count. Guard: only rewrite `careers.html` if the markers exist.

## Out of scope (later phases)

- Blog/Journal module (Phase 2 — next).
- Applicant self-service accounts, application status emails to applicants.
- Forgot-password / multi-user admin (tracked separately).

## Verification

- Boot server → `jobs` + `applications` tables auto-create; existing data untouched.
- Add a job in admin → Publish → `careers.html` shows the card between markers.
- Submit the public form with a PDF → row in `applications`, file in `cv-uploads/`,
  visible in the admin inbox, CV downloadable only when logged in.
- Bad file type / oversize / missing required field → rejected with a clear message.
- Server-unreachable → form falls back to mailto.
