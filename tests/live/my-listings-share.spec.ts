import { test, expect, type Page, type Locator } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { asUser, createWheelListing, sweepProducts, reportSweep } from './support/fixtures';

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
 * It acts ONLY on a listing of its own: createWheelListing makes one in
 * beforeAll and sweepProducts removes it in afterAll. It used to take
 * whichever listing was .first() on the page -- a standing listing, which
 * is how a spec once took a real car offline (see my-listings.spec.ts).
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

const QA_TITLE = `QA share ${Date.now()}`;
const MGMT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';
const TRIBE_MEMBER_ID = process.env.TEST_B_USER_ID || '';
// A tribe member of its own for test 3: davisontest2 (a test account) is
// put in davisontest1's tribe for this run and taken out in afterAll. Only
// the service role may write referral_circle, so it goes through the
// Management API (SUPABASE_ACCESS_TOKEN, .env.test, local only). The
// member-welcome trigger is suspended for that one insert so no welcome
// room or message is created.
let tribeRowId: string | null = null;

async function mgmtSql<T = any>(query: string): Promise<T[]> {
  const res = await fetch('https://api.supabase.com/v1/projects/zuwkgasbkpjlxzsjzumu/database/query', {
    method: 'POST', headers: { Authorization: `Bearer ${MGMT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const body = await res.json();
  if (!res.ok || !Array.isArray(body)) throw new Error(`management query failed: ${JSON.stringify(body).slice(0, 200)}`);
  return body as T[];
}
let owner: { client: SupabaseClient; userId: string };

/** THIS run's listing card -- the only one this spec may act on. */
function qaCard(page: Page): Locator {
  return page.locator('li').filter({ hasText: QA_TITLE }).first();
}

async function openShare(page: Page) {
  await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'My Listings' })).toBeVisible({ timeout: 30000 });
  await expect(qaCard(page), "this run's listing is not on the page").toBeVisible({ timeout: 30000 });
  await expect(qaCard(page)).toContainText(QA_TITLE);
  const share = qaCard(page).getByRole('button', { name: /^Share$/ });
  await expect(share).toBeVisible({ timeout: 30000 });
  await share.click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 20000 });
}

test.describe.serial('Share from My Listings', () => {
  test.beforeAll(async () => {
    owner = await asUser(A_EMAIL, A_PASS, 'TEST_A (davisontest1)');
    await createWheelListing(owner.client, owner.userId, QA_TITLE, { town: 'Bethlehem, Free State' });
    if (!MGMT_TOKEN || !TRIBE_MEMBER_ID) {
      throw new Error('SUPABASE_ACCESS_TOKEN and TEST_B_USER_ID must be set in .env.test to give this run its own tribe member.');
    }
    const existing = await mgmtSql(`select id from referral_circle where referred_user_id='${TRIBE_MEMBER_ID}'`);
    if (existing.length) throw new Error('davisontest2 already belongs to a tribe; this spec will not move them. Remove that row first.');
    const [row] = await mgmtSql<{ id: string }>(`begin;
      alter table referral_circle disable trigger member_welcome_on_referral;
      insert into referral_circle (referrer_id, referred_user_id, status) values ('${owner.userId}', '${TRIBE_MEMBER_ID}', 'active') returning id;
      alter table referral_circle enable trigger member_welcome_on_referral;
      commit;`);
    tribeRowId = row?.id ?? null;
    console.log(`[SETUP] tribe member davisontest2 -> davisontest1 (${tribeRowId})`);
  });

  test.afterAll(async () => {
    if (tribeRowId) {
      await mgmtSql(`delete from referral_circle where id='${tribeRowId}'`);
      const left = await mgmtSql(`select id from referral_circle where id='${tribeRowId}'`);
      console.log(`[RESIDUE] tribe row ${tribeRowId}: ${left.length} left (expected 0)`);
      expect(left, 'the QA tribe row survived teardown').toHaveLength(0);
    }
    const swept = await sweepProducts(owner.client, owner.userId, [QA_TITLE]);
    reportSweep('my-listings-share', swept);
    const { data: sowers } = await owner.client.from('sowers').select('id').eq('user_id', owner.userId);
    const { data: left } = await owner.client.from('products').select('id')
      .in('sower_id', (sowers ?? []).map((x: { id: string }) => x.id)).eq('title', QA_TITLE);
    console.log(`[RESIDUE] ${QA_TITLE}: ${left?.length ?? 0} product rows left (expected 0)`);
    expect(left ?? [], 'the QA listing survived teardown').toHaveLength(0);
  });

  test('1. Share sits alongside the other actions and opens the shared dialog', async ({ page }) => {
    await login(page);
    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'My Listings' })).toBeVisible({ timeout: 30000 });

    const card = qaCard(page);
    await expect(card).toBeVisible({ timeout: 30000 });
    for (const name of ['Open', 'Edit', 'Share', 'Delete']) {
      await expect(card.getByRole('button', { name: new RegExp(`^${name}$`) }).or(
        card.getByRole('link', { name: new RegExp(`^${name}$`) })
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

    // This run's listing, so the expected URL can be built.
    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'My Listings' })).toBeVisible({ timeout: 30000 });
    const openHref = await qaCard(page).getByRole('link', { name: /^Open$/ }).getAttribute('href');
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
    expect(count, 'this run put davisontest2 in the tribe, so a recipient must be listed').toBeGreaterThan(0);

    const sendBtn = page.getByRole('button', { name: /^Invite/ });
    await expect(sendBtn).toBeDisabled();
    await checkboxes.first().click();
    await expect(sendBtn).toBeEnabled({ timeout: 15000 });
    console.log('[EVIDENCE] selecting a recipient enables the send button');

    // Stopping here on purpose. Sending would message a real member.
    await page.screenshot({ path: 'test-results/share-3-tribe.png' });
  });
});
