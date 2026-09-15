import { test, expect, type Page, type BrowserContext } from '@playwright/test';

// Scripture Study speaker-permission proof (bug report, 2026-09-15): with 5
// people in a Scripture Study Gathering Room, only the host + first joiner
// could hear each other -- the other three were heard by nobody, and
// audibility overall was 100% incidental to Daily's own default routing
// (every "approved" guest simply joined with a live mic, nothing ever
// enforced who could actually be heard). Fixed by server-verified Daily
// "owner" permission for the real host (create-daily-meeting-token/index.ts)
// plus an explicit, host-controlled live-speaker queue (useLiveStage.ts's
// liveSpeakerUserId/setLiveSpeaker/advanceQueue, enforced via
// call.updateParticipant in LiveStage.tsx) that allows exactly ONE non-host
// speaker at a time, everyone else received-not-heard.
//
// This test proves it with 5 real accounts (host + 4 guests) on the actual
// deployed app (playwright.live.config.ts's baseURL) and reports a real
// per-pair pass/fail matrix, not "should work": every remote <audio>
// element is tagged data-user-id (LiveStage.tsx's ParticipantAudio), so
// energy readings are attributed to a SPECIFIC participant, not just
// counted/maxed anonymously. Roles are derived from behavior, not
// hardcoded uids: the host is whoever's audible to every guest from the
// very start (never touched by any of this); the "current speaker" is
// whichever other uid turns audible exactly when the host clicks
// "Next speaker", and must turn INAUDIBLE again the moment the host
// advances past them.
//
// Needs FOUR guest test accounts in .env.test: TEST_USER2_EMAIL/PASSWORD
// through TEST_USER5_EMAIL/PASSWORD (TEST_USER*_EMAIL/PASSWORD is the
// host). Skips (does not fail) if any are missing, same as every other
// live spec in this directory.
//
// Run: npx playwright test --config=playwright.live.config.ts scripture-study-speaker-queue

const HOST_EMAIL = process.env.TEST_USER_EMAIL ?? '';
const HOST_PASS = process.env.TEST_USER_PASSWORD ?? '';
const GUESTS = [2, 3, 4, 5].map((n) => ({
  email: process.env[`TEST_USER${n}_EMAIL`] ?? '',
  pass: process.env[`TEST_USER${n}_PASSWORD`] ?? '',
  label: `guest${n - 1}`, // guest1..guest4
}));
const STALL = 'davisontest1';
const ENERGY_THRESHOLD = 0.001; // same threshold every other live spec in this directory uses

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

/** Per-SOURCE received-audio energy, keyed by the remote participant's own
 * user_id (LiveStage.tsx's ParticipantAudio tags each <audio> element with
 * data-user-id specifically so this kind of attributed measurement is
 * possible) -- NOT a bare count/max, so a test can tell WHICH participant
 * is/isn't audible, not just how many are. */
async function measureAudioBySource(page: Page): Promise<Record<string, number>> {
  return page.evaluate(async () => {
    const audioEls = Array.from(document.querySelectorAll('audio[data-user-id]')) as HTMLAudioElement[];
    const withStream = audioEls.filter(
      (el) => el.srcObject instanceof MediaStream && (el.srcObject as MediaStream).getAudioTracks().length > 0
    );
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const result: Record<string, number> = {};
    for (const el of withStream) {
      const uid = el.dataset.userId || 'unknown';
      try {
        const src = ctx.createMediaStreamSource(el.srcObject as MediaStream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        src.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        let maxEnergy = 0;
        for (let i = 0; i < 6; i++) {
          analyser.getByteTimeDomainData(data);
          let sumSq = 0;
          for (let j = 0; j < data.length; j++) { const v = (data[j] - 128) / 128; sumSq += v * v; }
          const rms = Math.sqrt(sumSq / data.length);
          if (rms > maxEnergy) maxEnergy = rms;
          await new Promise((r) => setTimeout(r, 100));
        }
        result[uid] = Math.max(result[uid] ?? 0, maxEnergy);
      } catch { /* one bad element shouldn't sink the measurement */ }
    }
    return result;
  });
}

/** Retries until at least one source shows real energy (or gives up) --
 * mirrors every other live spec's measureAudioEnergyWithRetry, just
 * per-source instead of a single max. */
async function measureAudioBySourceWithRetry(page: Page, attempts = 8): Promise<Record<string, number>> {
  let result: Record<string, number> = {};
  for (let i = 0; i < attempts; i++) {
    result = await measureAudioBySource(page);
    if (Object.values(result).some((e) => e > ENERGY_THRESHOLD)) return result;
    await page.waitForTimeout(1500);
  }
  return result;
}

/** Audible sources (energy above threshold) as an array of uids, for
 * concise pass/fail logging. */
function audibleUids(bySource: Record<string, number>): string[] {
  return Object.entries(bySource).filter(([, e]) => e > ENERGY_THRESHOLD).map(([uid]) => uid);
}

async function advanceSpeaker(hostPage: Page) {
  const btn = hostPage.locator('button[title="Mute the current speaker and hand the floor to the next approved guest"]').first();
  await expect(btn, 'host should have a "Next speaker" control once guests are approved').toBeVisible({ timeout: 10000 });
  await btn.click();
  // Daily's updateParticipant round-trip + track renegotiation needs a
  // moment to actually land before the next measurement.
  await hostPage.waitForTimeout(4000);
}

test('Scripture Study, 5 participants: only host + current live speaker are ever heard, per pair', async ({ browser }) => {
  test.skip(
    !HOST_EMAIL || !HOST_PASS || GUESTS.some((g) => !g.email || !g.pass),
    '.env.test credentials required: TEST_USER_EMAIL/PASSWORD plus TEST_USER2..5_EMAIL/PASSWORD (host + 4 guests)'
  );
  test.setTimeout(8 * 60_000);
  const t0 = Date.now();
  const mark = (label: string) => console.log(`[T+${((Date.now() - t0) / 1000).toFixed(1)}s] ${label}`);

  const contexts: BrowserContext[] = [];
  const newCtx = async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, permissions: ['camera', 'microphone'] });
    contexts.push(ctx);
    return ctx;
  };

  const hostCtx = await newCtx();
  const hostPage = await hostCtx.newPage();
  const guestPages: Page[] = [];
  for (const g of GUESTS) {
    const ctx = await newCtx();
    guestPages.push(await ctx.newPage());
  }
  const [g1, g2, g3, g4] = guestPages;

  await test.step('setup: host live, all 4 guests join and are approved (in order)', async () => {
    mark('setup: login host + 4 guests');
    await login(hostPage, HOST_EMAIL, HOST_PASS);
    for (let i = 0; i < GUESTS.length; i++) await login(guestPages[i], GUESTS[i].email, GUESTS[i].pass);

    await hostStartFreshLiveSession(hostPage);
    await expect(hostPage.locator('text=/You are hosting/')).toBeVisible({ timeout: 15000 });

    for (let i = 0; i < guestPages.length; i++) {
      mark(`${GUESTS[i].label}: stepping into live`);
      await guestStepIntoLive(guestPages[i]);
      const raiseHandBtn = guestPages[i].locator('button[title="Join with voice only — your face stays hidden"]').first();
      await expect(raiseHandBtn, `${GUESTS[i].label} raise-hand control`).toHaveCount(1);
      await raiseHandBtn.click();
      const approveBtn = hostPage.locator('button[title="Approve"]').first();
      await expect(approveBtn, `host should see ${GUESTS[i].label}'s hand-raise`).toBeVisible({ timeout: 20000 });
      await approveBtn.click();
      await hostPage.waitForTimeout(1500);
    }
    // Let all 5 Daily joins + the host's initial force-mute of each guest
    // fully settle before measuring anything.
    await hostPage.waitForTimeout(6000);
  });

  let hostUid = '';
  let speaker1Uid = '';

  await test.step('BASELINE: guest1 (first approved) auto-has the floor; guest2/3/4 start muted', async () => {
    // approveHand (useLiveStage.ts) hands the floor to a LONE approved
    // guest immediately (preserves the ordinary 1:1 "demo a seed to one
    // buyer" experience) -- guest1 was approved while `approved` was still
    // empty, so guest1 is already the live speaker with no explicit
    // "Next speaker" click needed. guest2/3/4 were each approved while
    // guest1 already held the floor, so none of them auto-became speaker.
    mark('BASELINE');
    const hostBy = await measureAudioBySourceWithRetry(hostPage);
    const g1By = await measureAudioBySourceWithRetry(g1);
    const g2By = await measureAudioBySourceWithRetry(g2);
    const g3By = await measureAudioBySourceWithRetry(g3);
    const g4By = await measureAudioBySourceWithRetry(g4);

    console.log('PAIR RESULTS -- baseline (guest1 auto-speaking, no "Next speaker" clicked yet):');
    console.log(`  host hears: ${JSON.stringify(hostBy)} -- expect only guest1`);
    console.log(`  guest1 (auto speaker) hears: ${JSON.stringify(g1By)} -- expect ONLY host`);
    console.log(`  guest2 hears: ${JSON.stringify(g2By)} -- expect host + guest1`);
    console.log(`  guest3 hears: ${JSON.stringify(g3By)} -- expect host + guest1`);
    console.log(`  guest4 hears: ${JSON.stringify(g4By)} -- expect host + guest1`);

    // guest1 never hears itself (ParticipantAudio never renders the local
    // participant) regardless of who's speaking -- its one audible source
    // IS the host, independent of the auto-speaker behavior above.
    const g1Audible = audibleUids(g1By);
    expect(g1Audible.length, 'PAIR guest1<-host: guest1 must hear exactly one source (the host)').toBe(1);
    hostUid = g1Audible[0];
    expect(hostUid, 'host uid should have been derived from guest1\'s reading').toBeTruthy();

    const hostAudible = audibleUids(hostBy);
    expect(hostAudible.length, 'PAIR host<-guest1: host must hear EXACTLY ONE guest (guest1, auto-speaking)').toBe(1);
    speaker1Uid = hostAudible[0];
    expect(speaker1Uid, 'PAIR host<-guest1: the audible guest must not be the host itself').not.toBe(hostUid);

    for (const [label, by] of [['guest2', g2By], ['guest3', g3By], ['guest4', g4By]] as const) {
      const audible = audibleUids(by).sort();
      expect(audible, `PAIR ${label}<-{host,guest1}: must hear BOTH host and guest1 (the auto-speaker), nobody else`).toEqual([hostUid, speaker1Uid].sort());
    }
    console.log(`PASS: baseline correct -- host uid=${hostUid}, guest1 (uid=${speaker1Uid}) auto-speaking, guest2/3/4 correctly muted.`);
  });

  let speaker2Uid = '';

  await test.step('ROUND 1: advance to guest2 -- guest1 goes silent (atomically re-muted), guest2 becomes the only audible guest', async () => {
    mark('ROUND 1: advance -> guest2');
    await advanceSpeaker(hostPage);

    const hostBy = await measureAudioBySourceWithRetry(hostPage);
    const g1By = await measureAudioBySourceWithRetry(g1);
    const g2By = await measureAudioBySourceWithRetry(g2);
    const g3By = await measureAudioBySourceWithRetry(g3);
    console.log('PAIR RESULTS -- round 1 (guest2 is live speaker):');
    console.log(`  host hears: ${JSON.stringify(hostBy)}`);
    console.log(`  guest1 (previous speaker) hears: ${JSON.stringify(g1By)}`);
    console.log(`  guest2 (speaker) hears: ${JSON.stringify(g2By)}`);
    console.log(`  guest3 hears: ${JSON.stringify(g3By)}`);

    const hostAudible = audibleUids(hostBy);
    expect(hostAudible.length, 'PAIR host<-guest2: host must hear EXACTLY ONE guest (guest2) now').toBe(1);
    speaker2Uid = hostAudible[0];
    expect(speaker2Uid, 'PAIR host<-{guest1}: the swap must be ATOMIC -- guest1 must no longer be the audible one').not.toBe(speaker1Uid);
    expect(speaker2Uid, 'PAIR host<-guest2: the newly audible guest must not be the host').not.toBe(hostUid);

    const g1Audible = audibleUids(g1By);
    expect(g1Audible, 'PAIR guest1<-host: guest1 must be back to hearing ONLY the host (correctly re-muted, not left live)').toEqual([hostUid]);

    const g2Audible = audibleUids(g2By);
    expect(g2Audible, 'PAIR guest2<-host: guest2 (now the speaker) must hear only the host, not itself').toEqual([hostUid]);

    const g3Audible = audibleUids(g3By).sort();
    expect(g3Audible, 'PAIR guest3<-{host,guest2}: must hear BOTH host and the new speaker, nobody else').toEqual([hostUid, speaker2Uid].sort());

    console.log(`PASS: round 1 -- swap was atomic: guest1 muted, guest2 (uid=${speaker2Uid}) now the only audible guest.`);
  });

  await test.step('ROUND 2: advance to guest3 -- guest2 goes silent, guest3 becomes the only audible guest', async () => {
    mark('ROUND 2: advance -> guest3');
    await advanceSpeaker(hostPage);

    const hostBy = await measureAudioBySourceWithRetry(hostPage);
    const g2By = await measureAudioBySourceWithRetry(g2);
    const g3By = await measureAudioBySourceWithRetry(g3);
    const g4By = await measureAudioBySourceWithRetry(g4);
    console.log('PAIR RESULTS -- round 2 (guest3 is live speaker):');
    console.log(`  host hears: ${JSON.stringify(hostBy)}`);
    console.log(`  guest2 (previous speaker) hears: ${JSON.stringify(g2By)}`);
    console.log(`  guest3 (speaker) hears: ${JSON.stringify(g3By)}`);
    console.log(`  guest4 hears: ${JSON.stringify(g4By)}`);

    const hostAudible = audibleUids(hostBy);
    expect(hostAudible.length, 'PAIR host<-guest3: host must hear EXACTLY ONE guest (guest3) now').toBe(1);
    const speaker3Uid = hostAudible[0];
    expect(speaker3Uid, 'PAIR host<-{guest2}: the swap must be ATOMIC -- guest2 must no longer be the audible one').not.toBe(speaker2Uid);
    expect(speaker3Uid, 'PAIR host<-guest3: the newly audible guest must not be the host').not.toBe(hostUid);

    const g2Audible = audibleUids(g2By);
    expect(g2Audible, 'PAIR guest2<-host: guest2 must be back to hearing ONLY the host (correctly re-muted, not left live)').toEqual([hostUid]);

    const g3Audible = audibleUids(g3By);
    expect(g3Audible, 'PAIR guest3<-host: guest3 (now the speaker) must hear only the host, not itself').toEqual([hostUid]);

    const g4Audible = audibleUids(g4By).sort();
    expect(g4Audible, 'PAIR guest4<-{host,guest3}: must hear BOTH host and the new speaker, nobody else').toEqual([hostUid, speaker3Uid].sort());

    console.log(`PASS: round 2 -- swap was atomic: guest2 muted, guest3 (uid=${speaker3Uid}) now the only audible guest.`);
  });

  await test.step('cleanup: end the live session', async () => {
    const endLiveBtn = hostPage.locator('button:has-text("End live")').first();
    if (await endLiveBtn.count() > 0) await endLiveBtn.click().catch(() => {});
  });

  for (const ctx of contexts) await ctx.close();
});
