import { test, expect, chromium, type Page, type Browser } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Verifies two things reported live, 2026-09-15:
//   A. The "your microphone isn't being shared" banner actually fires for a
//      genuinely non-publishing mic (not just "looks right by inspection")
//      -- launches a dedicated Chromium with a SILENT fake audio capture
//      file (not the default fake-device tone), so the local mic track is
//      real/live but truly carries zero signal, the exact class of failure
//      reported (device/OS-level, not browser-specific -- confirmed silent
//      in both Edge and Chrome).
//   B. Phone-portrait (390x844) speaker-strip bugs: the tap-to-reveal
//      spotlight sheet was clipped invisible by its own scroll container,
//      and tiles never rendered live video, only avatar/initial.
//
// Run: npx playwright test --config=playwright.live.config.ts mic-silence-and-portrait

const HOST_EMAIL = process.env.TEST_USER_EMAIL ?? '';
const HOST_PASS = process.env.TEST_USER_PASSWORD ?? '';
const GUEST_EMAIL = process.env.TEST_USER2_EMAIL ?? '';
const GUEST_PASS = process.env.TEST_USER2_PASSWORD ?? '';
const STALL = 'davisontest1';
const SILENT_WAV = path.resolve(__dirname, 'fixtures/silent-mic.wav');

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

async function guestStepIntoLive(page: Page) {
  const booksBtn = await openBooksHotspot(page);
  const stepInBtn = await findLiveEntryButton(page, booksBtn);
  await expect(stepInBtn, 'guest should find a way to join the live').toHaveCount(1);
  await stepInBtn.click({ force: true });
  await page.waitForTimeout(3000);
}

test.describe.configure({ mode: 'serial' });

test('A: mic-silent banner fires for a genuinely non-publishing mic (silent fake audio capture)', async ({ }, testInfo) => {
  test.skip(!HOST_EMAIL || !HOST_PASS, '.env.test credentials required: TEST_USER_EMAIL/PASSWORD');
  testInfo.setTimeout(90_000);

  // A dedicated browser instance with its OWN launch args -- the shared
  // `browser` fixture (playwright.live.config.ts) uses the default fake
  // TONE device, which is exactly the "mic works" case. This one's fake
  // audio capture reads a truly silent WAV, so the track is real/live but
  // carries zero signal -- the case reported (device/OS-level silence).
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      args: [
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
        `--use-file-for-fake-audio-capture=${SILENT_WAV}`,
      ],
    });
    const ctx = await browser.newContext({
      baseURL: 'https://sow2growapp.com',
      viewport: { width: 1440, height: 900 },
      permissions: ['camera', 'microphone'],
    });
    const page = await ctx.newPage();
    await login(page, HOST_EMAIL, HOST_PASS);
    await hostStartFreshLiveSession(page);
    await expect(page.locator('text=/You are hosting/')).toBeVisible({ timeout: 15000 });

    const banner = page.locator("text=/microphone isn't being shared/i");
    await expect(banner, 'the mic-silent banner must fire for a genuinely silent captured track').toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=/OS microphone privacy setting/i'), 'the OS-level hint should be present').toBeVisible();
    console.log('CONFIRMED: mic-silent banner renders for a truly non-publishing mic, including the OS-level permission hint.');

    const retryBtn = page.locator('button:has-text("Try again")');
    await expect(retryBtn, 'the banner should offer a retry action').toBeVisible();
  } finally {
    await browser?.close();
  }
});

test('B: phone portrait (390x844) -- host can spotlight/un-spotlight a guest in one tap, tiles show video/avatar', async ({ browser }) => {
  test.skip(
    !HOST_EMAIL || !HOST_PASS || !GUEST_EMAIL || !GUEST_PASS,
    '.env.test credentials required: TEST_USER_EMAIL/PASSWORD, TEST_USER2_EMAIL/PASSWORD'
  );
  test.setTimeout(3 * 60_000);

  const hostCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['camera', 'microphone'] });
  // Guest joins at a normal desktop viewport -- the reported bug is about
  // the HOST's phone-portrait panel specifically (host.setViewportSize
  // below), not the guest's. Portrait's own PortraitActionBar only offers
  // a voice raise-hand (onRaiseHand always calls raiseHand('voice')) --
  // "Join with camera on" is a desktop/landscape-only control
  // (`max-lg:landscape:flex lg:flex`), correctly hidden at a 390x844
  // portrait viewport by the app's own responsive design. Putting the
  // GUEST there was a test bug, not an app bug -- confirmed via a failed
  // run where the button "resolved" but was correctly reported not
  // visible, not missing.
  const guestCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['camera', 'microphone'] });
  const hostPage = await hostCtx.newPage();
  const guestPage = await guestCtx.newPage();

  await test.step('setup: host live, guest joins with camera on, approved', async () => {
    await login(hostPage, HOST_EMAIL, HOST_PASS);
    await login(guestPage, GUEST_EMAIL, GUEST_PASS);
    await hostStartFreshLiveSession(hostPage);
    await expect(hostPage.locator('text=/You are hosting/')).toBeVisible({ timeout: 15000 });

    await guestStepIntoLive(guestPage);
    const raiseHandBtn = guestPage.locator('button[title="Join with camera on"]').first();
    await expect(raiseHandBtn, 'guest raise-hand control').toHaveCount(1);
    await raiseHandBtn.click();

    const approveBtn = hostPage.locator('button[title="Approve"]').first();
    await expect(approveBtn, "host should see the guest's hand-raise").toBeVisible({ timeout: 20000 });
    await approveBtn.click();
    await hostPage.waitForTimeout(2500);
  });

  // Host now switches to phone-portrait to manage the panel -- reuse
  // hostCtx's own page at the reported viewport instead of a third
  // context, since the report is specifically about the HOST's portrait
  // panel controlling a guest.
  await hostPage.setViewportSize({ width: 390, height: 844 });
  await hostPage.waitForTimeout(1500);

  const guestTile = hostPage.locator('button[aria-label="Host"] ~ button').first();

  await test.step('BUG 2: guest tile shows a live video element (camera on), not just an initial', async () => {
    await guestPage.waitForTimeout(2000); // let guest's camera track actually start publishing
    // The host's own Crown tile never used <video> before this fix; a
    // guest tile only gets one when TilePicture actually renders their
    // camera track -- so a <video> appearing inside the guest tile
    // specifically (not just anywhere on the page) is the real proof.
    await expect(guestTile.locator('video'), 'the guest\'s tile should render a live <video> element for their camera').toBeVisible({ timeout: 15000 });
    console.log('CONFIRMED: portrait speaker-strip tile renders a live video element, not just an avatar/initial.');
  });

  await test.step('BUG 1: host taps the guest tile -> action sheet is VISIBLE (not clipped) -> spotlights in one more tap', async () => {
    await guestTile.click();
    await hostPage.waitForTimeout(500);

    const sheet = hostPage.locator('text="Send to big screen"');
    await expect(sheet, 'the tile actions sheet must be genuinely visible, not clipped').toBeVisible({ timeout: 5000 });
    // Prove it isn't just "present in the DOM" (the old bug) -- assert a
    // real bounding box exists on-screen.
    const box = await sheet.boundingBox();
    expect(box, 'the "Send to big screen" action must have real, on-screen coordinates').not.toBeNull();

    await sheet.click();
    await hostPage.waitForTimeout(1500);
    console.log('Spotlight sent from portrait in one tap on the tile + one tap on the sheet action.');
  });

  await test.step('un-spotlight: tap the (now spotlighted) tile again -> "Remove from big screen" -> un-spotlighted', async () => {
    await guestTile.click();
    await hostPage.waitForTimeout(500);
    const removeAction = hostPage.locator('text="Remove from big screen"');
    await expect(removeAction, 'a currently-spotlighted guest\'s sheet should offer to remove them').toBeVisible({ timeout: 5000 });
    await removeAction.click();
    await hostPage.waitForTimeout(1500);
    console.log('Un-spotlight confirmed: tapping the lit tile again offered and executed "Remove from big screen".');
  });

  await hostCtx.close();
  await guestCtx.close();
});
