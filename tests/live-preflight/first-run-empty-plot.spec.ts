import { test, expect, type BrowserContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// First-run experience pre-flight (2026-09-13): a member with no stall
// lands on the new "Your plot is ready" /cockpit page, walks the restyled
// /stall/build wizard, and lands back in their own real stall with a
// one-time "share it" toast. Real backend, real TEST_USER2 account (its
// stalls row is deleted first for a genuinely fresh path), real deployed
// TEST_BASE_URL -- see playwright.live-preflight.config.ts.
//
// 2026-09-13 incident: this spec used to upload public/favicon-32.png
// (32x32) as both front and interior -- StallImageUpload.tsx had no width
// floor yet, so it published fine and left TEST_USER2's real /cockpit
// showing a blown-up app logo. Now uploads Amber's own real 1216-wide
// front/interior (copied from the bucket, not the tiny logo) and deletes
// its own stalls row + storage objects at the end, so the account is
// always left exactly as it started -- no-stall -- for the next run.

const SUPABASE_URL = 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const SUPABASE_PROJECT_REF = 'zuwkgasbkpjlxzsjzumu';
const ANON_KEY = 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa';
// amberswheeles -- a real, published stall with real (non-template) 1216-
// wide front/interior art, safe to copy as test-upload source material.
const AMBER_FRONT_URL = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/c34c0eba-0010-480b-8326-7063cd7221ae/front.webp';
const AMBER_INTERIOR_URL = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/c34c0eba-0010-480b-8326-7063cd7221ae/interior.webp';
const MIN_WIDTH_PX = 800;

const TEST_USER2_EMAIL = process.env.TEST_USER2_EMAIL;
const TEST_USER2_PASSWORD = process.env.TEST_USER2_PASSWORD;

const STALL_NAME = 'First Run Test Stall';

/** Real WebP (VP8/VP8L/VP8X) width, parsed from the header -- no decoder
 * needed. Same guard StallImageUpload.tsx enforces client-side (a script
 * uploading test fixtures bypasses that UI entirely, so this test -- the
 * one thing that DOES upload a fresh file here -- checks for itself
 * rather than trusting whatever's at a hardcoded source URL forever). */
function webpWidth(buf: Buffer): number | null {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
  if (chunk === 'VP8 ') return buf.readUInt16LE(26) & 0x3fff;
  if (chunk === 'VP8L') return (buf.readUInt32LE(21) & 0x3fff) + 1;
  return null;
}

async function fetchImage(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const width = webpWidth(buf);
  if (width == null) throw new Error(`${url}: could not parse WebP width`);
  if (width < MIN_WIDTH_PX) throw new Error(`${url} is only ${width}px wide -- need >= ${MIN_WIDTH_PX}px`);
  return buf;
}

async function loginAs(context: BrowserContext, email: string, password: string) {
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`login failed: ${error?.message}`);
  await context.addInitScript(
    ({ key, session }) => { window.localStorage.setItem(key, JSON.stringify(session)); window.sessionStorage.setItem('audioUnlocked', '1'); },
    { key: `sb-${SUPABASE_PROJECT_REF}-auth-token`, session: data.session },
  );
  return client;
}

/** Deletes this account's own stalls row + every object under its own
 * storage prefix -- run both before (belt-and-braces) and after this spec
 * so a fresh run always starts from "no stall" and never leaves one
 * behind for a real member's account to stumble into. */
async function resetStall(email: string, password: string) {
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: auth, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !auth.user) throw new Error(`login failed for cleanup: ${error?.message}`);
  const { data: files } = await client.storage.from('stalls').list(auth.user.id);
  const objectPaths = (files ?? []).filter((f) => f.id).map((f) => `${auth.user!.id}/${f.name}`);
  if (objectPaths.length > 0) await client.storage.from('stalls').remove(objectPaths);
  await client.from('stalls').delete().eq('user_id', auth.user.id);
  await client.auth.signOut();
}

test.describe('First-run experience -- empty plot -> restyled build wizard -> own stall', () => {
  test.skip(!TEST_USER2_EMAIL || !TEST_USER2_PASSWORD, 'Set TEST_USER2_EMAIL/TEST_USER2_PASSWORD in .env.test to run this spec.');
  test.skip(!process.env.TEST_BASE_URL, 'Set TEST_BASE_URL in .env.test to run this spec.');

  test('walks the full flow, portrait + desktop', async ({ browser }) => {
    test.setTimeout(180_000);
    // Belt-and-braces: a prior run that crashed mid-wizard could have left
    // a stall behind -- start from the same "no stall" state this test
    // always wants, regardless of how the last run ended.
    await resetStall(TEST_USER2_EMAIL!, TEST_USER2_PASSWORD!);
    const [frontBuf, interiorBuf] = await Promise.all([fetchImage(AMBER_FRONT_URL), fetchImage(AMBER_INTERIOR_URL)]);

    const ctx = await browser.newContext();
    try {
    const page = await ctx.newPage();
    await loginAs(ctx, TEST_USER2_EMAIL!, TEST_USER2_PASSWORD!);

    // EmptyPlotView (like StallInteriorView/StallsFeedPage) renders both a
    // mobile-portrait and a desktop copy of its content, CSS-hidden by
    // viewport rather than conditionally mounted -- filter to the visible
    // one instead of .first(), which follows DOM order, not visibility.
    const visibleText = (t: string, exact = false) => page.getByText(t, { exact }).filter({ visible: true });

    await test.step('portrait (390x844): empty-plot page', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/cockpit', { waitUntil: 'networkidle' });
      await expect(visibleText('your plot is ready').first()).toBeVisible({ timeout: 15_000 });
      await expect(visibleText('three steps and your shop is open').first()).toBeVisible();
      await expect(visibleText('paint your front').first()).toBeVisible();
      await expect(visibleText('paint your inside').first()).toBeVisible();
      await expect(visibleText('sow your seeds').first()).toBeVisible();
      await page.screenshot({ path: 'test-results/first-run-portrait-empty-plot.png' });
    });

    await test.step('desktop (1440x900): empty-plot page, 3-panel frame', async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/cockpit', { waitUntil: 'networkidle' });
      await expect(visibleText('your plot is ready').first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText('My Stall / Cockpit')).toBeVisible(); // StallSideNav
      await expect(page.getByText('TODAY')).toBeVisible(); // StallTodayPanel
      await page.screenshot({ path: 'test-results/first-run-desktop-empty-plot.png' });

      await visibleText('start building').first().click();
      await page.waitForURL(/\/stall\/build/, { timeout: 15_000 });
    });

    await test.step('step 0: category + name', async () => {
      await expect(page.getByText('Build your stall')).toBeVisible({ timeout: 15_000 });
      await page.getByRole('button', { name: 'Books & Writing' }).click();
      await page.getByPlaceholder('e.g. Davison — Lyricist and Writer').fill(STALL_NAME);
      await page.getByRole('button', { name: 'Next' }).click();
    });

    await test.step('step 1: front image, live feed-card preview', async () => {
      await page.locator('input[type="file"]').setInputFiles({ name: 'front.webp', mimeType: 'image/webp', buffer: frontBuf });
      await expect(page.getByText('How it looks on a feed card')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(STALL_NAME)).toBeVisible({ timeout: 10_000 });
      await page.screenshot({ path: 'test-results/first-run-step1-front-preview.png' });
      await page.getByRole('button', { name: 'Next' }).click();
    });

    await test.step('step 2: interior image, hotspot overlay preview', async () => {
      await page.locator('input[type="file"]').setInputFiles({ name: 'interior.webp', mimeType: 'image/webp', buffer: interiorBuf });
      await expect(page.getByText('Where the painted buttons will land')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText('Books', { exact: true })).toBeVisible({ timeout: 10_000 });
      await page.screenshot({ path: 'test-results/first-run-step2-interior-preview.png' });
      await page.getByRole('button', { name: 'Next' }).click();
    });

    await test.step('step 3: Mark your shelves (draw 3 boxes -- a fresh upload starts with none)', async () => {
      await expect(page.getByText('Drag on the image to draw a box')).toBeVisible({ timeout: 10_000 });
      const canvas = page.locator('div.relative.aspect-video').first();
      const box = await canvas.boundingBox();
      if (!box) throw new Error('canvas not found');
      const regions: [number, number][] = [[0.05, 0.05], [0.35, 0.05], [0.65, 0.05]];
      for (const [xPct, yPct] of regions) {
        // .hover({position}) resolves the on-screen point the same way
        // Playwright's own actionability checks would -- a manually
        // computed boundingBox()+arithmetic pair for the first move missed
        // the canvas's pointerdown handler entirely in an earlier spec.
        await canvas.hover({ position: { x: box.width * xPct, y: box.height * yPct } });
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * (xPct + 0.2), box.y + box.height * (yPct + 0.2), { steps: 6 });
        await page.waitForTimeout(80);
        await page.mouse.up();
      }
      const labels = ['My Books', 'My Music', 'My Services'];
      const labelInputs = page.getByPlaceholder('Label (e.g. My mugs)');
      await expect(labelInputs).toHaveCount(3, { timeout: 5_000 });
      for (let i = 0; i < 3; i++) await labelInputs.nth(i).fill(labels[i]);
      await page.getByRole('button', { name: 'Next' }).click();
    });

    await test.step('step 4: preview & publish, front + interior side by side', async () => {
      // "Interior"/"Front" also match the step-indicator's own step title
      // ("Interior") -- scope to the <p> preview-column labels specifically.
      await expect(page.getByRole('paragraph').filter({ hasText: /^Front$/ })).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('paragraph').filter({ hasText: /^Interior$/ })).toBeVisible();
      await page.screenshot({ path: 'test-results/first-run-step4-side-by-side.png' });
      await page.getByRole('button', { name: 'Publish' }).click();
    });

    await test.step('lands in own stall with the one-time share toast', async () => {
      await page.waitForURL(/\/cockpit/, { timeout: 20_000 });
      await expect(page.getByText('your stall is open')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole('button', { name: 'Share my stall' })).toBeVisible();
      // The empty-plot page is gone -- this is now the real StallInteriorView.
      await expect(page.getByText('your plot is ready')).toHaveCount(0);
      await page.screenshot({ path: 'test-results/first-run-published-own-stall.png' });
    });

    await test.step('portrait (390x844): published stall + edit-mode wizard both still render', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/cockpit', { waitUntil: 'networkidle' });
      await expect(page.getByText(STALL_NAME, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
      await page.screenshot({ path: 'test-results/first-run-portrait-published-stall.png' });

      await page.goto('/stall/build', { waitUntil: 'networkidle' });
      await expect(page.getByText('Edit your stall')).toBeVisible({ timeout: 15_000 });
      await page.screenshot({ path: 'test-results/first-run-portrait-edit-wizard.png' });
    });
    } finally {
      // Leave the account exactly as this run found it -- no stall -- so
      // the next run (and any real member who happens to share this test
      // account) always sees a genuinely fresh first-run /cockpit.
      await ctx.close();
      await resetStall(TEST_USER2_EMAIL!, TEST_USER2_PASSWORD!);
    }
  });
});
