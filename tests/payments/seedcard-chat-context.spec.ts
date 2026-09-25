import { test, expect, type Page } from '@playwright/test';
import {
  asUser, createStallFixture, createShelfSeedFixture, setStallHotspots, deleteStallFixture,
  sweepProducts, sweepStorage, reportSweep,
} from '../live/support/fixtures';

// SeedCard Message action, against the REAL backend:
//   1. Sending a text in the DM opened from a SeedCard's Message button
//      renders exactly ONE bubble, with the sender's real name (never
//      "Unknown User") -- ChatRoom.tsx's optimistic append carries the
//      sender's own profile and its realtime INSERT handler dedupes by id.
//   2. The seed-context quote card (SeedCard.tsx's
//      attachSeedReferenceIfFirstMessage) goes on a room's FIRST message,
//      and is never re-injected into an existing conversation. davisontest2
//      already shares a DM with the owner (the "never re-injected" half);
//      davisontest3 has no chat history (the first-message half).
//   3. Back out of that DM lands on the SAME stall sheet
//      (/stall/<username>#stall-kind=<kind>). Since /chatapp became a redirect
//      to /conversations (fb95ae9d, 2026-09-19) the redirect forwards
//      SeedCard's returnTo state and ConversationsPage honours it.
//   4. No navigation loop: closing the sheet and the interior afterwards
//      never lands back on the chat, and one browser Back does not either.
//
// Fixtures, created and deleted by this run: a stall on davisontest1 (TEST_A,
// the one test account with a sower row) with one book on a "QA SHELF"
// hotspot. afterAll removes the stall, the book, its files, every message
// the senders wrote this run and the notifications they raised, any room
// this run CREATED (davisontest3's DM, so it stays history-free), and puts
// back each sender's XP and stall-visit row; the residue check proves it.
// Needs SUPABASE_ACCESS_TOKEN in .env.test for that SQL.

const REF = 'zuwkgasbkpjlxzsjzumu';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';
const STAMP = Date.now();
const QA_STALL = `QA chat ${STAMP} stall`;
const QA_BOOK = `QA chat ${STAMP} book`;
const SHELF = 'QA SHELF';

async function sql<T = any>(query: string): Promise<T[]> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const body = await res.json();
  if (!res.ok || !Array.isArray(body)) throw new Error(`sql failed: ${JSON.stringify(body).slice(0, 300)}`);
  return body as T[];
}

type Sender = {
  key: 'B' | 'C'; label: string; user?: Awaited<ReturnType<typeof asUser>>;
  pointsBefore: any[]; visitBefore: any[];
};
const SENDERS: Record<'B' | 'C', Sender> = {
  B: { key: 'B', label: 'TEST_B (davisontest2, has a DM with the owner)', pointsBefore: [], visitBefore: [] },
  C: { key: 'C', label: 'TEST_C (davisontest3, no chat history)', pointsBefore: [], visitBefore: [] },
};

let owner: Awaited<ReturnType<typeof asUser>>;
let stallId: string | null = null;
let objectPaths: string[] = [];
let since = '';
const roomsTouched = new Set<string>();

const list = (xs: string[]) => xs.map((x) => `'${x}'`).join(',') || `'00000000-0000-0000-0000-000000000000'`;

test.describe.serial('SeedCard Message action: quote on first message, one bubble, back to the stall', () => {
  test.beforeAll(async () => {
    if (!TOKEN) throw new Error('SUPABASE_ACCESS_TOKEN must be set in .env.test (teardown of chat rows and XP).');
    owner = await asUser(process.env.TEST_A_EMAIL || '', process.env.TEST_A_PASSWORD || '', 'TEST_A (davisontest1, stall owner)');
    SENDERS.B.user = await asUser(process.env.TEST_B_EMAIL || '', process.env.TEST_B_PASSWORD || '', SENDERS.B.label);
    SENDERS.C.user = await asUser(process.env.TEST_C_EMAIL || '', process.env.TEST_C_PASSWORD || '', SENDERS.C.label);
    [{ now: since }] = await sql(`select now()::text as now`);
    for (const s of Object.values(SENDERS)) {
      s.pointsBefore = await sql(`select total_points, level, points_to_next_level from user_points where user_id='${s.user!.userId}'`);
      s.visitBefore = await sql(`select last_seen_at::text from stall_visits where viewer_id='${s.user!.userId}' and stall_user_id='${owner.userId}'`);
    }
    // davisontest3 is only useful while it has no DM with the owner.
    const [c] = await sql(`select count(*)::int n from chat_participants a join chat_participants b on a.room_id = b.room_id
      join chat_rooms r on r.id = a.room_id and r.room_type = 'direct'
      where a.user_id='${SENDERS.C.user!.userId}' and b.user_id='${owner.userId}'`);
    if (c.n > 0) throw new Error('davisontest3 already has a DM with davisontest1 -- a previous run leaked it. Delete that room, then re-run.');

    const created = await createStallFixture(owner.client, owner.userId, QA_STALL);
    stallId = created.stallId; objectPaths = created.objectPaths;
    const bookId = await createShelfSeedFixture(owner.client, owner.userId, QA_BOOK);
    await setStallHotspots(owner.client, created.stallId, [
      { id: 'qa-shelf', kind: 'books', label: SHELF, x: 40, y: 40, w: 20, h: 30, seed_ids: [bookId] },
    ]);
  });

  test.afterAll(async () => {
    const problems: string[] = [];
    const senderIds = Object.values(SENDERS).filter((s) => s.user).map((s) => s.user!.userId);
    const touched = list([...roomsTouched]);
    let createdRooms: string[] = [];
    try {
      createdRooms = (await sql(`select id from chat_rooms where id in (${touched}) and created_at >= '${since}'`)).map((r: any) => r.id);
      await sql(`begin;
        delete from user_notifications where user_id='${owner.userId}' and created_at >= '${since}'
          and action_url in (select '/conversations?c=' || x from unnest(array[${touched}]::text[]) x);
        delete from chat_messages where room_id in (${touched}) and sender_id in (${list(senderIds)}) and created_at >= '${since}';
        delete from chat_messages where room_id in (${list(createdRooms)});
        delete from chat_participants where room_id in (${list(createdRooms)});
        delete from chat_rooms where id in (${list(createdRooms)});
        commit;`);
    } catch (e) { problems.push(`chat: ${String(e)}`); }
    for (const s of Object.values(SENDERS)) {
      if (!s.user) continue;
      try {
        if (s.pointsBefore.length) {
          const p = s.pointsBefore[0];
          await sql(`update user_points set total_points=${p.total_points}, level=${p.level}, points_to_next_level=${p.points_to_next_level} where user_id='${s.user.userId}'`);
        } else {
          await sql(`delete from user_points where user_id='${s.user.userId}'`);
        }
        if (s.visitBefore.length) {
          await sql(`update stall_visits set last_seen_at='${s.visitBefore[0].last_seen_at}' where viewer_id='${s.user.userId}' and stall_user_id='${owner.userId}'`);
        } else {
          await sql(`delete from stall_visits where viewer_id='${s.user.userId}' and stall_user_id='${owner.userId}'`);
        }
      } catch (e) { problems.push(`xp/visit ${s.key}: ${String(e)}`); }
    }
    try {
      if (stallId) await deleteStallFixture(owner.client, stallId);
      if (objectPaths.length) await sweepStorage(owner.client, 'stalls', objectPaths);
      reportSweep('seedcard-chat-context', await sweepProducts(owner.client, owner.userId, [QA_BOOK]));
    } catch (e) { problems.push(`fixture: ${String(e)}`); }

    const [left] = await sql(`select
      (select count(*) from stalls where user_id='${owner.userId}' and name='${QA_STALL}')::int stalls,
      (select count(*) from products where title='${QA_BOOK}')::int products,
      (select count(*) from chat_messages where room_id in (${touched}) and sender_id in (${list(senderIds)}) and created_at >= '${since}')::int messages,
      (select count(*) from chat_rooms where id in (${list(createdRooms)}))::int created_rooms,
      (select count(*) from user_notifications where user_id='${owner.userId}' and created_at >= '${since}' and type='chat_message')::int notifications`);
    console.log(`[RESIDUE] ${JSON.stringify(left)}; rooms created this run: ${createdRooms.length}`);
    for (const s of Object.values(SENDERS)) {
      if (!s.user) continue;
      const [now] = await sql(`select (select total_points from user_points where user_id='${s.user.userId}')::int points,
        (select last_seen_at::text from stall_visits where viewer_id='${s.user.userId}' and stall_user_id='${owner.userId}') visit`);
      console.log(`[RESIDUE] sender ${s.key}: points ${now.points} (before ${s.pointsBefore[0]?.total_points ?? 'none'}), visit ${now.visit} (before ${s.visitBefore[0]?.last_seen_at ?? 'none'})`);
      expect(now.points ?? null).toBe(s.pointsBefore.length ? Number(s.pointsBefore[0].total_points) : null);
      expect(now.visit ?? null).toBe(s.visitBefore[0]?.last_seen_at ?? null);
    }
    expect(problems).toEqual([]);
    expect([left.stalls, left.products, left.messages, left.created_rooms, left.notifications]).toEqual([0, 0, 0, 0, 0]);
  });

  /** Signs in as the sender, reaches the stall (from the feed when it shows there), opens the shelf and taps Message. */
  async function messageFromSeedCard(page: Page, s: Sender): Promise<{ roomId: string; earlier: number; cameFromFeed: boolean }> {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(({ key, session }) => {
      window.localStorage.setItem(key, JSON.stringify(session));
      window.sessionStorage.setItem('audioUnlocked', '1');
    }, { key: `sb-${REF}-auth-token`, session: (await s.user!.client.auth.getSession()).data.session });
    const [{ username: ownerUsername }] = await sql(`select username from profiles where user_id='${owner.userId}'`);

    // Start from the feed so StallVisitPage carries a real { from }; fall back
    // to a direct link if the new fixture isn't on the feed's first screen.
    await page.goto('/stalls-feed', { waitUntil: 'load' });
    const feedCard = page.getByText(QA_STALL, { exact: false }).first();
    let cameFromFeed = false;
    // waitFor, not isVisible({ timeout }): isVisible does not wait.
    if (await feedCard.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true).catch(() => false)) {
      await feedCard.click();
      cameFromFeed = await page.waitForURL(/\/stall\//, { timeout: 15_000 }).then(() => true).catch(() => false);
    }
    if (!cameFromFeed) await page.goto(`/stall/${ownerUsername}`, { waitUntil: 'load' });
    console.log(`[ROUTE ${s.key}] reached the stall ${cameFromFeed ? 'from the feed' : 'by direct link'}`);

    const shelf = page.locator(`button[aria-label="${SHELF}"]`).filter({ visible: true }).first();
    await expect(shelf).toBeVisible({ timeout: 45_000 });
    await shelf.click();
    await expect(page.getByText(QA_BOOK).filter({ visible: true }).first()).toBeVisible({ timeout: 30_000 });

    // exact: the stall header's "Message the sower" sits under the sheet's backdrop.
    const messageButton = page.getByRole('button', { name: 'Message', exact: true }).filter({ visible: true }).first();
    await expect(messageButton).toBeVisible({ timeout: 15_000 });
    await messageButton.click();

    await page.waitForURL(/\/conversations\?c=/, { timeout: 20_000 });
    const roomId = new URL(page.url()).searchParams.get('c')!;
    roomsTouched.add(roomId);
    const [room] = await sql(`select (select count(*) from chat_messages where room_id='${roomId}' and created_at < '${since}')::int earlier`);
    console.log(`[ROOM ${s.key}] ${roomId}: ${room.earlier} messages before this run`);
    return { roomId, earlier: room.earlier, cameFromFeed };
  }

  async function sendOneBubble(page: Page, s: Sender) {
    const [p] = await sql(`select display_name from profiles_public where user_id='${s.user!.userId}'`);
    const probe = `verify-${s.key}-${STAMP}`;
    await page.getByPlaceholder(/message/i).first().fill(probe);
    await page.keyboard.press('Enter');
    await expect(page.getByText(probe, { exact: true })).toHaveCount(1, { timeout: 15_000 });
    await expect(page.getByText('Unknown User')).toHaveCount(0);
    if (p?.display_name) await expect(page.getByText(p.display_name).first()).toBeVisible();
  }

  const quotesSince = async (roomId: string) =>
    (await sql(`select count(*)::int n from chat_messages where room_id='${roomId}' and message_type='seed_reference' and created_at >= '${since}'`))[0].n;

  test('a first message from a SeedCard opens with the seed quote (davisontest3, no history)', async ({ page }) => {
    test.setTimeout(4 * 60_000);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    const { roomId, earlier } = await messageFromSeedCard(page, SENDERS.C);
    expect(earlier, 'davisontest3 starts with an empty room').toBe(0);

    await expect(page.getByText('About this seed').first(), 'the quote card shows in the new conversation').toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(QA_BOOK).filter({ visible: true }).first(), 'the quote names the seed').toBeVisible();
    expect(await quotesSince(roomId), 'exactly one seed quote, on the first message').toBe(1);

    await sendOneBubble(page, SENDERS.C);
    expect(await quotesSince(roomId), 'sending a text does not add another quote').toBe(1);
    expect(pageErrors, `no uncaught page errors: ${pageErrors.join('; ')}`).toHaveLength(0);
  });

  test('B messages A from a SeedCard on A\'s stall: one bubble, real name, no re-injected quote, back to the stall', async ({ page }) => {
    test.setTimeout(4 * 60_000);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    const { roomId, earlier, cameFromFeed } = await messageFromSeedCard(page, SENDERS.B);
    expect(earlier, 'davisontest2 already has a conversation with the owner').toBeGreaterThan(0);

    await sendOneBubble(page, SENDERS.B);
    expect(await quotesSince(roomId), 'an existing conversation must not get a seed quote injected').toBe(0);

    // Back -> the same stall sheet, not the conversation list.
    const backButton = page.getByRole('button', { name: /Back to .+'s stall/ }).first();
    await expect(backButton, 'the DM offers a way back to the stall it came from').toBeVisible({ timeout: 10_000 });
    await backButton.click();
    await page.waitForURL(/\/stall\//, { timeout: 15_000 });
    expect(page.url()).toContain('#stall-kind=');

    // The same sheet reopened, holding the same book.
    await expect(page.getByText(QA_BOOK).filter({ visible: true }).first(), 'back lands on the same shelf').toBeVisible({ timeout: 20_000 });

    // Close the sheet, then the interior: never back on the chat.
    await page.locator('button[aria-label="Close shelf"]:visible').first().click({ timeout: 10_000 });
    const leave = page.locator('button[aria-label="Leave stall"]:visible').first();
    await expect(leave).toBeVisible({ timeout: 10_000 });
    await leave.click();
    await page.waitForURL((u) => !u.pathname.startsWith('/stall/'), { timeout: 15_000 });
    if (cameFromFeed) expect(new URL(page.url()).pathname, 'closing the stall returns to the feed').toBe('/stalls-feed');
    expect(page.url()).not.toContain('/conversations');

    await page.goBack({ waitUntil: 'load', timeout: 15_000 }).catch(() => null);
    expect(page.url(), 'browser Back from here must not reopen the chat').not.toContain('/conversations');

    expect(pageErrors, `no uncaught page errors: ${pageErrors.join('; ')}`).toHaveLength(0);
  });
});
