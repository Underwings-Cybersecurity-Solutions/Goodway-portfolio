# Gated Brochure / Company-Profile Download — Design

**Date:** 2026-06-01
**Status:** Approved (design); pending implementation plan

## Goal

Let a website visitor download the company **Brochure** or **Company Profile**
(two separate PDFs) by submitting their **company name, email, and contact
number** through a modal popup. On a valid submit the chosen PDF downloads
instantly, the lead is recorded in the existing admin backend, and (once an
email provider is configured) a notification email is sent to the business.

## Scope

In scope:
- A reusable modal dialog (one per page) capturing company name, email, phone,
  and a document choice (Company Profile or Brochure).
- Two triggers that open the modal: a button in the footer (replacing the
  current "Request Catalogue" email box) and a link in the top navbar.
- Instant download of the selected PDF on success.
- Lead capture + notification reusing the existing `/api/catalogue` endpoint.

Out of scope:
- True access control on the PDFs. They live as static `/assets` files and are
  therefore publicly linkable; the form is a **lead-capture gate**, not a
  security boundary. This is intentional and normal for brochures.
- Configuring the email provider (a `server/.env` change — documented here as a
  dependency, not built).
- Downloading both documents in a single submit (visitor picks one; can reopen
  the modal for the other).

## Decisions (locked during brainstorming)

| Topic | Decision |
| --- | --- |
| Documents | Two separate PDFs: Company Profile + Brochure |
| Delivery | Instant download **and** business gets notified |
| UI pattern | Button + modal popup |
| Triggers | Footer (replace catalogue box) **and** top navbar |
| Backend | Extend existing `/api/catalogue` (Approach A) |
| Document selection | Visitor picks **one** (default: Company Profile) |
| Required fields | Company name, Email, Contact number — all required |
| Code placement | All runtime-injected via JS — **zero edits to static HTML pages** |

## File paths / naming

- `assets/goodway-company-profile.pdf` — Company Profile (user provides)
- `assets/goodway-brochure.pdf` — Brochure (user provides)
- Filenames are defined once in the server route and the JS config so they are
  easy to change.

## Architecture & components

Everything user-facing is injected at runtime, matching the existing pattern in
`js/goodway-enhance.js` (head-tag injector, breadcrumbs, footer honeypot). This
avoids editing the navbar/footer markup across 25+ HTML pages whose structure
varies slightly per page.

### 1. `js/goodway-enhance.js` (new section)
Responsibilities:
- Inject a **"Company Profile"** trigger link into the primary navbar
  (`.nav-menu .nav-menu-item`).
- Inject the **modal markup** once into `<body>` (idempotent — skip if present).
- Replace the footer **"Request Catalogue"** widget (`#email-form` and its
  heading) with a **"Download Brochure / Company Profile"** button that opens
  the modal.
- Handle: open (focus first field), close (ESC / backdrop / close button,
  returning focus to the trigger), focus trap, client-side validation, submit.
- Config constants near the top of the section:
  `DOC_FILES = { 'company-profile': '...', 'brochure': '...' }` and reuse of the
  existing `CATALOGUE_API` (`window.GW_CATALOGUE_API || '/api/catalogue'`).

### 2. `css/goodway-enhance.css` (new block)
- Backdrop, centered dialog card, form layout, document-choice radios, error
  states. Reuse existing design tokens and the existing `showToast` component.
- Respect the project's existing reduced-motion handling.

### 3. `server/routes/catalogue.js` (extend)
- Accept fields: `email` (required, format-checked), `company`, `phone`,
  `doc` (`'brochure'` | `'company-profile'`, default `'company-profile'`).
- Keep the existing email-only behaviour working (backward compatible).
- Honeypot (`website`) → silent fake success (existing pattern).
- Insert a lead into the `quotes` table with:
  - `name`: company name if provided, else `'Document download'`
  - `company`: submitted company
  - `email`, `phone`: submitted values
  - `source`: the `doc` value (`'brochure'` / `'company-profile'`)
  - `spec`: `'Requested the Brochure.'` / `'Requested the Company Profile.'`
- Call `notifyNewLead(...)` (always appends to `server/data/leads-inbox.log`;
  emails the business only if a provider env var is set).
- Resolve the PDF path for the chosen doc under `SITE_ROOT/assets`. If the file
  exists, return its public `url`; otherwise return a friendly
  "we'll email it within 48 hours" message with `url: null`.
- Response shape unchanged: `{ ok, message, url }`.

## Data flow

1. Visitor clicks the footer button or the navbar link → modal opens.
2. Visitor fills company / email / phone, picks a document, submits.
3. JS validates locally → `POST /api/catalogue` with
   `{ company, email, phone, doc }` as `application/x-www-form-urlencoded`.
4. Server validates, inserts the lead, calls `notifyNewLead`, checks the PDF,
   responds with `{ ok, message, url }`.
5. JS opens `url` in a new tab (instant download), shows a success toast, resets
   and closes the modal. Focus returns to the trigger.

## Error handling

| Condition | Behaviour |
| --- | --- |
| Empty/invalid field (client) | Inline error + toast; focus the offending field; no request sent |
| Honeypot filled | Server returns fake success; nothing stored |
| Server 400 (invalid email) | Error toast; modal stays open |
| Network error / 500 | Fallback to `mailto:info@goodway.ae` naming the requested document |
| PDF missing on server | `url: null` + "we'll email it within 48 hours"; **lead still captured** |
| Rate-limited (existing 10/hr/IP) | Friendly "try later" toast |

## Accessibility

- `role="dialog"`, `aria-modal="true"`, labelled by the modal heading id.
- Focus moves into the modal on open; focus trap while open; focus returns to
  the trigger on close.
- ESC and backdrop click close the modal.
- Visible focus styles; inputs have associated `<label>`s; the document choice
  is a proper radio group with a legend.

## Notification dependency (config, not code)

The business receives an email per download **only** when `server/.env`
contains one of `RESEND_API_KEY`, `POSTMARK_API_KEY`, or `NOTIFY_WEBHOOK`, plus
`NOTIFY_TO` (e.g. `itdept1@gcee.ae`). Today none are set, so until then every
download is still recorded in the admin panel and `server/data/leads-inbox.log`.
See `server/NOTIFICATIONS.md`.

## Testing

No automated test framework exists in the repo, so verification is pragmatic:
- `curl` the extended `/api/catalogue` for each `doc` value and for missing
  fields; confirm correct `url`/message and a lead line in
  `server/data/leads-inbox.log`.
- Manual (or Playwright MCP) check on at least two pages: modal opens from both
  triggers, validates required fields, submits, and triggers a download; ESC and
  backdrop close; focus behaviour correct.

## Risks / notes

- Per-page navbar/footer structural variance is handled by querying semantic
  selectors rather than exact-string replacement; the injector must no-op
  gracefully if a selector is absent on a given page.
- The modal markup injection must be idempotent (guard against double-injection
  if the script runs twice).
