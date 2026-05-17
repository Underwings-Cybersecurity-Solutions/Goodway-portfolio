# Goodway — Image Asset Handbook

This document is the source of truth for how images are commissioned, named,
compressed, committed and served across the Good Way General Trading website.
Read this before adding, replacing or removing any image.

**Last updated:** 2026-04-21

---

## 1. Where things live

```
site/assets/images/
├── _source/                    Masters — Git LFS, not served to web
├── logo/                       Master logo variants (goodway-logo.png is the live file)
├── hero/                       Page-level hero banners (12 images)
├── office-supplies/
│   ├── _category/              One feature image per category (14)
│   ├── stationery-essentials/  9-tile PDF grid
│   ├── paper-pads-notebooks-labels/
│   ├── files-filing-envelopes-labels/
│   └── boards-display-holders/
├── office-equipment/
│   ├── _category/              7 flagship features
│   ├── equipment-tiles/        5-tile PDF grid
│   └── display-stands/         6 Tecnostyl shots
├── printing-gifts/             8 service shots
├── brands/                     23 brand marks (SVG + PNG fallback)
├── company/                    Warehouse, showroom exteriors
├── team/                       Portraits + group shots
├── testimonials/               6 circular client avatars
├── icons/
│   ├── category/               21 category outline glyphs
│   └── ui/                     15 UI outline glyphs
├── backgrounds/                5 tileable textures
├── catalogue/                  PDF + page preview thumbnails
├── social/                     10 OG/Twitter cards (1200×630 JPG)
└── favicon/                    ICO/PNG/SVG family + webmanifest
```

The `_source/` folder holds PSD / AI / RAW masters. It is Git-LFS tracked and
**never served to the web**. Production uses the exported WebP / AVIF / JPG
derivatives only.

---

## 2. Naming convention

All filenames are **kebab-case**, keyword-first, and category-prefixed.

| Pattern | Example |
|---|---|
| `hero-<page>-<descriptor>.<ext>` | `hero-home-catalogue-shelf.webp` |
| `cat-<category-slug>.<ext>` | `cat-stationery-essentials-macro.webp` |
| `tile-<product-slug>.<ext>` | `tile-calculators-casio.webp` |
| `equip-<product>-<brand>.<ext>` | `equip-shredders-rexel.webp` |
| `display-<descriptor>.<ext>` | `display-brochure-tower-silver.webp` |
| `print-<service>-<descriptor>.<ext>` | `print-diary-embossed.webp` |
| `brand-<slug>.<ext>` | `brand-brother.svg` |
| `icon-category-<slug>.svg` | `icon-category-shredders.svg` |
| `icon-ui-<name>.svg` | `icon-ui-search.svg` |
| `bg-<descriptor>.webp` | `bg-ivory-paper-texture.webp` |
| `avatar-client-<slug>.webp` | `avatar-client-al-futtaim.webp` |
| `og-<page>.jpg` | `og-office-equipment.jpg` |

**Never rename a published file.** Filenames are referenced by external caches,
social-share scrapers and search engines. To change meaning, deprecate via
redirect — don't rename.

---

## 3. Format matrix

| Use case | Primary | Fallback 1 | Fallback 2 |
|---|---|---|---|
| Hero / category feature | AVIF | WebP | JPG |
| Product tiles | WebP | — | JPG |
| Brand marks | SVG | PNG 400×200 | — |
| UI + category icons | SVG inline | — | — |
| Backgrounds / textures | WebP | — | — |
| OG / Twitter cards | JPG only | — | — |
| Catalogue page previews | WebP | — | JPG |
| Favicon family | ICO / PNG / SVG | — | — |

**OG cards must be JPG.** Social scrapers (Slack, WhatsApp, iMessage, Twitter,
LinkedIn) unreliably render WebP/AVIF. Stay with JPG at 1200×630.

---

## 4. Responsive widths

Every raster asset in `/hero/`, `/office-supplies/_category/`,
`/office-equipment/_category/` is generated at 5 widths:

```
480, 800, 1200, 1600, 2000 px
```

File naming appends the width suffix:

```
hero-home-catalogue-shelf-480.avif
hero-home-catalogue-shelf-800.avif
hero-home-catalogue-shelf-1200.avif
hero-home-catalogue-shelf-1600.avif
hero-home-catalogue-shelf-2000.avif
```

Product tiles and smaller assets use a single width (see budgets below).

---

## 5. Compression budgets (fails CI if exceeded)

| Asset type | Max size |
|---|---|
| Hero AVIF (2000w) | 180 KB |
| Hero WebP (2000w) | 240 KB |
| Hero JPG (2000w) | 280 KB |
| Category feature AVIF | 140 KB |
| Product tile WebP (800×800) | 60 KB |
| Display-stand WebP (1200×1500) | 120 KB |
| Background WebP | 80 KB |
| Brand SVG (minified) | 4 KB |
| Icon SVG (minified) | 2 KB |
| OG JPG | 180 KB |
| Catalogue page preview WebP | 70 KB |

CI enforces these via `.github/workflows/image-budget.yml`.

---

## 6. Toolchain

- **AVIF / WebP generation** — [Squoosh CLI](https://github.com/GoogleChromeLabs/squoosh/tree/dev/cli)
  ```bash
  npx @squoosh/cli --avif '{"cqLevel":30}' --webp '{"quality":78}' --resize '{"enabled":true,"width":2000}' ./src/*.jpg -d ./out
  ```
- **JPG optimisation** — `mozjpeg` via `squoosh-cli --mozjpeg '{"quality":82}'`
- **SVG minification** — [SVGO](https://github.com/svg/svgo) with `removeViewBox: false`
- **Favicon family** — [realfavicongenerator.net](https://realfavicongenerator.net/) — output goes into `/favicon/`
- **PDF page previews** — generate via `pdftoppm -r 96 goodway-catalogue.pdf catalogue-page -png` then convert to WebP

---

## 7. Replacing an existing image

1. Open `assets/images/alt-text.yml` — confirm the filename already has an alt entry.
2. Save the new image with **the exact same filename** (case-sensitive).
3. Bump `IMG_VER` in `js/goodway-enhance.js` (top of file) to any new string.
4. Commit both the image and the JS version bump in the same PR.
5. Hard-reload the browser once (Ctrl+F5) to verify.

The `IMG_VER` query-string cache-bust propagates the change to every
referenced image on the site — no manual search-and-replace required.

---

## 8. Adding a new image

1. Drop the exported raster into the correct subfolder using the naming convention.
2. Generate all required format + width variants (see Section 4).
3. Add an entry to `assets/images/alt-text.yml`:
   ```yaml
   - file: office-supplies/stationery-essentials/tile-new-product.webp
     alt: "Descriptive alt text — brand — Good Way General Trading"
   ```
4. Add a licence entry to `assets/images/CREDITS.yml`.
5. Reference it in HTML using the `<picture>` helper (see Section 9).
6. Open a PR. CI will check sizes and fail if budgets are exceeded.

---

## 9. Using an image in HTML

**Recommended** — use the JS `<picture>` upgrader by writing a plain `<img>`
with `data-src`:

```html
<img data-src="assets/images/hero/hero-home-catalogue-shelf.jpg"
     alt="Good Way General Trading catalogue — stationery and office equipment display"
     width="1600" height="900"
     loading="lazy" decoding="async">
```

The helper in `js/goodway-enhance.js` upgrades it at runtime into a full
`<picture>` element with AVIF + WebP + JPG fallback and cache-busting.

**For the LCP image** (first hero on each page), use a full `<picture>`
element inline and `fetchpriority="high"`:

```html
<picture>
  <source type="image/avif"
    srcset="assets/images/hero/hero-home-catalogue-shelf-800.avif 800w,
            assets/images/hero/hero-home-catalogue-shelf-1200.avif 1200w,
            assets/images/hero/hero-home-catalogue-shelf-1600.avif 1600w,
            assets/images/hero/hero-home-catalogue-shelf-2000.avif 2000w"
    sizes="(max-width:640px) 100vw, (max-width:1200px) 90vw, 1200px">
  <source type="image/webp"
    srcset="… .webp variants …" sizes="…">
  <img src="assets/images/hero/hero-home-catalogue-shelf-1200.jpg"
       alt="Good Way General Trading catalogue — stationery and office equipment display"
       width="1600" height="900"
       fetchpriority="high" decoding="async">
</picture>
```

Also add a preload to `<head>`:

```html
<link rel="preload" as="image"
  href="assets/images/hero/hero-home-catalogue-shelf-1200.avif"
  imagesrcset="… .avif variants …" imagesizes="100vw" type="image/avif">
```

---

## 10. Alt text rules

1. Descriptive, not literal — "Casio office calculator" beats "a calculator".
2. Include the brand where relevant ("Brother P-touch labelling machine").
3. Purely decorative images — `alt=""` + `aria-hidden="true"`.
4. Do not start with "image of" or "picture of".
5. Max 125 characters per alt string.
6. Never duplicate alt across images on the same page.

All alt strings live in `alt-text.yml` as the single source of truth.

---

## 11. Image sitemap + SEO

`sitemap-images.xml` is generated by `scripts/build-sitemap-images.js` from
the contents of `/assets/images/` and the `alt-text.yml` file.

Regenerate before deploy:

```bash
node scripts/build-sitemap-images.js > sitemap-images.xml
```

Or add it to your deploy pipeline.

`robots.txt` already references the image sitemap.

---

## 12. Git LFS

Masters are tracked with LFS. Install LFS once per developer:

```bash
git lfs install
```

LFS rules live in `.gitattributes`. The following patterns route to LFS:

- `*.psd`, `*.ai`, `*.raw`, `*.tif`
- `assets/images/_source/**`

Large binary commits in `_source/` should never exceed 50 MB each; larger files
go to cloud storage, referenced via a `_source/CLOUD.md` note.

---

## 13. CDN offload

When `/assets/images/` exceeds 50 MB on disk, mirror it to a CDN:

1. Sync `/assets/images/` → Cloudflare R2 / Bunny / Backblaze B2.
2. Update a single base-URL constant in `js/goodway-enhance.js` (`IMG_BASE`).
3. Retain the same folder structure on the CDN so the sitemap and HTML paths
   stay stable — only the origin changes.

---

## 14. Contacts

- Brand-usage approvals (logo, 23 partner marks): see `CREDITS.yml` per brand.
- Commissioned photography: licence is `exclusive-transfer` by default.
- Stock imagery: keep the source URL + licence key in `CREDITS.yml`.

Questions → info@goodway.ae
