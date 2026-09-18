import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * Can a second account actually JOIN a running session, on the build that is
 * serving right now?
 *
 * Reported live 2026-09-18: members hit
 *   cannot add `presence` callbacks for realtime:stage:<seed> after `subscribe()`
 * That fault was introduced by a0a0d723 and rolled back in 636a59c4, so this
 * exists to answer whether the CURRENT deployment still produces it -- the
 * alternative being that the affected tabs are still running the withdrawn
 * bundle in memory, which no server-side change can reach.
 *
 * Deliberately uses its own fresh session on a test stall rather than touching
 * whatever real session is running.
 */

const HOST_EMAIL = process.env.TEST_USER_EMAIL ?? process.env.TEST_A_EMAIL ?? '';
const HOST_PASS = process.env.TEST_USER_PASSWORD ?? process.env.TEST_A_PASSWORD ?? '';
const GUEST_EMAIL = process.env.TEST_USER2_EMAIL ?? process.env.TEST_GOSAT_EMAIL ?? '';
const GUEST_PASS = process.env.TEST_USER2_PASSWORD ?? process.env.TEST_GOSAT_PASSWORD ?? '';
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
  throw new Error('Books hotspot never became visible');
}

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

test('a second account joins a running session with no realtime crash', async ({ browser }) => {
  test.skip(!HOST_EMAIL || !HOST_PASS || !GUEST_EMAIL || !GUEST_PASS, 'needs two identities');
  test.setTimeout(8 * 60_000);

  const contexts: BrowserContext[] = [];
  const newPage = async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['camera', 'microphone'] });
    contexts.push(ctx);
    return ctx.newPage();
  };

  const hostPage = await newPage();
  const guest = await newPage();

  // Every error either tab reports, unfiltered -- the point is to catch one
  // specific throw, so a narrow filter could hide it.
  const errors: string[] = [];
  for (const [who, p] of [['host', hostPage], ['guest', guest]] as const) {
    p.on('console', (m) => { if (m.type() === 'error') errors.push(`[${who}] ${m.text().slice(0, 240)}`); });
    p.on('pageerror', (e) => errors.push(`[${who}] PAGEERROR ${String(e).slice(0, 240)}`));
  }

  // Host enters the live. No end-then-restart dance: ending a live leaves the
  // shelf closed and the rail gone, which is what broke the first version of
  // this probe. Re-entering an already-running session is fine here -- all this
  // needs is a live session for the guest to join.
  await login(hostPage, HOST_EMAIL, HOST_PASS);
  const b2 = await openBooksHotspot(hostPage);
  const goLive = await findLiveEntryButton(hostPage, b2);
  await expect(goLive, 'host should have a way into the live').toHaveCount(1);
  await goLive.click({ force: true });
  await hostPage.waitForTimeout(20000);
  const hostState = await hostPage.evaluate(() => ({
    hosting: /You are hosting/i.test(document.body.innerText),
    inLive: /Leave call|End live|See everyone|Participants/i.test(document.body.innerText),
  }));
  console.log(`[HOST] ${JSON.stringify(hostState)}`);
  expect(hostState.hosting || hostState.inLive, 'host never reached the live').toBe(true);

  // Guest joins.
  await login(guest, GUEST_EMAIL, GUEST_PASS);
  const gb = await openBooksHotspot(guest);
  const stepIn = await findLiveEntryButton(guest, gb);
  await expect(stepIn, 'guest should find a way into the live').toHaveCount(1);
  await stepIn.click({ force: true });
  await guest.waitForTimeout(12000);

  const guestState = await guest.evaluate(() => ({
    inLive: /Leave call|Raise hand|End live|You are hosting|Participants|See everyone/i.test(document.body.innerText),
    crashScreen: /Something went wrong/i.test(document.body.innerText),
    blank: document.body.innerText.trim().length < 20,
    audioEls: document.querySelectorAll('audio').length,
  }));
  console.log(`[GUEST] ${JSON.stringify(guestState)}`);

  const presenceErrors = errors.filter((e) => /presence.*after.*subscribe/i.test(e));
  console.log(`[ERRORS] ${errors.length} total, ${presenceErrors.length} presence-after-subscribe`);
  for (const e of errors.slice(0, 15)) console.log('  ' + e);

  await guest.screenshot({ path: 'test-results/guest-join.png' });

  expect(presenceErrors, 'the realtime presence-after-subscribe crash is still happening').toEqual([]);
  expect(guestState.crashScreen, 'the guest landed on the crash screen').toBe(false);
  expect(guestState.blank, 'the guest landed on a blank page').toBe(false);
  expect(guestState.inLive, 'the guest never reached the live session').toBe(true);

  for (const ctx of contexts) await ctx.close();
});
