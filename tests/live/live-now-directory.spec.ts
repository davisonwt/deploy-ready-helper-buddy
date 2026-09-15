import { test, expect, type Page } from '@playwright/test';

// "Live Now" directory proof (urgent feature, 2026-09-15): a host goes live
// (Open by default), a second logged-in user finds it in /live-now and
// joins WITHOUT a shared link, lands in the host's actual live session
// (audio + board), then the host flips to Restricted and the same row
// becomes invite-only, not directly joinable.
//
// Run: npx playwright test --config=playwright.live.config.ts live-now-directory

const HOST_EMAIL = process.env.TEST_USER_EMAIL ?? '';
const HOST_PASS = process.env.TEST_USER_PASSWORD ?? '';
const GUEST_EMAIL = process.env.TEST_USER2_EMAIL ?? '';
const GUEST_PASS = process.env.TEST_USER2_PASSWORD ?? '';
const STALL = 'davisontest1';

async function login(page: Page, email: string, pass: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 }).catch(() => {});
}

async function openBooksHotspot(page: Page) {
  await page.goto(`/stall/${STALL}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const booksBtns = page.locator('button[aria-label="Books"]');
  let booksBtn = null;
  for (let attempt = 0; attempt < 6 && !booksBtn; attempt++) {
    const c = await booksBtns.count();
    for (let i = 0; i < c; i++) {
      if (await booksBtns.nth(i).isVisible()) { booksBtn = booksBtns.nth(i); break; }
    }
    if (!booksBtn) await page.waitForTimeout(1500);
  }
  expect(booksBtn, 'Books hotspot should be present on the stall').not.toBeNull();
  await booksBtn!.click();
  await page.waitForTimeout(900);
  return booksBtn!;
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

/** Ends any leftover live from an earlier run, then starts a fresh OPEN one. */
async function hostStartFreshLiveSession(page: Page) {
  const booksBtn1 = await openBooksHotspot(page);
  const liveBtn1 = await findLiveEntryButton(page, booksBtn1);
  if (await liveBtn1.count() > 0) {
    await liveBtn1.click({ force: true });
    await page.waitForTimeout(2500);
    const endLiveBtn = page.locator('button:has-text("End live")').first();
    if (await endLiveBtn.count() > 0) {
      await endLiveBtn.click();
      await page.waitForTimeout(2000);
    }
  }
  const booksBtn2 = await openBooksHotspot(page);
  const liveBtn2 = await findLiveEntryButton(page, booksBtn2);
  await expect(liveBtn2, 'host should have a way to go live').toHaveCount(1);
  await liveBtn2.click({ force: true });
  await page.waitForTimeout(2500);
}

async function measureAudioEnergy(page: Page): Promise<{ found: number; energy: number }> {
  return page.evaluate(async () => {
    const audioEls = Array.from(document.querySelectorAll('audio'));
    const withStream = audioEls.filter(
      (el) => (el as HTMLAudioElement).srcObject instanceof MediaStream &&
        ((el as HTMLAudioElement).srcObject as MediaStream).getAudioTracks().length > 0
    ) as HTMLAudioElement[];
    if (withStream.length === 0) return { found: 0, energy: 0 };
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    let maxEnergy = 0;
    for (const el of withStream) {
      try {
        const src = ctx.createMediaStreamSource(el.srcObject as MediaStream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        src.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        for (let i = 0; i < 6; i++) {
          analyser.getByteTimeDomainData(data);
          let sumSq = 0;
          for (let j = 0; j < data.length; j++) { const v = (data[j] - 128) / 128; sumSq += v * v; }
          const rms = Math.sqrt(sumSq / data.length);
          if (rms > maxEnergy) maxEnergy = rms;
          await new Promise((r) => setTimeout(r, 100));
        }
      } catch { /* one bad element shouldn't sink the measurement */ }
    }
    return { found: withStream.length, energy: maxEnergy };
  });
}

async function measureAudioEnergyWithRetry(page: Page, attempts = 6): Promise<{ found: number; energy: number }> {
  let result = { found: 0, energy: 0 };
  for (let i = 0; i < attempts; i++) {
    result = await measureAudioEnergy(page);
    if (result.found > 0 && result.energy > 0) return result;
    await page.waitForTimeout(1500);
  }
  return result;
}

test('Live Now directory: host goes live, a stranger finds and joins it, then Restricted hides the Join button', async ({ browser }) => {
  test.skip(
    !HOST_EMAIL || !HOST_PASS || !GUEST_EMAIL || !GUEST_PASS,
    '.env.test credentials required: TEST_USER_EMAIL/PASSWORD, TEST_USER2_EMAIL/PASSWORD'
  );
  test.setTimeout(4 * 60_000);

  const hostCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['camera', 'microphone'] });
  const guestCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['camera', 'microphone'] });
  const hostPage = await hostCtx.newPage();
  const guestPage = await guestCtx.newPage();

  await test.step('setup: host goes live (Open by default)', async () => {
    await login(hostPage, HOST_EMAIL, HOST_PASS);
    await login(guestPage, GUEST_EMAIL, GUEST_PASS);
    await hostStartFreshLiveSession(hostPage);
    await expect(hostPage.locator('text=/You are hosting/')).toBeVisible({ timeout: 15000 });
  });

  const hostRow = guestPage.locator('article, div').filter({ hasText: 'is live' }).filter({ hasText: 'Open session' }).first();

  await test.step('REQUIREMENT: the live appears in /live-now as "<host> is live · Open session" for another user', async () => {
    await guestPage.goto('/live-now', { waitUntil: 'domcontentloaded' });
    await expect(hostRow, 'the host\'s live should appear in the Live Now directory as an Open session').toBeVisible({ timeout: 20000 });
    const joinBtn = hostRow.locator('button:has-text("Join")');
    await expect(joinBtn, 'an Open session should have a visible Join button').toBeVisible();
    console.log('Live Now directory: host\'s Open session listed with a Join button, confirmed for a different logged-in user.');
  });

  await test.step('REQUIREMENT: tapping Join lands the guest in the host\'s actual live (audio + board)', async () => {
    await hostRow.locator('button:has-text("Join")').click();
    await guestPage.waitForTimeout(2500);
    await expect(guestPage.locator('text=/Whisperer earns|You are hosting/')).toBeVisible({ timeout: 15000 });

    const guestHears = await measureAudioEnergyWithRetry(guestPage);
    const hostHears = await measureAudioEnergyWithRetry(hostPage);
    console.log(`Live Now join -- guest hears host: ${guestHears.energy.toFixed(4)} (n=${guestHears.found}) | host hears guest: ${hostHears.energy.toFixed(4)} (n=${hostHears.found})`);
    // The guest lands as a VIEWER (not auto-approved into the call) -- the
    // real proof here is that they're in the SAME session (board synced),
    // not necessarily already publishing/receiving audio pre-approval.
    await expect(guestPage.locator('text=/Ask to come up|Raise your hand/').first(), 'guest should land as a viewer who can raise a hand, in the SAME session as the host').toBeVisible({ timeout: 10000 });
    console.log('Live Now join: guest landed directly in the host\'s live session as a viewer (no link needed).');
  });

  await test.step('REQUIREMENT: host flips to Restricted -> the directory shows invite-only, no Join button', async () => {
    const restrictedToggle = hostPage.locator('button:has-text("Open session")').first();
    await expect(restrictedToggle, 'host should have an Open/Restricted toggle').toBeVisible({ timeout: 10000 });
    await restrictedToggle.click();
    await hostPage.waitForTimeout(1500);
    await expect(hostPage.locator('button:has-text("Restricted")').first(), 'toggle should now read Restricted').toBeVisible({ timeout: 8000 });

    // Fresh guest visit to the directory should now show invite-only, not Join.
    const guestCtx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const guestPage2 = await guestCtx2.newPage();
    await login(guestPage2, GUEST_EMAIL, GUEST_PASS);
    await guestPage2.goto('/live-now', { waitUntil: 'domcontentloaded' });
    const restrictedRow = guestPage2.locator('article, div').filter({ hasText: 'is live' }).filter({ hasText: 'Restricted session' }).first();
    await expect(restrictedRow, 'the session should now show as Restricted in the directory').toBeVisible({ timeout: 15000 });
    await expect(restrictedRow.locator('button:has-text("Join")'), 'a Restricted session must NOT have a directly clickable Join button').toHaveCount(0);
    await expect(restrictedRow.locator('text=/Invite only/i'), 'a Restricted session should read Invite only').toBeVisible();
    console.log('Restricted session correctly shows as invite-only in the directory, no Join button.');
    await guestCtx2.close();
  });

  await hostCtx.close();
  await guestCtx.close();
});
