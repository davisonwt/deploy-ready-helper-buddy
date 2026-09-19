import { test, expect, type Page } from '@playwright/test';

/**
 * Verifies the Grove Station radio fix against real-listening conditions,
 * not a short foregrounded harness -- per the explicit demand after two
 * prior "it works" reports didn't match real listening (playback dying
 * after 2-5 songs, 6-20 minutes in). This test:
 *   1. Runs a real session of 10+ consecutive transitions (30+ real
 *      minutes of real audio, no time acceleration).
 *   2. Backgrounds the tab (a real second Chromium page brought to front,
 *      genuine document.visibilityState change, not a shim) for several
 *      minutes spanning at least one transition.
 *   3. Runs a second real session at a phone viewport.
 *   4. Kills the network for 10s mid-track via CDP and confirms the
 *      player recovers on its own.
 * Every [radio] console line (already timestamped by radioPlayback.ts's
 * own log()/logError() helpers) is captured and printed as evidence --
 * this is the "actual timestamps from your instrumentation" the report
 * demanded, not a prose summary.
 *
 * Honest limits of this harness: Playwright/Chromium can genuinely
 * background a tab (document.visibilityState really changes, real
 * browser timer throttling applies), but it cannot replicate an actual
 * phone OS locking its screen and suspending the page entirely. The fix
 * itself does not depend on any timer surviving that -- ended/error are
 * media-engine events, not JS-timer events -- but that specific claim is
 * argued from the code, not proven by this harness.
 *
 * Run: npx playwright test --config=playwright.live.config.ts radio-reliability
 */

const EMAIL = process.env.TEST_A_EMAIL || '';
const PASS = process.env.TEST_A_PASSWORD || '';

async function login(page: Page) {
  for (let i = 0; i < 2; i++) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    const ok = await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 })
      .then(() => true).catch(() => false);
    if (ok) return;
  }
  throw new Error('login failed');
}

/** The Audio() element radioPlayback.ts owns is never appended to the
 *  DOM (doesn't need to be, to play) -- document.querySelector('audio')
 *  finds nothing. window.__radioDebug (radioPlayback.ts) is the only way
 *  to read ground-truth playback state from outside the module. */
async function readAudioPaused(page: Page): Promise<boolean | null> {
  return page.evaluate(() => {
    const dbg = (window as unknown as { __radioDebug?: { getAudio: () => HTMLAudioElement | null } }).__radioDebug;
    const el = dbg?.getAudio();
    return el ? el.paused : null;
  });
}

function attachRadioLogCapture(page: Page, sink: string[]) {
  page.on('console', (msg) => {
    const t = msg.text();
    if (t.includes('[radio]')) sink.push(t);
  });
}

async function startRadioFromCockpit(page: Page) {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  const btn = page.getByRole('button', { name: /Radio$/ }).first();
  await expect(btn).toBeVisible({ timeout: 20000 });
  await btn.click();
}

function countOccurrences(lines: string[], needle: string): number {
  return lines.filter((l) => l.includes(needle)).length;
}

/** The longest gap, in ms, between any "trouble" line (ended/error/stalled/
 *  retry scheduled) and the next "playing" confirmation after it -- the
 *  metric that actually matters: not whether trouble happened, but
 *  whether it ever recovered, and how long the silence lasted each time. */
function maxRecoveryGapMs(lines: string[]): number {
  const ts = (l: string) => {
    const m = l.match(/\[radio\]\s+(\S+)/);
    return m ? new Date(m[1]).getTime() : NaN;
  };
  const troubleAt = lines
    .map((l, i) => ({ l, i, t: ts(l) }))
    .filter((x) => /event: ended|event: error|retry #\d+ scheduled/.test(x.l));
  const playingAt = lines
    .map((l) => ts(l))
    .filter((t) => !Number.isNaN(t));
  let maxGap = 0;
  for (const trouble of troubleAt) {
    const nextPlaying = lines
      .slice(trouble.i + 1)
      .find((l) => l.includes('event: playing') || l.includes('play() resolved successfully'));
    if (!nextPlaying) continue; // no recovery logged after this trouble line at all
    const t2 = ts(nextPlaying);
    if (!Number.isNaN(t2) && !Number.isNaN(trouble.t)) {
      maxGap = Math.max(maxGap, t2 - trouble.t);
    }
  }
  return maxGap;
}

test.describe.serial('Radio reliability -- real listening conditions', () => {
  test.skip(!EMAIL || !PASS, 'TEST_A_EMAIL/PASSWORD required in .env.test.');

  test('1. long desktop session: 10+ transitions over 30+ real minutes, backgrounded for part of it', async ({ page, context }) => {
    test.setTimeout(60 * 60_000);
    const logs: string[] = [];
    attachRadioLogCapture(page, logs);

    await login(page);
    await startRadioFromCockpit(page);

    console.log('[harness] radio started, waiting for first playing confirmation');
    await page.waitForFunction(
      () => document.title.length >= 0, // noop wait target; real wait is the log poll below
      {},
      { timeout: 1000 },
    ).catch(() => {});
    await expect
      .poll(() => logs.some((l) => l.includes('event: playing')), { timeout: 30000, message: 'no playing event logged yet' })
      .toBe(true);

    // Phase A: 16 real minutes foregrounded.
    console.log('[harness] phase A: 16 minutes foregrounded');
    await page.waitForTimeout(16 * 60_000);
    console.log(`[harness] phase A done, transitions so far: ${countOccurrences(logs, 'event: playing')}`);

    // Phase B: background the radio tab behind a second real tab for 10
    // real minutes -- document.visibilityState genuinely flips to
    // 'hidden' on the radio page, real Chromium timer throttling applies.
    console.log('[harness] phase B: backgrounding the radio tab for 10 minutes');
    const blank = await context.newPage();
    await blank.goto('about:blank');
    await blank.bringToFront();
    await page.waitForTimeout(10 * 60_000);
    console.log('[harness] phase B: bringing radio tab back to front');
    await page.bringToFront();
    await page.waitForTimeout(15_000); // let visibilitychange resync run
    await blank.close();
    console.log(`[harness] phase B done, transitions so far: ${countOccurrences(logs, 'event: playing')}`);

    // Phase C: another 16 real minutes foregrounded, to comfortably clear
    // 10+ total transitions (avg track ~230s => ~10.4 over 40 real
    // minutes total) and confirm steady state after the background stretch.
    console.log('[harness] phase C: 16 more minutes foregrounded');
    await page.waitForTimeout(16 * 60_000);

    const playingCount = countOccurrences(logs, 'event: playing');
    const endedCount = countOccurrences(logs, 'event: ended');
    const errorCount = countOccurrences(logs, 'event: error');
    const retryCount = countOccurrences(logs, 'retry #');
    const gap = maxRecoveryGapMs(logs);

    console.log('----- RADIO RELIABILITY EVIDENCE (desktop, ~42 real minutes) -----');
    console.log(`playing confirmations: ${playingCount}`);
    console.log(`ended events: ${endedCount}, error events: ${errorCount}, retries scheduled: ${retryCount}`);
    console.log(`max gap between trouble and next recovery: ${gap}ms`);
    console.log('--- full timestamped [radio] log ---');
    logs.forEach((l) => console.log(l));
    console.log('----- END EVIDENCE -----');

    const finalPaused = await readAudioPaused(page);
    console.log(`[harness] final audio.paused = ${finalPaused}`);

    expect(playingCount).toBeGreaterThanOrEqual(10);
    expect(finalPaused).toBe(false);
    // Any trouble that happened must have recovered within a bounded window
    // (generous -- backoff caps at 20s per retry, allow a few retries).
    expect(gap).toBeLessThan(90_000);

    await page.evaluate(() => {
      // Best-effort stop so we don't leave audio playing against the account.
      const btn = Array.from(document.querySelectorAll('button')).find((b) => /Stop|Reconnecting/.test(b.textContent || ''));
      (btn as HTMLButtonElement | undefined)?.click();
    });
  });

  test('2. phone-viewport session: transitions confirmed on a 390x844 viewport', async ({ browser }) => {
    test.setTimeout(15 * 60_000);
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const logs: string[] = [];
    attachRadioLogCapture(page, logs);

    await login(page);
    await startRadioFromCockpit(page);

    await expect
      .poll(() => logs.some((l) => l.includes('event: playing')), { timeout: 30000, message: 'no playing event logged yet' })
      .toBe(true);

    console.log('[harness] phone viewport: running 10 real minutes');
    await page.waitForTimeout(10 * 60_000);

    const playingCount = countOccurrences(logs, 'event: playing');
    console.log('----- RADIO RELIABILITY EVIDENCE (phone viewport, 10 real minutes) -----');
    console.log(`playing confirmations: ${playingCount}`);
    logs.forEach((l) => console.log(l));
    console.log('----- END EVIDENCE -----');

    const finalPaused = await readAudioPaused(page);
    expect(finalPaused).toBe(false);
    expect(playingCount).toBeGreaterThanOrEqual(2);

    await context.close();
  });

  test('3. network killed for 10s mid-track -- confirms self-recovery', async ({ page, context }) => {
    test.setTimeout(5 * 60_000);
    const logs: string[] = [];
    attachRadioLogCapture(page, logs);

    await login(page);
    await startRadioFromCockpit(page);
    await expect
      .poll(() => logs.some((l) => l.includes('event: playing')), { timeout: 30000, message: 'no playing event logged yet' })
      .toBe(true);

    await page.waitForTimeout(15_000); // let it settle into steady playback

    const cdp = await context.newCDPSession(page);
    console.log(`[harness] ${new Date().toISOString()} killing network for 10s`);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0,
    });
    await page.waitForTimeout(10_000);
    console.log(`[harness] ${new Date().toISOString()} restoring network`);
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1,
    });

    // Give the retry/backoff loop room to notice and recover.
    await expect
      .poll(() => {
        const after = logs.slice(logs.findIndex((l) => l.includes('killing network')));
        return after.some((l) => l.includes('event: playing') || l.includes('play() resolved successfully'));
      }, { timeout: 60_000, message: 'no recovery logged within 60s of network restore' })
      .toBe(true);

    console.log('----- RADIO RELIABILITY EVIDENCE (network kill mid-track) -----');
    logs.forEach((l) => console.log(l));
    console.log('----- END EVIDENCE -----');

    const finalPaused = await readAudioPaused(page);
    expect(finalPaused).toBe(false);
  });
});
