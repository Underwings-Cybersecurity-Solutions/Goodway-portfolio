const express = require('express');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { ensureCsrf, verifyCsrf, requireLogin } = require('../middleware/auth');
const { logAudit } = require('../db');

const router = express.Router();

const ENV_PATH = path.resolve(__dirname, '..', '.env');

/** Rewrite the ADMIN_PASSWORD_HASH line in .env in place. Returns true on
 *  success. Does NOT touch any other line. The new hash also takes effect
 *  in the running process by mutating process.env, so the user can sign in
 *  with the new password without restarting the server. */
function persistNewHash(hash) {
  const src = fs.readFileSync(ENV_PATH, 'utf8');
  const next = /^ADMIN_PASSWORD_HASH=.*$/m.test(src)
    ? src.replace(/^ADMIN_PASSWORD_HASH=.*$/m, 'ADMIN_PASSWORD_HASH=' + hash)
    : src.replace(/\s*$/, '\nADMIN_PASSWORD_HASH=' + hash + '\n');
  fs.writeFileSync(ENV_PATH, next, 'utf8');
  process.env.ADMIN_PASSWORD_HASH = hash;
  return true;
}

router.get('/login', ensureCsrf, function (req, res) {
  if (req.session.user) return res.redirect('/admin');
  res.render('login', { active: '' });
});

router.post('/login', ensureCsrf, verifyCsrf, function (req, res) {
  const { username, password } = req.body;
  const EXPECT_USER = process.env.ADMIN_USERNAME || 'admin';
  const EXPECT_HASH = process.env.ADMIN_PASSWORD_HASH || '';
  if (!EXPECT_HASH) {
    req.session.flash = [{ kind: 'error', msg: 'Server not configured: ADMIN_PASSWORD_HASH is empty. Run `npm run set-password` first.' }];
    return res.redirect('/admin/login');
  }
  const ok = username === EXPECT_USER && bcrypt.compareSync(password || '', EXPECT_HASH);
  if (!ok) {
    logAudit('anonymous', 'login.fail', 'auth', null, 'user=' + String(username || '').slice(0, 40));
    req.session.flash = [{ kind: 'error', msg: 'Invalid credentials.' }];
    return res.redirect('/admin/login');
  }
  req.session.regenerate(function (err) {
    if (err) { console.error(err); return res.redirect('/admin/login'); }
    req.session.user = { username: EXPECT_USER, role: 'admin' };
    logAudit(EXPECT_USER, 'login.success', 'auth', null, null);
    req.session.flash = [{ kind: 'success', msg: 'Signed in as ' + EXPECT_USER + '.' }];
    res.redirect('/admin');
  });
});

/* ----- Change password (logged-in users) ----- */
router.get('/password', requireLogin, ensureCsrf, function (_req, res) {
  res.render('password', { active: 'password' });
});

router.post('/password', requireLogin, ensureCsrf, verifyCsrf, function (req, res) {
  const { current_password, new_password, confirm_password } = req.body || {};
  const user = req.session.user.username;
  const currentHash = process.env.ADMIN_PASSWORD_HASH || '';

  /* Server-side validation. Any failure logs to audit + flashes back to
     the form. We check current first so a bad current rejects fast. */
  if (!current_password || !bcrypt.compareSync(current_password, currentHash)) {
    logAudit(user, 'password.change.fail', 'auth', null, 'wrong current');
    req.session.flash = [{ kind: 'error', msg: 'Current password is incorrect.' }];
    return res.redirect('/admin/password');
  }
  if (!new_password || new_password.length < 10) {
    req.session.flash = [{ kind: 'error', msg: 'New password must be at least 10 characters.' }];
    return res.redirect('/admin/password');
  }
  if (new_password !== confirm_password) {
    req.session.flash = [{ kind: 'error', msg: 'New password and confirmation do not match.' }];
    return res.redirect('/admin/password');
  }
  if (new_password === current_password) {
    req.session.flash = [{ kind: 'error', msg: 'New password must be different from the current one.' }];
    return res.redirect('/admin/password');
  }

  /* Hash, persist, and rotate the session id so any leaked cookie from
     before the change becomes useless. */
  const newHash = bcrypt.hashSync(new_password, 12);
  try {
    persistNewHash(newHash);
  } catch (e) {
    console.error('persistNewHash failed', e);
    logAudit(user, 'password.change.fail', 'auth', null, 'env-write-failed: ' + e.message);
    req.session.flash = [{ kind: 'error', msg: 'Could not save the new password (server file-system error). Check server logs.' }];
    return res.redirect('/admin/password');
  }
  logAudit(user, 'password.change.success', 'auth', null, null);
  const username = user;
  req.session.regenerate(function (err) {
    if (err) { console.error(err); return res.redirect('/admin/login'); }
    req.session.user = { username, role: 'admin' };
    req.session.flash = [{ kind: 'success', msg: 'Password updated. The next sign-in will use the new password.' }];
    res.redirect('/admin');
  });
});

router.post('/logout', function (req, res) {
  const user = req.session.user && req.session.user.username;
  if (user) logAudit(user, 'logout', 'auth', null, null);
  req.session.destroy(function () {
    res.clearCookie('gw_admin');
    res.redirect('/admin/login');
  });
});

module.exports = router;
