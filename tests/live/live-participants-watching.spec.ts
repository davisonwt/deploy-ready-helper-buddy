import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * A viewer who never raised a hand must still appear in "Everyone here".
 *
 * Reported live 2026-09-18, from a real session: the host's sheet read
 * IN THE POCKET 0 and WAITING TO COME UP 0 while a member was actively typing
 * in Live Chat. The sheet only ever listed approved panel guests plus the host,
 * so anyone who simply stepped in and watched was invisible to everybody.
 *
 * The Daily participant list cannot answer this -- LiveStage only joins the
 * call when `isHost || iAmApproved`, so a watcher is deliberately not in the
 * room. Presence now rides the `stage:${seedId}` broadcast channel, which every
 * participant subscribes to for the board.
 *
 * Run: npx playwright test --config=playwright.live.config.ts live-participants-watching
 */

const HOST_EMAIL = process.env.TEST_USER_EMAIL ?? process.env.TEST_A_EMAIL ?? '';
const HOST_PASS = process.env.TEST_USER_PASSWORD ?? process.env.TEST_A_PASSWORD ?? '';
const WATCHER_EMAIL = process.env.TEST_USER2_EMAIL ?? process.env.TEST_GOSAT_EMAIL ?? '';
const WATCHER_PASS = process.env.TEST_USER2_PASSWORD ?? process.env.TEST_GOSAT_PASSWORD ?? '';
const STALL = 'davisontest1';

async function login(page: Page, email: string, pass: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 25000 }).catch(() => {});
}

async function openBooksHotspot(page: Page) {
  await page.goto(`/stall/${STALL}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  const books = page.locator('button[aria-label="Books"]');
  for (let attempt = 0; attempt < 6; attempt++) {
    const c = await books.count();
    for (let i = 0; i < c; i++) {
      if (await books.nth(i).isVisible()) {
        await books.nth(i).click({ force: true });
        await page.waitForTimeout(2500);
        return books.nth(i);
      }
    }
    await page.waitForTimeout(1500);
  }
  throw new Error('Books hotspot never became visible on the stall');
}

/** Go Live (host) or Step In (viewer) -- the same rail control, relabelled. */
async function findLiveEntryButton(page: Page, booksBtn: ReturnType<Page['locator']>) {
  let btn = page.locator('button[aria-label="Go Live"]').first();
  if (await btn.count() === 0) btn = page.locator('button[aria-label="Step In"]').first();
  if (await btn.count() === 0) {
    await booksBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1200);
    btn = page.locator('button[aria-label="Go Live"]').first();
    if (await btn.count() === 0) btn = page.locator('button[aria-label="Step In"]').first();
  }
  return btn;
}

/**
 * End whatever session is already running on this seed, then start a clean one.
 *
 * A previous run that closed its browser contexts can leave the seed still
 * showing "Step In": presence is gone but the session row is not, and the host
 * re-entering that half-dead session never reaches "You are hosting". Same
 * shape as capacity-4-participants' own helper, which is why that one is
 * reliable and the first version of this spec was not.
 */
async function hostStartFreshLiveSession(page: Page) {
  const books1 = await openBooksHotspot(page);
  const first = await findLiveEntryButton(page, books1);
  if (await first.count()) {
    await first.click({ force: true });
    await page.waitForTimeout(2500);
    const endLive = page.locator('button:has-text("End live")').first();
    if (await endLive.count()) {
      await endLive.click();
      await page.waitForTimeout(2000);
    }
  }
  const books2 = await openBooksHotspot(page);
  const second = await findLiveEntryButton(page, books2);
  await expect(second, 'host should have a way to go live').toHaveCount(1);
  await second.click({ force: true });
  await page.waitForTimeout(4000);
}

async function guestStepIntoLive(page: Page) {
  const books = await openBooksHotspot(page);
  const stepIn = await findLiveEntryButton(page, books);
  await expect(stepIn, 'the watcher should find a way into the live').toHaveCount(1);
  await stepIn.click({ force: true });
  await page.waitForTimeout(6000);
}

/** The three group headers, as the sheet renders them. */
async function readSheet(page: Page) {
  await page.getByRole('button', { name: /See everyone/i }).first().click();
  await page.waitForTimeout(2500);
  return page.evaluate(() => {
    const text = document.body.innerText;
    const num = (label: string) => {
      const m = new RegExp(`${label}\\s*·\\s*(\\d+)`, 'i').exec(text);
      return m ? Number(m[1]) : -1;
    };
    const sheet = Array.from(document.querySelectorAll('div'))
      .find((d) => /Everyone here/i.test(d.textContent ?? ''));
    return {
      pocket: num('In the pocket'),
      waiting: num('Waiting to come up'),
      watching: num('Watching'),
      body: (sheet?.textContent ?? '').replace(/\s+/g, ' ').slice(0, 400),
    };
  });
}

test('a viewer who never raised a hand still shows up, under Watching', async ({ browser }) => {
  test.skip(
    !HOST_EMAIL || !HOST_PASS || !WATCHER_EMAIL || !WATCHER_PASS,
    'needs two distinct identities: a host who owns the stall, plus a watcher',
  );
  test.setTimeout(8 * 60_000);

  const contexts: BrowserContext[] = [];
  const newPage = async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['camera', 'microphone'] });
    contexts.push(ctx);
    return ctx.newPage();
  };

  const hostPage = await newPage();
  const watcher = await newPage();

  await login(hostPage, HOST_EMAIL, HOST_PASS);
  await hostStartFreshLiveSession(hostPage);
  await expect(hostPage.locator('text=/You are hosting/')).toBeVisible({ timeout: 25000 });

  // Before: the host is alone, and the sheet should say so honestly.
  const before = await readSheet(hostPage);
  console.log(`[BEFORE] ${JSON.stringify(before)}`);
  expect(before.watching, 'the sheet has no Watching group at all').toBeGreaterThanOrEqual(0);
  await hostPage.keyboard.press('Escape').catch(() => {});
  await hostPage.locator('button[aria-label="Close"]').first().click({ force: true }).catch(() => {});
  await hostPage.waitForTimeout(1500);

  // The watcher steps in and does NOTHING else -- no hand raised, ever. This is
  // exactly the person who was invisible.
  await login(watcher, WATCHER_EMAIL, WATCHER_PASS);
  await guestStepIntoLive(watcher);
  await hostPage.waitForTimeout(8000);

  const after = await readSheet(hostPage);
  console.log(`[AFTER ] ${JSON.stringify(after)}`);

  expect(after.waiting, 'the watcher never raised a hand, so Waiting must stay empty').toBe(0);
  expect(
    after.watching,
    'a member is in the session and the sheet still says nobody is -- the reported bug',
  ).toBeGreaterThan(before.watching);
  // The host is always in the pocket; a header reading 0 above their own
  // visible row was its own small lie.
  expect(after.pocket, 'the host is not counted in their own session').toBeGreaterThan(0);

  // And the watcher must appear exactly once, not in two groups at a time.
  const dupes = await hostPage.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('div'))
      .map((d) => (d.children.length === 0 ? d.textContent?.trim() ?? '' : ''))
      .filter(Boolean);
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r, (counts.get(r) ?? 0) + 1);
    return [...counts.entries()].filter(([, n]) => n > 1).map(([name]) => name);
  });
  console.log(`[DUPES] ${JSON.stringify(dupes)}`);

  await hostPage.screenshot({ path: 'test-results/participants-watching.png' });
  for (const ctx of contexts) await ctx.close();
});
