import { test, expect, type BrowserContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// First-run experience pre-flight (2026-09-13): a member with no stall
// lands on the new "Your plot is ready" /cockpit page, walks the restyled
// /stall/build wizard, and lands back in their own real stall with a
// one-time "share it" toast. Real backend, real TEST_USER2 account (its
// stalls row is deleted first for a genuinely fresh path), real deployed
// TEST_BASE_URL -- see playwright.live-preflight.config.ts.

const SUPABASE_URL = 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const SUPABASE_PROJECT_REF = 'zuwkgasbkpjlxzsjzumu';
const ANON_KEY = 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa';

const TEST_USER2_EMAIL = process.env.TEST_USER2_EMAIL;
const TEST_USER2_PASSWORD = process.env.TEST_USER2_PASSWORD;

const STALL_NAME = 'First Run Test Stall';
const IMG = readFileSync(resolve(process.cwd(), 'public/favicon-32.png'));

async function loginAs(context: BrowserContext, email: string, password: string) {
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`login failed: ${error?.message}`);
  await context.addInitScript(
    ({ key, session }) => { window.localStorage.setItem(key, JSON.stringify(session)); window.sessionStorage.setItem('audioUnlocked', '1'); },
    { key: `sb-${SUPABASE_PROJECT_REF}-auth-token`, session: data.session },
  );
}

test.describe('First-run experience -- empty plot -> restyled build wizard -> own stall', () => {
  test.skip(!TEST_USER2_EMAIL || !TEST_USER2_PASSWORD, 'Set TEST_USER2_EMAIL/TEST_USER2_PASSWORD in .env.test to run this spec.');
  test.skip(!process.env.TEST_BASE_URL, 'Set TEST_BASE_URL in .env.test to run this spec.');

  test('walks the full flow, portrait + desktop', async ({ browser }) => {
    test.setTimeout(180_000);
    const ctx = await browser.newContext();
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
      await page.locator('input[type="file"]').setInputFiles({ name: 'front.png', mimeType: 'image/png', buffer: IMG });
      await expect(page.getByText('How it looks on a feed card')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(STALL_NAME)).toBeVisible({ timeout: 10_000 });
      await page.screenshot({ path: 'test-results/first-run-step1-front-preview.png' });
      await page.getByRole('button', { name: 'Next' }).click();
    });

    await test.step('step 2: interior image, hotspot overlay preview', async () => {
      await page.locator('input[type="file"]').setInputFiles({ name: 'interior.png', mimeType: 'image/png', buffer: IMG });
      await expect(page.getByText('Where the painted buttons will land')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText('Books', { exact: true })).toBeVisible({ timeout: 10_000 });
      await page.screenshot({ path: 'test-results/first-run-step2-interior-preview.png' });
      await page.getByRole('button', { name: 'Next' }).click();
    });

    await test.step('step 3: tiles (3 minimum, already scaffolded)', async () => {
      const labels = ['My Books', 'My Music', 'My Services'];
      for (let i = 0; i < 3; i++) {
        await page.getByPlaceholder('Label (e.g. My Books)').nth(i).fill(labels[i]);
      }
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

    await ctx.close();
  });
});
