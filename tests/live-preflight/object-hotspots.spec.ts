import { test, expect, type BrowserContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Object hotspots pre-flight (2026-09-13): many-per-kind stalls.hotspots,
// the new hover-glow/tap-preview interior render, and the wizard's
// drag-to-mark "Mark your shelves" step. Real backend, real TEST_USER/
// TEST_USER2 accounts, real deployed TEST_BASE_URL.

const SUPABASE_URL = 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const SUPABASE_PROJECT_REF = 'zuwkgasbkpjlxzsjzumu';
const ANON_KEY = 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa';

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD;
const TEST_USER2_EMAIL = process.env.TEST_USER2_EMAIL;
const TEST_USER2_PASSWORD = process.env.TEST_USER2_PASSWORD;

async function loginAs(context: BrowserContext, email: string, password: string) {
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`login failed: ${error?.message}`);
  await context.addInitScript(
    ({ key, session }) => { window.localStorage.setItem(key, JSON.stringify(session)); window.localStorage.setItem('s2g:stall-room-hint-seen', '1'); },
    { key: `sb-${SUPABASE_PROJECT_REF}-auth-token`, session: data.session },
  );
}

test.describe('Object hotspots -- many per kind, hover/tap, wizard drag-marking', () => {
  test.skip(!TEST_USER_EMAIL || !TEST_USER_PASSWORD || !TEST_USER2_EMAIL || !TEST_USER2_PASSWORD, 'Set TEST_USER*/TEST_USER2* in .env.test to run this spec.');
  test.skip(!process.env.TEST_BASE_URL, 'Set TEST_BASE_URL in .env.test to run this spec.');

  test("desktop 1440x900: hover glow+pill on Davison's real stall, tap opens the right sheet", async ({ browser }) => {
    test.setTimeout(120_000);
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await loginAs(ctx, TEST_USER2_EMAIL!, TEST_USER2_PASSWORD!);
    const page = await ctx.newPage();
    await page.goto('/stall/davison.taljaard', { waitUntil: 'networkidle' });

    // "My music" object hotspot (one of guitar/piano/vinyl crate/
    // headphones/turntable) -- hover reveals the gold glow + label pill
    // (opacity 0->1, not mere DOM presence -- the pill is always in the
    // DOM, just invisible until hover/preview) without opening anything.
    const musicBox = page.getByRole('button', { name: 'My music' }).first();
    await expect(musicBox).toBeVisible({ timeout: 15_000 });
    const pill = musicBox.locator('span.pointer-events-none');
    await expect(pill).toHaveCSS('opacity', '0');
    await musicBox.hover();
    await expect(pill).toHaveCSS('opacity', '1', { timeout: 5_000 });

    // A click opens the Music sheet directly (fine pointer -- no two-step).
    await musicBox.click();
    await expect(page.getByRole('heading', { name: 'My music' })).toBeVisible({ timeout: 10_000 });
    await ctx.close();
  });

  test('mobile 390x844: two-step tap (preview then open) on a touch device', async ({ browser }) => {
    test.setTimeout(120_000);
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await loginAs(ctx, TEST_USER2_EMAIL!, TEST_USER2_PASSWORD!);
    const page = await ctx.newPage();
    await page.goto('/stall/davison.taljaard', { waitUntil: 'networkidle' });

    const mugBox = page.getByRole('button', { name: 'My mugs' }).first();
    await expect(mugBox).toBeVisible({ timeout: 15_000 });
    const mugPill = mugBox.locator('span.pointer-events-none');
    await expect(mugPill).toHaveCSS('opacity', '0');

    // First tap: label pill (+ caption) previews, sheet does NOT open.
    await mugBox.tap();
    await expect(mugPill).toHaveCSS('opacity', '1', { timeout: 3_000 });
    await expect(mugBox.getByText('Every one needs a coffee')).toBeVisible();
    await page.waitForTimeout(300);
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);

    // Second tap (within the 1.5s preview window): opens the sheet.
    await mugBox.tap();
    await expect(page.getByRole('heading', { name: 'My mugs' })).toBeVisible({ timeout: 10_000 });
    await ctx.close();
  });

  test('wizard: "Mark your shelves" loads legacy (id-less) boxes, draws a new one, saves and renders', async ({ browser }) => {
    test.setTimeout(150_000);
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await loginAs(ctx, TEST_USER_EMAIL!, TEST_USER_PASSWORD!);
    const page = await ctx.newPage();
    await page.goto('/stall/build', { waitUntil: 'networkidle' });

    // No step-chip navigation in this wizard -- click Next 3x (0->1->2->3).
    // TEST_USER already has a published stall (name/front/interior all
    // set), so canGoNext is already true at every one of these steps.
    const nextBtn = page.getByRole('button', { name: /Next/i });
    for (let i = 0; i < 3; i++) {
      await expect(nextBtn).toBeEnabled({ timeout: 10_000 });
      await nextBtn.click();
    }
    await expect(page.getByText('Drag on the image to draw a box')).toBeVisible({ timeout: 10_000 });
    // TEST_USER's row has 4 legacy hotspots with no `id` -- must render
    // without crashing (index-fallback keys) and list all 4 by their label
    // input's value (their label text also appears on kind-picker buttons
    // and canvas overlays, so the input value is the unambiguous check).
    await expect(page.locator('input[value="Books"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[value="Music"]')).toBeVisible();
    await expect(page.locator('input[value="Lyrics"]')).toBeVisible();
    await expect(page.locator('input[value="My Story"]')).toBeVisible();

    // Draw a brand new box by dragging on the canvas (mouse events -- this
    // desktop context has no touch).
    const canvas = page.locator('div.relative.aspect-video').first();
    await expect(canvas).toBeVisible({ timeout: 5_000 });
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas not found');
    const x2 = box.x + box.width * 0.30;
    const y2 = box.y + box.height * 0.30;
    const countBefore = await page.getByPlaceholder('Label (e.g. My mugs)').count();
    // .hover({position}) resolves the exact on-screen point the same way
    // Playwright's own actionability checks would (accounting for any
    // scroll/transform) -- a manually-computed boundingBox() + arithmetic
    // pair for the very first move landed off by enough to miss the
    // canvas's own pointerdown handler entirely in an earlier version of
    // this test.
    await canvas.hover({ position: { x: box.width * 0.15, y: box.height * 0.15 } });
    await page.mouse.down();
    await page.mouse.move(x2, y2, { steps: 6 });
    await page.waitForTimeout(100);
    await page.mouse.up();
    await page.waitForTimeout(200);
    const countAfter = await page.getByPlaceholder('Label (e.g. My mugs)').count();
    if (countAfter <= countBefore) throw new Error(`drag did not create a new box -- still ${countAfter} cards`);

    const newLabelInput = page.getByPlaceholder('Label (e.g. My mugs)').last();
    await newLabelInput.fill('Test pre-flight box');
    await page.getByRole('button', { name: 'Products', exact: true }).last().click();

    // Step 3 -> step 4 (Preview & publish) -- Save & publish only appears
    // on the actual last step, not this one.
    await expect(nextBtn).toBeEnabled({ timeout: 5_000 });
    await nextBtn.click();
    await page.getByRole('button', { name: /^(Save & publish|Publish)$/ }).click();
    await expect(page).toHaveURL(/\/cockpit/, { timeout: 20_000 });

    // Renders live on the interior -- hover shows the new label.
    const newBox = page.getByRole('button', { name: 'Test pre-flight box' });
    await expect(newBox).toBeVisible({ timeout: 15_000 });
    const newPill = newBox.locator('span.pointer-events-none');
    await expect(newPill).toHaveCSS('opacity', '0');
    await newBox.hover();
    await expect(newPill).toHaveCSS('opacity', '1', { timeout: 5_000 });
    await ctx.close();
  });
});
