import { test, expect } from '@playwright/test';

/**
 * A member with no roles must not refresh their session in a loop.
 *
 * Measured on production 2026-09-25 as davisontest1 (no roles), 30s per page:
 * /cockpit 30 token refreshes and 307 profile reads; a stall 23 refreshes and
 * 90 stall_visits writes. useRoles retried an empty roles result with
 * refreshSession(), keyed on the user OBJECT, which useAuth replaces on every
 * auth event -- so each refresh re-ran the fetch, found no roles again, and
 * refreshed again.
 *
 * Read-only apart from the visit record a normal stall visit writes.
 */

const EMAIL = process.env.TEST_A_EMAIL;
const PASSWORD = process.env.TEST_A_PASSWORD;

test('a no-roles member idles on /cockpit and a stall without a token-refresh loop', async ({ page }) => {
  if (!EMAIL || !PASSWORD) throw new Error('TEST_A_EMAIL / TEST_A_PASSWORD (davisontest1, no roles) must be set in .env.test.');
  test.setTimeout(3 * 60_000);

  const counts = { token: 0, roles: 0 };
  page.on('request', (r) => {
    const u = r.url();
    if (u.includes('/auth/v1/token')) counts.token++;
    if (u.includes('/rest/v1/user_roles')) counts.roles++;
  });

  await page.goto('/login');
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30_000 });

  for (const path of ['/cockpit', '/stall/davison.taljaard']) {
    counts.token = 0; counts.roles = 0;
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(30_000);
    console.log(`[IDLE] ${path} over 30s: ${counts.token} token refreshes, ${counts.roles} user_roles reads`);
    // One retry per mount is by design; a loop is dozens.
    expect(counts.token, `${path}: token refreshes in 30s`).toBeLessThanOrEqual(3);
    expect(counts.roles, `${path}: user_roles reads in 30s`).toBeLessThanOrEqual(20);
  }
});
