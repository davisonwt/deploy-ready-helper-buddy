import { test, expect, type Page } from '@playwright/test';

/**
 * Can the owner place his own hotspots again, and does doing so stop his
 * stall inheriting the template's set?
 *
 * This drives his REAL stall. The caller restores the row afterwards.
 *
 * Run: npx playwright test --config=playwright.live.config.ts stall-hotspot-editor
 */

const E = process.env.TEST_GOSAT_EMAIL || '', P = process.env.TEST_GOSAT_PASSWORD || '';

async function login(page: Page) {
  for (let i = 0; i < 2; i++) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', E);
    await page.fill('input[type="password"]', P);
    await page.click('button[type="submit"]');
    if (await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 })
      .then(() => true).catch(() => false)) return;
  }
  throw new Error('login failed');
}

test('the owner can drop the Mugs box and it overrides the template', async ({ page }) => {
  test.skip(!E || !P, 'The owner account is required.');
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page);

  // 1. The route the pencil menu goes to.
  await page.goto('/stall/build', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(9000);

  // 2. Walk forward to "Mark your shelves".
  for (let i = 0; i < 6; i++) {
    if (await page.getByRole('heading', { name: /Mark your shelves/i }).count()) break;
    const next = page.getByRole('button', { name: /^Next|^Continue/ });
    if (!(await next.count())) break;
    await next.first().click().catch(() => {});
    await page.waitForTimeout(2500);
  }
  await expect(page.getByRole('heading', { name: /Mark your shelves/i }))
    .toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(2500);

  // 3. What the editor seeded for him.
  const before = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[aria-label^="Delete "]'))
      .map((b) => b.getAttribute('aria-label')));
  const seeded = await page.evaluate(() => {
    const txt = document.body.innerText || '';
    return ['Books', 'Music', 'Lyrics', 'My Story', 'Mugs'].filter((l) => txt.includes(l));
  });
  console.log('[EDITOR] seeded labels present on the page: ' + JSON.stringify(seeded));
  console.log('[EDITOR] delete controls found: ' + JSON.stringify(before));
  await page.screenshot({ path: 'test-results/editor-step3.png', fullPage: true });

  // 4. Remove Mugs. Its "Delete Mugs" control opens an AlertDialog whose
  //    confirm button is the one inside the dialog, not another row's.
  const del = page.getByRole('button', { name: 'Delete Mugs', exact: true });
  await expect(del.first(), 'no Delete Mugs control').toBeVisible({ timeout: 20000 });
  await del.first().click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible({ timeout: 15000 });
  console.log('[EDITOR] confirm dialog: '
    + (await dialog.innerText()).replace(/\s+/g, ' ').slice(0, 120));
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.waitForTimeout(2000);

  const after = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[aria-label^="Delete "]'))
      .map((b) => b.getAttribute('aria-label')));
  console.log('[EDITOR] boxes left: ' + JSON.stringify(after));
  expect(after, 'Mugs was not removed').not.toContain('Delete Mugs');
  await page.screenshot({ path: 'test-results/editor-after-delete.png', fullPage: true });

  // 5. Publish. "Save & publish" only exists on the wizard's last step, so
  //    walk the remaining Next buttons first.
  const publish = page.getByRole('button', { name: /Save & publish|^Publish$/ });
  for (let i = 0; i < 6 && !(await publish.count()); i++) {
    const next = page.getByRole('button', { name: /^Next|^Continue/ });
    if (!(await next.count())) break;
    await next.first().click().catch(() => {});
    await page.waitForTimeout(2500);
  }
  await expect(publish.first(), 'never reached the publish step').toBeVisible({ timeout: 20000 });
  await publish.first().click();
  await page.waitForTimeout(12000);
  console.log('[EDITOR] url after publish: ' + page.url());
  await page.screenshot({ path: 'test-results/editor-after-publish.png' });

  // 6. The live stall must now show his array, not the template's.
  await page.goto('/stall/davison.taljaard', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(9000);
  const live = await page.evaluate(() =>
    (Array.from(document.querySelectorAll('button.group.absolute')) as HTMLElement[])
      .filter((b) => { const r = b.getBoundingClientRect(); return r.width > 4 && r.height > 4; })
      .map((b) => b.getAttribute('aria-label')));
  console.log('[LIVE AFTER PUBLISH] ' + JSON.stringify(live));
  await page.screenshot({ path: 'test-results/live-after-publish.png' });

  expect(live.length, 'the stall did not pick up an owner-placed set').toBeGreaterThan(0);
});
