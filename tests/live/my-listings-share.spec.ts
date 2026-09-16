import { test, expect, type Page } from '@playwright/test';

/**
 * Live verification of the Share button on /my-listings.
 *
 * What is NOT here, deliberately: an actual send. The share dialog's
 * recipient list comes from get_my_tribe_members(), and no pairing exists
 * among the accounts in .env.test -- davisontest1's tribe holds one real
 * member, davisontest2's is empty, and Davison's own tribe contains
 * neither test account. Sending would therefore put a QA message and a
 * notification in a real member's inbox, and creating a referral row to
 * avoid that would mean writing tribe structure in production. Neither is
 * acceptable, so the send and receive scenarios are reported NOT RUN.
 *
 * Everything up to the send is exercised through the real button here.
 *
 * Run: npx playwright test --config=playwright.live.config.ts my-listings-share
 */

const A_EMAIL = process.env.TEST_USER_EMAIL || process.env.TEST_A_EMAIL || '';
const A_PASS = process.env.TEST_USER_PASSWORD || process.env.TEST_A_PASSWORD || '';

async function login(page: Page) {
  // Retry once: a single submit occasionally does not take, and silently
  // carrying on lands every later assertion on the login page instead.
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', A_EMAIL);
    await page.fill('input[type="password"]', A_PASS);
    await page.click('button[type="submit"]');
    const ok = await page
      .waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 })
      .then(() => true)
      .catch(() => false);
    if (ok) return;
  }
  throw new Error('could not sign in after two attempts');
}

async function openShare(page: Page) {
  await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'My Listings' })).toBeVisible({ timeout: 30000 });
  const share = page.getByRole('button', { name: /^Share$/ }).first();
  await expect(share).toBeVisible({ timeout: 30000 });
  await share.click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 20000 });
}

test.describe.serial('Share from My Listings', () => {
  test.skip(!A_EMAIL || !A_PASS, 'A test account is required in .env.test.');

  test('1. Share sits alongside the other actions and opens the shared dialog', async ({ page }) => {
    await login(page);
    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'My Listings' })).toBeVisible({ timeout: 30000 });

    for (const name of ['Open', 'Edit', 'Share', 'Delete']) {
      await expect(page.getByRole('button', { name: new RegExp(`^${name}$`) }).or(
        page.getByRole('link', { name: new RegExp(`^${name}$`) })
      ).first()).toBeVisible({ timeout: 20000 });
    }

    await openShare(page);
    // The dialog is ShareSeedDialog: its four tabs are its signature.
    for (const tab of ['Tribe', 'Circle', 'Feed', 'Link']) {
      await expect(page.getByRole('tab', { name: tab })).toBeVisible({ timeout: 15000 });
    }
    await page.screenshot({ path: 'test-results/share-1-dialog.png' });
  });

  test('2. the Link tab carries the listing\'s own seed URL', async ({ page }) => {
    await login(page);

    // Which listing is first, so the expected URL can be built.
    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'My Listings' })).toBeVisible({ timeout: 30000 });
    const openHref = await page.getByRole('link', { name: /^Open$/ }).first().getAttribute('href');
    expect(openHref, 'no Open link found').toBeTruthy();
    console.log(`[EVIDENCE] first listing seed path: ${openHref}`);

    await openShare(page);
    await page.getByRole('tab', { name: 'Link' }).click();

    const shown = await page.getByText(/https:\/\/[^\s]+\/seed\//).first().innerText();
    console.log(`[EVIDENCE] share link shown: ${shown}`);
    expect(shown).toContain(openHref!);

    // The link must resolve to that seed, not 404.
    const res = await page.request.get(shown.trim());
    console.log(`[EVIDENCE] link HTTP ${res.status()}`);
    expect(res.status()).toBeLessThan(400);
    await page.screenshot({ path: 'test-results/share-2-link.png' });
  });

  test('3. the Tribe tab loads real recipients and arms the send button', async ({ page }) => {
    await login(page);
    await openShare(page);
    await page.getByRole('tab', { name: 'Tribe' }).click();

    // Either real members load, or the empty state appears. Both are real
    // answers; only the first lets a send happen.
    const empty = page.getByText(/No tribe members yet/i);
    const checkboxes = page.getByRole('checkbox');
    await expect(empty.or(checkboxes.first())).toBeVisible({ timeout: 40000 });

    const count = await checkboxes.count();
    console.log(`[EVIDENCE] recipients listed for this account: ${count}`);
    test.skip(count === 0, 'This account has no tribe members, so no send is possible.');

    const sendBtn = page.getByRole('button', { name: /^Invite/ });
    await expect(sendBtn).toBeDisabled();
    await checkboxes.first().click();
    await expect(sendBtn).toBeEnabled({ timeout: 15000 });
    console.log('[EVIDENCE] selecting a recipient enables the send button');

    // Stopping here on purpose. Sending would message a real member.
    await page.screenshot({ path: 'test-results/share-3-tribe.png' });
  });
});
