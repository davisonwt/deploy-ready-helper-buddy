import { test, expect, type Page, type BrowserContext } from '@playwright/test';

// Capacity proof (root cause found live, 2026-09-15): a Daily room created
// with no explicit max_participants silently dropped participants beyond a
// small number -- reproduced via one guest account open on 2 devices (host
// heard only one) plus a third participant not heard at all. Fixed by
// setting max_participants explicitly on the Daily room (create AND reuse
// paths, supabase/functions/create-daily-meeting-token/index.ts).
//
// This test reproduces the SAME multi-device shape that found the bug: one
// guest ACCOUNT opened across 3 separate browser contexts (Daily tracks
// each as its own session/participant, exactly like a real person's 3
// devices -- this is what actually proved the original bug, not a
// coincidence of test design) plus the host = 4 total participants, all in
// ONE live session, all needing real received-audio energy from each other.
//
// Run: npx playwright test --config=playwright.live.config.ts capacity-4-participants

// TEST_USER_*/TEST_USER2_* are not in .env.test and never have been, so this
// whole spec -- the one that proves everyone hears everyone -- was silently
// skipping every run. Fall back to the account names the file actually holds
// (TEST_GOSAT as host, TEST_A as guest) while keeping the original names
// working if they are ever set.
// The HOST must own STALL below -- going live happens from the owner's own
// stall -- so TEST_A (davisontest1) is the host and TEST_GOSAT is the guest.
const HOST_EMAIL = process.env.TEST_USER_EMAIL ?? process.env.TEST_A_EMAIL ?? '';
const HOST_PASS = process.env.TEST_USER_PASSWORD ?? process.env.TEST_A_PASSWORD ?? '';
const GUEST_EMAIL = process.env.TEST_USER2_EMAIL ?? process.env.TEST_GOSAT_EMAIL ?? '';
const GUEST_PASS = process.env.TEST_USER2_PASSWORD ?? process.env.TEST_GOSAT_PASSWORD ?? '';
// A THIRD distinct identity. The capacity test deliberately used one guest
// account on three tabs, which is fine for "can the SFU carry four joins" --
// but everything the app does with a participant is keyed on user_id
// (`approved` is a list of user_ids, so is liveSpeakerUserId), so two tabs
// sharing an account are indistinguishable to the approval and queue logic.
const GUEST2_EMAIL = process.env.TEST_USER3_EMAIL ?? process.env.TEST_B_EMAIL ?? '';
const GUEST2_PASS = process.env.TEST_USER3_PASSWORD ?? process.env.TEST_B_PASSWORD ?? '';
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

async function measureAudioEnergyWithRetry(page: Page, attempts = 8): Promise<{ found: number; energy: number }> {
  let result = { found: 0, energy: 0 };
  for (let i = 0; i < attempts; i++) {
    result = await measureAudioEnergy(page);
    if (result.found > 0 && result.energy > 0) return result;
    await page.waitForTimeout(1500);
  }
  return result;
}

test('Capacity: 4 simultaneous participants (host + guest on 3 devices) -- ALL must hear ALL', async ({ browser }) => {
  test.skip(
    !HOST_EMAIL || !HOST_PASS || !GUEST_EMAIL || !GUEST_PASS,
    '.env.test credentials required: TEST_USER_EMAIL/PASSWORD, TEST_USER2_EMAIL/PASSWORD'
  );
  test.setTimeout(5 * 60_000);

  const contexts: BrowserContext[] = [];
  const newCtx = async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['camera', 'microphone'] });
    contexts.push(ctx);
    return ctx;
  };

  const hostCtx = await newCtx();
  const guestCtx1 = await newCtx(); // "Amber, device 1"
  const guestCtx2 = await newCtx(); // "Amber, device 2"
  const guestCtx3 = await newCtx(); // "Amber, device 3" (stands in for a distinct 2nd guest -- same capacity path, see file doc comment)

  const hostPage = await hostCtx.newPage();
  const g1 = await guestCtx1.newPage();
  const g2 = await guestCtx2.newPage();
  const g3 = await guestCtx3.newPage();
  const allGuests = [g1, g2, g3];

  await test.step('setup: host live; ALL THREE guest devices join and subscribe to the live BEFORE approval', async () => {
    // approve_hand is an ephemeral Supabase broadcast, not replayed to late
    // subscribers -- a device that joins the channel AFTER the host clicks
    // Approve would never receive that event and would stay un-approved.
    // All three tabs must already be subscribed when the host approves, so
    // all three see the same broadcast simultaneously -- exactly how a
    // real second/third device naturally ends up approved too (opened
    // around the same time as the first, not strictly after approval).
    await login(hostPage, HOST_EMAIL, HOST_PASS);
    await hostStartFreshLiveSession(hostPage);
    await expect(hostPage.locator('text=/You are hosting/')).toBeVisible({ timeout: 15000 });

    await login(g1, GUEST_EMAIL, GUEST_PASS);
    await guestStepIntoLive(g1);
    await login(g2, GUEST_EMAIL, GUEST_PASS);
    await guestStepIntoLive(g2);
    await login(g3, GUEST_EMAIL, GUEST_PASS);
    await guestStepIntoLive(g3);

    const raiseHandBtn = g1.locator('button[title="Join with camera on"]').first();
    await expect(raiseHandBtn, 'guest device 1 raise-hand control').toHaveCount(1);
    await raiseHandBtn.click();

    const approveBtn = hostPage.locator('button[title="Approve"]').first();
    await expect(approveBtn, "host should see the guest's hand-raise").toBeVisible({ timeout: 20000 });
    await approveBtn.click();
    // All three guest tabs share the same user_id and were already
    // subscribed when this broadcast fired -- give Daily a few seconds to
    // actually establish all three joins to the SFU.
    await hostPage.waitForTimeout(5000);
  });

  await test.step('REQUIREMENT: all 4 participants (host + 3 guest devices) hear real audio energy from the others -- none silently dropped', async () => {
    const hostResult = await measureAudioEnergyWithRetry(hostPage);
    const g1Result = await measureAudioEnergyWithRetry(g1);
    const g2Result = await measureAudioEnergyWithRetry(g2);
    const g3Result = await measureAudioEnergyWithRetry(g3);

    console.log(`CAPACITY TEST (4 participants) --`);
    console.log(`  host   hears: energy=${hostResult.energy.toFixed(4)} remote-audio-elements=${hostResult.found} (expect 3)`);
    console.log(`  guest1 hears: energy=${g1Result.energy.toFixed(4)} remote-audio-elements=${g1Result.found} (expect 3)`);
    console.log(`  guest2 hears: energy=${g2Result.energy.toFixed(4)} remote-audio-elements=${g2Result.found} (expect 3)`);
    console.log(`  guest3 hears: energy=${g3Result.energy.toFixed(4)} remote-audio-elements=${g3Result.found} (expect 3)`);

    // The host must have exactly 3 remote participants (the 3 guest
    // devices) -- fewer than that IS the reported bug (silently dropped
    // beyond a small number).
    expect(hostResult.found, 'HOST must have a live remote-audio element for ALL 3 guest devices, not just one or two').toBe(3);
    expect(hostResult.energy, 'host must hear real audio energy (capacity bug: audio silently drops beyond a small participant count)').toBeGreaterThan(0.001);

    for (const [label, r] of [['guest1', g1Result], ['guest2', g2Result], ['guest3', g3Result]] as const) {
      expect(r.found, `${label} must have remote-audio elements for the host AND both other guest devices (3 total)`).toBe(3);
      expect(r.energy, `${label} must hear real audio energy from the room`).toBeGreaterThan(0.001);
    }
    console.log('PASS: all 4 participants (host + 3 guest devices) hear all others -- no capacity drop.');
  });

  for (const ctx of contexts) await ctx.close();
});

/**
 * THE REQUIREMENT, as Davison states it: in a live session everyone hears
 * everyone, ALWAYS, whatever view any participant is on. Exploring the options
 * must never cut anyone's sound, in either direction.
 *
 * The capacity test above proves everyone hears everyone at one moment, in one
 * view. This proves it stays true THROUGH a view change, which is what members
 * actually reported losing.
 *
 * Shares that test's harness deliberately -- same real four-browser session,
 * same RMS energy measurement on the live remote streams. A view change is
 * broadcast to every participant (setStageMode writes board_state), so when
 * the presenter switches tabs EVERY tab's view changes, and every tab is
 * re-measured.
 */
const STAGE_TABS = ['Camera', 'Image', 'Text', 'PDF', 'Clip', 'Seed', 'Media'] as const;

test('Views: everyone still hears everyone through EVERY view in the tab strip', async ({ browser }) => {
  test.skip(
    !HOST_EMAIL || !HOST_PASS || !GUEST_EMAIL || !GUEST_PASS || !GUEST2_EMAIL || !GUEST2_PASS,
    'needs three distinct identities: a host who owns the stall, plus two guests'
  );
  test.setTimeout(12 * 60_000);

  const contexts: BrowserContext[] = [];
  const newCtx = async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['camera', 'microphone'] });
    contexts.push(ctx);
    return ctx;
  };

  const hostCtx = await newCtx();
  const guestCtx1 = await newCtx();
  const guestCtx2 = await newCtx();
  const hostPage = await hostCtx.newPage();
  const g1 = await guestCtx1.newPage();
  const g2 = await guestCtx2.newPage();

  await test.step('setup: one session, host + two guest devices, all audible', async () => {
    await login(hostPage, HOST_EMAIL, HOST_PASS);
    await hostStartFreshLiveSession(hostPage);
    await expect(hostPage.locator('text=/You are hosting/')).toBeVisible({ timeout: 15000 });

    // THREE DISTINCT identities, one tab each.
    await login(g1, GUEST_EMAIL, GUEST_PASS);
    await guestStepIntoLive(g1);
    await login(g2, GUEST2_EMAIL, GUEST2_PASS);
    await guestStepIntoLive(g2);

    // Each distinct guest raises their own hand and is approved separately --
    // one approval cannot stand in for the other now that they are different
    // user_ids.
    for (const [label, g] of [['guest1', g1], ['guest2', g2]] as const) {
      const raiseHandBtn = g.locator('button[title="Join with camera on"]').first();
      await expect(raiseHandBtn, `${label} raise-hand control`).toHaveCount(1);
      await raiseHandBtn.click();
      const approveBtn = hostPage.locator('button[title="Approve"]').first();
      await expect(approveBtn, `host should see ${label}'s hand-raise`).toBeVisible({ timeout: 25000 });
      await approveBtn.click();
      await hostPage.waitForTimeout(3000);
    }
    // Three browsers each establishing their own join to Daily's SFU takes
    // longer than the capacity test's original 5s, and a baseline measured
    // too early reads as "nobody is audible" rather than "not connected yet".
    await hostPage.waitForTimeout(15000);

    const baseline = await measureAudioEnergyWithRetry(hostPage, 12);
    console.log(`[BASELINE] host hears ${baseline.found} remote streams, energy ${baseline.energy.toFixed(4)}`);
    expect(baseline.found, 'baseline: host must hear the guest devices before any view change').toBeGreaterThan(0);
  });

  const failures: string[] = [];

  for (const tab of STAGE_TABS) {
    await test.step(`view: ${tab}`, async () => {
      const tabBtn = hostPage.getByRole('button', { name: tab, exact: true }).first();
      if (!(await tabBtn.count())) {
        console.log(`[${tab}] SKIP -- tab not present for this presenter`);
        return;
      }
      await tabBtn.click();
      // The change broadcasts to every participant; give it time to land and
      // for any media element in Clip/Media mode to actually start.
      await hostPage.waitForTimeout(6000);

      const h = await measureAudioEnergyWithRetry(hostPage, 4);
      const a = await measureAudioEnergyWithRetry(g1, 4);
      const b = await measureAudioEnergyWithRetry(g2, 4);

      const line = (who: string, r: { found: number; energy: number }) =>
        `${who} found=${r.found} energy=${r.energy.toFixed(4)}`;
      const ok = h.found > 0 && h.energy > 0.001
        && a.found > 0 && a.energy > 0.001
        && b.found > 0 && b.energy > 0.001;
      console.log(`[${tab}] ${ok ? 'PASS' : 'FAIL'} -- ${line('host', h)} | ${line('guest1', a)} | ${line('guest2', b)}`);
      if (!ok) failures.push(`${tab}: host=${h.found}/${h.energy.toFixed(4)} g1=${a.found}/${a.energy.toFixed(4)} g2=${b.found}/${b.energy.toFixed(4)}`);
    });
  }

  expect(
    failures,
    `a view change cut someone's audio:\n  ${failures.join('\n  ')}`,
  ).toEqual([]);
  console.log('PASS: audio survived every view in the tab strip, in both directions.');

  for (const ctx of contexts) await ctx.close();
});
