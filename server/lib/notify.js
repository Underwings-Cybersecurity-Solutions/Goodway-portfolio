/**
 * Email notifier for new leads. Pluggable — picks provider from env.
 * Supports:
 *   - RESEND_API_KEY   → https://resend.com     (recommended, free tier is generous)
 *   - POSTMARK_API_KEY → https://postmarkapp.com
 *   - NOTIFY_WEBHOOK   → any URL that accepts POST JSON (Slack, Zapier, etc.)
 * If none set, the function silently no-ops — admins still see the lead
 * in the UI and can subscribe later without code changes.
 */
const fs = require('fs');
const path = require('path');

const TO    = process.env.NOTIFY_TO    || 'info@goodway.ae';
const FROM  = process.env.NOTIFY_FROM  || 'Goodway Website <no-reply@goodway.ae>';
const RESEND_KEY   = process.env.RESEND_API_KEY || '';
const POSTMARK_KEY = process.env.POSTMARK_API_KEY || '';
const WEBHOOK_URL  = process.env.NOTIFY_WEBHOOK || '';

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderBody(lead) {
  const subject = 'New lead: ' + (lead.name || 'unknown') +
    (lead.sector ? ' · ' + lead.sector : '') +
    (lead.company ? ' · ' + lead.company : '');
  const lines = [
    'A new quote request came in via goodway.ae.',
    '',
    'Name:      ' + (lead.name || ''),
    'Company:   ' + (lead.company || ''),
    'Email:     ' + (lead.email || ''),
    'Phone:     ' + (lead.phone || ''),
    'Sector:    ' + (lead.sector || ''),
    'Division:  ' + (lead.division || ''),
    'Location:  ' + (lead.location || ''),
    'Timeline:  ' + (lead.timeline || ''),
    '',
    'Specification:',
    lead.spec || '',
    '',
    'Received from IP ' + (lead.ip || 'unknown')
  ];
  const text = lines.join('\n');
  const html = '<pre style="font-family:ui-monospace,monospace;font-size:13px;line-height:1.55;">' +
               escapeHtml(text) +
               '</pre>';
  return { subject, text, html };
}

/* ---- Providers ---- */
async function sendResend(body) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + RESEND_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: FROM, to: [TO], subject: body.subject, html: body.html, text: body.text })
  });
  if (!r.ok) throw new Error('Resend ' + r.status + ' ' + (await r.text()).slice(0, 200));
}

async function sendPostmark(body) {
  const r = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': POSTMARK_KEY
    },
    body: JSON.stringify({ From: FROM, To: TO, Subject: body.subject, HtmlBody: body.html, TextBody: body.text })
  });
  if (!r.ok) throw new Error('Postmark ' + r.status + ' ' + (await r.text()).slice(0, 200));
}

async function sendWebhook(lead, body) {
  const r = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: body.subject,
      subject: body.subject,
      lead,
      adminUrl: (process.env.ADMIN_PUBLIC_URL || '') + '/admin/quotes/' + lead.id
    })
  });
  if (!r.ok) throw new Error('Webhook ' + r.status);
}

async function notifyNewLead(lead) {
  const body = renderBody(lead);
  /* Always append to a local inbox log for audit + offline inspection */
  try {
    const logDir = path.resolve(__dirname, '..', 'data');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(
      path.join(logDir, 'leads-inbox.log'),
      '\n=== ' + new Date().toISOString() + ' · lead #' + (lead.id || '?') + ' ===\n' + body.text + '\n'
    );
  } catch (e) { console.error('inbox log write failed', e); }

  const tasks = [];
  if (RESEND_KEY)   tasks.push(sendResend(body).catch(e => console.error('Resend send failed:', e.message)));
  if (POSTMARK_KEY) tasks.push(sendPostmark(body).catch(e => console.error('Postmark send failed:', e.message)));
  if (WEBHOOK_URL)  tasks.push(sendWebhook(lead, body).catch(e => console.error('Webhook send failed:', e.message)));
  if (tasks.length === 0) return; // silently no-op when no provider configured
  await Promise.allSettled(tasks);
}

module.exports = { notifyNewLead };
