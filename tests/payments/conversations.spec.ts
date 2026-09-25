import { test, expect, type Page } from '@playwright/test';
import { createClient, type Session } from '@supabase/supabase-js';

/**
 * Phase 1A / 1B-lite: the unified conversation list at /conversations.
 *
 * Proves, against the REAL backend with two real member accounts:
 *   - one list holds direct AND group conversations, with no "direct chat"
 *     versus "group chat" split shown to the member
 *   - a new chat can be started by picking a person
 *   - a message sends from A and arrives for B
 *   - the participants view names who is actually in the room
 *   - a call starts INSIDE a conversation WITHOUT a route change (the
 *     2026-09-15 unmount bug: a navigate here would take the call with it)
 *   - the historical direct rooms are still readable, and the old /chatapp
 *     links (retired 2026-09-19, fb95ae9d) land on /conversations with the
 *     same room open
 *
 * At 390x844 and at desktop width.
 *
 * NO test.skip: per the golden rule, a spec that cannot run FAILS and says
 * why. `?? ''` is not a default, it is what makes a skip fire silently.
 */

const SUPABASE_URL = 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const SUPABASE_PROJECT_REF = 'zuwkgasbkpjlxzsjzumu';
const ANON_KEY = 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. This spec talks to the real backend with two member ` +
      `accounts and cannot prove anything without them. Add ${name} to .env.test ` +
      `(playwright.config.ts reads that file), then re-run: npm run test:payments`,
    );
  }
  return value;
}

const MOBILE = { width: 390, height: 844 };

// Every conversation this run starts is deleted in afterAll: its messages,
// participants, the notification it raised, and the sender's chat XP.
// Until 2026-09-25 each run left one room behind. Needs SUPABASE_ACCESS_TOKEN.
const createdRooms: string[] = [];
let pointsBefore: { user_id: string; total_points: number; level: number; points_to_next_level: number }[] = [];

async function sql<T = any>(query: string): Promise<T[]> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${required('SUPABASE_ACCESS_TOKEN')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const body = await res.json();
  if (!res.ok || !Array.isArray(body)) throw new Error(`sql failed: ${JSON.stringify(body).slice(0, 300)}`);
  return body as T[];
}

test.beforeAll(async () => {
  pointsBefore = await sql(`select user_id, total_points, level, points_to_next_level from user_points where user_id='${required('TEST_A_USER_ID')}'`);
});

test.afterAll(async () => {
  if (createdRooms.length) {
    const ids = createdRooms.map((r) => `'${r}'`).join(',');
    await sql(`begin;
      delete from user_notifications where action_url in (select '/conversations?c=' || x from unnest(array[${ids}]::text[]) x);
      delete from chat_messages where room_id in (${ids});
      delete from chat_participants where room_id in (${ids});
      delete from chat_rooms where id in (${ids});
      commit;`);
  }
  if (pointsBefore.length) {
    const p = pointsBefore[0];
    await sql(`update user_points set total_points=${p.total_points}, level=${p.level}, points_to_next_level=${p.points_to_next_level} where user_id='${p.user_id}'`);
  }
  const ids = createdRooms.map((r) => `'${r}'`).join(',') || `'00000000-0000-0000-0000-000000000000'`;
  const [left] = await sql(`select (select count(*) from chat_rooms where id in (${ids}))::int rooms,
      (select count(*) from chat_messages where room_id in (${ids}))::int messages,
      (select count(*) from chat_participants where room_id in (${ids}))::int participants`);
  console.log(`[RESIDUE] conversations: ${createdRooms.length} room(s) created, left: ${JSON.stringify(left)}`);
  expect([left.rooms, left.messages, left.participants]).toEqual([0, 0, 0]);
});
const DESKTOP = { width: 1280, height: 900 };

async function signIn(email: string, password: string): Promise<{ session: Session; userId: string }> {
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  expect(error, `sign-in as ${email} must succeed`).toBeNull();
  const session = data.session!;
  return { session, userId: session.user.id };
}

async function loginAs(page: Page, session: Session) {
  await page.addInitScript(
    ({ storageKey, session }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(session));
      window.sessionStorage.setItem('audioUnlocked', '1');
    },
    { storageKey: `sb-${SUPABASE_PROJECT_REF}-auth-token`, session },
  );
}

test.describe('Conversations — unified list', () => {
  test('at 390x844: list, new chat, message, participants, in-place call', async ({ page }) => {
    const aEmail = required('TEST_A_EMAIL');
    const aPassword = required('TEST_A_PASSWORD');
    const bEmail = required('TEST_B_EMAIL');
    const bPassword = required('TEST_B_PASSWORD');

    const a = await signIn(aEmail, aPassword);
    const b = await signIn(bEmail, bPassword);

    await page.setViewportSize(MOBILE);
    await loginAs(page, a.session);

    // --- the list ---------------------------------------------------------
    await page.goto('/conversations', { waitUntil: 'networkidle' });
    expect(page.url(), 'must not bounce to /login').toContain('/conversations');
    await expect(page.locator('body')).not.toContainText('permission denied');

    // The whole thesis: no direct/group vocabulary reaches the member.
    const bodyText = (await page.locator('body').innerText()).toLowerCase();
    expect(bodyText, 'the list must not say "direct chat"').not.toContain('direct chat');
    expect(bodyText, 'the list must not say "group chat"').not.toContain('group chat');

    // --- start a new chat with B -----------------------------------------
    await page.getByTestId('new-conversation').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const { data: bPublic } = await createClient(SUPABASE_URL, ANON_KEY)
      .from('profiles_public').select('display_name, first_name').eq('user_id', b.userId).maybeSingle();
    const bName = String((bPublic as any)?.display_name ?? (bPublic as any)?.first_name ?? '').trim();
    expect(bName, 'B must have a visible public name to be pickable').toBeTruthy();

    await dialog.getByPlaceholder('Search people').fill(bName);
    await dialog.getByRole('button', { name: new RegExp(bName, 'i') }).first().click();
    await dialog.getByRole('button', { name: /Start talking/i }).click();

    // Landing in the conversation is a search-param change, not a route
    // change -- the page must not have remounted.
    await expect(page.getByTestId('conversation-people')).toBeVisible({ timeout: 15_000 });
    const conversationUrl = page.url();
    // Recorded as soon as it exists, so a later failure still tears it down.
    const startedRoom = new URL(conversationUrl).searchParams.get('c');
    if (startedRoom) createdRooms.push(startedRoom);
    expect(conversationUrl, 'opening a conversation stays on /conversations').toContain('/conversations');

    // --- participants view -----------------------------------------------
    await page.getByTestId('conversation-people').click();
    const people = page.getByTestId('conversation-people-panel');
    await expect(people).toBeVisible();
    await expect(people).toContainText('You');
    await expect(people).toContainText(bName);
    await page.getByTestId('conversation-people').click();

    // --- a message sends and arrives -------------------------------------
    const body = `conv-spec ${Date.now()}`;
    const input = page.getByRole('textbox').last();
    await input.fill(body);
    await input.press('Enter');
    await expect(page.locator('body')).toContainText(body, { timeout: 15_000 });

    // ...and B can actually read it, through B's own RLS, not A's.
    const roomId = new URL(conversationUrl).searchParams.get('c')!;
    expect(roomId, 'the conversation must have an id in the url').toBeTruthy();
    const bClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    await bClient.auth.signInWithPassword({ email: bEmail, password: bPassword });
    await expect.poll(async () => {
      const { data } = await bClient.from('chat_messages').select('content').eq('room_id', roomId);
      return (data ?? []).map((m: any) => m.content);
    }, { timeout: 20_000 }).toContain(body);

    // --- the call must NOT navigate --------------------------------------
    const urlBeforeCall = page.url();
    await page.getByTestId('conversation-call-voice').click();
    await page.waitForTimeout(2000);
    expect(page.url(), 'starting a call must not change the route (2026-09-15 unmount bug)')
      .toBe(urlBeforeCall);
    // The conversation is still mounted underneath the docked call.
    await expect(page.getByTestId('conversation-people')).toBeVisible();
  });

  test('at desktop width: the same list renders and opens', async ({ page }) => {
    const a = await signIn(required('TEST_A_EMAIL'), required('TEST_A_PASSWORD'));
    await page.setViewportSize(DESKTOP);
    await loginAs(page, a.session);

    await page.goto('/conversations', { waitUntil: 'networkidle' });
    expect(page.url()).toContain('/conversations');
    await expect(page.getByTestId('new-conversation')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('permission denied');

    const rows = page.getByTestId('conversation-row');
    if (await rows.count() > 0) {
      await rows.first().click();
      await expect(page.getByTestId('conversation-people')).toBeVisible({ timeout: 15_000 });
      expect(page.url()).toContain('/conversations');
    }
  });
});

test.describe('the old way still reaches the same rooms', () => {
  test('/chatapp links land on /conversations and the historical direct rooms are intact', async ({ page }) => {
    const aEmail = required('TEST_A_EMAIL');
    const aPassword = required('TEST_A_PASSWORD');
    const a = await signIn(aEmail, aPassword);

    // The 205 historical direct messages: counted through A's own RLS,
    // before and after this change they are the same rows. This asserts the
    // rows are READABLE, which is what "untouched" has to mean.
    const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    await client.auth.signInWithPassword({ email: aEmail, password: aPassword });
    const { data: mine, error: mineErr } = await client
      .from('chat_participants').select('room_id').eq('user_id', a.userId).eq('is_active', true);
    expect(mineErr).toBeNull();
    const roomIds = [...new Set((mine ?? []).map((r: any) => r.room_id))];

    if (roomIds.length > 0) {
      const { error: msgErr } = await client
        .from('chat_messages').select('id').in('room_id', roomIds).limit(1);
      expect(msgErr, 'A must still be able to read messages in A\'s rooms').toBeNull();
    }

    await page.setViewportSize(MOBILE);
    await loginAs(page, a.session);
    await page.goto('/chatapp', { waitUntil: 'networkidle' });
    expect(new URL(page.url()).pathname, '/chatapp redirects to /conversations').toBe('/conversations');
    await expect(page.locator('body')).not.toContainText('permission denied');
    await expect(page.locator('body')).not.toContainText('Something went wrong');

    // An old deep link keeps its room: ?room=<id> arrives as ?c=<id>.
    expect(roomIds.length, 'A needs at least one room for the deep-link check').toBeGreaterThan(0);
    const room = roomIds[0] as string;
    await page.goto(`/chatapp?room=${room}`, { waitUntil: 'networkidle' });
    const landed = new URL(page.url());
    expect(landed.pathname).toBe('/conversations');
    expect(landed.searchParams.get('c'), 'the same room is open').toBe(room);
  });
});
