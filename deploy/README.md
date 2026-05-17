# Goodway deploy — single-origin (Option A)

Everything in this folder gets the website plus the lead-capture API
online on one VPS under `https://goodway.ae`. The static site is served
by Nginx; the Node admin + `/api/leads` endpoint runs behind it on
`127.0.0.1:4010`, managed by pm2.

| File | Purpose |
|---|---|
| `nginx.goodway.ae.conf` | The Nginx vhost. Static files from `/var/www/goodway/site`; `/api/*` and `/admin/*` reverse-proxied to Node. |
| `pm2.ecosystem.config.js` | Keeps `server/server.js` alive, auto-restarts on crash, survives reboot. |
| `bootstrap.sh` | One-shot installer for a fresh Ubuntu 22.04 / 24.04 VPS. Installs Node, Nginx, pm2, certbot; clones the repo; wires everything up. |

## Quick start — fresh VPS

Prereqs before you run the script:

1. A VPS with Ubuntu 22.04 LTS or newer (Hetzner, Contabo, DigitalOcean, AWS Lightsail — ~$5-10/month is plenty for this traffic).
2. Your domain `goodway.ae` **and** `www.goodway.ae` pointing at the VPS IP (A records in your DNS provider). Wait until `dig +short goodway.ae` returns the IP before running certbot.
3. SSH access as a sudoer.

Then on the server:

```bash
curl -fsSL https://raw.githubusercontent.com/Gowtham14863205/goodway-ae/main/deploy/bootstrap.sh -o bootstrap.sh
sudo bash bootstrap.sh
```

The script installs everything, seeds `server/.env` with a random `SESSION_SECRET`, starts the admin under pm2, opens the firewall, and runs certbot for a free Let's Encrypt SSL cert. Re-running is safe.

## After the bootstrap — 3 manual steps

### 1. Set the admin password

```bash
cd /var/www/goodway/site/server
npm run set-password -- 'pick-a-strong-password'
# it prints ADMIN_PASSWORD_HASH=...
# copy that line into server/.env, replacing the empty one
```

### 2. Wire lead notifications

Open `server/.env` and fill **one** of the notify blocks:

```ini
# Resend (recommended — cheapest, cleanest dashboard)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
NOTIFY_TO=info@goodway.ae
NOTIFY_FROM=Goodway Website <no-reply@goodway.ae>
```

*or*

```ini
# Slack / Discord / Zapier incoming webhook
NOTIFY_WEBHOOK=https://hooks.slack.com/services/T0xxx/B0xxx/xxxxxxxx
```

Then reload:

```bash
sudo -u www-data pm2 restart goodway-admin
```

### 3. Smoke-test

```bash
curl -s https://goodway.ae/api/health
# → {"ok":true,"now":"2026-04-24T..."}
```

Visit `https://goodway.ae/request-a-quote.html`, submit a fake enquiry, and you should:

- See a navy toast confirming receipt.
- Log in at `https://goodway.ae/admin` (username `admin`, the password you set) and find the lead in the dashboard.
- Receive the notification at whichever channel you configured in step 2.

## Redeploys

The bootstrap script is also the redeploy path — re-running pulls the latest `main`, reinstalls server deps if `package.json` changed, and reloads nginx + pm2. For a typical content push:

```bash
sudo bash /var/www/goodway/site/deploy/bootstrap.sh
```

Or more minimally:

```bash
sudo -u www-data git -C /var/www/goodway pull
sudo -u www-data pm2 restart goodway-admin
sudo systemctl reload nginx
```

## If something goes wrong

| Symptom | Likely cause | Fix |
|---|---|---|
| `certbot` step fails | DNS hasn't propagated | `dig +short goodway.ae` — wait for IP, then rerun `sudo certbot --nginx -d goodway.ae -d www.goodway.ae` |
| `/api/leads` returns 502 Bad Gateway | pm2 app is down | `sudo -u www-data pm2 logs goodway-admin` — usually a missing `.env` value |
| Admin login loops | `SESSION_SECRET` missing or app restarted mid-session | Clear browser cookies for the domain, retry |
| Site loads but forms fall back to `mailto:` | The frontend can't reach `/api/leads` | Check browser devtools → Network. A 5xx or CORS error means the Node app isn't behind `/api/`. Check `pm2 status goodway-admin`. |
| Need to rotate the admin password | | Re-run `npm run set-password`, paste into `server/.env`, restart |

## Security notes

- `server/.env` is `chmod 600` root-owned by `www-data` after bootstrap. Don't commit it.
- `server/data/*.db` is git-ignored. Back it up nightly:
  ```bash
  0 3 * * * sqlite3 /var/www/goodway/site/server/data/goodway.db ".backup '/var/backups/goodway-$(date +\%F).db'"
  ```
- Rate limits are enforced: 5 lead submissions / minute / IP, 10 login attempts / 5 min / IP.
- The honeypot `<input name="website">` silently drops bot submissions without writing to the DB.

## Not ready to deploy yet?

Zero pressure — everything in this folder can sit unused. The forms still work in pure-static mode via `mailto:info@goodway.ae` until you flip the switch.
