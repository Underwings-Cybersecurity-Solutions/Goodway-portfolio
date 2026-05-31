/**
 * One-shot: ingest a new master logo PNG and emit the two site variants:
 *   images/goodway-logo.png        — dark wordmark (light backgrounds: nav)
 *   images/goodway-logo-light.png  — cream wordmark (dark backgrounds: footer)
 *
 * The cream variant is derived by recolouring the near-black wordmark text
 * to the brand cream (#FAF6EC) while leaving the gold emblem + divider
 * untouched (gold pixels are far brighter than the dark-text threshold).
 *
 * After running, regenerate the favicon family:  node scripts/build-favicons.js
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SRC = process.argv[2] || 'C:/Users/gowth/Downloads/Good way logo work (1).png';
const OUT_DARK = path.join(ROOT, 'images', 'goodway-logo.png');
const OUT_LIGHT = path.join(ROOT, 'images', 'goodway-logo-light.png');

const CREAM = { r: 250, g: 246, b: 236 };
const DARK_MAX = 110; // a pixel whose max(R,G,B) is below this is "text", not "gold"
const TARGET_W = 720; // match the outgoing logo footprint

(async () => {
  // 1. Trim transparent margin, normalise to a known width.
  const base = sharp(SRC).ensureAlpha().trim();
  const trimmedBuf = await base.png().toBuffer();
  const meta = await sharp(trimmedBuf).metadata();
  console.log('  trimmed source:', meta.width + 'x' + meta.height);

  const darkBuf = await sharp(trimmedBuf)
    .resize({ width: TARGET_W, withoutEnlargement: false })
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(OUT_DARK, darkBuf);
  const dm = await sharp(darkBuf).metadata();
  console.log('  ✓ goodway-logo.png       ' + dm.width + 'x' + dm.height + ' (' + (darkBuf.length / 1024).toFixed(1) + ' KB)');

  // 2. Cream variant — recolour dark text pixels, keep alpha + gold.
  const { data, info } = await sharp(darkBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const N = info.channels;
  let recoloured = 0;
  for (let i = 0; i < data.length; i += N) {
    const a = data[i + 3];
    if (a === 0) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (Math.max(r, g, b) < DARK_MAX) {
      data[i] = CREAM.r; data[i + 1] = CREAM.g; data[i + 2] = CREAM.b;
      recoloured++;
    }
  }
  const lightBuf = await sharp(data, { raw: { width: info.width, height: info.height, channels: N } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(OUT_LIGHT, lightBuf);
  console.log('  ✓ goodway-logo-light.png ' + info.width + 'x' + info.height + ' (' + (lightBuf.length / 1024).toFixed(1) + ' KB) · ' + recoloured + ' px recoloured to cream');
})().catch(e => { console.error(e); process.exit(1); });
