# Lead notifications — setup guide

When a buyer submits the spec/quote form on the public site, the lead is
written to the SQLite `quotes` table and shown in the admin **Leads**
page. This doc explains how to also get **pinged in real time** so you
don't miss leads while you're away from the admin panel.

## How the pipeline works

```
Browser  ──POST /api/leads──►  Express server.js
                                    │
                                    ├──► SQLite quotes table  (always)
                                    │
                                    └──► notifyNewLead()  (lib/notify.js)
                                              │
                                              ├──► leads-inbox.log    (always)
                                              ├──► Resend  (if RESEND_API_KEY set)
                                              ├──► Postmark (if POSTMARK_API_KEY set)
                                              └──► Webhook  (if NOTIFY_WEBHOOK set)
```

`notifyNewLead()` is **non-blocking** — it logs the lead to a local file
*and* fans out to whichever providers you've configured. If none are
configured it silently no-ops. Lead is still saved to DB regardless.

## Pick ONE of the three options below

### Option A — Resend (recommended, 5-min setup)

Free tier: 3,000 emails/month, 100/day. More than enough for B2B leads.

1. **Sign up** at https://resend.com → verify your email.
2. **Add a sending domain.** In the Resend dashboard:
   - Click *Domains* → *Add Domain* → enter `goodway.ae`
   - Resend gives you 3 DNS records (SPF, DKIM, MX). Add them at your
     DNS host (Etisalat, Cloudflare, wherever `goodway.ae` is managed).
   - Wait ~10 min for verification (Resend re-checks automatically).
3. **Generate an API key.** Dashboard → *API Keys* → *Create*. Copy the
   key (starts with `re_`).
4. **Edit `server/.env`:**
   ```
   RESEND_API_KEY=re_yourkey...
   NOTIFY_TO=info@goodway.ae
   NOTIFY_FROM=Goodway Website <no-reply@goodway.ae>
   ```
5. **Restart the server:** Ctrl+C then `npm start`.
6. **Test:** submit a test quote at `https://goodway.ae/contact#quote`.
   You should get an email at `info@goodway.ae` within 30 seconds.

### Option B — Postmark (alternative, similar setup)

Same shape as Resend but Postmark has stronger transactional-email
reputation and slightly different DNS records.

1. Sign up at https://postmarkapp.com (paid from $15/month after a
   100-email free trial).
2. Add `goodway.ae` as a sender signature, complete DKIM + Return-Path.
3. Get the *Server Token* from your Postmark server settings.
4. Edit `server/.env`:
   ```
   POSTMARK_API_KEY=your-server-token
   NOTIFY_TO=info@goodway.ae
   NOTIFY_FROM=Goodway Website <no-reply@goodway.ae>
   ```
5. Restart, test.

### Option C — Webhook (Slack / Telegram / Zapier / anything)

If you'd rather a chat ping than an email, point the webhook at any URL
that accepts `POST application/json`.

#### Slack

1. In Slack, create an *Incoming Webhook* for the channel you want:
   https://api.slack.com/messaging/webhooks
2. Copy the webhook URL (looks like
   `https://hooks.slack.com/services/T0/B0/XXX`).
3. Edit `server/.env`:
   ```
   NOTIFY_WEBHOOK=https://hooks.slack.com/services/T0/B0/XXX
   ```
4. Restart, test. Slack channel gets a message:
   *"New lead: Ahmed · Oil & Gas · Acme Engineering"*

The webhook payload includes the full lead JSON, so Zapier / n8n /
custom services can route to anywhere — Telegram, WhatsApp Cloud API,
Notion database, Google Sheet, etc.

#### Telegram

1. Create a bot via [@BotFather](https://t.me/botfather), get the bot token.
2. Get your chat ID by sending the bot a message and visiting
   `https://api.telegram.org/bot<TOKEN>/getUpdates`.
3. Set:
   ```
   NOTIFY_WEBHOOK=https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHAT_ID>
   ```
   (You may need a small webhook adapter — the Telegram API expects
   `text` in the body which our payload includes.)

## Multiple providers at once

You can set **all three** if you want belt-and-braces. They run in
parallel via `Promise.allSettled` — one failing doesn't block the
others. Useful pattern: email to inbox + Slack ping on the team channel.

## Verification checklist

After your provider is set up, run this end-to-end smoke test:

1. Restart `npm start` — terminal should show `Goodway admin: ...`
2. Open `https://goodway.ae/contact#quote` in a private window
3. Fill the form with realistic test data, click Submit
4. Within 30 seconds, you should see:
   - The lead in `/admin/quotes` (always, regardless of notify config)
   - An email / Slack message / webhook hit (depending on provider)
   - A new line in `server/data/leads-inbox.log` (always — local audit)

If the email/webhook doesn't arrive, check `server/npm start` terminal
for stderr lines starting with `Resend send failed:` /
`Postmark send failed:` / `Webhook send failed:`. The exact API error
is logged.

## Local dev gotcha

The public `/api/leads` endpoint is on the Express admin server (port
4010). When you submit the quote form on the **deployed** site, the
form's JS POSTs to `https://goodway.ae/api/leads` which routes to that
endpoint. **On localhost** you'd be POSTing to `localhost:5501/api/leads`
which doesn't exist (the static-site dev server has no API). For local
testing of notifications, use the deployed site or proxy `/api/leads`
through the static-site dev server. Recommended: just test on the
deployed `goodway.ae` once you've configured a provider.

## Local audit log

Even with no provider configured, every lead is appended to
`server/data/leads-inbox.log` — plain-text, one block per lead, with a
timestamp. Useful as a backup if you ever lose access to the admin
panel or your email provider.

```
tail -f server/data/leads-inbox.log    # watch leads come in
```

## Summary

| Setup time | What you get | What you pay |
|---|---|---|
| 0 min (default) | Local log + admin Leads page | Free |
| 5 min (Resend) | + Email to info@goodway.ae | Free up to 3,000/month |
| 10 min (Postmark) | + Email with stronger deliverability | $15/month |
| 5 min (Slack webhook) | + Slack channel ping | Free |
| 5 min (Zapier webhook) | + Anywhere Zapier can route to | Free 100/month |

For Goodway's volume, **Option A (Resend)** is the obvious pick.
