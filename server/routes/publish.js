const express = require('express');
const { logAudit } = require('../db');
const { ensureCsrf, verifyCsrf } = require('../middleware/auth');
const { rebuildAll } = require('../scripts/build-pages');

const router = express.Router();

router.get('/', ensureCsrf, function (_req, res) {
  res.render('publish', { last: null, active: 'publish' });
});

router.post('/', ensureCsrf, verifyCsrf, function (req, res) {
  try {
    const result = rebuildAll();
    logAudit(req.session.user.username, 'publish', 'site', null,
             'principals=' + result.principalsWritten + ' sectors=' + result.sectorsWritten + ' jobs=' + result.jobsWritten);
    const careersMsg = result.careersWritten
      ? ' and careers.html (' + result.jobsWritten + ' openings)'
      : '';
    req.session.flash = [{
      kind: 'success',
      msg: 'Published. principals.html (' + result.principalsWritten + ' brands), industries.html (' + result.sectorsWritten + ' sectors)' + careersMsg + ' regenerated.'
    }];
  } catch (e) {
    console.error(e);
    req.session.flash = [{ kind: 'error', msg: 'Publish failed: ' + e.message }];
  }
  res.redirect('/admin/publish');
});

module.exports = router;
