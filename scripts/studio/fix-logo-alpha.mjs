// Removes the faint white fringe just outside the gold rim on
// public/s2g-logo.webp (2026-09-13 bug report): the rim is a hand-drawn
// "hammered gold" ring, not a perfect circle, so a single global radius
// would either clip real gold texture or leave part of the fringe behind.
// Detects the rim's own outer edge per-angle instead (sampling where the
// pixel color stops looking gold/teal/brown and starts looking near-white
// or transparent), lightly smooths that per-angle radius, then zeroes
// alpha beyond it with a 1px feather. Runs entirely in a headless
// Chromium canvas (Playwright is already a project dependency) -- no new
// image library needed for WebP decode/encode.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve('C:/Users/Ezra/Desktop/deploy-ready-helper-buddy/public/s2g-logo.webp');
const OUT_WEBP = SRC; // overwrite in place
const OUT_DIR = 'C:/Users/Ezra/AppData/Local/Temp/claude/C--Users-Ezra-Desktop-deploy-ready-helper-buddy/697f042e-702b-4ef0-8978-68f6872fba86/scratchpad';
mkdirSync(OUT_DIR, { recursive: true });

const buf = readFileSync(SRC);
const dataUrl = 'data:image/webp;base64,' + buf.toString('base64');

const browser = await chromium.launch();
const page = await browser.newPage();

const { webpBase64, pngBase64 } = await page.evaluate(async (dataUrl) => {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const w = canvas.width, h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const cx = w / 2, cy = h / 2;

  const getPx = (x, y) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= w || y >= h) return null;
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };
  // The real gold rim (including its bright highlight and dark shadow
  // tones) always has strong saturation -- the unwanted pale fringe
  // beyond it is close to neutral even where it isn't quite white.
  // Measured on the actual file: the fringe's max (R-B)-style spread is
  // ~52, the rim's own dimmest highlight spread is ~74 -- 65 sits
  // cleanly between the two.
  const isBackgroundish = (px) => {
    if (!px) return true;
    const [r, g, b, a] = px;
    if (a < 200) return true;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if ((mx - mn) < 65) return true;
    return false;
  };

  // Per-angle outer-content radius (the rim's own true edge), oversampled
  // then lightly smoothed to avoid single-pixel classification noise
  // while still following the hammered-gold silhouette. Requires 3
  // consecutive non-background radii before accepting a candidate edge,
  // so a single stray pixel (antialiasing between the rim and the fringe)
  // can't drag the detected radius outward.
  const N = 1440;
  const raw = new Float64Array(N);
  const RUN = 3;
  for (let i = 0; i < N; i++) {
    const rad = (i * 2 * Math.PI) / N;
    const dx = Math.cos(rad), dy = Math.sin(rad);
    let last = 400, run = 0;
    for (let r = 400; r < Math.min(w, h) / 2; r += 1) {
      if (!isBackgroundish(getPx(cx + r * dx, cy + r * dy))) {
        run += 1;
        if (run >= RUN) last = r;
      } else {
        run = 0;
      }
    }
    raw[i] = last;
  }
  const WIN = 5;
  const smoothed = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    let sum = 0;
    for (let k = -WIN; k <= WIN; k++) sum += raw[(i + k + N) % N];
    smoothed[i] = sum / (2 * WIN + 1);
  }

  const radiusAt = (angle) => {
    let a = angle % (2 * Math.PI);
    if (a < 0) a += 2 * Math.PI;
    const pos = (a / (2 * Math.PI)) * N;
    const i0 = Math.floor(pos) % N, i1 = (i0 + 1) % N;
    const t = pos - Math.floor(pos);
    return smoothed[i0] * (1 - t) + smoothed[i1] * t;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx, dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      const R = radiusAt(Math.atan2(dy, dx));
      const idx = (y * w + x) * 4 + 3;
      if (d > R + 1) data[idx] = 0;
      else if (d > R) data[idx] = Math.round(data[idx] * (R + 1 - d));
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const webpBlob = await new Promise((res) => canvas.toBlob(res, 'image/webp', 0.95));
  const pngBlob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  const toBase64 = (blob) => new Promise((res) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result.split(',')[1]);
    reader.readAsDataURL(blob);
  });
  return { webpBase64: await toBase64(webpBlob), pngBase64: await toBase64(pngBlob) };
}, dataUrl);

writeFileSync(OUT_WEBP, Buffer.from(webpBase64, 'base64'));
writeFileSync(`${OUT_DIR}/s2g-logo-fixed.png`, Buffer.from(pngBase64, 'base64'));
console.log('wrote', OUT_WEBP, 'and', `${OUT_DIR}/s2g-logo-fixed.png`);

await browser.close();
