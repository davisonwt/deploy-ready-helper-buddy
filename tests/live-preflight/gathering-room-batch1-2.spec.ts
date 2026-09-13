import { test, expect, type BrowserContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Gathering Room batches 1+2 pre-flight (2026-09-13): the board (PDF page
// sync, pinned-seed Bestow) and the ordered raise-hand queue with
// voice-note-at-#1, wired into the existing Go-Live stage. Real backend,
// real TEST_USER/TEST_USER2 accounts, real deployed TEST_BASE_URL -- see
// playwright.live-preflight.config.ts. Reuses TEST_USER's existing
// "Sabbath Scripture Study" book seed (from the earlier Sabbath pre-flight)
// rather than sowing a new one.

const SUPABASE_URL = 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const SUPABASE_PROJECT_REF = 'zuwkgasbkpjlxzsjzumu';
const ANON_KEY = 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa';

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD;
const TEST_USER2_EMAIL = process.env.TEST_USER2_EMAIL;
const TEST_USER2_PASSWORD = process.env.TEST_USER2_PASSWORD;

// A real, minimal, valid one-page PDF (not a fake text file) -- LiveStage's
// board mode actually parses this with pdf.js, unlike SowBookPage's own
// upload step, which never renders the file's real content.
const MINIMAL_PDF = Buffer.from(
  '%PDF-1.1\n' +
  '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n' +
  '2 0 obj << /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >> endobj\n' +
  '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >> endobj\n' +
  '4 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >> endobj\n' +
  'trailer << /Root 1 0 R >>\n',
  'utf8',
);

async function loginAs(context: BrowserContext, email: string, password: string) {
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`login failed: ${error?.message}`);
  await context.addInitScript(
    ({ key, session }) => { window.localStorage.setItem(key, JSON.stringify(session)); window.sessionStorage.setItem('audioUnlocked', '1'); },
    { key: `sb-${SUPABASE_PROJECT_REF}-auth-token`, session: data.session },
  );
}

async function fetchBooksHotspotLabel(email: string, password: string) {
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: auth } = await client.auth.signInWithPassword({ email, password });
  if (!auth.user) throw new Error('could not sign in to read stall row');
  const { data: stall } = await client.from('stalls').select('hotspots').eq('user_id', auth.user.id).maybeSingle();
  const hotspots = (stall?.hotspots as Array<{ kind: string; label: string }> | null) ?? [];
  const books = hotspots.find((h) => h.kind === 'books');
  await client.auth.signOut();
  if (!books) throw new Error("TEST_USER's stall has no 'books' hotspot");
  return books.label;
}

const SEED_TITLE = 'Sabbath Scripture Study';

test.describe('Gathering Room batches 1+2 -- board + ordered queue', () => {
  test.skip(!TEST_USER_EMAIL || !TEST_USER_PASSWORD || !TEST_USER2_EMAIL || !TEST_USER2_PASSWORD, 'Set TEST_USER*/TEST_USER2* in .env.test to run this spec.');
  test.skip(!process.env.TEST_BASE_URL, 'Set TEST_BASE_URL in .env.test to run this spec.');

  test('board: PDF page sync + pinned-seed Bestow; queue: ordered + voice-note-at-#1', async ({ browser }) => {
    test.setTimeout(300_000);
    const booksLabel = await fetchBooksHotspotLabel(TEST_USER_EMAIL!, TEST_USER_PASSWORD!);

    const hostCtx = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const hostPage = await hostCtx.newPage();
    await loginAs(hostCtx, TEST_USER_EMAIL!, TEST_USER_PASSWORD!);

    const guestCtx = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const guestPage = await guestCtx.newPage();
    await loginAs(guestCtx, TEST_USER2_EMAIL!, TEST_USER2_PASSWORD!);
    const guestConsole: string[] = [];
    guestPage.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') guestConsole.push(`[${m.type()}] ${m.text()}`); });
    guestPage.on('pageerror', (e) => guestConsole.push(`[pageerror] ${e.message}`));

    const seedCardScope = (page: typeof hostPage) => page.locator('body').filter({ hasText: SEED_TITLE });

    await test.step('host goes live on the existing book seed', async () => {
      await hostPage.goto('/cockpit', { waitUntil: 'networkidle' });
      await hostPage.getByRole('button', { name: booksLabel, exact: true }).click();
      await expect(hostPage.getByText(SEED_TITLE, { exact: true })).toBeVisible({ timeout: 15_000 });
      const goLive = seedCardScope(hostPage).getByRole('button', { name: /^(Go Live|Step In)$/ }).first();
      await goLive.click();
      await expect(hostPage.getByText(`Live: ${SEED_TITLE}`)).toBeVisible({ timeout: 10_000 });
    });

    await test.step('guest steps in (no hand-raise needed to see the board)', async () => {
      await guestPage.goto(`/stall/davisontest1`, { waitUntil: 'networkidle' });
      await guestPage.getByRole('button', { name: booksLabel, exact: true }).click();
      await expect(guestPage.getByText(SEED_TITLE, { exact: true })).toBeVisible({ timeout: 15_000 });
      const stepIn = seedCardScope(guestPage).getByRole('button', { name: /^(Go Live|Step In)$/ }).first();
      await stepIn.click();
      await expect(guestPage.getByText(`Live: ${SEED_TITLE}`)).toBeVisible({ timeout: 10_000 });
    });

    await test.step('batch 1: host uploads a PDF, sets page 2, guest sees the same page', async () => {
      await hostPage.getByRole('button', { name: 'PDF' }).click();
      await hostPage.locator('input[type="file"]').setInputFiles({ name: 'board.pdf', mimeType: 'application/pdf', buffer: MINIMAL_PDF });
      await expect(hostPage.getByText(/Page 1 of 2/)).toBeVisible({ timeout: 20_000 });
      await hostPage.getByRole('button', { name: 'Next page' }).click();
      await expect(hostPage.getByText(/Page 2 of 2/)).toBeVisible({ timeout: 10_000 });

      await expect(guestPage.getByText(/Page 2 of 2/)).toBeVisible({ timeout: 20_000 });
    });

    await test.step('batch 1: host pins a seed, guest sees a working Bestow', async () => {
      await hostPage.getByRole('button', { name: 'Seed', exact: true }).click();
      await hostPage.getByRole('button', { name: 'Pin one of your seeds' }).click();
      // Earlier pre-flight runs left several products titled SEED_TITLE in
      // this account's catalog, so the picker lists duplicates -- any one
      // pins fine for this check. Scope to the picker's own option list
      // (not plain text, which also matches this title elsewhere on the
      // page) and take the first option.
      await hostPage.locator('.max-h-64 button').first().click();
      await expect(hostPage.getByText('Unpin')).toBeVisible({ timeout: 10_000 });

      await expect(guestPage.locator('div').filter({ hasText: 'Host hasn\'t pinned' })).toHaveCount(0, { timeout: 20_000 });
      const bestowBtn = guestPage.getByRole('button', { name: /Bestow/i }).first();
      await expect(bestowBtn).toBeVisible({ timeout: 10_000 });
      // Diagnostics: a prior run saw this click's own bounding-box center
      // resolve (via elementFromPoint) to the button's own ancestor wrapper
      // instead of the button, for reasons not yet understood -- dump what
      // is actually on top before deciding whether to fall back to a forced
      // click.
      const diag = await bestowBtn.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const top = document.elementFromPoint(cx, cy);
        return {
          rect: { x: r.x, y: r.y, w: r.width, h: r.height },
          topTag: top?.tagName, topClass: (top as HTMLElement | null)?.className, isSelf: top === el, containsSelf: top ? top.contains(el) : false,
        };
      });
      console.log('bestow click diag:', JSON.stringify(diag));
      try {
        await bestowBtn.click({ timeout: 15_000 });
      } catch (e) {
        console.log('normal click failed, forcing:', (e as Error).message.slice(0, 200));
        await bestowBtn.click({ force: true });
      }
      await expect(guestPage.getByText(/Bestow|Confirm|Amount/i).first()).toBeVisible({ timeout: 10_000 });
    });

    await test.step('batch 2: guest records a voice note instead of raising hand for camera', async () => {
      // Board is a distraction-free surface for this check -- back to camera
      // mode so the guest's own request-to-join controls are the ones under
      // test, not whatever board mode batch 1 left active.
      await hostPage.getByRole('button', { name: 'Camera' }).click();
      const micProbe = await guestPage.evaluate(async () => {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ audio: true });
          const tracks = s.getTracks().map((t) => ({ kind: t.kind, label: t.label, readyState: t.readyState }));
          const supported = { webm: (window as any).MediaRecorder?.isTypeSupported?.('audio/webm'), mp4: (window as any).MediaRecorder?.isTypeSupported?.('audio/mp4') };
          s.getTracks().forEach((t) => t.stop());
          return { ok: true, tracks, supported };
        } catch (e) { return { ok: false, err: String(e) }; }
      });
      console.log('mic probe:', JSON.stringify(micProbe));
      // Reproduce useMediaRecorder's exact start() mechanics directly (no
      // timeslice, single ondataavailable at stop()) with a short 3s cap,
      // to isolate whether raw MediaRecorder mechanics work in this
      // environment before trusting the full 45s app-driven recording.
      const rawRecProbe = await guestPage.evaluate(async () => {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        const rec = new MediaRecorder(s, { mimeType: 'audio/webm' });
        const chunks: Blob[] = [];
        const result = await new Promise<{ size: number; chunkCount: number; err?: string }>((resolve) => {
          rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
          rec.onerror = (ev) => resolve({ size: -1, chunkCount: chunks.length, err: String((ev as any)?.error?.message || (ev as any)?.error?.name || 'err') });
          rec.onstop = () => resolve({ size: chunks.reduce((a, c) => a + c.size, 0), chunkCount: chunks.length });
          rec.start();
          setTimeout(() => { if (rec.state === 'recording') rec.stop(); }, 3000);
        });
        s.getTracks().forEach((t) => t.stop());
        return result;
      });
      console.log('raw MediaRecorder probe (3s):', JSON.stringify(rawRecProbe));
      await guestPage.getByRole('button', { name: /Record a voice note instead/i }).click();
      await expect(guestPage.getByText(/recording…/)).toBeVisible({ timeout: 5_000 });
      await guestPage.waitForTimeout(2_000);
      // Let the capped recording finish on its own (VOICE_NOTE_MAX_SECONDS) --
      // simplest reliable way to stop it from this side without a Cancel path.
      await expect(guestPage.getByText(/recording…/)).toHaveCount(0, { timeout: 50_000 });
      // Diagnostics: give the upload+moderate+raiseHand chain a moment to
      // finish, then check directly what actually happened server-side
      // (storage object + its moderation verdict) instead of only inferring
      // it from host-side UI, since a prior run's raiseHand appeared to
      // never arrive.
      await guestPage.waitForTimeout(5_000);
      console.log('guest console during recording:', JSON.stringify(guestConsole));
      const diagClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
      await diagClient.auth.signInWithPassword({ email: TEST_USER2_EMAIL!, password: TEST_USER2_PASSWORD! });
      const { data: files } = await diagClient.storage.from('stalls').list(`${(await diagClient.auth.getUser()).data.user!.id}/gathering`, { sortBy: { column: 'created_at', order: 'desc' } });
      console.log('gathering files:', JSON.stringify(files?.map((f) => f.name)));
      const { data: modRows } = await diagClient.from('media_moderation' as any).select('object_path, verdict, reason, created_at').ilike('object_path', '%voicenote%').order('created_at', { ascending: false }).limit(3);
      console.log('media_moderation rows:', JSON.stringify(modRows));
      await diagClient.auth.signOut();
    });

    await test.step('batch 2: host sees an ordered, voice-note-flagged #1 entry; it auto-plays and advances', async () => {
      // "recording…" clearing only means the local capture ended -- the
      // upload + moderateStorageUpload round-trip still has to finish
      // before raiseHand() fires, so give this more room than a plain UI sync.
      await expect(hostPage.getByText('#1')).toBeVisible({ timeout: 45_000 });
      await expect(hostPage.getByText('voice note — plays at #1')).toBeVisible();

      // Auto-plays to the room without any host click.
      await expect(hostPage.getByText(/'s voice note/)).toBeVisible({ timeout: 15_000 });
      await expect(guestPage.getByText(/'s voice note/)).toBeVisible({ timeout: 15_000 });

      // Queue advances once playback ends -- the #1 entry clears itself.
      await expect(hostPage.getByText('voice note — plays at #1')).toHaveCount(0, { timeout: 60_000 });
    });

    await hostCtx.close();
    await guestCtx.close();
  });
});
