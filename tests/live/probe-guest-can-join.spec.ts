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

/** Real RMS energy off every received track -- same technique as
 *  capacity-4-participants, so "can hear" means sound, not a mounted element. */
async function measureAudioEnergy(page: Page): Promise<{ found: number; energy: number }> {
  return page.evaluate(async () => {
    const els = Array.from(document.querySelectorAll('audio')) as HTMLAudioElement[];
    const live = els.filter(
      (el) => el.srcObject instanceof MediaStream && (el.srcObject as MediaStream).getAudioTracks().length > 0,
    );
    if (live.length === 0) return { found: 0, energy: 0 };
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    let max = 0;
    for (const el of live) {
      try {
        const src = ctx.createMediaStreamSource(el.srcObject as MediaStream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        src.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        for (let i = 0; i < 6; i++) {
          analyser.getByteTimeDomainData(data);
          let sumSq = 0;
          for (const v of data) { const n = (v - 128) / 128; sumSq += n * n; }
          max = Math.max(max, Math.sqrt(sumSq / data.length));
          await new Promise((r) => setTimeout(r, 120));
        }
      } catch { /* one element failing must not hide the others */ }
    }
    await ctx.close().catch(() => undefined);
    return { found: live.length, energy: max };
  });
}

async function measureAudioEnergyWithRetry(page: Page, attempts: number) {
  let best = { found: 0, energy: 0 };
  for (let i = 0; i < attempts; i++) {
    const r = await measureAudioEnergy(page);
    if (r.found > best.found || r.energy > best.energy) best = r;
    if (best.energy > 0.001) return best;
    await page.waitForTimeout(1500);
  }
  return best;
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

  // THE REQUIREMENT: this guest never raised a hand and never will. They must
  // still hear the host. Measured as real RMS energy off the received track,
  // not merely "an <audio> element exists" -- an element with a silent or
  // unattached track would otherwise read as success.
  const heard = await measureAudioEnergyWithRetry(guest, 10);
  console.log(`[GUEST HEARS] found=${heard.found} energy=${heard.energy.toFixed(4)}`);

  const presenceErrors = errors.filter((e) => /presence.*after.*subscribe/i.test(e));
  console.log(`[ERRORS] ${errors.length} total, ${presenceErrors.length} presence-after-subscribe`);
  for (const e of errors.slice(0, 15)) console.log('  ' + e);

  await guest.screenshot({ path: 'test-results/guest-join.png' });

  expect(presenceErrors, 'the realtime presence-after-subscribe crash is still happening').toEqual([]);
  expect(guestState.crashScreen, 'the guest landed on the crash screen').toBe(false);
  expect(guestState.blank, 'the guest landed on a blank page').toBe(false);
  expect(guestState.inLive, 'the guest never reached the live session').toBe(true);
  expect(
    heard.found,
    'a joiner who never raised a hand has NO remote audio element -- they are in the app but not in the room',
  ).toBeGreaterThan(0);
  expect(
    heard.energy,
    'a joiner who never raised a hand cannot hear the host speaking',
  ).toBeGreaterThan(0.001);

  for (const ctx of contexts) await ctx.close();
});
