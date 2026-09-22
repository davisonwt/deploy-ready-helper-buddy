import { test, expect, devices, type Page } from '@playwright/test';
import { panHotspotIntoView, waitForInteriorReady } from './support/interior';

/**
 * On mobile portrait the stall interior fills the screen.
 *
 * Before (measured live 2026-09-21 at 393x660): the image was `w-full
 * h-auto`, so a 1216x816 interior came out 393x262 -- a band across the
 * top 40%, the stats strip under it, and ~280px of black below that.
 *
 * After: header block, then the image at full remaining height, panned
 * sideways, with the stats panel starting exactly at the fold.
 *
 * Run: npx playwright test --config=playwright.live.config.ts stall-interior-mobile-fill
 *
 * Creates nothing -- both stalls are published and already exist.
 */

const E = process.env.TEST_GOSAT_EMAIL;
const P = process.env.TEST_GOSAT_PASSWORD;

// 390x844 exactly, as reported.
const PHONE = { ...devices['iPhone 12'] };

/** A stall with in-image hotspots spread wide, and one with a welcome note. */
const GROVE = '/stall/grovestation';
const JT = '/stall/jtphotographer2';
// The ONLY stall in the feed carrying a welcome note, checked across all
// 16 published stalls on 2026-09-21. Davison's has none, so it proves
// nothing about the pill.
const WITH_GREETING = '/stall/primitivevsns';

test.beforeAll(() => {
  // Never a silent skip: if this cannot run, it says so and fails.
  if (!E || !P) {
    throw new Error(
      'TEST_GOSAT_EMAIL / TEST_GOSAT_PASSWORD are not set. They live in .env.test, '
      + 'which playwright.live.config.ts loads. This spec must not skip its way to green.',
    );
  }
});

async function login(page: Page) {
  for (let i = 0; i < 2; i++) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', E!);
    await page.fill('input[type="password"]', P!);
    await page.click('button[type="submit"]');
    const ok = await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 })
      .then(() => true).catch(() => false);
    if (ok) return;
  }
  throw new Error('login failed');
}

/**
 * Opens a stall interior, stepping through a front gate if there is one.
 *
 * Event-driven throughout: whichever the stall shows first -- its gate or
 * its interior -- wins the race, so a stall with no gate costs nothing and
 * a stall with one is not guessed at. The three fixed sleeps this replaced
 * (7s, 6s, 2s) were enough running alone and not enough under a 3-worker
 * suite run, which is the shape of a threshold rather than a wait.
 */
async function openInterior(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  const gate = page.getByRole('button', { name: /^Enter/i }).first();
  const sawGate = await Promise.race([
    gate.waitFor({ state: 'visible', timeout: 45_000 }).then(() => true).catch(() => false),
    waitForInteriorReady(page).then(() => false).catch(() => false),
  ]);
  if (sawGate) await gate.tap();
  // Already true when the interior won the race above; the real wait when
  // the gate did. Throws here, named, if the interior never arrives.
  await waitForInteriorReady(page);
}

/** Geometry of the interior as actually laid out. */
function layout(page: Page) {
  return page.evaluate(() => {
    const pan = document.querySelector('[data-pan-scroll]') as HTMLElement | null;
    const img = pan?.querySelector('img') as HTMLImageElement | null;
    const panel = Array.from(document.querySelectorAll('button'))
      .find((b) => /my stats|stall stats/i.test(b.innerText || ''));
    const r = (el: Element | null | undefined) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
    };
    return {
      vw: window.innerWidth,
      vh: window.innerHeight,
      scrollY: window.scrollY,
      docScrollH: document.documentElement.scrollHeight,
      pan: r(pan),
      img: r(img),
      imgNatural: img ? `${img.naturalWidth}x${img.naturalHeight}` : null,
      scrollLeft: pan ? Math.round(pan.scrollLeft) : null,
      scrollWidth: pan ? Math.round(pan.scrollWidth) : null,
      clientWidth: pan ? Math.round(pan.clientWidth) : null,
      statsLabel: panel ? (panel.innerText || '').replace(/\s+/g, ' ').trim() : null,
      stats: r(panel),
      greetingPill: r(Array.from(document.querySelectorAll('button'))
        .find((b) => /greeting|replay/i.test(b.innerText || '') || /greeting/i.test(b.getAttribute('aria-label') || ''))),
      topChromeVar: getComputedStyle(document.documentElement).getPropertyValue('--stall-top-chrome-h').trim(),
    };
  });
}

/** Every in-image hotspot (excludes the header/chrome controls). */
function hotspots(page: Page) {
  return page.evaluate(() => {
    const chrome = ['Close', 'Close shelf', 'Leave stall', 'Log out', 'Open menu', 'Owner menu',
      'Share this stall', 'Dismiss banner', 'Message the sower', 'Exit visitor view',
      'Open Today, Omer & Growth'];
    const pan = document.querySelector('[data-pan-scroll]');
    return Array.from(pan?.querySelectorAll('button[aria-label]') ?? [])
      .filter((b) => !chrome.includes(b.getAttribute('aria-label') || ''))
      .map((b) => b.getAttribute('aria-label') || '');
  });
}

for (const [name, path] of [['Grove Station', GROVE], ['J & T Photography', JT]] as const) {
  test(`${name}: the interior fills the screen, no band and no void`, async ({ browser }) => {
    const ctx = await browser.newContext({ ...PHONE });
    const page = await ctx.newPage();
    await login(page);
    await openInterior(page, path);

    const g = await layout(page);
    console.log(`[${name}] ${JSON.stringify(g)}`);
    await page.screenshot({ path: `test-results/interior-fill-${path.split('/').pop()}.png` });

    expect(g.vw, 'viewport width').toBe(390);
    expect(g.pan, 'no pan container -- the mobile portrait branch did not render').not.toBeNull();

    // The interior reaches the fold: top chrome + interior == one screen,
    // give or take the bottom chrome and a rounding pixel.
    const bottomOfInterior = g.pan!.y + g.pan!.h;
    expect(bottomOfInterior, `interior ends at ${bottomOfInterior} of a ${g.vh}px screen -- that is the band`)
      .toBeGreaterThanOrEqual(g.vh - 8);
    expect(g.pan!.y, 'the interior should start right under the header block').toBeLessThanOrEqual(120);

    // Image is full-height, and wider than the window (landscape interior).
    expect(g.img!.h, 'the image does not fill the interior height').toBeGreaterThanOrEqual(g.pan!.h - 2);
    expect(g.scrollWidth!, 'the image is not wider than the window, so nothing to pan')
      .toBeGreaterThan(g.clientWidth!);

    // Opens centred, not pinned to an edge.
    const max = g.scrollWidth! - g.clientWidth!;
    expect(Math.abs(g.scrollLeft! - max / 2), 'the pan did not open centred').toBeLessThanOrEqual(8);

    // Stats sit below the fold, not in the middle of a void.
    expect(g.stats, 'the stats strip is missing').not.toBeNull();
    expect(g.stats!.y, 'the stats strip is above the fold -- it should be scrolled to')
      .toBeGreaterThanOrEqual(g.vh - 8);
    await ctx.close();
  });

  test(`${name}: pan reaches both edges and every hotspot opens`, async ({ browser }) => {
    const ctx = await browser.newContext({ ...PHONE });
    const page = await ctx.newPage();
    await login(page);
    await openInterior(page, path);

    const labels = await hotspots(page);
    console.log(`[${name}] hotspots: ${JSON.stringify(labels)}`);
    expect(labels.length, 'no in-image hotspots found to test').toBeGreaterThan(0);

    // Both edges are reachable.
    const edges = await page.evaluate(() => {
      const pan = document.querySelector('[data-pan-scroll]') as HTMLElement;
      const max = pan.scrollWidth - pan.clientWidth;
      pan.scrollLeft = 0; const atLeft = Math.round(pan.scrollLeft);
      pan.scrollLeft = max; const atRight = Math.round(pan.scrollLeft);
      pan.scrollLeft = max / 2;
      return { max, atLeft, atRight };
    });
    console.log(`[${name}] edges: ${JSON.stringify(edges)}`);
    expect(edges.atLeft, 'could not pan to the left edge').toBe(0);
    expect(edges.atRight, 'could not pan to the right edge').toBe(edges.max);

    // Each hotspot does its job. Two kinds exist and both count as
    // working: a shelf hotspot opens its sheet (J & T's album covers), and
    // a 'nav' hotspot leaves for its wired destination instead -- Grove
    // Station's On Air / Schedule / Shows / Advertise, wired in ddaae675,
    // never open a sheet at all (StallInteriorView.handleHotspotTap).
    for (const label of labels) {
      const btn = page.getByRole('button', { name: label, exact: true }).first();
      // Pan it into the window OURSELVES before tapping. Relying on tap's
      // own scroll-into-view is what hung here: the interior is a 924px
      // strip in a 390px window, so a box can be outside the window with a
      // perfectly real bounding box, and tap() then waits on an
      // actionability check that never becomes true. It surfaced on
      // re-entry after a 'nav' hotspot, where the strip is back at its
      // start and the later boxes are off to the right.
      await panHotspotIntoView(page, label);
      await btn.tap();
      // Wait for the OUTCOME, either kind: a shelf opened, or the 'nav'
      // hotspot left the stall. Same threshold problem as openInterior had
      // -- 2.8s was enough alone and a guess under a parallel suite run.
      // Swallowed on timeout so the assertion below reports it in its own
      // words rather than a raw locator error.
      await page.waitForFunction(() => {
        const sheet = /stall-kind=/.test(location.hash)
          || !!document.querySelector('[role="dialog"]')
          || !!document.querySelector('button[aria-label="Close shelf"]');
        return sheet || !/^\/stall\//.test(location.pathname);
      }, undefined, { timeout: 45_000 }).catch(() => {});
      const after = await page.evaluate(() => ({
        sheet: /stall-kind=/.test(location.hash) || !!document.querySelector('[role="dialog"]'),
        path: location.pathname,
      }));
      const navigated = !/^\/stall\//.test(after.path);
      console.log(`[${name}] "${label}": sheet=${after.sheet} navigatedTo=${navigated ? after.path : '-'}`);
      expect(
        after.sheet || navigated,
        `"${label}" did nothing at all -- no shelf opened and no navigation`,
      ).toBe(true);

      if (after.sheet) {
        const close = page.getByRole('button', { name: 'Close shelf', exact: true }).first();
        expect(await close.count(), `"${label}" opened with no way to close it`).toBeGreaterThan(0);
        await close.tap();
        await page.waitForFunction(
          () => !document.querySelector('button[aria-label="Close shelf"]'),
          undefined, { timeout: 45_000 },
        ).catch(() => {});
        const left = await page.evaluate(() => !/\/stall\//.test(location.pathname));
        expect(left, `closing "${label}" left the stall`).toBe(false);
      } else {
        // Went somewhere: come back and carry on down the list.
        await openInterior(page, path);
      }
    }
    await ctx.close();
  });
}

test('the stats strip reads MY STATS and expands', async ({ browser }) => {
  const ctx = await browser.newContext({ ...PHONE });
  const page = await ctx.newPage();
  await login(page);
  await openInterior(page, GROVE);

  // The interior is a `fixed inset-0` overlay that owns its own
  // overflow-y-auto -- the document itself never scrolls here, so
  // window.scrollTo and documentElement.scrollHeight both measure nothing.
  const scrollToBottom = () => page.evaluate(() => {
    let el = document.querySelector('[data-pan-scroll]')?.parentElement ?? null;
    while (el && el.scrollHeight <= el.clientHeight) el = el.parentElement;
    if (!el) throw new Error('no scrolling ancestor found above the interior');
    el.scrollTop = el.scrollHeight;
    return { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
  });

  const scrolled = await scrollToBottom();
  await page.waitForTimeout(2000);
  const g = await layout(page);
  console.log('[stats] ' + JSON.stringify({ label: g.statsLabel, y: g.stats?.y, vh: g.vh, ...scrolled }));
  expect(g.statsLabel, 'the strip still names the stall, not the viewer').toMatch(/MY STATS/i);
  expect(g.statsLabel, 'it should no longer read "stall stats"').not.toMatch(/STALL STATS/i);
  // Scrolled to the bottom, the strip is now on screen -- proving it was
  // reachable rather than stranded past the end of the scroll.
  expect(g.stats!.y, 'the stats strip cannot be scrolled into view').toBeLessThan(g.vh);

  const before = scrolled.scrollHeight;
  await page.getByRole('button', { name: /my stats/i }).first().tap();
  await page.waitForTimeout(2200);
  const after = (await scrollToBottom()).scrollHeight;
  console.log(`[stats] scrollHeight ${before} -> ${after}`);
  await page.screenshot({ path: 'test-results/interior-fill-stats-expanded.png' });
  expect(after, 'tapping the strip did not expand the panel').toBeGreaterThan(before);
  await ctx.close();
});

test('a stall with a welcome note shows its greeting pill without scrolling', async ({ browser }) => {
  const ctx = await browser.newContext({ ...PHONE });
  const page = await ctx.newPage();
  await login(page);
  await openInterior(page, WITH_GREETING);

  const g = await layout(page);
  console.log('[greeting] ' + JSON.stringify({ pill: g.greetingPill, topChrome: g.topChromeVar, pan: g.pan, vh: g.vh }));
  await page.screenshot({ path: 'test-results/interior-fill-greeting.png' });

  expect(g.greetingPill, 'the replay-greeting pill is not rendered').not.toBeNull();
  expect(g.greetingPill!.y, 'the greeting pill is off screen at rest').toBeLessThan(g.vh);
  expect(g.greetingPill!.y, 'the greeting pill needs scrolling to reach').toBeGreaterThanOrEqual(0);
  // The measured top chrome must actually include the pill row, or the
  // interior below would overshoot the fold by exactly the pill's height.
  expect(g.topChromeVar, '--stall-top-chrome-h was never published').toMatch(/px$/);
  expect(parseFloat(g.topChromeVar), 'top chrome measured as header-only, pill not counted')
    .toBeGreaterThan(48);
  expect(g.pan!.y, 'the interior starts above the pill').toBeGreaterThanOrEqual(parseFloat(g.topChromeVar) - 2);
  await ctx.close();
});
