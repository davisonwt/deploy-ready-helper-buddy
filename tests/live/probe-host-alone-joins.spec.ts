import { test, expect, type Page } from '@playwright/test';

/**
 * ONE QUESTION: does a host going live, ALONE, end up with a joined Daily call?
 *
 * The 4-browser harness reads 0 remote audio streams at baseline even with
 * three distinct identities, so before adding any guest this establishes
 * whether the host's own call comes up at all. If it does not, nothing
 * downstream is measurable and the problem is larger than audio.
 *
 * Every link in the chain is checked separately, because the first version of
 * this probe asserted only the last one and mis-attributed the failure:
 *   signed in? -> on the stall? -> shelf open? -> a Go Live that is ENABLED?
 *   -> click -> overlay -> meeting token -> a published local track.
 *
 * Two traps this exists to avoid:
 *  - click({force:true}) on a DISABLED button silently does nothing, and a
 *    SeedCard's Go Live is disabled for a non-owner with no whisperer
 *    commission (SeedCard.tsx, goLiveDisabled).
 *  - AUTH_SESSION_LOST is NOT evidence of a lost session. errorDetection.ts
 *    reports it for any onAuthStateChange carrying no session whose event is
 *    not SIGNED_OUT, which includes the INITIAL_SESSION fired on every
 *    anonymous page load -- the login page's own, before sign-in.
 */

const HOST_EMAIL = process.env.TEST_USER_EMAIL ?? process.env.TEST_A_EMAIL ?? '';
const HOST_PASS = process.env.TEST_USER_PASSWORD ?? process.env.TEST_A_PASSWORD ?? '';
const STALL = process.env.PROBE_STALL ?? 'davisontest1';

/** Signed in as far as the app is concerned: a stored Supabase session. */
async function authState(page: Page) {
  return page.evaluate(() => {
    let keys: string[] = [];
    try {
      keys = Object.keys(localStorage).filter((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
    } catch { /* storage blocked */ }
    let email = '';
    try {
      const raw = keys.length ? localStorage.getItem(keys[0]) : null;
      if (raw) email = JSON.parse(raw)?.user?.email ?? '';
    } catch { /* not the shape we expected */ }
    return {
      origin: location.origin,
      path: location.pathname + location.hash,
      storedSession: keys.length > 0,
      email,
    };
  });
}

/** Every Go Live / Step In control, with the state that decides if a click lands. */
async function goLiveControls(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .map((b) => ({ b, label: (b.getAttribute('aria-label') || b.textContent || '').trim() }))
      .filter((x) => /^(go live|step in)$/i.test(x.label))
      .map(({ b, label }, i) => ({
        i,
        label,
        disabled: (b as HTMLButtonElement).disabled || b.getAttribute('aria-disabled') === 'true',
        title: b.getAttribute('title') ?? '',
        visible: b.getBoundingClientRect().width > 0,
      })));
}

test('host alone: does the Daily call join?', async ({ browser }) => {
  test.skip(!HOST_EMAIL || !HOST_PASS, 'host credentials required in .env.test');
  test.setTimeout(6 * 60_000);

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ['camera', 'microphone'],
  });
  const page = await ctx.newPage();

  const notes: string[] = [];
  page.on('console', (m) => {
    const t = m.text();
    if (/daily|call|join|token|mic|audio|forbidden|denied|error/i.test(t)) {
      notes.push(`${m.type()}: ${t.slice(0, 200)}`);
    }
  });
  page.on('pageerror', (e) => notes.push(`PAGEERROR: ${String(e).slice(0, 200)}`));
  const http: string[] = [];
  page.on('response', (r) => {
    if (/create-daily-meeting-token|daily\.co|gathering_sessions|live_presence/i.test(r.url())) {
      http.push(`HTTP ${r.status()} ${r.request().method()} ${r.url().split('?')[0].slice(-70)}`);
    }
  });

  // 1. Sign in, and PROVE it rather than swallowing the wait.
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', HOST_EMAIL);
  await page.fill('input[type="password"]', HOST_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const afterLogin = await authState(page);
  console.log(`[1 LOGIN] ${JSON.stringify(afterLogin)}`);

  // 2. The stall, and whether the session survived the navigation.
  await page.goto(`/stall/${STALL}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(9000);
  const onStall = await authState(page);
  console.log(`[2 STALL] ${JSON.stringify(onStall)}`);

  // 3. Open a shelf -- Go Live lives on a SeedCard rail, not on the stall itself.
  const books = page.getByRole('button', { name: 'Books', exact: true }).first();
  console.log(`[3 SHELF] Books hotspot present: ${await books.count()}`);
  await books.click({ force: true }).catch(() => {});
  await page.waitForTimeout(5000);

  // 4. Which Go Live controls exist, and is any of them actually clickable?
  const controls = await goLiveControls(page);
  console.log(`[4 CONTROLS] ${JSON.stringify(controls)}`);
  const live = controls.find((c) => c.visible && !c.disabled);
  console.log(`[4 CLICKABLE] ${live ? JSON.stringify(live) : 'NONE -- every Go Live on this shelf is disabled'}`);

  // 5. Click it for real. No force: a forced click on a disabled button lies.
  if (live) {
    await page.getByRole('button', { name: /^(go live|step in)$/i }).nth(live.i)
      .click({ timeout: 15000 })
      .catch((e) => console.log(`[5 CLICK] failed: ${String(e).slice(0, 120)}`));
    await page.waitForTimeout(25000);
  }

  const state = await page.evaluate(() => {
    const audios = Array.from(document.querySelectorAll('audio')) as HTMLAudioElement[];
    const videos = Array.from(document.querySelectorAll('video')) as HTMLVideoElement[];
    return {
      url: location.pathname + location.hash,
      hosting: /You are hosting/i.test(document.body.innerText),
      overlay: /Leave call|End live|Raise hand|You are hosting|Participants/i.test(document.body.innerText),
      audioEls: audios.length,
      videoEls: videos.length,
      videoWithStream: videos.filter((v) => v.srcObject instanceof MediaStream).length,
      audioWithStream: audios.filter((a) => a.srcObject instanceof MediaStream).length,
      micButton: !!document.querySelector('button[aria-label*="mic" i], button[title*="mic" i]'),
      text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 220),
    };
  });

  console.log(`[6 RESULT] ${JSON.stringify(state, null, 1)}`);
  console.log('[HTTP]');
  for (const h of http.slice(0, 20)) console.log('  ' + h);
  console.log('[CONSOLE]');
  for (const n of notes.slice(0, 20)) console.log('  ' + n);
  await page.screenshot({ path: 'test-results/host-alone.png', fullPage: false });

  // Assert each link separately, so a failure names the link that broke.
  expect(afterLogin.storedSession, 'sign-in stored no session -- nothing downstream is measurable').toBe(true);
  expect(onStall.storedSession, 'the session did not survive the navigation to the stall').toBe(true);
  expect(live, 'no enabled Go Live control -- the host cannot start a session here at all').toBeTruthy();
  // A host alone has no REMOTE audio by definition; what proves the call is up
  // is their own local track being published.
  expect(
    state.hosting || state.videoWithStream > 0,
    'the host never reached a live state at all -- the call did not come up',
  ).toBe(true);

  await ctx.close();
});
