/**
 * Shared image-upload pipeline for public content (principal logos, job images).
 *
 * Unlike CVs (private, login-gated, stored outside the web root), these images
 * appear on the live site, so they're written into the static site's
 * assets/uploads/ folder and referenced by the published HTML as
 * "assets/uploads/<file>".
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const SITE_ROOT = path.resolve(__dirname, '..', process.env.SITE_ROOT || '..');
const UPLOAD_DIR = path.join(SITE_ROOT, 'assets', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const IMG_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const IMG_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) { cb(null, UPLOAD_DIR); },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase().slice(0, 8);
    cb(null, 'img-' + Date.now() + '-' + crypto.randomBytes(6).toString('hex') + ext);
  }
});

const uploadImage = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: function (_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (IMG_EXT.has(ext) && IMG_MIME.has(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPG, PNG, WEBP or GIF images up to 5 MB are allowed.'));
  }
}).single('image');

/** Path stored in the DB and written into the public HTML. */
function publicPath(filename) { return 'assets/uploads/' + filename; }

/** Delete a previously-stored upload (best effort). Accepts the stored
 *  "assets/uploads/x" path or a bare filename. */
function removeUpload(storedPath) {
  if (!storedPath) return;
  try { fs.unlinkSync(path.join(UPLOAD_DIR, path.basename(storedPath))); } catch (e) {}
}

/**
 * Route middleware: run the single-image upload, but on a validation error
 * flash a friendly message and bounce back instead of hitting the generic
 * error page. `fallback` is where to redirect on failure.
 */
function handleImageUpload(fallback) {
  return function (req, res, next) {
    uploadImage(req, res, function (err) {
      if (err) {
        req.session.flash = [{ kind: 'error', msg: err.message || 'Image upload failed.' }];
        return res.redirect(fallback);
      }
      next();
    });
  };
}

module.exports = { handleImageUpload, publicPath, removeUpload, UPLOAD_DIR };
