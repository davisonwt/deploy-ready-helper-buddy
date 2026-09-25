import { test, expect, type Page, type Response } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  SUPA, PUBKEY, asUser, signInThroughUi, createStallFixture, setStallHotspots, deleteStallFixture,
  sweepProducts, reportSweep,
} from './support/fixtures';
import { panHotspotIntoView, waitForInteriorReady } from './support/interior';
import { probeAudioDurationSeconds } from '../../supabase/functions/_shared/audioDuration';

/**
 * Album cards open their track list; each track plays a 45s preview, or the
 * full track for the owner (album-tracks, AlbumTracksPanel).
 *
 *   1. Louw's real album (callth3guy, "The Ancient Voice (Original Album)"),
 *      as the visitor davisontest2, READ-ONLY -- nothing of hers is written
 *      and nothing is bought. Label "Album · 11 tracks"; the list opens;
 *      tracks 1, 5 and 11 each play a seed-previews clip measured at ~45s;
 *      starting one stops the previous (only ever one pause button);
 *      closing the list stops playback. Desktop and 390px screenshots.
 *   2. A QA album of its own on davisontest1 (three 60s tracks) on a
 *      throwaway stall: the owner hears the FULL 60s file, the visitor a
 *      45s preview.
 *
 * Playing a track of Louw's album the first time generates that track's
 * preview clip in seed-previews -- the designed behaviour, the same clip
 * every real visitor then gets. Those are not fixtures and are not removed.
 *
 * Teardown of the QA album removes its product, stall, premium-room files,
 * generated preview clips and their media_moderation rows. Preview clips
 * can only be deleted by the service role (no member delete policy on
 * seed-previews, and direct SQL deletes on storage are blocked), so the
 * key is fetched at run time from the Management API with
 * SUPABASE_ACCESS_TOKEN (.env.test, local only), held in memory, never
 * logged, and used only to remove this run's own files.
 *
 *   npx playwright test --config=playwright.live.config.ts album-playback
 */

const REF = 'zuwkgasbkpjlxzsjzumu';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';
const A_E = process.env.TEST_A_EMAIL || '', A_P = process.env.TEST_A_PASSWORD || '';
const B_E = process.env.TEST_B_EMAIL || '', B_P = process.env.TEST_B_PASSWORD || '';
const LOUW_STALL = '/stall/callth3guy';
const LOUW_ALBUM = 'The Ancient Voice (Original Album)';
const STAMP = Date.now();
const QA_ALBUM = `QA album ${STAMP}`;
const SHOTS = 'test-results/album-playback';

async function sql<T = any>(query: string): Promise<T[]> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const body = await res.json();
  if (!res.ok || !Array.isArray(body)) throw new Error(`sql failed: ${JSON.stringify(body).slice(0, 300)}`);
  return body as T[];
}

async function serviceClient(): Promise<SupabaseClient> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const keys = (await res.json()) as { name: string; type: string; api_key: string }[];
  const secret = keys.find((k) => k.type === 'secret')?.api_key || keys.find((k) => k.name === 'service_role')?.api_key;
  if (!secret) throw new Error('could not resolve the service key for teardown');
  return createClient(SUPA, secret, { auth: { persistSession: false } });
}

/** A PCM WAV of `seconds` of quiet tone (8 kHz mono 16-bit). */
function wav(seconds: number): Buffer {
  const rate = 8000, byteRate = rate * 2, dataSize = byteRate * seconds;
  const b = Buffer.alloc(44 + dataSize);
  b.write('RIFF', 0); b.writeUInt32LE(36 + dataSize, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(byteRate, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < rate * seconds; i++) b.writeInt16LE(Math.round(800 * Math.sin((2 * Math.PI * 440 * i) / rate)), 44 + i * 2);
  return b;
}

/** Collects every album-tracks "play" answer the page receives. */
function watchPlays(page: Page): Array<{ url: string; full: boolean }> {
  const seen: Array<{ url: string; full: boolean }> = [];
  page.on('response', async (r: Response) => {
    if (!r.url().includes('/functions/v1/album-tracks') || r.request().method() !== 'POST') return;
    try {
      const body = JSON.parse(r.request().postData() || '{}');
      if (body.action !== 'play') return;
      const j = await r.json();
      if (j?.url) seen.push({ url: j.url, full: !!j.full });
    } catch { /* not ours */ }
  });
  return seen;
}

async function measure(url: string): Promise<number | null> {
  const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
  return probeAudioDurationSeconds(bytes);
}

async function openAlbum(page: Page, stallPath: string, shelfLabel: string, albumTitle: string) {
  await page.goto(stallPath, { waitUntil: 'domcontentloaded' });
  // The pan strip ([data-pan-scroll]) only exists on a narrow viewport.
  if ((page.viewportSize()?.width ?? 1440) < 1024) await waitForInteriorReady(page);
  else await expect(page.locator(`button[aria-label="${shelfLabel}"]`).filter({ visible: true }).first()).toBeVisible({ timeout: 45000 });
  // Pan it in (phones), then click the painted one -- the other layout's
  // copy of the same button is in the DOM but hidden.
  await panHotspotIntoView(page, shelfLabel, 0);
  await page.locator(`button[aria-label="${shelfLabel}"]`).filter({ visible: true }).first().click();
  await expect(page.getByText(albumTitle, { exact: false }).filter({ visible: true }).first(), `"${albumTitle}" is on the shelf`).toBeVisible({ timeout: 45000 });
  const label = page.getByTestId('album-label').filter({ visible: true }).first();
  await expect(label, 'the album card shows its album strip').toBeVisible({ timeout: 45000 });
  return { label };
}

async function playRow(page: Page, n: number) {
  const row = page.locator(`[data-track-row="${n}"]`).filter({ visible: true }).first();
  await row.getByRole('button', { name: /^Play / }).click();
  await expect(row.getByTestId('track-mode')).toBeVisible({ timeout: 45000 });
  return row;
}

let owner: { client: SupabaseClient; userId: string };
let stallId: string | null = null;
let stallObjects: string[] = [];
let albumId = '';
const qaPaths: string[] = [];

test.describe.serial('album playback', () => {
  test.setTimeout(6 * 60_000);

  test.beforeAll(async () => {
    if (!TOKEN) throw new Error('SUPABASE_ACCESS_TOKEN is missing from .env.test; teardown of generated preview clips needs it.');
    owner = await asUser(A_E, A_P, 'TEST_A (davisontest1)');
    const s = await createStallFixture(owner.client, owner.userId, `QA album ${STAMP} stall`);
    stallId = s.stallId; stallObjects = s.objectPaths;
    await setStallHotspots(owner.client, stallId, [{ id: 'qa-music', kind: 'music', label: 'QA MUSIC', x: 30, y: 40, w: 40, h: 40 }]);

    const session = `${STAMP}`;
    const tracks = [];
    for (let i = 1; i <= 3; i++) {
      const path = `products/${owner.userId}/${session}/0${i}__QA_Track_${i}.wav`;
      const { error } = await owner.client.storage.from('premium-room').upload(path, wav(60), { contentType: 'audio/wav', upsert: false });
      if (error) throw new Error(`upload ${path}: ${error.message}`);
      qaPaths.push(path);
      tracks.push({ name: `0${i}) QA Track ${i}.wav`, size: 44 + 16000 * 60, path, url: `${SUPA}/storage/v1/object/public/premium-room/${path}`, price: 1 });
    }
    const manifestPath = `products/${owner.userId}/${session}/manifest.json`;
    const { error: mErr } = await owner.client.storage.from('premium-room')
      .upload(manifestPath, Buffer.from(JSON.stringify({ type: 'album', createdAt: new Date().toISOString(), tracks })), { contentType: 'application/json' });
    if (mErr) throw new Error(`manifest: ${mErr.message}`);
    qaPaths.push(manifestPath);

    const { data: sower } = await owner.client.from('sowers').select('id').eq('user_id', owner.userId).single();
    const { data: company } = await owner.client.from('companies').select('id').eq('owner_user_id', owner.userId).limit(1).maybeSingle();
    const { data: product, error: pErr } = await owner.client.from('products').insert({
      sower_id: sower!.id, company_id: company?.id ?? null, title: QA_ALBUM, description: 'QA album fixture',
      type: 'music', category: 'music', status: 'active', price: 3, tags: ['album'], delivery_type: 'digital',
      file_url: `${SUPA}/storage/v1/object/public/premium-room/${manifestPath}`,
    }).select('id').single();
    if (pErr || !product) throw new Error(`album product: ${pErr?.message}`);
    albumId = product.id;
    console.log(`[SETUP] QA album ${albumId} with 3 x 60s tracks on stall ${stallId}`);
  });

  test.afterAll(async () => {
    const problems: string[] = [];
    try {
      const service = await serviceClient();
      if (albumId) {
        const previews = [1, 2, 3].map((n) => `${owner.userId}/album-${albumId}-0${n}.wav`);
        const { error: pvErr } = await service.storage.from('seed-previews').remove(previews);
        if (pvErr) problems.push(`previews: ${pvErr.message}`);
        await sql(`delete from media_moderation where (bucket_id='seed-previews' and object_path in (${previews.map((p) => `'${p}'`).join(',')}))
                     or (bucket_id='premium-room' and object_path in (${qaPaths.map((p) => `'${p}'`).join(',') || "''"}))`);
      }
      if (qaPaths.length) {
        const { error } = await service.storage.from('premium-room').remove(qaPaths);
        if (error) problems.push(`album files: ${error.message}`);
      }
    } catch (e) { problems.push(String(e)); }
    if (owner) reportSweep('album-playback', await sweepProducts(owner.client, owner.userId, [QA_ALBUM]));
    if (stallId) {
      try { await deleteStallFixture(owner.client, stallId); } catch (e) { problems.push(String(e)); }
      const { error } = await owner.client.storage.from('stalls').remove(stallObjects);
      if (error) problems.push(`stall images: ${error.message}`);
    }
    const [r] = await sql(`select
      (select count(*)::int from products where title='${QA_ALBUM}') products,
      (select count(*)::int from stalls where name='QA album ${STAMP} stall') stalls,
      (select count(*)::int from storage.objects where bucket_id='premium-room' and name like 'products/${owner?.userId}/${STAMP}/%') album_files,
      (select count(*)::int from storage.objects where bucket_id='seed-previews' and name like '${owner?.userId}/album-${albumId || 'none'}-%') previews,
      (select count(*)::int from media_moderation where object_path like '%${STAMP}%' or object_path like '%album-${albumId || 'none'}-%') moderation_rows`);
    console.log(`[RESIDUE] ${JSON.stringify(r)}`);
    if (problems.length) console.log(`[TEARDOWN PROBLEMS] ${problems.join(' | ')}`);
    expect(problems).toEqual([]);
    expect(r).toEqual({ products: 0, stalls: 0, album_files: 0, previews: 0, moderation_rows: 0 });
  });

  for (const vp of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'phone-390', width: 390, height: 844 }]) {
    test(`1. Louw's album as a visitor (${vp.name}): list, three 45s previews, one at a time, close stops it`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const plays = watchPlays(page);
      await signInThroughUi(page, B_E, B_P, 'TEST_B (visitor)');
      const { label } = await openAlbum(page, LOUW_STALL, 'MUSIC', LOUW_ALBUM);
      await expect(page.getByTestId('album-label').filter({ hasText: 'Album · 11 tracks' }).first()).toBeVisible({ timeout: 30000 });
      await page.getByRole('button', { name: 'Show tracks' }).filter({ visible: true }).first().click();
      const panel = page.getByTestId('album-tracks').filter({ visible: true }).first();
      await expect(panel).toBeVisible({ timeout: 20000 });
      await expect(panel.locator('[data-track-row]')).toHaveCount(11, { timeout: 60000 });
      await page.screenshot({ path: `${SHOTS}/louw-${vp.name}-list.png` });

      for (const n of [1, 5, 11]) {
        const row = await playRow(page, n);
        await expect(row.getByTestId('track-mode')).toContainText('45s preview');
        await page.waitForTimeout(2500);
        const pauses = await page.getByRole('button', { name: /^Pause / }).filter({ visible: true }).count();
        console.log(`[${vp.name}] track ${n}: "${await row.getByTestId('track-mode').innerText()}", pause buttons showing: ${pauses}`);
        expect(pauses, 'exactly one track plays at a time').toBe(1);
      }
      await page.screenshot({ path: `${SHOTS}/louw-${vp.name}-playing.png` });

      const lastThree = plays.slice(-3);
      expect(lastThree.length, 'three play answers from album-tracks').toBe(3);
      for (const p of lastThree) {
        expect(p.full, 'a visitor never gets the full file').toBe(false);
        expect(p.url, 'served from seed-previews, not premium-room').toContain('/seed-previews/');
        const secs = await measure(p.url);
        console.log(`[${vp.name}] served clip measures ${secs?.toFixed(1)}s`);
        expect(secs!).toBeGreaterThan(44);
        expect(secs!).toBeLessThanOrEqual(45.5);
      }

      await panel.getByRole('button', { name: 'Close track list' }).click();
      await expect(panel).toBeHidden({ timeout: 10000 });
      expect(await page.getByRole('button', { name: /^Pause / }).count(), 'closing the list stops playback').toBe(0);
      await expect(label).toBeVisible();
    });
  }

  test('2. QA album: the owner hears the full track, a visitor a 45s preview', async ({ page, browser }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const ownerPlays = watchPlays(page);
    await signInThroughUi(page, A_E, A_P, 'TEST_A (owner)');
    await openAlbum(page, '/stall/davisontest1', 'QA MUSIC', QA_ALBUM);
    await expect(page.getByTestId('album-label').filter({ hasText: 'Album · 3 tracks' }).first()).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Show tracks' }).filter({ visible: true }).first().click();
    const row = await playRow(page, 2);
    await expect(row.getByTestId('track-mode')).toContainText('Full track');
    const o = ownerPlays.at(-1)!;
    const ownerSecs = await measure(o.url);
    console.log(`[owner] full=${o.full} from ${o.url.includes('/premium-room/') ? 'premium-room' : 'elsewhere'}, measures ${ownerSecs?.toFixed(1)}s`);
    expect(o.full).toBe(true);
    expect(o.url).toContain('/premium-room/');
    expect(Math.round(ownerSecs!)).toBe(60);
    await page.screenshot({ path: `${SHOTS}/qa-owner-full.png` });

    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const vp = await ctx.newPage();
    const visitorPlays = watchPlays(vp);
    await signInThroughUi(vp, B_E, B_P, 'TEST_B (visitor)');
    await openAlbum(vp, '/stall/davisontest1', 'QA MUSIC', QA_ALBUM);
    await vp.getByRole('button', { name: 'Show tracks' }).filter({ visible: true }).first().click();
    const vRow = await playRow(vp, 2);
    await expect(vRow.getByTestId('track-mode')).toContainText('45s preview');
    const v = visitorPlays.at(-1)!;
    const visitorSecs = await measure(v.url);
    console.log(`[visitor] full=${v.full} from ${v.url.includes('/seed-previews/') ? 'seed-previews' : 'elsewhere'}, measures ${visitorSecs?.toFixed(1)}s`);
    expect(v.full).toBe(false);
    expect(v.url).toContain('/seed-previews/');
    expect(Math.round(visitorSecs!)).toBe(45);
    await vp.screenshot({ path: `${SHOTS}/qa-visitor-preview-390.png` });
    await ctx.close();
  });
});
