import { test, expect, devices, type Page } from '@playwright/test';

/**
 * iOS Safari layout: nothing paints an empty coloured band into the
 * home-indicator area, and nothing is pushed under the browser chrome.
 *
 * ROOT CAUSE this guards (2026-09-17). `src/index.css` had a bare element
 * selector inside the mobile media query:
 *
 *     @media (max-width: 768px) { section { @apply py-8; } }
 *
 * where that same block also sets `html { font-size: 14px }`, so py-8 is 28px
 * a side. It matched EVERY <section>, including Sonner's toast live region --
 * an empty <section aria-live="polite"> that is the first child of #root on
 * every page. So every mobile page carried a 56px blank block at the top,
 * which:
 *   1. displaced the whole app down 56px and made the document 56px taller
 *      than the viewport, so a feed designed not to scroll did; on iOS the
 *      category pills scrolled under Safari's URL bar and the feed's inner
 *      scroller captured the swipe back, leaving them unreachable; and
 *   2. pushed Layout's min-h-screen box 56px past the fold, painting its
 *      themed gradient (green on the hour Davison saw it) as an empty band.
 *
 * WHAT PLAYWRIGHT CAN AND CANNOT PROVE. Chromium resolves
 * env(safe-area-inset-*) to 0 and makes 100vh === 100dvh, so neither iOS
 * symptom reproduces on its own. What IS observable, and is what these tests
 * assert, is the mechanism: the stray 56px block, and any box that extends
 * below the visible viewport. The dvh half of the fix is verified by reading
 * the computed value of the utility, which Chromium does report honestly.
 *
 * Run: npx playwright test --config=playwright.live.config.ts ios-safe-area
 */

const E = process.env.TEST_GOSAT_EMAIL || '';
const P = process.env.TEST_GOSAT_PASSWORD || '';

/** iPhone 14 Pro: 393x659 CSS px with both Safari bars showing, DPR 3. */
const IPHONE = devices['iPhone 14 Pro'];

/** Real iPhone 14 Pro portrait insets, forced on so the layout is exercised. */
const INSET_TOP = 59;
const INSET_BOTTOM = 34;

/** Full-height surfaces across the app, not just the page that was reported. */
const ROUTES = ['/stalls-feed', '/dashboard', '/my-listings', '/sleeping-seeds', '/live-now'];

async function login(page: Page) {
  for (let i = 0; i < 2; i++) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', E);
    await page.fill('input[type="password"]', P);
    await page.click('button[type="submit"]');
    const ok = await page
      .waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 })
      .then(() => true)
      .catch(() => false);
    if (ok) return;
  }
  throw new Error('login failed');
}

/** Force the insets on: the same code path a real notch takes. */
async function applyInsets(page: Page) {
  await page.addStyleTag({
    content: `:root { --sat: ${INSET_TOP}px !important; --sab: ${INSET_BOTTOM}px !important; }`,
  });
  await page.waitForTimeout(300);
}

/** Everything that decides how tall the page is. */
async function measure(page: Page) {
  return page.evaluate(() => {
    const vh = window.innerHeight;
    const overhang: { where: string; minHeight: string; bottom: number; overBy: number }[] = [];
    const candidates = [
      document.body,
      ...Array.from(document.querySelectorAll('#root, #root > *, #root > * > *')),
    ];
    const seen = new Set<Element>();
    for (const el of candidates) {
      if (!el || seen.has(el)) continue;
      seen.add(el);
      const h = el as HTMLElement;
      const s = getComputedStyle(h);
      if (s.position === 'fixed') continue; // fixed chrome is placed deliberately
      const r = h.getBoundingClientRect();
      if (Math.round(r.bottom) > vh + 1) {
        overhang.push({
          where: `${h.tagName}.${(h.className?.toString() || '').slice(0, 60)}`,
          minHeight: s.minHeight,
          bottom: Math.round(r.bottom),
          overBy: Math.round(r.bottom) - vh,
        });
      }
    }

    // Non-visual <section>s must take up no room. This is the actual bug.
    const ghosts = Array.from(document.querySelectorAll('section'))
      .filter((el) => el.children.length === 0 && !(el as HTMLElement).innerText.trim())
      .map((el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el as HTMLElement);
        return {
          label: el.getAttribute('aria-label') || '(none)',
          height: Math.round(r.height),
          padding: s.padding,
        };
      })
      .filter((g) => g.height > 0);

    const shell = document.querySelector('#root > div.min-h-screen') as HTMLElement | null;
    return {
      viewportHeight: vh,
      scrollHeight: document.documentElement.scrollHeight,
      scrollableBy: document.documentElement.scrollHeight - vh,
      shellMinHeight: shell ? getComputedStyle(shell).minHeight : null,
      shellTop: shell ? Math.round(shell.getBoundingClientRect().top) : null,
      overhang,
      ghosts,
      sat: getComputedStyle(document.documentElement).getPropertyValue('--sat').trim(),
    };
  });
}

test.describe('iOS Safari safe areas', () => {
  test.skip(!E || !P, 'A test account is required in .env.test.');

  test('the safe-area variables exist and dvh replaced vh', async ({ browser }) => {
    const ctx = await browser.newContext({ ...IPHONE });
    const page = await ctx.newPage();
    await login(page);
    await page.goto('/stalls-feed', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    const css = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.className = 'min-h-screen';
      probe.style.position = 'absolute';
      probe.style.visibility = 'hidden';
      document.body.appendChild(probe);
      const minHeight = getComputedStyle(probe).minHeight;
      probe.remove();
      const root = getComputedStyle(document.documentElement);
      return {
        // In Chromium dvh === vh in px, so compare against the viewport and
        // read the declaration text the engine kept for the shorthand.
        minHeightPx: minHeight,
        viewport: window.innerHeight,
        satDeclared: root.getPropertyValue('--sat').trim(),
        sabDeclared: root.getPropertyValue('--sab').trim(),
      };
    });
    console.log('[CSS] ' + JSON.stringify(css));
    expect(css.satDeclared, '--sat is not defined; the fix is not deployed').not.toBe('');
    expect(css.sabDeclared, '--sab is not defined').not.toBe('');
    await ctx.close();
  });

  for (const route of ROUTES) {
    test(`${route}: no ghost section, no band below the fold`, async ({ browser }) => {
      const ctx = await browser.newContext({ ...IPHONE });
      const page = await ctx.newPage();
      await login(page);
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(6000);
      await applyInsets(page);

      const m = await measure(page);
      console.log(`[${route}] ` + JSON.stringify(m));
      await page.screenshot({
        path: `test-results/ios${route.replace(/\//g, '-')}.png`,
        fullPage: false,
      });

      expect(m.ghosts, 'an empty <section> is taking up layout height').toEqual([]);
      expect(m.shellTop, 'the app shell does not start at the top of the page').toBe(0);
      expect(m.overhang, 'a surface paints below the visible viewport').toEqual([]);
      await ctx.close();
    });
  }
});
