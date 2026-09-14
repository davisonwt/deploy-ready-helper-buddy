import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 3-participant Go-Live proof -- written to directly reproduce and verify
// the fix for a live incident, 2026-09-14 (3 real people: host, "Ed",
// "Amber"): Ed landed in an empty live instead of the host's active
// session, the host couldn't hear one participant, and spotlighting Amber
// left HER unable to hear anyone or upload a PDF. Root cause (see
// useTribalLiveOrchard.ts's goLive() doc comment): the Daily room name was
// re-minted on every goLive() call instead of being reused like
// gathering_sessions.id already was -- board/spotlight state (keyed by the
// stable seed id) kept syncing perfectly while audio/video silently split
// across different Daily rooms.
//
// This test asserts the fix holds for all three requirements at once:
//   1. All three participants resolve the SAME gathering_sessions id and
//      the SAME Daily room -- read directly from each participant's own
//      diagnostic console logs (useTribalLiveOrchard/useLiveStage/
//      useDailyCallObject), not inferred from UI behavior alone.
//   2. Real audio energy flows in every direction between all three.
//   3. Spotlighting the third participant does not cost her audio or
//      upload rights -- she can still hear the others and still push a
//      PDF to the board while spotlighted.
//
// Needs a THIRD test account: TEST_USER3_EMAIL / TEST_USER3_PASSWORD in
// .env.test (only two existed before this test -- see HOST_EMAIL/
// GUEST_EMAIL below). Skips (does not fail) if unset, same as every other
// live spec in this directory when its required credentials are missing.
//
// Run: npx playwright test --config=playwright.live.config.ts gathering-room-3way

const HOST_EMAIL = process.env.TEST_USER_EMAIL ?? '';
const HOST_PASS = process.env.TEST_USER_PASSWORD ?? '';
const GUEST_EMAIL = process.env.TEST_USER2_EMAIL ?? '';
const GUEST_PASS = process.env.TEST_USER2_PASSWORD ?? '';
const GUEST3_EMAIL = process.env.TEST_USER3_EMAIL ?? '';
const GUEST3_PASS = process.env.TEST_USER3_PASSWORD ?? '';
const PDF_PATH = path.resolve(__dirname, 'fixtures/test3page.pdf');
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

/** Pulls the last `[useTribalLiveOrchard] goLive` / `[useLiveStage]` /
 * `[useDailyCallObject] joining room` lines out of a page's captured
 * console log -- the direct, unambiguous evidence for "which session/room/
 * channel did this participant actually land on," per the incident report. */
function lastMatch(logs: string[], marker: string): string | null {
  for (let i = logs.length - 1; i >= 0; i--) {
    if (logs[i].includes(marker)) return logs[i];
  }
  return null;
}

function extractField(line: string | null, field: string): string | null {
  if (!line) return null;
  const m = new RegExp(`${field}:\\s*([^,]+?)(?:,|$)`).exec(line);
  return m ? m[1].trim() : null;
}

test('Go-Live 3-way: all participants share one session/room, spotlight handoff preserves audio+upload', async ({ browser }) => {
  test.skip(
    !HOST_EMAIL || !HOST_PASS || !GUEST_EMAIL || !GUEST_PASS || !GUEST3_EMAIL || !GUEST3_PASS,
    '.env.test credentials required: TEST_USER_EMAIL/PASSWORD, TEST_USER2_EMAIL/PASSWORD, TEST_USER3_EMAIL/PASSWORD'
  );
  test.setTimeout(6 * 60_000);

  const hostCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['camera', 'microphone'] });
  const guestCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['camera', 'microphone'] });
  const guest3Ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['camera', 'microphone'] });
  const hostPage = await hostCtx.newPage();
  const guestPage = await guestCtx.newPage();
  const guest3Page = await guest3Ctx.newPage();

  const hostLogs: string[] = [];
  const guestLogs: string[] = [];
  const guest3Logs: string[] = [];
  const capture = (logs: string[]) => (msg: { text: () => string }) => {
    const t = msg.text();
    if (t.includes('[useTribalLiveOrchard]') || t.includes('[useLiveStage]') || t.includes('[useDailyCallObject] joining room')) logs.push(t);
  };
  hostPage.on('console', capture(hostLogs));
  guestPage.on('console', capture(guestLogs));
  guest3Page.on('console', capture(guest3Logs));

  await test.step('setup: host goes live, both guests step in and are approved', async () => {
    await login(hostPage, HOST_EMAIL, HOST_PASS);
    await login(guestPage, GUEST_EMAIL, GUEST_PASS);
    await login(guest3Page, GUEST3_EMAIL, GUEST3_PASS);

    await hostStartFreshLiveSession(hostPage);
    await expect(hostPage.locator('text=/You are hosting/')).toBeVisible({ timeout: 15000 });

    await guestStepIntoLive(guestPage);
    await guestStepIntoLive(guest3Page);

    // Both guests raise "Camera on" (want: 'video') -- matches the real
    // incident's Amber scenario more closely than voice-only, and Requirement
    // 1c (gathering-room.spec.ts) already separately proves the voice-only path.
    const raiseHand = async (page: Page) => {
      const btn = page.locator('button[title="Join with camera on"]').first();
      await expect(btn, 'guest raise-hand control').toHaveCount(1);
      await btn.click();
    };
    await raiseHand(guestPage);
    await guestPage.waitForTimeout(800);
    await raiseHand(guest3Page);

    // Approve both -- two separate hand-raise entries expected.
    for (let i = 0; i < 2; i++) {
      const approveBtn = hostPage.locator('button[title="Approve"]').first();
      await expect(approveBtn, `host should see hand-raise #${i + 1}`).toBeVisible({ timeout: 20000 });
      await approveBtn.click();
      await hostPage.waitForTimeout(1500);
    }
    await hostPage.waitForTimeout(2500);
  });

  await test.step('REQUIREMENT A: all three participants resolved the SAME session id and Daily room', async () => {
    // Give the diagnostic logging a moment to have definitely fired for all three.
    await hostPage.waitForTimeout(1000);

    const hostSessionId = extractField(lastMatch(hostLogs, '[useTribalLiveOrchard] goLive'), 'gatheringSessionId');
    const hostRoom = extractField(lastMatch(hostLogs, '[useTribalLiveOrchard] goLive'), 'jitsi_room');
    const guestSessionId = extractField(lastMatch(guestLogs, '[useLiveStage] GUEST'), 'sessionId');
    const guest3SessionId = extractField(lastMatch(guest3Logs, '[useLiveStage] GUEST'), 'sessionId');
    const hostDailyRoom = extractField(lastMatch(hostLogs, '[useDailyCallObject] joining room'), 'room');
    const guestDailyRoom = extractField(lastMatch(guestLogs, '[useDailyCallObject] joining room'), 'room');
    const guest3DailyRoom = extractField(lastMatch(guest3Logs, '[useDailyCallObject] joining room'), 'room');

    console.log(`SESSION IDENTITY -- host: session=${hostSessionId} room=${hostRoom} dailyRoom=${hostDailyRoom}`);
    console.log(`SESSION IDENTITY -- guest: session=${guestSessionId} dailyRoom=${guestDailyRoom}`);
    console.log(`SESSION IDENTITY -- guest3: session=${guest3SessionId} dailyRoom=${guest3DailyRoom}`);

    expect(hostSessionId, 'host must have resolved a gathering_sessions id').not.toBeNull();
    expect(guestSessionId, 'guest must have resolved a gathering_sessions id').toBe(hostSessionId);
    expect(guest3SessionId, 'guest3 must have resolved a gathering_sessions id').toBe(hostSessionId);
    expect(hostDailyRoom, 'host must have a Daily room').not.toBeNull();
    expect(guestDailyRoom, 'guest must be on the SAME Daily room as the host').toBe(hostDailyRoom);
    expect(guest3DailyRoom, 'guest3 must be on the SAME Daily room as the host').toBe(hostDailyRoom);
  });

  await test.step('REQUIREMENT B: real audio energy flows in every direction between all three', async () => {
    const hostHears = await measureAudioEnergyWithRetry(hostPage);
    const guestHears = await measureAudioEnergyWithRetry(guestPage);
    const guest3Hears = await measureAudioEnergyWithRetry(guest3Page);
    console.log(`AUDIO 3-way -- host hears: ${hostHears.energy.toFixed(4)} (n=${hostHears.found}) | guest hears: ${guestHears.energy.toFixed(4)} (n=${guestHears.found}) | guest3 hears: ${guest3Hears.energy.toFixed(4)} (n=${guest3Hears.found})`);

    // Each of the three should have TWO live remote-audio elements (the
    // other two participants) -- the direct signature of "not split across
    // rooms": someone stuck in a different/abandoned room would show 0 or 1.
    expect(hostHears.found, 'host should have remote audio from BOTH guests').toBeGreaterThanOrEqual(2);
    expect(guestHears.found, 'guest should have remote audio from BOTH host and guest3').toBeGreaterThanOrEqual(2);
    expect(guest3Hears.found, 'guest3 should have remote audio from BOTH host and guest').toBeGreaterThanOrEqual(2);
    expect(hostHears.energy).toBeGreaterThan(0.001);
    expect(guestHears.energy).toBeGreaterThan(0.001);
    expect(guest3Hears.energy).toBeGreaterThan(0.001);
  });

  await test.step('REQUIREMENT C: spotlighting guest3 does not cost her audio or upload rights', async () => {
    // Spotlight guest3 specifically -- the "Amber" role in the incident.
    // Guest boxes render in join order; guest3 joined second, so her
    // "Send to big screen" star button is the SECOND one in the row.
    const spotlightBtns = hostPage.locator('button[title="Send to big screen"]');
    await expect(spotlightBtns.last()).toBeVisible({ timeout: 10000 });
    await spotlightBtns.last().click();
    await hostPage.waitForTimeout(2500);

    // C1: guest3 must still HEAR the others after being spotlighted.
    const guest3HearsAfter = await measureAudioEnergyWithRetry(guest3Page);
    console.log(`AUDIO after spotlight -- guest3 (spotlighted) hears: ${guest3HearsAfter.energy.toFixed(4)} (n=${guest3HearsAfter.found})`);
    expect(guest3HearsAfter.found, 'spotlighted guest3 must still have remote audio elements').toBeGreaterThanOrEqual(2);
    expect(guest3HearsAfter.energy, 'spotlighted guest3 must still HEAR real audio').toBeGreaterThan(0.001);

    // C2: guest3 must still be able to upload a PDF while spotlighted.
    await expect(guest3Page.locator('button:has-text("PDF")').first(), 'spotlighted guest3 should see the board toolbar').toBeVisible({ timeout: 10000 });
    await guest3Page.locator('button:has-text("PDF")').first().click();
    await guest3Page.waitForTimeout(1000);
    const fileInput = guest3Page.locator('input[type="file"][accept="application/pdf"]');
    await expect(fileInput, 'spotlighted guest3 should see the PDF upload prompt').toHaveCount(1);
    await fileInput.setInputFiles(PDF_PATH);
    await guest3Page.waitForTimeout(6000);
    await expect(guest3Page.locator('canvas').first(), 'spotlighted guest3\'s own uploaded PDF should render for her').toBeVisible({ timeout: 15000 });

    // Confirms it actually reached everyone else too (not just her own tab).
    await hostPage.waitForTimeout(2000);
    await expect(hostPage.locator('canvas').first(), 'host should see the spotlighted guest3\'s PDF').toBeVisible({ timeout: 15000 });
    await guestPage.waitForTimeout(2000);
    await expect(guestPage.locator('canvas').first(), 'other guest should see the spotlighted guest3\'s PDF').toBeVisible({ timeout: 15000 });
    console.log('Spotlighted guest3: audio intact, PDF upload reached host and other guest');
  });

  await hostCtx.close();
  await guestCtx.close();
  await guest3Ctx.close();
});
