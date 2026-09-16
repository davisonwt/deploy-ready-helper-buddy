import { test, expect, type Page } from '@playwright/test';

/**
 * Live verification that the share dialog is usable at any viewport height.
 *
 * Before the fix DialogContent had no max-height, so the dialog rendered at
 * its natural height (586px on the Circle tab) and clipped on anything
 * shorter, with the action button unreachable and nothing scrollable.
 *
 * Run: npx playwright test --config=playwright.live.config.ts share-dialog-layout
 */

const A_EMAIL = process.env.TEST_USER_EMAIL || process.env.TEST_A_EMAIL || '';
const A_PASS = process.env.TEST_USER_PASSWORD || process.env.TEST_A_PASSWORD || '';
const CAR_ID = '819a5b71-48a4-40c5-9fc7-f516aa82c348';

const VIEWPORTS = [
  { w: 1280, h: 720, name: 'desktop-720' },
  { w: 1366, h: 560, name: 'laptop-560' }, // the size that clipped before
  { w: 390, h: 844, name: 'mobile-390' },
  { w: 390, h: 667, name: 'mobile-short' },
];

const TABS = ['Tribe', 'Circle', 'Feed', 'Link'] as const;
const ACTION = /Invite|Open chatroom|Share to the tribal feed|Copy invitation/;

async function login(page: Page) {
  for (let i = 0; i < 2; i++) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', A_EMAIL);
    await page.fill('input[type="password"]', A_PASS);
    await page.click('button[type="submit"]');
    const ok = await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 })
      .then(() => true).catch(() => false);
    if (ok) return;
  }
  throw new Error('login failed');
}

/** Geometry for the dialog and its action button, plus a real hit test. */
async function probe(page: Page, viewportH: number) {
  return page.evaluate((vh) => {
    const dlg = document.querySelector('[role="dialog"]') as HTMLElement | null;
    if (!dlg) return null;
    const d = dlg.getBoundingClientRect();
    const btn = Array.from(dlg.querySelectorAll('button')).find((b) =>
      /Invite|Open chatroom|Share to the tribal feed|Copy invitation/.test(b.textContent || ''));
    let action = null as null | { label: string; top: number; bottom: number; inView: boolean; onTop: boolean; enabled: boolean; hitInDialog: boolean };
    if (btn) {
      const r = btn.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const hit = document.elementFromPoint(cx, cy);
      action = {
        label: (btn.textContent || '').trim().slice(0, 34),
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        inView: r.top >= 0 && r.bottom <= vh,
        enabled: !btn.disabled,
        // Nothing is painted over the button's own centre. A DISABLED button
        // has pointer-events:none, so the hit lands on its own footer -- that
        // is still "not covered by anything foreign", hence hitInDialog.
        onTop: !!hit && (hit === btn || btn.contains(hit)),
        hitInDialog: !!hit && dlg.contains(hit),
      };
    }
    const scroller = dlg.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    return {
      dialogTop: Math.round(d.top),
      dialogBottom: Math.round(d.bottom),
      dialogH: Math.round(d.height),
      withinViewport: d.top >= 0 && d.bottom <= vh,
      action,
      listScrolls: scroller ? scroller.scrollHeight > scroller.clientHeight : null,
    };
  }, viewportH);
}

for (const vp of VIEWPORTS) {
  test(`dialog fits and its action stays reachable at ${vp.name}`, async ({ page }) => {
    test.skip(!A_EMAIL || !A_PASS, 'A test account is required in .env.test.');
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await login(page);
    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /^Share$/ }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(2500);

    for (const tab of TABS) {
      await page.getByRole('tab', { name: tab }).click();
      await page.waitForTimeout(900);
      const m = await probe(page, vp.h);
      console.log(`\n[${vp.name}] ${tab}: ${JSON.stringify(m)}`);

      expect(m, 'dialog missing').not.toBeNull();
      expect(m!.withinViewport, `dialog spills outside the viewport on ${tab}`).toBe(true);
      expect(m!.dialogH, `dialog taller than 85% of the viewport on ${tab}`)
        .toBeLessThanOrEqual(Math.ceil(vp.h * 0.86));
      expect(m!.action, `no action button on ${tab}`).not.toBeNull();
      expect(m!.action!.inView, `action button off-screen on ${tab}`).toBe(true);
      // Nothing foreign is painted over it. When it is enabled the button
      // itself must be the hit target.
      expect(m!.action!.hitInDialog, `something outside the dialog covers the action on ${tab}`).toBe(true);
      if (m!.action!.enabled) {
        expect(m!.action!.onTop, `action button covered by something on ${tab}`).toBe(true);
      }
    }
    await page.screenshot({ path: `test-results/share-fixed-${vp.name}.png` });
  });
}

test('the member list scrolls inside the dialog, and selecting arms the button', async ({ page }) => {
  test.skip(!A_EMAIL || !A_PASS, 'A test account is required.');
  await page.setViewportSize({ width: 1366, height: 560 });
  await login(page);
  await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Share$/ }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 20000 });
  await page.getByRole('tab', { name: 'Tribe' }).click();
  await page.waitForTimeout(3000);

  const boxes = page.getByRole('checkbox');
  const n = await boxes.count();
  console.log(`\n[EVIDENCE] recipients listed: ${n}`);
  test.skip(n === 0, 'no tribe members on this account');

  const send = page.getByRole('button', { name: /^Invite/ });
  await expect(send).toBeDisabled();

  // The scroll container exists and is the thing that scrolls, not the page.
  const scrollable = await page.evaluate(() => {
    const v = document.querySelector('[role="dialog"] [data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (!v) return null;
    v.scrollTop = 50;
    return { hasViewport: true, scrolled: v.scrollTop, pageScrollY: window.scrollY };
  });
  console.log(`[EVIDENCE] list scroller: ${JSON.stringify(scrollable)}`);
  expect(scrollable?.hasViewport).toBe(true);
  expect(scrollable?.pageScrollY, 'the page scrolled instead of the list').toBe(0);

  await boxes.first().click();
  await expect(send).toBeEnabled({ timeout: 15000 });

  // Reachable without resizing: hover proves it is hit-testable where it sits.
  await send.hover();
  const after = await probe(page, 560);
  console.log(`[EVIDENCE] after selecting: ${JSON.stringify(after?.action)}`);
  expect(after!.action!.inView).toBe(true);
  expect(after!.action!.onTop).toBe(true);
  await page.screenshot({ path: 'test-results/share-fixed-selected.png' });
});

test('same dialog on the seed detail page behaves the same', async ({ page }) => {
  test.skip(!A_EMAIL || !A_PASS, 'A test account is required.');
  await page.setViewportSize({ width: 390, height: 667 });
  await login(page);
  await page.goto(`/seed/wheel/${CAR_ID}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);

  const share = page.getByRole('button', { name: /share/i }).first();
  const count = await share.count();
  console.log(`\n[EVIDENCE] share control on the seed detail page: ${count}`);
  test.skip(count === 0, 'this detail page has no share control to open');

  await share.click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(2000);
  const m = await probe(page, 667);
  console.log(`[EVIDENCE] detail-page dialog: ${JSON.stringify(m)}`);
  expect(m!.withinViewport).toBe(true);
  expect(m!.action!.inView).toBe(true);
  await page.screenshot({ path: 'test-results/share-fixed-detail.png' });
});
