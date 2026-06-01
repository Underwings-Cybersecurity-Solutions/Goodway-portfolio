/**
 * Catalogue / document-request endpoint. The site's download modal (and the
 * legacy footer email box) POST here. We validate, store a lead, dispatch a
 * notification, and — if the requested PDF exists under /assets — return its
 * public URL so the browser can open it instantly.
 *
 * Accepts (urlencoded):
 *   email   (required, validated)
 *   company (optional)
 *   phone   (optional)
 *   doc     (optional: 'brochure' | 'company-profile'; default 'company-profile')
 *   website (honeypot — if filled, silently accepted and dropped)
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const { db, logAudit } = require('../db');
const { notifyNewLead } = require('../lib/notify');
const { resolveDoc } = require('../lib/docs');

const router = express.Router();

router.post('/', express.urlencoded({ extended: true }), async function (req, res) {
  const body = req.body || {};
  const email = String(body.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'Invalid email' });
  }
  /* Honeypot */
  if (body.website && String(body.website).trim()) {
    return res.json({ ok: true });
  }

  const company = String(body.company || '').trim().slice(0, 200);
  const phone = String(body.phone || '').trim().slice(0, 100);
  const d = resolveDoc(body.doc);

  /* Store as a lead, tagged with which document was requested */
  let leadId;
  try {
    const info = db.prepare(`
      INSERT INTO quotes (name, company, email, phone, sector, division, location, timeline, spec, source, ip, user_agent)
      VALUES (@name, @company, @email, @phone, NULL, NULL, NULL, NULL, @spec, @source, @ip, @ua)
    `).run({
      name: company || 'Document download',
      company,
      email,
      phone,
      spec: 'Requested the ' + d.label + '.',
      source: d.key,
      ip: (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim(),
      ua: (req.headers['user-agent'] || '').toString().slice(0, 300)
    });
    leadId = info.lastInsertRowid;
    notifyNewLead({
      id: leadId,
      name: company || 'Document download',
      company,
      email,
      phone,
      spec: 'Requested the ' + d.label + '.'
    }).catch(function (e) { console.error('notify failed', e); });
    logAudit('anonymous', 'catalogue.request', 'lead', leadId, email + ' · ' + d.key);
  } catch (e) {
    console.error('catalogue insert failed', e);
    return res.status(500).json({ ok: false, error: 'server' });
  }

  /* If the requested PDF exists, hand back its public URL */
  const pdfPath = path.resolve(__dirname, '..', process.env.SITE_ROOT || '..', 'assets', d.file);
  const hasPdf = fs.existsSync(pdfPath);
  return res.json({
    ok: true,
    doc: d.key,
    message: hasPdf
      ? 'Thanks — opening your ' + d.label + ' in a new tab.'
      : 'Thanks — we will email the ' + d.label + ' within 48 hours.',
    url: hasPdf ? '/assets/' + d.file : null
  });
});

module.exports = router;
