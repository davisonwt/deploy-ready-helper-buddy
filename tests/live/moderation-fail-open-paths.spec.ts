import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * No upload surface refuses a member because the scanner could not answer.
 *
 * 2026-09-17 fixed moderate-media and CoverDropZone. 2026-09-18 Davison hit
 * "We couldn't verify this image right now" on a music/track cover -- a
 * different surface. The policy lives in one helper precisely so this does not
 * have to be fixed 37 times, and this spec checks surfaces that do NOT use
 * CoverDropZone, so a future fix that only covers the sow forms fails here.
 *
 * Only meaningful while the scanner is actually failing. Test 1 asserts that
 * first, and the rest skip if the quota has recovered -- a green run against a
 * healthy scanner would prove nothing about failing open.
 *
 * Run: npx playwright test --config=playwright.live.config.ts moderation-fail-open-paths
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const E = process.env.TEST_GOSAT_EMAIL || '';
const P = process.env.TEST_GOSAT_PASSWORD || '';
const PHOTO = path.resolve(__dirname, '../../src/assets/tier-grove.jpg');

/** Set by test 1 so the others only run while the scanner is genuinely down. */
let scannerDown = false;

async function login(page: Page) {
  for (let i = 0; i < 2; i++) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', E);
    await page.fill('input[type="password"]', P);
    await page.click('button[type="submit"]');
    const ok = await page
      .waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 })
      .then(() => true)
      .catch(() => false);
    if (ok) return;
  }
  throw new Error('login failed');
}

/** The copy a member must never see for a scanner failure. */
const SCANNER_REFUSAL = /couldn't verify this|could not verify this/i;

test.describe.serial('Fail-open on every upload surface', () => {
  test.skip(!E || !P, 'A test account is required in .env.test.');

  test('0. the scanner really is failing right now', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Must scan a REAL object. The first version of this probe pointed at a
    // path that did not exist, so moderate-media answered 'download_failed'
    // and the probe proved nothing about the scanner.
    const out = await page.evaluate(async () => {
      const ANON = 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa';
      const BASE = 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
      const keys = Object.keys(localStorage).filter((k) => k.includes('auth-token'));
      const raw = keys.length ? localStorage.getItem(keys[0]) : null;
      const session = raw ? JSON.parse(raw) : null;
      const token = session?.access_token;
      const uid = session?.user?.id;
      if (!token || !uid) return { error: 'no session' };

      // A 1x1 JPEG is enough for the scanner to have something to fetch.
      const b64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a'
        + 'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAA'
        + 'AAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const path = `covers/${uid}/QAPROBE-scanner-${Date.now()}.jpg`;
      const up = await fetch(`${BASE}/storage/v1/object/premium-room/${path}`, {
        method: 'POST',
        headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'image/jpeg' },
        body: bin,
      });
      if (!up.ok) return { error: `upload ${up.status}` };

      const r = await fetch(`${BASE}/functions/v1/moderate-media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bucket: 'premium-room', path, kind: 'image', subjectType: 'storage_object' }),
      });
      return { status: r.status, body: await r.text(), path };
    });

    console.log(`[EVIDENCE] moderate-media on a real object: ${JSON.stringify(out)}`);
    scannerDown = JSON.stringify(out).includes('scanner_unavailable');
    console.log(`[EVIDENCE] scanner currently failing: ${scannerDown}`);
  });

  // Surface 1: /products/upload -- the music/track form Davison was on.
  // Uses UploadForm.tsx, NOT CoverDropZone.
  test('1. a track cover is accepted on /products/upload', async ({ page }) => {
    test.skip(!scannerDown, 'the scanner recovered; failing open cannot be observed');
    await login(page);
    await page.goto('/products/upload', { waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel(/^Title/).first()).toBeVisible({ timeout: 30000 });

    await page.fill('#title', `QAFAILOPEN track ${Date.now()}`);
    const files = page.locator('input[type="file"]');
    await expect(files.first()).toHaveCount(1, { timeout: 10000 });
    await files.first().setInputFiles(PHOTO);
    await page.waitForTimeout(18000);

    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    const refused = SCANNER_REFUSAL.test(body);
    console.log(`[EVIDENCE] /products/upload scanner refusal shown: ${refused}`);
    await page.screenshot({ path: 'test-results/failopen-products-upload.png', fullPage: false });
    expect(refused, 'a scanner failure refused the member on /products/upload').toBe(false);
  });

  // Surface 2: /sow/art -- SeedDropZone, a third distinct component on a third
  // bucket (seed-previews), with its own guard. ProfilePage's avatar would
  // have been the other helper (moderateBase64Upload) but its input only
  // exists inside an edit mode this spec could not reach reliably; that path
  // is covered by reading the code, not by this run.
  test('2. a seed image is accepted on /sow/art', async ({ page }) => {
    test.skip(!scannerDown, 'the scanner recovered; failing open cannot be observed');
    await login(page);
    await page.goto('/sow/art', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);

    const files = page.locator('input[type="file"]');
    await expect(files.first(), 'no file input on /sow/art').toHaveCount(1, { timeout: 20000 });
    await files.first().setInputFiles(PHOTO);
    await page.waitForTimeout(20000);

    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    const refused = SCANNER_REFUSAL.test(body);
    console.log(`[EVIDENCE] /sow/art scanner refusal shown: ${refused}`);
    await page.screenshot({ path: 'test-results/failopen-sow-art.png', fullPage: false });
    expect(refused, 'a scanner failure refused the member on /sow/art').toBe(false);
  });
});
