#!/usr/bin/env node
/**
 * Goodway — favicon + search-engine icon generator
 * Reads images/goodway-logo.png and emits a full icon family at images/favicon/
 * Run: node scripts/build-favicons.js
 */
'use strict';

const fs   = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SRC  = path.join(ROOT, 'images', 'goodway-logo.png');
const OUT  = path.join(ROOT, 'images', 'favicon');

/* Canonical icon sizes we want to ship */
const PNGS = [
  // Standard browser favicons
  { size: 16,  name: 'favicon-16x16.png' },
  { size: 32,  name: 'favicon-32x32.png' },
  { size: 48,  name: 'favicon-48x48.png' },
  { size: 96,  name: 'favicon-96x96.png' },
  // Android Chrome / PWA
  { size: 192, name: 'android-chrome-192x192.png' },
  { size: 256, name: 'android-chrome-256x256.png' },
  { size: 384, name: 'android-chrome-384x384.png' },
  { size: 512, name: 'android-chrome-512x512.png' },
  // Windows / Microsoft tiles
  { size: 70,  name: 'mstile-70x70.png' },
  { size: 150, name: 'mstile-150x150.png' },
  { size: 310, name: 'mstile-310x310.png' }
];

async function main() {
  if (!fs.existsSync(SRC)) { console.error('Source missing:', SRC); process.exit(1); }
  fs.mkdirSync(OUT, { recursive: true });

  const ivory  = '#faf6ec';   // brand surface
  const transp = { r: 0, g: 0, b: 0, alpha: 0 };

  for (const icon of PNGS) {
    const w = icon.width  || icon.size;
    const h = icon.height || icon.size;
    const fit  = icon.fit || 'contain';
    const bg   = icon.background || transp;
    const outPath = path.join(OUT, icon.name);
    await sharp(SRC)
      .resize({ width: w, height: h, fit, background: bg, withoutEnlargement: false })
      .png({ compressionLevel: 9, palette: icon.size <= 48 })
      .toFile(outPath);
    const st = fs.statSync(outPath);
    console.log(' ✓', icon.name.padEnd(34), (st.size / 1024).toFixed(1) + ' KB');
  }

  /* Classic favicon.ico — multi-image ICO (16/32/48) */
  const ico16 = await sharp(SRC).resize(16, 16, { fit: 'contain', background: transp }).png().toBuffer();
  const ico32 = await sharp(SRC).resize(32, 32, { fit: 'contain', background: transp }).png().toBuffer();
  const ico48 = await sharp(SRC).resize(48, 48, { fit: 'contain', background: transp }).png().toBuffer();

  // Build a multi-image .ico manually (ICONDIR + 3 ICONDIRENTRY + 3 PNG payloads).
  function icoBuf(pngs) {
    const count = pngs.length;
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);         // reserved
    header.writeUInt16LE(1, 2);         // type=1 (icon)
    header.writeUInt16LE(count, 4);
    const entrySize = 16;
    const entries = Buffer.alloc(entrySize * count);
    let offset = 6 + entrySize * count;
    const chunks = [header, entries];
    pngs.forEach((png, i) => {
      const dim = [16, 32, 48][i];
      const base = entrySize * i;
      entries.writeUInt8(dim === 256 ? 0 : dim, base + 0);  // width
      entries.writeUInt8(dim === 256 ? 0 : dim, base + 1);  // height
      entries.writeUInt8(0, base + 2);                      // palette
      entries.writeUInt8(0, base + 3);                      // reserved
      entries.writeUInt16LE(1, base + 4);                   // colour planes
      entries.writeUInt16LE(32, base + 6);                  // bits per pixel
      entries.writeUInt32LE(png.length, base + 8);          // image size
      entries.writeUInt32LE(offset, base + 12);             // offset
      offset += png.length;
      chunks.push(png);
    });
    return Buffer.concat(chunks);
  }
  const icoPath = path.join(ROOT, 'images', 'favicon.ico');
  fs.writeFileSync(icoPath, icoBuf([ico16, ico32, ico48]));
  const icoStat = fs.statSync(icoPath);
  console.log(' ✓', 'favicon.ico (16/32/48 multi)'.padEnd(34), (icoStat.size / 1024).toFixed(1) + ' KB');

  console.log(`\nAll icons written to: ${path.relative(ROOT, OUT)}/`);
  console.log(`favicon.ico written to: images/favicon.ico`);
}

main().catch(err => { console.error(err); process.exit(1); });
