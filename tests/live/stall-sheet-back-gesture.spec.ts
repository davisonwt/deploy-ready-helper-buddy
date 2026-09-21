import { test, expect, devices, type Page } from '@playwright/test';

/**
 * The phone's Back gesture closes a stall overlay. It does not leave the stall.
 *
 * Exact repro, reported and reproduced 2026-09-21 at 390x844: arrive at a
 * stall from a conversation, open the music shelf, press Back -- and land
 * on /conversations, out of the stall entirely. An open sheet added no
 * history entry (StallInteriorView synced #stall-kind= with replaceState
 * precisely so it would not), so Back skipped past the stall to whatever
 * came before it.
 *
 * Run: npx playwright test --config=playwright.live.config.ts stall-sheet-back-gesture
 *
 * Creates nothing: it reads a published stall and an existing route.
 */

const E = process.env.TEST_GOSAT_EMAIL;
const P = process.env.TEST_GOSAT_PASSWORD;

const PHONE = { ...devices['iPhone 12'] };
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const STALL = '/stall/davison.taljaard';

test.beforeAll(() => {
  if (!E || !P) {
    throw new Error(
      'TEST_GOSAT_EMAIL / TEST_GOSAT_PASSWORD are not set. They live in .env.test, which '
      + 'playwright.live.config.ts loads. This spec fails rather than skipping to green.',
    );
  }
});

async function login(page: Page) {
  for (let i = 0; i < 2; i++) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', E!);
    await page.fill('input[type="password"]', P!);
    await page.click('button[type="submit"]');
    const ok = await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 })
      .then(() => true).catch(() => false);
    if (ok) return;
  }
  throw new Error('login failed');
}

const where = (page: Page) => page.evaluate(() => ({
  path: location.pathname,
  hash: location.hash,
  sheetOpen: /stall-kind=/.test(location.hash) || !!document.querySelector('[role="dialog"]'),
  onStall: /^\/stall\//.test(location.pathname),
}));

/** Puts /conversations directly behind the stall, as a SeedCard tap from a chat does. */
async function arriveFromConversations(page: Page) {
  await page.goto('/conversations', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  await page.goto(STALL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);
}

async function openShelf(page: Page, name: string) {
  await page.getByRole('button', { name, exact: true }).first().tap();
  await page.waitForTimeout(2800);
}

test('10 Back cycles out of the music shelf, zero misroutes', async ({ browser }) => {
  const ctx = await browser.newContext({ ...PHONE });
  const page = await ctx.newPage();
  await login(page);
  await arriveFromConversations(page);

  const misroutes: string[] = [];
  for (let i = 1; i <= 10; i++) {
    await openShelf(page, 'Music');
    const opened = await where(page);
    expect(opened.sheetOpen, `cycle ${i}: the music shelf did not open`).toBe(true);

    await page.goBack();
    await page.waitForTimeout(2500);
    const after = await where(page);
    if (!after.onStall) misroutes.push(`cycle ${i} -> ${after.path}`);
    console.log(`[cycle ${i}] Back -> path=${after.path} hash=${JSON.stringify(after.hash)} sheetOpen=${after.sheetOpen}`);
    expect(after.sheetOpen, `cycle ${i}: Back did not close the shelf`).toBe(false);
    expect(after.onStall, `cycle ${i}: Back left the stall and landed on ${after.path}`).toBe(true);
  }
  console.log(`[misroutes] ${JSON.stringify(misroutes)}`);
  expect(misroutes, 'Back left the stall on at least one cycle').toEqual([]);

  // The Back AFTER the sheet is closed is meant to leave, and to land
  // exactly where the member came from.
  await page.goBack();
  await page.waitForTimeout(3000);
  const out = await where(page);
  console.log(`[final Back] ${JSON.stringify(out)}`);
  expect(out.path, 'the Back that leaves the stall should return to the conversation')
    .toBe('/conversations');
  await page.screenshot({ path: 'test-results/back-gesture-final.png' });
  await ctx.close();
});

test('switching shelves still costs exactly one Back', async ({ browser }) => {
  const ctx = await browser.newContext({ ...PHONE });
  const page = await ctx.newPage();
  await login(page);
  await arriveFromConversations(page);

  // Three kinds viewed in one run: without the replace-on-switch rule this
  // would unwind through every one of them on the way out.
  await openShelf(page, 'Music');
  await openShelf(page, 'Books');
  await openShelf(page, 'Lyrics');
  const viewed = await where(page);
  console.log(`[switch] after music -> books -> lyrics: ${JSON.stringify(viewed)}`);
  expect(viewed.sheetOpen, 'no shelf open after switching').toBe(true);
  expect(viewed.hash, 'the hash should name the shelf actually showing').toContain('lyrics');

  await page.goBack();
  await page.waitForTimeout(2500);
  const closed = await where(page);
  console.log(`[switch] one Back: ${JSON.stringify(closed)}`);
  expect(closed.sheetOpen, 'one Back should close the shelf').toBe(false);
  expect(closed.onStall, 'one Back should leave you on the stall').toBe(true);

  await page.goBack();
  await page.waitForTimeout(3000);
  const out = await where(page);
  console.log(`[switch] second Back: ${JSON.stringify(out)}`);
  expect(out.path, 'the second Back should leave -- not unwind through books and music')
    .toBe('/conversations');
  await ctx.close();
});

test('the chat sheet answers Back the same way', async ({ browser }) => {
  const ctx = await browser.newContext({ ...PHONE });
  const page = await ctx.newPage();
  await login(page);
  await arriveFromConversations(page);

  const msg = page.getByRole('button', { name: 'Message the sower' }).first();
  expect(await msg.count(), 'no "Message the sower" control on this stall').toBeGreaterThan(0);
  await msg.tap();
  await page.waitForTimeout(6000);
  const opened = await page.evaluate(() => !!document.querySelector('[role="dialog"]'));
  console.log(`[chat] opened=${opened}`);
  expect(opened, 'the chat sheet did not open').toBe(true);

  await page.goBack();
  await page.waitForTimeout(3000);
  const after = await where(page);
  console.log(`[chat] after Back: ${JSON.stringify(after)}`);
  expect(after.sheetOpen, 'Back did not close the chat sheet').toBe(false);
  expect(after.onStall, 'Back with the chat sheet open left the stall').toBe(true);
  await ctx.close();
});

test('desktop: Back closes the shelf and nothing else regresses', async ({ browser }) => {
  const ctx = await browser.newContext({ ...DESKTOP });
  const page = await ctx.newPage();
  await login(page);
  await page.goto('/conversations', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  await page.goto(STALL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);

  await page.getByRole('button', { name: 'Music', exact: true }).first().click();
  await page.waitForTimeout(2800);
  expect((await where(page)).sheetOpen, 'desktop: the shelf did not open').toBe(true);

  await page.goBack();
  await page.waitForTimeout(2500);
  const after = await where(page);
  console.log(`[desktop] after Back: ${JSON.stringify(after)}`);
  await page.screenshot({ path: 'test-results/back-gesture-desktop.png' });
  expect(after.sheetOpen, 'desktop: Back did not close the shelf').toBe(false);
  expect(after.onStall, 'desktop: Back with the shelf open left the stall').toBe(true);

  // The X still works on desktop, and still returns to the interior.
  await page.getByRole('button', { name: 'Music', exact: true }).first().click();
  await page.waitForTimeout(2800);
  await page.getByRole('button', { name: 'Close shelf', exact: true }).first().click();
  await page.waitForTimeout(2500);
  const closed = await where(page);
  console.log(`[desktop] after X: ${JSON.stringify(closed)}`);
  expect(closed.sheetOpen, 'desktop: the X did not close the shelf').toBe(false);
  expect(closed.onStall, 'desktop: the X left the stall').toBe(true);
  await ctx.close();
});
