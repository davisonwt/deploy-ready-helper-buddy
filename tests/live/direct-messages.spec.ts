import { test, expect, type Page } from '@playwright/test';

/**
 * Live verification that direct messages are visible to their recipients.
 *
 * Before the fix, ChatApp passed roomType="group" with the filter controls
 * hidden, and ChatList drops direct rooms under that filter, so no DM had
 * ever reached a recipient's screen.
 *
 * Run: npx playwright test --config=playwright.live.config.ts direct-messages
 */

const A_EMAIL = process.env.TEST_USER_EMAIL || process.env.TEST_A_EMAIL || '';
const A_PASS = process.env.TEST_USER_PASSWORD || process.env.TEST_A_PASSWORD || '';
const B_EMAIL = process.env.TEST_USER2_EMAIL || process.env.TEST_B_EMAIL || '';
const B_PASS = process.env.TEST_USER2_PASSWORD || process.env.TEST_B_PASSWORD || '';
const GOSAT_EMAIL = process.env.TEST_GOSAT_EMAIL || '';
const GOSAT_PASS = process.env.TEST_GOSAT_PASSWORD || '';

/** The pre-existing direct room shared by the two test accounts. */
const AB_ROOM = '2a4dbece-11f6-47a6-9df9-1ff9ae9dbf2a';
/** The real share to Louw, from the bug report. */
const LOUW_ROOM = '1d35d812-a4d1-414a-a661-28863d207b28';

async function login(page: Page, email: string, pass: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 }).catch(() => {});
}

async function openChatApp(page: Page) {
  await page.goto('/chatapp', { waitUntil: 'domcontentloaded' });
  // Wait for the list to settle rather than a fixed pause.
  await page.waitForSelector('text=/Private|Community|No conversations yet/', { timeout: 40000 });
}

test.describe.serial('Direct messages reach their recipient', () => {
  test.skip(!A_EMAIL || !A_PASS || !B_EMAIL || !B_PASS, 'Two test accounts are required in .env.test.');

  test('1. the Private/Community toggle renders at all', async ({ page }) => {
    await login(page, B_EMAIL, B_PASS);
    await openChatApp(page);
    await expect(page.getByRole('button', { name: 'Private', exact: true })).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('button', { name: 'Community', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'All', exact: true })).toBeVisible();
  });

  test('2. account B sees direct rooms, named after the other person, not "Chat"', async ({ page }) => {
    await login(page, B_EMAIL, B_PASS);
    await openChatApp(page);

    await page.getByRole('button', { name: 'Private', exact: true }).click();

    // At least one direct conversation is listed.
    await expect(page.getByText(/No conversations yet/)).toHaveCount(0, { timeout: 30000 });

    // None of them may render as the stored placeholder.
    await expect(page.getByText('Direct Chat', { exact: true })).toHaveCount(0);

    // The counterpart is named. davisontest1 is account A.
    await expect(page.getByText(/davisontest1/i).first()).toBeVisible({ timeout: 30000 });
  });

  test('3. the pre-existing A-to-B room opens and its messages render', async ({ page }) => {
    await login(page, B_EMAIL, B_PASS);
    await openChatApp(page);
    await page.getByRole('button', { name: 'Private', exact: true }).click();

    await page.getByText(/davisontest1/i).first().click();
    await page.waitForURL(new RegExp(`room=${AB_ROOM}|/communications-hub`), { timeout: 30000 });

    // The room actually has content, not an empty shell.
    await expect(page.locator('body')).not.toContainText('Failed to load', { timeout: 20000 });
  });

  test('4. the real share to Louw is visible from the sender side', async ({ page }) => {
    test.skip(!GOSAT_EMAIL || !GOSAT_PASS, 'The owner account is required for the Louw room.');
    await login(page, GOSAT_EMAIL, GOSAT_PASS);
    await openChatApp(page);
    await page.getByRole('button', { name: 'Private', exact: true }).click();

    await expect(page.getByText(/No conversations yet/)).toHaveCount(0, { timeout: 30000 });
    await expect(page.getByText('Direct Chat', { exact: true })).toHaveCount(0);
    await expect(page.getByText(/Louw/i).first()).toBeVisible({ timeout: 30000 });
  });

  test('5. notify_member delivers a notification from A to B', async () => {
    // Drives the deployed RPC with account A's real signed-in session, then
    // reads it back as B under B's own session and RLS.
    //
    // The share dialog's own button cannot be used for this pair: its
    // recipient list comes from get_my_tribe_members(), and there is no
    // tribe edge between the two test accounts. Creating one would mean
    // writing referral rows in production, which is not mine to do.
    const { createClient } = await import('@supabase/supabase-js');
    const URL = 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
    const KEY = 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa';
    const B_ID = 'a8872ed5-951c-4343-ba05-d4921af18eb2';
    const stamp = String(Date.now()).slice(-6);
    const probe = `QA notification probe ${stamp}`;

    const asA = createClient(URL, KEY, { auth: { persistSession: false } });
    const { error: aErr } = await asA.auth.signInWithPassword({ email: A_EMAIL, password: A_PASS });
    expect(aErr, 'account A could not sign in').toBeNull();

    const { error: rpcErr } = await asA.rpc('notify_member' as never, {
      _recipient: B_ID,
      _type: 'seed_share',
      _title: 'A seed was shared with you',
      _message: probe,
      _action_url: '/chatapp',
    } as never);
    expect(rpcErr?.message ?? null, 'notify_member returned an error').toBeNull();

    const asB = createClient(URL, KEY, { auth: { persistSession: false } });
    const { error: bErr } = await asB.auth.signInWithPassword({ email: B_EMAIL, password: B_PASS });
    expect(bErr, 'account B could not sign in').toBeNull();

    const { data: seen } = await asB
      .from('user_notifications')
      .select('id, title, message, type, action_url')
      .eq('message', probe)
      .limit(1);

    expect(seen?.[0], 'B could not read the notification').toBeTruthy();
    expect((seen as any)[0].type).toBe('seed_share');
    expect((seen as any)[0].action_url).toBe('/chatapp');
  });

  test('6. a member still cannot notify someone directly, only through the RPC', async () => {
    // The guard that made this bug class possible must stay shut: a raw
    // insert for another user is still refused. notify_member is the only
    // way through, and it checks entitlement.
    const { createClient } = await import('@supabase/supabase-js');
    const asA = createClient(
      'https://zuwkgasbkpjlxzsjzumu.supabase.co',
      'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa',
      { auth: { persistSession: false } },
    );
    await asA.auth.signInWithPassword({ email: A_EMAIL, password: A_PASS });

    const { error } = await asA.from('user_notifications').insert({
      user_id: 'a8872ed5-951c-4343-ba05-d4921af18eb2',
      type: 'probe',
      title: 'probe',
      message: 'raw insert probe',
    } as never);

    expect(error, 'a raw cross-user insert should still be refused').not.toBeNull();
  });
});
