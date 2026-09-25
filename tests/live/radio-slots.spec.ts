import { test, expect, type Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  asUser, signInThroughUi, createStallFixture, deleteStallFixture,
} from './support/fixtures';
import { resolveSlotOverride } from '../../supabase/functions/_shared/radioSlots';

/**
 * Grove Station radio slots, member path end to end, against production:
 *   1. the "Book a radio slot" entry is findable from the Cockpit nav, the
 *      stall Owner Menu, and the top of /grove-station (desktop + 390px);
 *   2. davisontest1 books a slot, builds a rundown (upload, reorder,
 *      remove -- each checked in the database, not on screen), and submits;
 *   3. a direct REST write to status='scheduled' is refused, and a
 *      scheduled slot's time can't be moved;
 *   4. a whole-show file uploads by TUS into a second slot; an over-2h file
 *      is refused and its object removed;
 *   5. playout: resolveSlotOverride at an injected time inside the QA
 *      slot's window returns the QA slot's segment -- the slot itself never
 *      reaches real airtime (its window is >= 12 days out and it is
 *      cancelled in this run);
 *   6. a gosat cancels it from /admin/radio with a reason and the DJ gets
 *      the chat notice.
 *
 * Fixtures: a throwaway stall for davisontest1 (the Owner Menu only exists
 * on an owner's own stall), QA slots, their bucket objects, the chat
 * notices, and the Grove Station <-> davisontest1 direct room if this run
 * created it. All removed in afterAll, which runs even when a serial test
 * fails; the residue check at the end asserts zero of each.
 *
 * The gosat account is TEST_GOSAT (the founder). It only ever writes to
 * rows this run created: the QA slot it cancels, and the QA notices and
 * room it deletes in teardown.
 *
 *   npx playwright test --config=playwright.live.config.ts radio-slots
 */

const DJ_E = process.env.TEST_A_EMAIL || '';
const DJ_P = process.env.TEST_A_PASSWORD || '';
const STAFF_E = process.env.TEST_GOSAT_EMAIL || '';
const STAFF_P = process.env.TEST_GOSAT_PASSWORD || '';

const GROVE_STATION_USER_ID = 'e9758e23-fba4-4778-8e58-4fd8e5550a72';
const BUCKET = 'dj-rundown-segments';
const SLOT_MS = 2 * 3600 * 1000;
const MIN_LEAD_MS = 12 * 24 * 3600 * 1000;
const RUN = `QA radio-slots ${Date.now()}`;
const SHOTS = process.env.RADIO_SLOTS_SHOTS_DIR || 'test-results/radio-slots';

let dj: { client: SupabaseClient; userId: string };
let staff: { client: SupabaseClient; userId: string };
let stallId: string | null = null;
let stallObjects: string[] = [];
let roomExistedBefore = true;
const qaSlotIds: string[] = [];
let rundownSlotId = '';
let showSlotId = '';
let rundownStartsAt = '';

// ---------------------------------------------------------------- helpers

/** A PCM WAV of `seconds` of silence (8 kHz mono 16-bit -- small). */
function wavBytes(seconds: number): Buffer {
  const rate = 8000, byteRate = rate * 2, dataSize = byteRate * seconds;
  const b = Buffer.alloc(44 + dataSize);
  b.write('RIFF', 0); b.writeUInt32LE(36 + dataSize, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(byteRate, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(dataSize, 40);
  return b;
}

/**
 * An MP3 of `seconds`, MPEG-2 Layer III 8 kbps 22.05 kHz: 26-byte frames of
 * 576 samples, so a 2-hour file is ~7 MB -- big enough to span two 6 MB TUS
 * chunks, small enough for every run. Measured by the server's frame walk
 * exactly like a real file.
 */
function mp3Bytes(seconds: number): Buffer {
  const frameSeconds = 576 / 22050;
  const frames = Math.ceil(seconds / frameSeconds);
  const b = Buffer.alloc(frames * 26);
  for (let f = 0; f < frames; f++) {
    b[f * 26] = 0xff; b[f * 26 + 1] = 0xf3; b[f * 26 + 2] = 0x10; b[f * 26 + 3] = 0xc4;
  }
  return b;
}

/** Two free 2h boundaries >= 12 days out (checked against live bookings). */
async function pickFreeBoundaries(client: SupabaseClient, n: number): Promise<Date[]> {
  const base = Math.ceil((Date.now() + MIN_LEAD_MS) / SLOT_MS) * SLOT_MS;
  const candidates = Array.from({ length: 24 }, (_, i) => new Date(base + i * SLOT_MS));
  const { data, error } = await client.from('radio_slots').select('starts_at')
    .neq('status', 'cancelled')
    .gte('starts_at', candidates[0].toISOString())
    .lte('starts_at', candidates[candidates.length - 1].toISOString());
  if (error) throw new Error(`could not read bookings: ${error.message}`);
  const taken = new Set((data ?? []).map((r: { starts_at: string }) => new Date(r.starts_at).getTime()));
  const free = candidates.filter((d) => !taken.has(d.getTime())).slice(0, n);
  if (free.length < n) throw new Error('no free boundaries 12+ days out -- the schedule is full; nothing to test against');
  return free;
}

function utcLabel(d: Date): string {
  return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
}

/** Direct rooms between Grove Station and the DJ, as the DJ sees them. */
async function groveStationRoomIds(): Promise<string[]> {
  const { data: mine, error } = await dj.client.from('chat_participants').select('room_id').eq('user_id', dj.userId);
  if (error) throw new Error(`could not read the DJ's rooms: ${error.message}`);
  const ids = (mine ?? []).map((r: { room_id: string }) => r.room_id);
  if (ids.length === 0) return [];
  const { data: shared, error: e2 } = await dj.client.from('chat_participants').select('room_id, chat_rooms!inner(room_type)')
    .eq('user_id', GROVE_STATION_USER_ID).eq('chat_rooms.room_type', 'direct').in('room_id', ids);
  if (e2) throw new Error(`could not read shared rooms: ${e2.message}`);
  return [...new Set((shared ?? []).map((r: { room_id: string }) => r.room_id))];
}

async function segmentsInDb(slotId: string): Promise<Array<{ id: string; position: number; kind: string }>> {
  const { data, error } = await dj.client.from('radio_rundown_segments')
    .select('id, position, kind').eq('slot_id', slotId).order('position', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{ id: string; position: number; kind: string }>;
}

async function waitForToast(page: Page, text: RegExp, timeout = 60000) {
  await expect(page.getByText(text).first()).toBeVisible({ timeout });
}

/** Opens /grove-station?tab=schedule and books `when` through the calendar. */
async function bookThroughUi(page: Page, when: Date, title: string): Promise<string> {
  await page.goto('/grove-station?tab=schedule', { waitUntil: 'domcontentloaded' });
  const card = page.locator('div.rounded-lg, [class*="card"]').filter({ hasText: utcLabel(when) }).last();
  await expect(card, `no calendar card for ${utcLabel(when)}`).toBeVisible({ timeout: 45000 });
  await card.getByRole('button', { name: 'Book this slot' }).click();
  await card.getByPlaceholder('Show title (optional)').fill(title);
  await expect(card.getByRole('button', { name: /^Live$/ }), 'live mode must not be offered').toHaveCount(0);
  await card.getByRole('button', { name: 'Confirm booking' }).click();
  await waitForToast(page, /Slot booked/);
  const { data, error } = await dj.client.from('radio_slots').select('id, status, mode, title')
    .eq('dj_user_id', dj.userId).eq('starts_at', when.toISOString()).neq('status', 'cancelled').single();
  if (error || !data) throw new Error(`booked slot not in the database: ${error?.message}`);
  expect(data.title).toBe(title);
  expect(data.status).toBe('draft');
  expect(data.mode).toBe('prerecorded');
  qaSlotIds.push(data.id);
  return data.id as string;
}

async function uploadSegment(page: Page, kindLabel: string, name: string, bytes: Buffer, mime: string) {
  await page.getByRole('button', { name: new RegExp(`^${kindLabel}$`) }).click();
  const input = page.locator('input[type="file"][accept=".wav,.mp3"]');
  await input.setInputFiles({ name, mimeType: mime, buffer: bytes });
}

// ---------------------------------------------------------------- setup / teardown

test.describe.serial('Grove Station radio slots (member path)', () => {
  test.setTimeout(300_000);

  test.beforeAll(async () => {
    dj = await asUser(DJ_E, DJ_P, 'TEST_A (davisontest1)');
    staff = await asUser(STAFF_E, STAFF_P, 'TEST_GOSAT');

    // Read as the DJ: chat RLS only shows a room to its members, so the
    // gosat account cannot see this room at all.
    roomExistedBefore = (await groveStationRoomIds()).length > 0;

    const stall = await createStallFixture(dj.client, dj.userId, `${RUN} stall`);
    stallId = stall.stallId;
    stallObjects = stall.objectPaths;
  });

  test.afterAll(async () => {
    const problems: string[] = [];

    // Slots: cancel anything still live (all are >= 12 days out, so the
    // 24h-notice rule allows it), then delete. Segments cascade.
    for (const id of qaSlotIds) {
      const { data: row } = await dj.client.from('radio_slots').select('status').eq('id', id).maybeSingle();
      if (row && row.status !== 'cancelled' && row.status !== 'draft') {
        const { error } = await dj.client.from('radio_slots').update({ status: 'cancelled' }).eq('id', id);
        if (error) problems.push(`cancel ${id}: ${error.message}`);
      }
      // Bucket objects under this slot's folder.
      const prefix = `${dj.userId}/${id}`;
      const { data: objs } = await dj.client.storage.from(BUCKET).list(prefix, { limit: 1000 });
      const paths = (objs ?? []).map((o: { name: string }) => `${prefix}/${o.name}`);
      if (paths.length > 0) {
        const { error } = await dj.client.storage.from(BUCKET).remove(paths);
        if (error) problems.push(`remove objects ${prefix}: ${error.message}`);
      }
      const { error: delError } = await dj.client.from('radio_slots').delete().eq('id', id);
      if (delError) problems.push(`delete slot ${id}: ${delError.message}`);
    }

    // Chat notices the run caused, then the room if this run created it.
    if (qaSlotIds.length > 0) {
      const { data: notices } = await staff.client.from('chat_messages').select('id, room_id')
        .eq('sender_id', GROVE_STATION_USER_ID)
        .in('system_metadata->>slot_id', qaSlotIds);
      const noticeIds = (notices ?? []).map((n: { id: string }) => n.id);
      if (noticeIds.length > 0) {
        const { error } = await staff.client.from('chat_messages').delete().in('id', noticeIds);
        if (error) problems.push(`delete notices: ${error.message}`);
      }
    }
    // The notices open a Grove Station <-> DJ direct room. Direct rooms can
    // only be deleted by the service role (chat_rooms_delete excludes
    // 'direct' for members, and RLS hides the room from gosat), so a room
    // this run created cannot be torn down from here. Fail loudly with the
    // exact removal rather than leave it silently.
    if (!roomExistedBefore) {
      for (const roomId of await groveStationRoomIds()) {
        problems.push(
          `direct room ${roomId} (Grove Station <-> davisontest1) was created by this run and members cannot delete it. ` +
          `Remove it with the service role: delete from chat_participants where room_id='${roomId}'; delete from chat_rooms where id='${roomId}';`,
        );
      }
    }

    if (stallId) {
      try { await deleteStallFixture(dj.client, stallId); } catch (e) { problems.push(String(e)); }
      const { error } = await dj.client.storage.from('stalls').remove(stallObjects);
      if (error) problems.push(`stall objects: ${error.message}`);
    }

    // ---- residue check: prove it, don't claim it
    const residue: Record<string, number> = {};
    const { count: slotCount } = await dj.client.from('radio_slots').select('id', { count: 'exact', head: true })
      .in('id', qaSlotIds.length ? qaSlotIds : ['00000000-0000-0000-0000-000000000000']);
    residue.slots = slotCount ?? -1;
    const { count: segCount } = await dj.client.from('radio_rundown_segments').select('id', { count: 'exact', head: true })
      .in('slot_id', qaSlotIds.length ? qaSlotIds : ['00000000-0000-0000-0000-000000000000']);
    residue.segments = segCount ?? -1;
    let objectCount = 0;
    for (const id of qaSlotIds) {
      const { data: objs } = await dj.client.storage.from(BUCKET).list(`${dj.userId}/${id}`, { limit: 1000 });
      objectCount += (objs ?? []).length;
    }
    residue.bucketObjects = objectCount;
    const { count: noticeCount } = await staff.client.from('chat_messages').select('id', { count: 'exact', head: true })
      .eq('sender_id', GROVE_STATION_USER_ID)
      .in('system_metadata->>slot_id', qaSlotIds.length ? qaSlotIds : ['none']);
    residue.notices = noticeCount ?? -1;
    const { count: stallCount } = await dj.client.from('stalls').select('id', { count: 'exact', head: true }).eq('user_id', dj.userId);
    residue.stalls = stallCount ?? -1;
    residue.newRooms = roomExistedBefore ? 0 : (await groveStationRoomIds()).length;
    console.log(`[RESIDUE] ${JSON.stringify(residue)} qaSlots=${JSON.stringify(qaSlotIds)}`);
    if (problems.length) console.log(`[TEARDOWN PROBLEMS] ${problems.join(' | ')}`);
    expect(problems, 'teardown problems').toEqual([]);
    expect(residue).toEqual({ slots: 0, segments: 0, bucketObjects: 0, notices: 0, stalls: 0, newRooms: 0 });
  });

  // ---------------------------------------------------------------- tests

  test('1. "Book a radio slot" is findable from the Cockpit nav, the Owner Menu and /grove-station (desktop)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signInThroughUi(page, DJ_E, DJ_P, 'TEST_A');

    await page.goto('/stall/davisontest1', { waitUntil: 'domcontentloaded' });
    const navEntry = page.getByRole('link', { name: /Book a radio slot/ }).first();
    await expect(navEntry, 'Cockpit nav entry').toBeVisible({ timeout: 45000 });
    await page.screenshot({ path: `${SHOTS}/desktop-cockpit-nav.png` });
    await navEntry.click();
    await expect(page).toHaveURL(/\/grove-station\?tab=schedule/);
    await expect(page.getByRole('heading', { name: '24/7 Schedule' })).toBeVisible({ timeout: 30000 });

    await page.goto('/stall/davisontest1', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Owner menu' }).first().click({ timeout: 45000 });
    const ownerEntry = page.getByRole('button', { name: /Book a radio slot/ }).first();
    await expect(ownerEntry, 'Owner Menu entry').toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: `${SHOTS}/desktop-owner-menu.png` });
    await ownerEntry.click();
    await expect(page).toHaveURL(/\/grove-station\?tab=schedule/);

    await page.goto('/grove-station?tab=listen', { waitUntil: 'domcontentloaded' });
    const top = page.getByTestId('grove-book-slot');
    await expect(top, '/grove-station top button').toBeVisible({ timeout: 45000 });
    await page.screenshot({ path: `${SHOTS}/desktop-grove-station-top.png` });
    await top.click();
    await expect(page).toHaveURL(/tab=schedule/);
    await expect(page.getByText('Pre-recorded shows — live hosting coming soon')).toBeVisible();
    await page.evaluate(() => { try { localStorage.removeItem('grove.radioSlotExplainerSeen'); } catch { /* */ } });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('radio-slot-explainer'), 'first-visit explainer').toBeVisible({ timeout: 45000 });
    await page.screenshot({ path: `${SHOTS}/desktop-schedule-explainer.png` });
  });

  test('2. the same three entries at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signInThroughUi(page, DJ_E, DJ_P, 'TEST_A');

    await page.goto('/stall/davisontest1', { waitUntil: 'domcontentloaded' });
    // Portrait phones get the Cockpit nav as a bookshelf of spine buttons,
    // otherwise it sits in the "Open menu" drawer as links.
    const navEntry = page.getByRole('link', { name: /Book a radio slot/ })
      .or(page.getByRole('button', { name: 'Book a radio slot' })).first();
    await page.waitForTimeout(8000);
    if (!(await navEntry.isVisible().catch(() => false))) {
      await page.getByRole('button', { name: 'Open menu' }).first().click({ timeout: 45000 });
    }
    await navEntry.scrollIntoViewIfNeeded();
    await expect(navEntry, 'Cockpit nav entry (mobile)').toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: `${SHOTS}/mobile-cockpit-nav.png` });
    await navEntry.click();
    await expect(page).toHaveURL(/\/grove-station\?tab=schedule/);

    await page.goto('/stall/davisontest1', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Owner menu' }).first().click({ timeout: 45000 });
    const ownerEntry = page.getByRole('button', { name: /Book a radio slot/ }).first();
    await expect(ownerEntry, 'Owner Menu entry (mobile)').toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: `${SHOTS}/mobile-owner-menu.png` });

    await page.goto('/grove-station?tab=listen', { waitUntil: 'domcontentloaded' });
    const top = page.getByTestId('grove-book-slot');
    await expect(top).toBeVisible({ timeout: 45000 });
    await page.screenshot({ path: `${SHOTS}/mobile-grove-station-top.png` });
    await top.click();
    await expect(page.getByTestId('radio-slot-explainer').or(page.getByText('Pre-recorded shows — live hosting coming soon')).first()).toBeVisible({ timeout: 30000 });
    await page.screenshot({ path: `${SHOTS}/mobile-schedule.png` });
  });

  test('3. book, build a rundown, reorder and remove persist, direct status write refused, submit schedules', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signInThroughUi(page, DJ_E, DJ_P, 'TEST_A');
    const [when] = await pickFreeBoundaries(dj.client, 1);
    rundownStartsAt = when.toISOString();
    rundownSlotId = await bookThroughUi(page, when, `${RUN} rundown`);

    // Build: opening, talk, advert (distinct lengths so order is checkable).
    await uploadSegment(page, 'Opening', 'qa-opening.wav', wavBytes(3), 'audio/wav');
    await waitForToast(page, /Added Opening segment/);
    await uploadSegment(page, 'Talk', 'qa-talk.wav', wavBytes(5), 'audio/wav');
    await waitForToast(page, /Added Talk segment/);
    await uploadSegment(page, 'Advert', 'qa-advert.wav', wavBytes(7), 'audio/wav');
    await waitForToast(page, /Added Advert segment/);
    let segs = await segmentsInDb(rundownSlotId);
    expect(segs.map((s) => s.kind)).toEqual(['opening', 'talk', 'advert']);

    // Swap the first two with the down arrow; the database must follow.
    await page.locator('button:has(svg.lucide-arrow-down)').first().click();
    await expect.poll(async () => (await segmentsInDb(rundownSlotId)).map((s) => s.kind), { timeout: 15000 })
      .toEqual(['talk', 'opening', 'advert']);
    segs = await segmentsInDb(rundownSlotId);
    expect(segs.map((s) => s.position)).toEqual([0, 1, 2]);

    // Remove the middle one; positions close up with no gap.
    await page.locator('button:has(svg.lucide-trash2), button:has(svg.lucide-trash-2)').nth(1).click();
    await expect.poll(async () => (await segmentsInDb(rundownSlotId)).map((s) => `${s.position}:${s.kind}`), { timeout: 15000 })
      .toEqual(['0:talk', '1:advert']);

    // A member's own REST client cannot schedule a draft directly.
    const direct = await dj.client.from('radio_slots').update({ status: 'scheduled' }).eq('id', rundownSlotId).select('id');
    console.log(`[POLICY] direct draft->scheduled: error=${direct.error?.code} ${direct.error?.message} rows=${direct.data?.length ?? 0}`);
    expect(direct.error, 'direct status write must be refused').not.toBeNull();
    const { data: still } = await dj.client.from('radio_slots').select('status').eq('id', rundownSlotId).single();
    expect(still?.status).toBe('draft');

    // Nor can it insert a slot that is already scheduled, or a live one.
    const [spare] = await pickFreeBoundaries(dj.client, 2).then((d) => d.slice(1));
    const badInsert = await dj.client.from('radio_slots')
      .insert({ dj_user_id: dj.userId, starts_at: spare.toISOString(), mode: 'prerecorded', status: 'scheduled', title: `${RUN} bad` })
      .select('id');
    if (badInsert.data?.[0]?.id) qaSlotIds.push(badInsert.data[0].id);
    console.log(`[POLICY] insert status=scheduled: error=${badInsert.error?.code} ${badInsert.error?.message}`);
    expect(badInsert.error, 'inserting a scheduled slot must be refused').not.toBeNull();
    const liveInsert = await dj.client.from('radio_slots')
      .insert({ dj_user_id: dj.userId, starts_at: spare.toISOString(), mode: 'live', status: 'draft', title: `${RUN} live` })
      .select('id');
    if (liveInsert.data?.[0]?.id) qaSlotIds.push(liveInsert.data[0].id);
    console.log(`[POLICY] insert mode=live: error=${liveInsert.error?.code} ${liveInsert.error?.message}`);
    expect(liveInsert.error, 'booking a live slot must be refused until live exists').not.toBeNull();

    // Submit through the real button -> submit-radio-slot -> scheduled.
    await page.getByRole('button', { name: 'Submit rundown' }).click();
    await waitForToast(page, /Rundown submitted/);
    const { data: sched } = await dj.client.from('radio_slots').select('status, scheduled_at').eq('id', rundownSlotId).single();
    expect(sched?.status).toBe('scheduled');
    expect(sched?.scheduled_at).toBeTruthy();

    // Scheduled is locked: no moving it, no un-submitting it, no segment edits.
    const move = await dj.client.from('radio_slots').update({ starts_at: spare.toISOString() }).eq('id', rundownSlotId).select('id');
    console.log(`[POLICY] move scheduled slot: error=${move.error?.code} ${move.error?.message}`);
    expect(move.error, 'moving a scheduled slot must be refused').not.toBeNull();
    const back = await dj.client.from('radio_slots').update({ status: 'draft' }).eq('id', rundownSlotId).select('id');
    console.log(`[POLICY] scheduled->draft: error=${back.error?.code} ${back.error?.message}`);
    expect(back.error, 'un-submitting must be refused').not.toBeNull();
    const segDel = await dj.client.from('radio_rundown_segments').delete().eq('slot_id', rundownSlotId).select('id');
    expect(segDel.data ?? [], 'segments of a scheduled slot must be locked').toHaveLength(0);

    // The DJ got the "scheduled" chat notice.
    const { data: notices } = await dj.client.from('chat_messages').select('content')
      .eq('sender_id', GROVE_STATION_USER_ID).eq('system_metadata->>slot_id', rundownSlotId).eq('system_metadata->>type', 'scheduled');
    expect(notices ?? [], 'scheduled notice in chat').toHaveLength(1);
  });

  test('4. playout: the resolver airs the QA slot inside its window, and nothing outside it', async () => {
    const start = new Date(rundownStartsAt).getTime();
    const segs = await segmentsInDb(rundownSlotId);
    const inside = await resolveSlotOverride(dj.client, start + 2_000);
    console.log(`[PLAYOUT] t=start+2s -> ${JSON.stringify(inside && { slotId: inside.slotId, seg: inside.segment.id, kind: inside.segment.kind, offset: inside.segment.offsetSeconds })}`);
    expect(inside?.slotId).toBe(rundownSlotId);
    expect(inside?.segment.id).toBe(segs[0].id);
    expect(inside?.segment.offsetSeconds).toBe(2);
    const second = await resolveSlotOverride(dj.client, start + 6_000);
    console.log(`[PLAYOUT] t=start+6s -> ${JSON.stringify(second && { seg: second.segment.id, kind: second.segment.kind, offset: second.segment.offsetSeconds })}`);
    expect(second?.segment.id).toBe(segs[1].id);
    const after = await resolveSlotOverride(dj.client, start + 60_000);
    console.log(`[PLAYOUT] t=start+60s (rundown finished) -> ${after ? after.slotId : 'null (autopilot)'}`);
    expect(after).toBeNull();
    const before = await resolveSlotOverride(dj.client, start - 1_000);
    expect(before?.slotId ?? null).not.toBe(rundownSlotId);
  });

  test('5. whole-show upload by TUS into its own slot; an over-2h file is refused and removed', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signInThroughUi(page, DJ_E, DJ_P, 'TEST_A');
    const [, when] = await pickFreeBoundaries(dj.client, 2);
    showSlotId = await bookThroughUi(page, when, `${RUN} whole show`);

    await uploadSegment(page, 'Whole show', 'qa-too-long.mp3', mp3Bytes(7500), 'audio/mpeg');
    await waitForToast(page, /longer than 2 hours/, 180000);
    await expect.poll(async () => {
      const { data } = await dj.client.storage.from(BUCKET).list(`${dj.userId}/${showSlotId}`);
      return (data ?? []).length;
    }, { timeout: 20000 }).toBe(0);
    expect(await segmentsInDb(showSlotId)).toHaveLength(0);

    await uploadSegment(page, 'Whole show', 'qa-show.mp3', mp3Bytes(6900), 'audio/mpeg');
    await waitForToast(page, /Added Whole show segment/, 180000);
    const segs = await segmentsInDb(showSlotId);
    expect(segs.map((s) => s.kind)).toEqual(['show']);
    const { data: seg } = await dj.client.from('radio_rundown_segments').select('duration_seconds, audio_path').eq('id', segs[0].id).single();
    console.log(`[UPLOAD] whole show measured ${seg?.duration_seconds}s at ${seg?.audio_path}`);
    expect(seg?.duration_seconds).toBeGreaterThanOrEqual(6899);
    expect(seg?.duration_seconds).toBeLessThanOrEqual(6900);
  });

  test('6. station staff cancel from /admin/radio with a reason; the DJ is told in chat', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signInThroughUi(page, STAFF_E, STAFF_P, 'TEST_GOSAT');
    await page.goto('/admin/radio', { waitUntil: 'domcontentloaded' });
    const card = page.locator(`[data-slot-id="${rundownSlotId}"]`);
    await expect(card, 'QA slot listed in the admin panel').toBeVisible({ timeout: 45000 });
    await expect(card).toContainText(RUN);
    await card.getByRole('button', { name: /Rundown/ }).click();
    await expect(card.locator('audio').first(), 'segment audio preview').toBeVisible({ timeout: 20000 });
    await page.screenshot({ path: `${SHOTS}/admin-panel.png` });
    await card.getByRole('button', { name: /Cancel slot/ }).click();
    const reason = `${RUN}: automated test cancel`;
    await card.getByLabel('Cancel reason').fill(reason);
    await card.getByRole('button', { name: /Confirm cancel/ }).click();
    await waitForToast(page, /The DJ has been told in chat/);

    const { data: row } = await dj.client.from('radio_slots').select('status, cancel_reason, cancelled_by').eq('id', rundownSlotId).single();
    expect(row?.status).toBe('cancelled');
    expect(row?.cancel_reason).toBe(reason);
    expect(row?.cancelled_by).toBe(staff.userId);
    const { data: notices } = await dj.client.from('chat_messages').select('content')
      .eq('sender_id', GROVE_STATION_USER_ID).eq('system_metadata->>slot_id', rundownSlotId).eq('system_metadata->>type', 'cancelled');
    expect(notices ?? []).toHaveLength(1);
    expect(notices?.[0]?.content).toContain(reason);
  });
});
