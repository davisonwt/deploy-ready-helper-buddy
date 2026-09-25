import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { asUser, signInThroughUi, createStallFixture, deleteStallFixture } from './support/fixtures';

/**
 * The invite link for every member, stall or not (src/lib/invite/inviteLink.ts).
 *
 * The throwaway signups are real auth users, and only the service role can
 * delete one, so DB checks and teardown go through the Management API:
 * SUPABASE_ACCESS_TOKEN must be set in .env.test (local only, gitignored).
 * Without it the spec FAILS in beforeAll and says so -- it never skips.
 *
 *   A. davisontest2 -- NO stall. Copies their link from the empty plot,
 *      a signed-out visitor sees the join page, signs up through the real
 *      form, and is attributed to davisontest2.
 *   B. davisontest1 -- a throwaway stall. Copies their link from the
 *      Cockpit nav inside their stall, the visitor sees the stall (not the
 *      join page), signs up, and is attributed to davisontest1.
 *   Both new members' private welcome carries their OWN link.
 *   Link previews (crawler UA) read sensibly for both.
 *
 * The signup request is sent with is_test: true added (page.route), so a
 * throwaway never posts "just joined" into the real members' Global room.
 * Everything else is the real UI path.
 *
 *   npx playwright test --config=playwright.live.config.ts invite-link
 */

const REF = 'zuwkgasbkpjlxzsjzumu';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';
const A_E = process.env.TEST_A_EMAIL || '', A_P = process.env.TEST_A_PASSWORD || '';
const B_E = process.env.TEST_B_EMAIL || '', B_P = process.env.TEST_B_PASSWORD || '';
const STAMP = Date.now();
const SHOTS = 'test-results/invite-link';

async function sql<T = any>(query: string): Promise<T[]> {
  if (!TOKEN) throw new Error('SUPABASE_ACCESS_TOKEN is not set -- this verification needs it for DB checks and teardown');
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const body = await res.json();
  if (!res.ok || !Array.isArray(body)) throw new Error(`sql failed: ${JSON.stringify(body).slice(0, 300)}`);
  return body as T[];
}

let a: { client: SupabaseClient; userId: string };
let b: { client: SupabaseClient; userId: string };
let stallId: string | null = null;
let stallObjects: string[] = [];
const signups: string[] = []; // emails created this run
let orphanRoomsBefore = -1;
const ORPHAN_ROOMS = `select count(*)::int n from chat_rooms r where not exists (select 1 from auth.users u where u.id=r.created_by) and r.name in ('Welcome to S2G','Sow2Grow Verification')`;

async function copyInviteLink(page: Page, context: BrowserContext): Promise<string> {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const btn = page.getByTestId('invite-people').filter({ visible: true }).first();
  await expect(btn, 'an "Invite people" control is visible').toBeVisible({ timeout: 45000 });
  for (let attempt = 1; attempt <= 3; attempt++) {
    await btn.click();
    const copied = await page.getByText('Invite link copied').first().waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
    const toasts = await page.evaluate(() => Array.from(document.querySelectorAll('[data-sonner-toast]')).map((t) => (t as HTMLElement).innerText.replace(/\s+/g, ' ')).join(' | '));
    console.log(`[COPY attempt ${attempt}] copied=${copied} toasts="${toasts}"`);
    if (copied) return page.evaluate(() => navigator.clipboard.readText());
    await page.waitForTimeout(3000);
  }
  throw new Error('"Invite people" never reported a copied link after 3 clicks');
}

async function signUpThroughForm(page: Page, email: string, first: string): Promise<void> {
  let sentRef: string | null = null;
  await page.route('**/auth/v1/signup**', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    sentRef = body?.data?.referral_code ?? null;
    body.data = { ...(body.data || {}), is_test: true };
    await route.continue({ postData: JSON.stringify(body) });
  });
  const pw = `Qa!${STAMP}Xy9z`;
  await page.fill('#firstName', first);
  await page.fill('#lastName', 'Invitetest');
  await page.fill('#email', email);
  await page.fill('#password', pw);
  await page.fill('#confirmPassword', pw);
  await page.click('#disclaimer-accept');
  signups.push(email);
  await page.click('button[type="submit"]');
  await expect.poll(async () => (await sql(`select count(*)::int n from auth.users where email='${email}'`))[0].n, { timeout: 60000 }).toBe(1);
  console.log(`[SIGNUP] ${email} sent referral_code=${sentRef}`);
}

async function attributionOf(email: string) {
  const rows = await sql(`
    select u.id, p.username,
           rc.referrer_id, p.referred_by,
           (select referral_code from affiliates x where x.user_id=u.id and coalesce(x.is_active,true) limit 1) own_code,
           (select content from chat_messages m where m.system_metadata->>'user_id'=u.id::text and m.system_metadata->>'type'='member_welcome_private' limit 1) welcome,
           (select count(*)::int from chat_messages m where m.system_metadata->>'user_id'=u.id::text and m.system_metadata->>'type'='member_welcome_global') global_posts
      from auth.users u
      left join profiles p on p.user_id=u.id
      left join referral_circle rc on rc.referred_user_id=u.id
     where u.email='${email}'`);
  return rows[0];
}

test.describe.serial('invite link for every member', () => {
  test.beforeAll(async () => {
    if (!TOKEN) throw new Error('SUPABASE_ACCESS_TOKEN is missing from .env.test. It is needed to delete the throwaway signups; add it (local only) and re-run.');
    a = await asUser(A_E, A_P, 'TEST_A (davisontest1)');
    b = await asUser(B_E, B_P, 'TEST_B (davisontest2)');
    const { data: bStall } = await b.client.from('stalls').select('id').eq('user_id', b.userId).maybeSingle();
    if (bStall) throw new Error('davisontest2 has a stall; leg A needs a member without one');
    orphanRoomsBefore = (await sql(ORPHAN_ROOMS))[0].n;
    const s = await createStallFixture(a.client, a.userId, `QA invite ${STAMP} stall`);
    stallId = s.stallId; stallObjects = s.objectPaths;
  });

  test.afterAll(async () => {
    const problems: string[] = [];
    for (const email of signups) {
      const [u] = await sql(`select id from auth.users where email='${email}'`);
      if (!u) continue;
      try {
        await sql(`begin;
          create temp table qa_rooms on commit drop as select id from chat_rooms where created_by='${u.id}';
          delete from chat_messages where room_id in (select id from qa_rooms);
          delete from chat_participants where room_id in (select id from qa_rooms);
          delete from chat_rooms where id in (select id from qa_rooms);
          delete from chat_messages where system_metadata->>'user_id'='${u.id}';
          delete from auth.users where id='${u.id}' and email like 'qa-invite-%@example.com';
          commit;`);
      } catch (e) { problems.push(String(e)); }
    }
    if (stallId) {
      try { await deleteStallFixture(a.client, stallId); } catch (e) { problems.push(String(e)); }
      const { error } = await a.client.storage.from('stalls').remove(stallObjects);
      if (error) problems.push(`stall objects: ${error.message}`);
    }
    const emails = signups.length ? signups.map((e) => `'${e}'`).join(',') : `'none'`;
    const [r] = await sql(`select
      (select count(*)::int from auth.users where email in (${emails})) auth_users,
      (select count(*)::int from profiles where username like 'qa-invite%' or username like 'qainvite%') profiles,
      (select count(*)::int from affiliates x where not exists (select 1 from auth.users u where u.id=x.user_id)) orphan_affiliates,
      (select count(*)::int from chat_rooms r where not exists (select 1 from auth.users u where u.id=r.created_by) and r.name in ('Welcome to S2G','Sow2Grow Verification')) - ${orphanRoomsBefore} new_orphan_rooms,
      (select count(*)::int from stalls where user_id='${a.userId}') stalls_a,
      (select count(*)::int from stalls where user_id='${b.userId}') stalls_b`);
    console.log(`[RESIDUE] ${JSON.stringify(r)} signups=${JSON.stringify(signups)}`);
    if (problems.length) console.log(`[TEARDOWN PROBLEMS] ${problems.join(' | ')}`);
    expect(problems).toEqual([]);
    expect(r).toEqual({ auth_users: 0, profiles: 0, orphan_affiliates: 0, new_orphan_rooms: 0, stalls_a: 0, stalls_b: 0 });
  });

  test('A. a member with NO stall: copy link, join page, signup attributed to them', async ({ page, context, browser }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signInThroughUi(page, B_E, B_P, 'TEST_B');
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('your plot is ready').filter({ visible: true }).first()).toBeVisible({ timeout: 45000 });
    await page.screenshot({ path: `${SHOTS}/A-empty-plot.png` });
    const link = await copyInviteLink(page, context);
    const { data: codeRow } = await b.client.rpc('ensure_my_referral_code' as never);
    console.log(`[LINK A] ${link}`);
    expect(link).toBe(`https://sow2growapp.com/stall/davisontest2?ref=${codeRow}`);

    // The other two placements exist for this member too.
    await page.goto('/my-tribe', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('invite-people').filter({ visible: true }).first(), 'My Tribe invite').toBeVisible({ timeout: 45000 });
    await page.screenshot({ path: `${SHOTS}/A-my-tribe.png` });

    const guest = await browser.newContext();
    const gp = await guest.newPage();
    await gp.goto(link, { waitUntil: 'domcontentloaded' });
    await expect(gp.getByTestId('invite-join')).toBeVisible({ timeout: 45000 });
    await expect(gp.getByRole('heading', { name: 'davisontest2 invited you to Sow2Grow' })).toBeVisible();
    await gp.screenshot({ path: `${SHOTS}/A-join-page.png` });
    await gp.getByRole('link', { name: 'Join Sow2Grow' }).click();
    await expect(gp).toHaveURL(/\/register\?ref=/);
    const email = `qa-invite-a-${STAMP}@example.com`;
    await signUpThroughForm(gp, email, 'Inviteea');
    await expect.poll(async () => (await attributionOf(email))?.referrer_id, { timeout: 30000 }).toBe(b.userId);
    const got = await attributionOf(email);
    console.log(`[ATTRIBUTION A] referrer=${got.referrer_id} referred_by=${got.referred_by} own_code=${got.own_code} global_posts=${got.global_posts}`);
    console.log(`[WELCOME A] ${got.welcome}`);
    expect(got.referred_by).toBe(b.userId);
    expect(got.welcome).toContain("Invite people with your own link — they'll join your tribe.");
    expect(got.welcome).toContain(`https://sow2growapp.com/stall/${got.username}?ref=${got.own_code}`);
    expect(got.welcome).toContain("davisontest2's tribe");
    expect(got.global_posts).toBe(0);
    await guest.close();
  });

  test('B. a member WITH a stall: copy link from the Cockpit nav, stall opens, signup attributed', async ({ page, context, browser }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signInThroughUi(page, A_E, A_P, 'TEST_A');
    await page.goto('/stall/davisontest1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('invite-people').filter({ visible: true }).first()).toBeVisible({ timeout: 45000 });
    await page.screenshot({ path: `${SHOTS}/B-cockpit-nav.png` });
    const link = await copyInviteLink(page, context);
    console.log(`[LINK B] ${link}`);
    expect(link).toBe('https://sow2growapp.com/stall/davisontest1?ref=996B4CCE');

    const guest = await browser.newContext();
    const gp = await guest.newPage();
    await gp.goto(link, { waitUntil: 'domcontentloaded' });
    await gp.waitForTimeout(8000);
    await expect(gp.getByTestId('invite-join'), 'a member with a stall gets their stall, not the join page').toHaveCount(0);
    await expect(gp.getByRole('img', { name: `QA invite ${STAMP} stall` }).first(), 'the guest sees the stall itself').toBeVisible({ timeout: 30000 });
    await gp.screenshot({ path: `${SHOTS}/B-stall-for-guest.png` });
    await gp.goto('/register', { waitUntil: 'domcontentloaded' }); // ?ref was captured on the stall visit
    const email = `qa-invite-b-${STAMP}@example.com`;
    await signUpThroughForm(gp, email, 'Inviteeb');
    await expect.poll(async () => (await attributionOf(email))?.referrer_id, { timeout: 30000 }).toBe(a.userId);
    const got = await attributionOf(email);
    console.log(`[ATTRIBUTION B] referrer=${got.referrer_id} referred_by=${got.referred_by} own_code=${got.own_code}`);
    console.log(`[WELCOME B] ${got.welcome}`);
    expect(got.welcome).toContain(`https://sow2growapp.com/stall/${got.username}?ref=${got.own_code}`);
    expect(got.welcome).toContain("davisontest1's tribe");
    await guest.close();
  });

  test('C. link previews read sensibly for both', async () => {
    const ua = 'WhatsApp/2.23.20.0';
    const noStall = await (await fetch('https://sow2growapp.com/stall/davisontest2?ref=X', { headers: { 'user-agent': ua } })).text();
    const withStall = await (await fetch('https://sow2growapp.com/stall/davisontest1?ref=996B4CCE', { headers: { 'user-agent': ua } })).text();
    const og = (html: string, prop: string) => (new RegExp(`<meta property="${prop}" content="([^"]*)"`).exec(html) || [])[1];
    console.log(`[OG no stall] title="${og(noStall, 'og:title')}" desc="${og(noStall, 'og:description')}" image=${og(noStall, 'og:image')}`);
    console.log(`[OG stall]    title="${og(withStall, 'og:title')}" desc="${og(withStall, 'og:description')}" image=${og(withStall, 'og:image')}`);
    expect(og(noStall, 'og:title')).toBe('davisontest2 invited you to Sow2Grow');
    expect(og(withStall, 'og:title')).toBe(`QA invite ${STAMP} stall`);
  });
});
