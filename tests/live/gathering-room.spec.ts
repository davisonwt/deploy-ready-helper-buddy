import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Live Go-Live / Gathering Room end-to-end proof -- two real accounts
// (host + guest), one continuous live session on the actual production
// deployment (sow2growapp.com, see playwright.live.config.ts's baseURL).
// Four requirements, asserted with real evidence, in one run:
//   1. Audio both directions, camera ON and OFF (real received-track RMS
//      energy, not "no thrown error").
//   2. PDF uploads, renders for host AND guest, page-turn syncs.
//   3. A spotlighted guest gets presenter tools and can push their own
//      content; reclaiming control restores the host's own prior content.
//   4. PDF survives a PDF -> TEXT -> PDF round trip, same page, still
//      synced to the guest.
//
// Run: npx playwright test --config=playwright.live.config.ts

const HOST_EMAIL = process.env.TEST_USER_EMAIL ?? '';
const HOST_PASS = process.env.TEST_USER_PASSWORD ?? '';
const GUEST_EMAIL = process.env.TEST_USER2_EMAIL ?? '';
const GUEST_PASS = process.env.TEST_USER2_PASSWORD ?? '';
const PDF_PATH = path.resolve(__dirname, 'fixtures/test3page.pdf');
const STALL = 'davisontest1';

async function login(page: Page, email: string, pass: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 }).catch(() => {});
}

/** Opens the Books hotspot sheet on the stall's interior view (a fresh
 * navigation every time, so it never depends on whatever state the page
 * was already in). Desktop viewport -- a single click opens it directly,
 * no touch two-step. */
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

/** Ends any live session left over from an earlier run (so board_state
 * starts empty -- no stale pdfUrl/spotlightUserId to muddy this run's
 * assertions), then starts a brand new one. */
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

/** Measures whether any remote-participant <audio> element carries REAL,
 * non-silent audio -- WebAudio RMS energy on the actual received
 * MediaStreamTrack, not "the element exists" or "play() didn't throw." */
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

/** A tap on the board reveals the (auto-fading) zoom/page-turn control bar
 * -- called right before reading "Page X of Y" so a check never races the
 * 3s fade. */
async function revealBoardControls(page: Page) {
  await page.locator('canvas').first().click({ position: { x: 5, y: 5 } }).catch(() => {});
  await page.waitForTimeout(300);
}

test('Go-Live: audio, PDF sync, presenter handoff, PDF persistence -- one live session, one run', async ({ browser }) => {
  test.skip(
    !HOST_EMAIL || !HOST_PASS || !GUEST_EMAIL || !GUEST_PASS,
    '.env.test credentials required: TEST_USER_EMAIL/PASSWORD, TEST_USER2_EMAIL/PASSWORD'
  );
  test.setTimeout(6 * 60_000);

  const hostCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ['camera', 'microphone'],
  });
  const guestCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ['camera', 'microphone'],
  });
  const hostPage = await hostCtx.newPage();
  const guestPage = await guestCtx.newPage();
  hostPage.on('pageerror', (e) => console.log('[host pageerror]', e.message));
  guestPage.on('pageerror', (e) => console.log('[guest pageerror]', e.message));

  await test.step('setup: login host + guest, host starts fresh live, guest joins + is approved', async () => {
    await login(hostPage, HOST_EMAIL, HOST_PASS);
    await login(guestPage, GUEST_EMAIL, GUEST_PASS);

    await hostStartFreshLiveSession(hostPage);
    await expect(hostPage.locator('text=/You are hosting/')).toBeVisible({ timeout: 15000 });
    console.log('LIVE bundle under test:', await hostPage.evaluate(() =>
      document.querySelector('script[src*="index-"]')?.getAttribute('src') || 'unknown'));

    await guestStepIntoLive(guestPage);
    const raiseHandBtn = guestPage.locator('button[title="Join with voice only — your face stays hidden"]').first();
    await expect(raiseHandBtn, 'guest raise-hand control').toHaveCount(1);
    await raiseHandBtn.click();

    const approveBtn = hostPage.locator('button[title="Approve"]').first();
    await expect(approveBtn, 'host should see the guest\'s hand-raise').toBeVisible({ timeout: 20000 });
    await approveBtn.click();
    await hostPage.waitForTimeout(2500);
  });

  await test.step('REQUIREMENT 1a: audio both directions, host camera OFF', async () => {
    const camBtn = hostPage.locator('button[aria-label="Turn camera off"], button[aria-label="Turn camera on"]').first();
    await expect(camBtn).toHaveCount(1);
    await expect(camBtn, 'host camera should default OFF').toHaveAttribute('aria-label', 'Turn camera on');

    const guestHears = await measureAudioEnergyWithRetry(guestPage);
    const hostHears = await measureAudioEnergyWithRetry(hostPage);
    console.log(`AUDIO camera-OFF -- guest hears host: ${guestHears.energy.toFixed(4)} (elements=${guestHears.found}) | host hears guest: ${hostHears.energy.toFixed(4)} (elements=${hostHears.found})`);

    expect(guestHears.found, 'guest must have a live remote-audio element').toBeGreaterThan(0);
    expect(guestHears.energy, 'guest must HEAR real audio energy from host, camera off').toBeGreaterThan(0.001);
    expect(hostHears.found, 'host must have a live remote-audio element').toBeGreaterThan(0);
    expect(hostHears.energy, 'host must HEAR real audio energy from guest').toBeGreaterThan(0.001);
  });

  await test.step('REQUIREMENT 1b: audio survives host camera ON (mic independent of camera)', async () => {
    const camBtn = hostPage.locator('button[aria-label="Turn camera off"], button[aria-label="Turn camera on"]').first();
    await camBtn.click();
    await hostPage.waitForTimeout(2000);
    await expect(camBtn, 'host camera should now be ON').toHaveAttribute('aria-label', 'Turn camera off');

    const guestHears = await measureAudioEnergyWithRetry(guestPage);
    console.log(`AUDIO camera-ON -- guest hears host: ${guestHears.energy.toFixed(4)} (elements=${guestHears.found})`);
    expect(guestHears.energy, 'guest must still HEAR host with camera ON').toBeGreaterThan(0.001);

    await camBtn.click(); // back off, matches the rest of the flow
    await hostPage.waitForTimeout(1000);
  });

  await test.step('REQUIREMENT 2a: PDF uploads and renders for host AND guest', async () => {
    const pdfTab = hostPage.locator('button:has-text("PDF")').first();
    await pdfTab.click();
    await hostPage.waitForTimeout(1000);

    const fileInput = hostPage.locator('input[type="file"][accept="application/pdf"]');
    await expect(fileInput, 'fresh session should show the PDF upload prompt').toHaveCount(1);
    await fileInput.setInputFiles(PDF_PATH);
    await hostPage.waitForTimeout(6000);

    await expect(hostPage.locator('canvas').first(), 'host canvas should render the uploaded PDF').toBeVisible({ timeout: 15000 });

    await guestPage.waitForTimeout(2500);
    await expect(guestPage.locator('canvas').first(), 'guest canvas should render the same PDF (synced)').toBeVisible({ timeout: 15000 });
    console.log('PDF uploaded and rendered for both host and guest');
  });

  await test.step('REQUIREMENT 2b: page-turn syncs to the guest', async () => {
    const nextPageBtn = hostPage.locator('button[aria-label="Next page"]').first();
    await expect(nextPageBtn).toBeVisible({ timeout: 10000 });
    await nextPageBtn.click();
    await hostPage.waitForTimeout(2000);

    await revealBoardControls(hostPage);
    await expect(hostPage.locator('text=/Page 2 of 3/').first(), 'host should be on page 2').toBeVisible({ timeout: 8000 });

    await guestPage.waitForTimeout(2000);
    await revealBoardControls(guestPage);
    await expect(guestPage.locator('text=/Page 2 of 3/').first(), 'guest should ALSO be on page 2 (synced)').toBeVisible({ timeout: 8000 });
    console.log('Page-turn synced: host and guest both on page 2 of 3');
  });

  const DISTINCT_MARK = `GUEST-MARK-${Date.now()}`;

  await test.step('REQUIREMENT 3a: host spotlights the guest', async () => {
    const spotlightBtn = hostPage.locator('button[title="Send to big screen"]').first();
    await expect(spotlightBtn, 'host should be able to spotlight the approved guest').toBeVisible({ timeout: 10000 });
    await spotlightBtn.click();
    await hostPage.waitForTimeout(2000);
  });

  await test.step('REQUIREMENT 3b: spotlighted guest gets presenter tools and pushes their own content', async () => {
    await expect(guestPage.locator('button:has-text("PDF")').first(), 'spotlighted guest should see the board toolbar').toBeVisible({ timeout: 10000 });

    const guestTextTab = guestPage.locator('button:has-text("TEXT")').first();
    await guestTextTab.click();
    await guestPage.waitForTimeout(800);
    const guestTextarea = guestPage.locator('textarea').first();
    await expect(guestTextarea, 'spotlighted guest should get the EDITABLE text box, not a read-only view').toBeVisible({ timeout: 8000 });
    await guestTextarea.fill(DISTINCT_MARK);
    await guestPage.waitForTimeout(1000);

    await hostPage.waitForTimeout(2000);
    await expect(hostPage.locator(`text=${DISTINCT_MARK}`), 'host should see the panelist\'s distinct content live').toBeVisible({ timeout: 10000 });
    console.log(`Presenter handoff confirmed: host sees guest's distinct marker "${DISTINCT_MARK}"`);
  });

  await test.step('REQUIREMENT 3c: host reclaims control, own PDF content restored (not wiped)', async () => {
    const unspotlightBtn = hostPage.locator('button[title="Remove from big screen"]').first();
    await expect(unspotlightBtn).toBeVisible({ timeout: 8000 });
    await unspotlightBtn.click();
    await hostPage.waitForTimeout(2500);

    await expect(hostPage.locator(`text=${DISTINCT_MARK}`), 'guest\'s content should be gone once host reclaims control').toHaveCount(0);
    await expect(hostPage.locator('canvas').first(), 'host\'s own PDF should be restored, not wiped/blank').toBeVisible({ timeout: 10000 });

    await revealBoardControls(hostPage);
    await expect(hostPage.locator('text=/Page 2 of 3/').first(), 'host\'s own page-2 PDF state should be exactly as they left it').toBeVisible({ timeout: 8000 });
    console.log('Host reclaimed control: own PDF (page 2 of 3) restored, guest\'s text gone');
  });

  await test.step('REQUIREMENT 4: PDF survives a PDF -> TEXT -> PDF round trip, stays synced', async () => {
    const textTab = hostPage.locator('button:has-text("TEXT")').first();
    await textTab.click();
    await hostPage.waitForTimeout(1000);
    await hostPage.locator('textarea').first().fill('Round-trip persistence check.');
    await hostPage.waitForTimeout(800); // let the debounce fire

    const pdfTab = hostPage.locator('button:has-text("PDF")').first();
    await pdfTab.click();
    await hostPage.waitForTimeout(2000);

    await expect(hostPage.locator('canvas').first(), 'PDF should survive PDF -> TEXT -> PDF').toBeVisible({ timeout: 10000 });
    await revealBoardControls(hostPage);
    await expect(hostPage.locator('text=/Page 2 of 3/').first(), 'PDF should still be on the SAME page (2 of 3) as before the switch').toBeVisible({ timeout: 8000 });

    await guestPage.waitForTimeout(2000);
    await expect(guestPage.locator('canvas').first(), 'guest should still see the PDF synced after the round trip').toBeVisible({ timeout: 10000 });
    console.log('PDF persistence confirmed: survived PDF -> TEXT -> PDF, still page 2 of 3, still synced to guest');
  });

  await hostCtx.close();
  await guestCtx.close();
});
