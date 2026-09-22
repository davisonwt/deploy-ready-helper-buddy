import { expect, type Page } from '@playwright/test';

/**
 * Opening a hotspot on a PANNABLE interior.
 *
 * The interior is a strip wider than the window on narrow viewports -- on
 * davison.taljaard at 390px it is 1141px wide -- so a hotspot can be fully
 * outside the visible window while still being, in Playwright's terms,
 * "visible": it has a non-zero box and `visibility: visible`, it is simply
 * scrolled off to one side. `isVisible()` therefore returns true, and the
 * click that follows scrolls the strip, which moves every other
 * absolutely-positioned hotspot with it -- so the element the locator
 * resolved can land outside the window again and the click fails with
 * "Element is not visible".
 *
 * Measured on davison.taljaard at 390x844: "Coffee Mugs" sits at x -334
 * with the strip scrolled to 376, i.e. entirely off the left edge. Two
 * spec runs failed there on the FIRST shelf they tried.
 *
 * The fix is to pan deliberately and re-assert, never to wait longer: no
 * amount of waiting moves a box that is off-screen because the strip is
 * scrolled elsewhere.
 */

interface PanResult {
  found: boolean;
  /** Whether the box is inside the window horizontally AFTER panning. */
  inWindow: boolean;
  x: number;
  width: number;
  scrollLeft: number | null;
  strip: number | null;
}

/** Scroll the pannable strip so this hotspot sits in the window. Returns what it measured. */
export async function panHotspotIntoView(page: Page, label: string, nth = 0): Promise<PanResult> {
  return page.evaluate(({ label, nth }) => {
    const all = Array.from(document.querySelectorAll(`button[aria-label="${CSS.escape(label)}"]`))
      .filter((b) => b.getBoundingClientRect().width > 0);
    const el = all[nth] as HTMLElement | undefined;
    if (!el) return { found: false, inWindow: false, x: 0, width: 0, scrollLeft: null, strip: null };

    // Nearest horizontally scrollable ancestor -- found by measurement rather
    // than by a class or data attribute, so it survives markup changes.
    let p: HTMLElement | null = el.parentElement;
    let scroller: HTMLElement | null = null;
    while (p) {
      if (p.scrollWidth > p.clientWidth + 4) { scroller = p; break; }
      p = p.parentElement;
    }

    if (scroller) {
      const er = el.getBoundingClientRect();
      const sr = scroller.getBoundingClientRect();
      // Centre it in the strip's own window.
      scroller.scrollLeft += (er.left + er.width / 2) - (sr.left + sr.width / 2);
    }

    const r = el.getBoundingClientRect();
    return {
      found: true,
      inWindow: r.left >= 0 && r.right <= window.innerWidth,
      x: Math.round(r.left),
      width: Math.round(r.width),
      scrollLeft: scroller ? Math.round(scroller.scrollLeft) : null,
      strip: scroller ? scroller.scrollWidth : null,
    };
  }, { label, nth });
}

/**
 * Pan a hotspot into the window, prove it is there, then click it.
 *
 * Never `.first()` on an unscoped locator and never an assumption that a
 * label is unique: two boxes on one stall may share a label on purpose
 * (repeated hotspots are the point), so the caller picks by position.
 */
export async function openHotspot(page: Page, label: string, nth = 0): Promise<void> {
  const before = await panHotspotIntoView(page, label, nth);
  expect(before.found, `no hotspot "${label}" #${nth} is painted on this interior`).toBe(true);
  expect(
    before.inWindow,
    `"${label}" #${nth} is still outside the window after panning `
    + `(x ${before.x}, width ${before.width}, strip ${before.strip}, scrollLeft ${before.scrollLeft})`,
  ).toBe(true);

  const btn = page.locator(`button[aria-label="${label}"]`).nth(nth);
  await expect(btn).toBeVisible();
  await btn.click();
}

/**
 * Wait until an interior is actually ready to be measured.
 *
 * Two conditions, both events rather than elapsed time:
 *
 * 1. The interior image has LOADED (`complete` and a real naturalWidth).
 *    Hotspots are positioned from useContainImageRect, which returns null
 *    until `img.naturalWidth` is non-zero -- so `{rect && hotspots.map(...)}`
 *    renders nothing at all until the image is in. A spec that measures
 *    before then sees zero hotspots on a stall that has four.
 * 2. At least one hotspot button is attached INSIDE that container.
 *    Hotspots are the absolutely positioned `button[aria-label]`s there;
 *    the header's own buttons are not absolute, which separates them
 *    without repeating a list of chrome labels that would drift.
 *
 * Both conditions are scoped to `[data-pan-scroll]` and there is NO
 * fallback to document.body. A first attempt fell back, and before the
 * interior rendered it happily matched some other loaded image plus a
 * notification's absolutely-positioned dismiss button -- so it returned
 * instantly and the callers measured an empty room. A wait that can be
 * satisfied by the wrong elements is worse than the sleep it replaced.
 *
 * Why this exists: stall-interior-mobile-fill waited `waitForTimeout(7000)`
 * and then measured. Alone that was enough; in a 3-worker suite run against
 * production it was not, and the spec reported "no in-image hotspots found
 * to test" for Grove Station -- a stall that is published with four of them.
 * The failure was the clock, not the app, and a bigger number would only
 * have moved the threshold rather than removed it.
 */
export async function waitForInteriorReady(page: Page, timeout = 45_000): Promise<void> {
  await page.waitForFunction(() => {
    const pan = document.querySelector('[data-pan-scroll]');
    if (!pan) return false;
    const img = pan.querySelector('img') as HTMLImageElement | null;
    if (!img || !img.complete || !img.naturalWidth) return false;
    return Array.from(pan.querySelectorAll('button[aria-label]'))
      .some((b) => getComputedStyle(b).position === 'absolute'
        && b.getBoundingClientRect().width > 0);
  }, undefined, { timeout });
}
