#!/usr/bin/env bash
# Goodway — one-shot server bootstrap (Ubuntu 22.04 / 24.04).
# Run as a sudoer on a fresh VPS. Idempotent — re-running is safe.
#
#   curl -fsSL https://raw.githubusercontent.com/Underwings-Cybersecurity-Solutions/Goodway-portfolio/main/deploy/bootstrap.sh | sudo bash
# or, after cloning the repo to /var/www/goodway/site:
#   sudo bash /var/www/goodway/site/deploy/bootstrap.sh
set -euo pipefail

DOMAIN="goodway.ae"
REPO_URL="https://github.com/Underwings-Cybersecurity-Solutions/Goodway-portfolio.git"
REPO_ROOT="/var/www/goodway"
SITE_DIR="$REPO_ROOT/site"   # the repo (site root) is cloned here; nginx + pm2 expect this path
NODE_MAJOR="20"

say() { printf "\n\033[1;36m==> %s\033[0m\n" "$*"; }

if [[ $EUID -ne 0 ]]; then echo "Run as root (sudo)." >&2; exit 1; fi

# ---------- 1. System packages ----------
say "Installing system packages"
apt-get update -y
apt-get install -y curl git nginx ufw ca-certificates gnupg build-essential

# ---------- 2. Node.js via NodeSource ----------
if ! command -v node >/dev/null || [[ "$(node -v)" != v${NODE_MAJOR}* ]]; then
  say "Installing Node ${NODE_MAJOR}.x"
  curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash -
  apt-get install -y nodejs
fi

# ---------- 3. pm2 ----------
if ! command -v pm2 >/dev/null; then
  say "Installing pm2"
  npm install -g pm2
fi

# ---------- 4. Clone or update the repo (into $SITE_DIR) ----------
if [[ ! -d "$SITE_DIR/.git" ]]; then
  say "Cloning repo into $SITE_DIR"
  mkdir -p "$REPO_ROOT"
  git clone "$REPO_URL" "$SITE_DIR"
else
  say "Repo exists — pulling latest"
  git -C "$SITE_DIR" pull --ff-only
fi
chown -R www-data:www-data "$REPO_ROOT"

# ---------- 5. Install server deps ----------
say "Installing server dependencies"
sudo -u www-data -H bash -c "cd $SITE_DIR/server && npm ci --omit=dev"

# ---------- 6. .env scaffolding ----------
if [[ ! -f "$SITE_DIR/server/.env" ]]; then
  say "Seeding server/.env from .env.example — you MUST edit this"
  cp "$SITE_DIR/server/.env.example" "$SITE_DIR/server/.env"
  SESSION_SECRET="$(openssl rand -hex 48)"
  sed -i "s/^SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" "$SITE_DIR/server/.env"
  chown www-data:www-data "$SITE_DIR/server/.env"
  chmod 600 "$SITE_DIR/server/.env"
fi

# ---------- 6b. First-run database seed ----------
# Populate the SQLite DB from the current HTML (principals, sectors, jobs) so
# the admin's "Publish" round-trips faithfully instead of wiping those pages.
# Runs only when the DB does not yet exist, so redeploys never overwrite edits.
if [[ ! -f "$SITE_DIR/server/data/goodway.db" ]]; then
  say "Seeding database from current HTML (first run only)"
  sudo -u www-data -H bash -c "cd $SITE_DIR/server && npm run seed"
fi

# ---------- 7. Log directory ----------
mkdir -p /var/log/goodway
chown www-data:www-data /var/log/goodway

# ---------- 8. nginx site ----------
say "Installing nginx site"
install -m 644 "$SITE_DIR/deploy/nginx.goodway.ae.conf" "/etc/nginx/sites-available/$DOMAIN"
ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# ---------- 9. Firewall ----------
say "Configuring UFW (SSH + HTTP + HTTPS)"
ufw --force default deny incoming
ufw --force default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ---------- 10. Start the admin under pm2 ----------
say "Starting goodway-admin under pm2"
sudo -u www-data -H bash -c "cd $SITE_DIR && pm2 start deploy/pm2.ecosystem.config.js || pm2 restart goodway-admin"
sudo -u www-data -H pm2 save
# Persist across reboots
pm2 startup systemd -u www-data --hp /var/www || true

# ---------- 11. SSL via certbot ----------
if ! command -v certbot >/dev/null; then
  say "Installing certbot"
  apt-get install -y certbot python3-certbot-nginx
fi
if [[ ! -d "/etc/letsencrypt/live/$DOMAIN" ]]; then
  say "Requesting Let's Encrypt certificate (non-interactive)"
  certbot --nginx --non-interactive --agree-tos \
    -m admin@$DOMAIN \
    -d $DOMAIN -d www.$DOMAIN || {
      echo "certbot failed — check DNS A records point $DOMAIN and www.$DOMAIN at this server, then rerun:"
      echo "  sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
    }
fi

say "All done."
cat <<EOF

Next steps — do these manually once:

 1. Edit the admin password hash:
      cd $SITE_DIR/server
      npm run set-password -- 'your-strong-password'
      # copy the hash into ADMIN_PASSWORD_HASH in server/.env

 2. Set up lead notifications in server/.env:
      RESEND_API_KEY=...           (or POSTMARK_API_KEY, or NOTIFY_WEBHOOK)
      NOTIFY_TO=gwayuae@outlook.com
      NOTIFY_FROM='Goodway Website <no-reply@goodway.ae>'

 3. Restart the admin to pick up the .env changes:
      sudo -u www-data pm2 restart goodway-admin

 4. Verify end-to-end:
      curl -s https://$DOMAIN/api/health
      # → {"ok":true,"now":"..."}

      # Then submit a test lead via https://$DOMAIN/request-a-quote.html
      # and log in to https://$DOMAIN/admin to see it in the dashboard.

EOF
