// Regenerates the favicon/icon PNGs from the corrected public/s2g-logo.webp
// (2026-09-13 white-fringe fix) so every icon matches, not just the source
// file. apple-touch-icon.png has no alpha channel (Apple's own convention)
// -- flattened onto white, matching its original format.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve('C:/Users/Ezra/Desktop/deploy-ready-helper-buddy/public/s2g-logo.webp');
const PUB = 'C:/Users/Ezra/Desktop/deploy-ready-helper-buddy/public';
const buf = readFileSync(SRC);
const dataUrl = 'data:image/webp;base64,' + buf.toString('base64');

const targets = [
  { file: `${PUB}/favicon-16.png`, size: 16, flattenOnWhite: false },
  { file: `${PUB}/favicon-32.png`, size: 32, flattenOnWhite: false },
  { file: `${PUB}/favicon.png`, size: 512, flattenOnWhite: false },
  { file: `${PUB}/apple-touch-icon.png`, size: 180, flattenOnWhite: true },
  { file: `${PUB}/icon-192.png`, size: 192, flattenOnWhite: false },
  { file: `${PUB}/icon-512.png`, size: 512, flattenOnWhite: false },
];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.evaluate(async (dataUrl) => {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
  window.__logoImg = img;
}, dataUrl);

for (const t of targets) {
  const base64 = await page.evaluate(async ({ size, flattenOnWhite }) => {
    const img = window.__logoImg;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (flattenOnWhite) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size); }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, size, size);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
    return await new Promise((res) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result.split(',')[1]);
      reader.readAsDataURL(blob);
    });
  }, { size: t.size, flattenOnWhite: t.flattenOnWhite });
  writeFileSync(t.file, Buffer.from(base64, 'base64'));
  console.log('wrote', t.file, t.size);
}

await browser.close();
