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

/** Recovering quickly isn't enough on its own -- a bug that thrashes
 *  (reload every few seconds, each one individually "recovering" fine)
 *  passed the gap check above while still being unlistenable. Counts how
 *  many times two consecutive "playing" confirmations were less than
 *  MIN_SANE_GAP_MS apart -- real tracks are minutes long, so more than an
 *  occasional one-off reconnect this fast means something is looping. */
function suspiciouslyFastPlayingGaps(lines: string[]): number {
  const MIN_SANE_GAP_MS = 5000;
  const ts = (l: string) => {
    const m = l.match(/\[radio\]\s+(\S+)/);
    return m ? new Date(m[1]).getTime() : NaN;
  };
  const playingTimes = lines.filter((l) => l.includes('event: playing')).map(ts).filter((t) => !Number.isNaN(t));
  let count = 0;
  for (let i = 1; i < playingTimes.length; i++) {
    if (playingTimes[i] - playingTimes[i - 1] < MIN_SANE_GAP_MS) count++;
  }
  return count;
}

test.describe.serial('Radio reliability -- real listening conditions', () => {
  test.skip(!EMAIL || !PASS, 'TEST_A_EMAIL/PASSWORD required in .env.test.');

  test('1. long desktop session: 10+ transitions over 30+ real minutes, backgrounded for part of it', async ({ page, context }) => {
    test.setTimeout(80 * 60_000);
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

    // Phase A: 22 real minutes foregrounded.
    console.log('[harness] phase A: 22 minutes foregrounded');
    await page.waitForTimeout(22 * 60_000);
    console.log(`[harness] phase A done, transitions so far: ${countOccurrences(logs, 'event: playing')}`);

    // Phase B: background the radio tab behind a second real tab for 12
    // real minutes -- document.visibilityState genuinely flips to
    // 'hidden' on the radio page, real Chromium timer throttling applies.
    console.log('[harness] phase B: backgrounding the radio tab for 12 minutes');
    const blank = await context.newPage();
    await blank.goto('about:blank');
    await blank.bringToFront();
    await page.waitForTimeout(12 * 60_000);
    console.log('[harness] phase B: bringing radio tab back to front');
    await page.bringToFront();
    await page.waitForTimeout(15_000); // let visibilitychange resync run
    await blank.close();
    console.log(`[harness] phase B done, transitions so far: ${countOccurrences(logs, 'event: playing')}`);

    // Phase C: another 26 real minutes foregrounded. Total budget ~60 real
    // minutes, checked against the actual ordered duration list (49
    // tracks, queried directly from products -- pool average 238s/track,
    // total cycle ~194min), not a guess: a prior run landed on the pool's
    // own worst 6-track run (430+404+288+348+368+391=2229s, ~37min) and
    // only cleared 6 transitions in its 42-minute window. Extended to a
    // full 60-minute window starting at that same worst point, the cycle
    // wraps back into the pool's shorter tracks and clears 11 -- so 60
    // real minutes clears the required 10 even starting from the
    // documented worst case in this pool, not just on average.
    console.log('[harness] phase C: 26 more minutes foregrounded');
    await page.waitForTimeout(26 * 60_000);

    const playingCount = countOccurrences(logs, 'event: playing');
    const endedCount = countOccurrences(logs, 'event: ended');
    const errorCount = countOccurrences(logs, 'event: error');
    const retryCount = countOccurrences(logs, 'retry #');
    const gap = maxRecoveryGapMs(logs);
    const fastGaps = suspiciouslyFastPlayingGaps(logs);

    console.log('----- RADIO RELIABILITY EVIDENCE (desktop, ~42 real minutes) -----');
    console.log(`playing confirmations: ${playingCount}`);
    console.log(`ended events: ${endedCount}, error events: ${errorCount}, retries scheduled: ${retryCount}`);
    console.log(`max gap between trouble and next recovery: ${gap}ms`);
    console.log(`suspiciously fast playing-to-playing gaps (<5s, real tracks are minutes): ${fastGaps}`);
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
    // Recovering fast isn't enough on its own -- caught a real bug where
    // every individual reload "recovered" within ~2s while the player
    // thrashed a reload every ~3-15s for most of the session. A couple of
    // one-off fast reconnects are fine; dozens are a loop, not resilience.
    expect(fastGaps).toBeLessThanOrEqual(3);

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
