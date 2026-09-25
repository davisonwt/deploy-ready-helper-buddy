import { test, expect } from '@playwright/test';
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
//      attachSeedReferenceIfFirstMessage) goes on a room's FIRST message
//      only, never re-injected into an existing conversation. The two test
//      accounts already share a DM, so this run proves the "never
//      re-injected" half; the first-message half needs a sender with no DM
//      with the owner, which no .env.test identity is today.
//   3. Back out of that DM lands on the SAME stall sheet
//      (/stall/<username>#stall-kind=<kind>). Since /chatapp became a redirect
//      to /conversations (fb95ae9d, 2026-09-19) the redirect forwards
//      SeedCard's returnTo state and ConversationsPage honours it.
//   4. No navigation loop: closing the sheet and the interior afterwards
//      never lands back on the chat, and one browser Back does not either.
//
// Fixtures, created and deleted by this run: a stall on davisontest1 (TEST_A,
// the one test account with a sower row) with one book on a "QA SHELF"
// hotspot. davisontest2 (TEST_B) sends. afterAll removes the stall, the book,
// its files, this run's chat messages and the notifications they raised, and
// restores davisontest2's XP and stall-visit row; the residue check proves it.
// Needs SUPABASE_ACCESS_TOKEN in .env.test for that SQL.

const REF = 'zuwkgasbkpjlxzsjzumu';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';
const OWNER_E = process.env.TEST_A_EMAIL || '';
const OWNER_P = process.env.TEST_A_PASSWORD || '';
const SENDER_E = process.env.TEST_B_EMAIL || '';
const SENDER_P = process.env.TEST_B_PASSWORD || '';
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

let owner: Awaited<ReturnType<typeof asUser>>;
let sender: Awaited<ReturnType<typeof asUser>>;
let stallId: string | null = null;
let objectPaths: string[] = [];
let since = '';
let pointsBefore: any[] = [];
let visitBefore: any[] = [];
const roomsTouched = new Set<string>();

test.describe('SeedCard Message action: one bubble, back to the stall, no loop', () => {
  test.beforeAll(async () => {
    if (!TOKEN) throw new Error('SUPABASE_ACCESS_TOKEN must be set in .env.test (teardown of chat rows and XP).');
    owner = await asUser(OWNER_E, OWNER_P, 'TEST_A (davisontest1, stall owner)');
    sender = await asUser(SENDER_E, SENDER_P, 'TEST_B (davisontest2, sender)');
    [{ now: since }] = await sql(`select now()::text as now`);
    pointsBefore = await sql(`select total_points, level, points_to_next_level from user_points where user_id='${sender.userId}'`);
    visitBefore = await sql(`select last_seen_at::text from stall_visits where viewer_id='${sender.userId}' and stall_user_id='${owner.userId}'`);

    const created = await createStallFixture(owner.client, owner.userId, QA_STALL);
    stallId = created.stallId; objectPaths = created.objectPaths;
    const bookId = await createShelfSeedFixture(owner.client, owner.userId, QA_BOOK);
    await setStallHotspots(owner.client, created.stallId, [
      { id: 'qa-shelf', kind: 'books', label: SHELF, x: 40, y: 40, w: 20, h: 30, seed_ids: [bookId] },
    ]);
  });

  test.afterAll(async () => {
    const problems: string[] = [];
    const rooms = [...roomsTouched].map((r) => `'${r}'`).join(',') || `'00000000-0000-0000-0000-000000000000'`;
    try {
      await sql(`begin;
        delete from user_notifications where user_id='${owner.userId}' and created_at >= '${since}'
          and action_url in (select '/conversations?c=' || x from unnest(array[${rooms}]::text[]) x);
        delete from chat_messages where room_id in (${rooms}) and sender_id='${sender.userId}' and created_at >= '${since}';
        commit;`);
    } catch (e) { problems.push(`chat: ${String(e)}`); }
    try {
      if (pointsBefore.length) {
        const p = pointsBefore[0];
        await sql(`update user_points set total_points=${p.total_points}, level=${p.level}, points_to_next_level=${p.points_to_next_level} where user_id='${sender.userId}'`);
      }
      if (visitBefore.length) {
        await sql(`update stall_visits set last_seen_at='${visitBefore[0].last_seen_at}' where viewer_id='${sender.userId}' and stall_user_id='${owner.userId}'`);
      } else {
        await sql(`delete from stall_visits where viewer_id='${sender.userId}' and stall_user_id='${owner.userId}'`);
      }
    } catch (e) { problems.push(`xp/visit: ${String(e)}`); }
    try {
      if (stallId) await deleteStallFixture(owner.client, stallId);
      if (objectPaths.length) await sweepStorage(owner.client, 'stalls', objectPaths);
      reportSweep('seedcard-chat-context', await sweepProducts(owner.client, owner.userId, [QA_BOOK]));
    } catch (e) { problems.push(`fixture: ${String(e)}`); }

    const [left] = await sql(`select
      (select count(*) from stalls where user_id='${owner.userId}' and name='${QA_STALL}')::int stalls,
      (select count(*) from products where title='${QA_BOOK}')::int products,
      (select count(*) from chat_messages where room_id in (${rooms}) and sender_id='${sender.userId}' and created_at >= '${since}')::int messages,
      (select count(*) from user_notifications where user_id='${owner.userId}' and created_at >= '${since}' and type='chat_message')::int notifications,
      (select total_points from user_points where user_id='${sender.userId}')::int points,
      (select last_seen_at::text from stall_visits where viewer_id='${sender.userId}' and stall_user_id='${owner.userId}') visit`);
    console.log(`[RESIDUE] ${JSON.stringify(left)} (points before ${pointsBefore[0]?.total_points ?? 'none'}, visit before ${visitBefore[0]?.last_seen_at ?? 'none'})`);
    expect(problems).toEqual([]);
    expect([left.stalls, left.products, left.messages, left.notifications]).toEqual([0, 0, 0, 0]);
    if (pointsBefore.length) expect(left.points).toBe(Number(pointsBefore[0].total_points));
    expect(left.visit ?? null).toBe(visitBefore[0]?.last_seen_at ?? null);
  });

  test('B messages A from a SeedCard on A\'s stall: one bubble, real name, no re-injected quote, back to the stall', async ({ page }) => {
    test.setTimeout(4 * 60_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(({ key, session }) => {
      window.localStorage.setItem(key, JSON.stringify(session));
      window.sessionStorage.setItem('audioUnlocked', '1');
    }, { key: `sb-${REF}-auth-token`, session: (await sender.client.auth.getSession()).data.session });

    const [{ username: ownerUsername }] = await sql(`select username from profiles where user_id='${owner.userId}'`);
    const [senderProfile] = await sql(`select display_name from profiles_public where user_id='${sender.userId}'`);
    const senderName = senderProfile?.display_name as string | undefined;

    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    // Start from the feed so StallVisitPage carries a real { from }; fall back
    // to a direct link if the new fixture isn't on the feed's first screen.
    await page.goto('/stalls-feed', { waitUntil: 'load' });
    const feedCard = page.getByText(QA_STALL, { exact: false }).first();
    let cameFromFeed = false;
    if (await feedCard.isVisible({ timeout: 15_000 }).catch(() => false)) {
      await feedCard.click();
      cameFromFeed = await page.waitForURL(/\/stall\//, { timeout: 15_000 }).then(() => true).catch(() => false);
    }
    if (!cameFromFeed) await page.goto(`/stall/${ownerUsername}`, { waitUntil: 'load' });
    console.log(`[ROUTE] reached the stall ${cameFromFeed ? 'from the feed' : 'by direct link'}`);

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
    console.log(`[ROOM] ${roomId}: ${room.earlier} messages before this run`);

    // Send a real text: exactly one bubble, the sender's real name.
    const probe = `verify-${STAMP}`;
    await page.getByPlaceholder(/message/i).first().fill(probe);
    await page.keyboard.press('Enter');
    await expect(page.getByText(probe, { exact: true })).toHaveCount(1, { timeout: 15_000 });
    await expect(page.getByText('Unknown User')).toHaveCount(0);
    if (senderName) await expect(page.getByText(senderName).first()).toBeVisible();

    // The quote card belongs on a room's first message only.
    const [quotes] = await sql(`select count(*)::int n from chat_messages where room_id='${roomId}' and message_type='seed_reference' and created_at >= '${since}'`);
    if (room.earlier > 0) expect(quotes.n, 'an existing conversation must not get a seed quote injected').toBe(0);
    else expect(quotes.n, 'a brand-new conversation opens with the seed quote').toBe(1);

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
