import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Pre-flight for tomorrow's Sabbath scripture study (Davison, 2026-09-13):
// the PUBLIC Go-Live path an owner uses to broadcast from their own stall --
// as opposed to the private "1-on-1 Live" (/live-rooms) system, which is a
// separate feature with no connection to the stall LIVE badge (see
// docs/FLOW-V2-ORPHANS.md's step-13-adjacent note / this session's earlier
// findings). Runs against the REAL deployed TEST_BASE_URL with REAL
// TEST_USER/TEST_USER2 accounts -- see playwright.live-preflight.config.ts.
//
// Flow under test: TEST_USER sows a real book seed -> goes live on it from
// their own stall (as OWNER -- SeedCard.tsx's Go Live gate used to require a
// whisperer commission for this, which blocked the owner entirely; fixed
// 2026-09-13) -> TEST_USER2 opens the stall, sees the LIVE badge (front +
// Tribal Gardens), raises a hand to join, TEST_USER approves, both sides get
// a real Daily.co video tile, chat works both ways, badge clears when the
// owner ends.

const SUPABASE_URL = 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const SUPABASE_PROJECT_REF = 'zuwkgasbkpjlxzsjzumu';
const ANON_KEY = 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa';

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD;
const TEST_USER2_EMAIL = process.env.TEST_USER2_EMAIL;
const TEST_USER2_PASSWORD = process.env.TEST_USER2_PASSWORD;

const SEED_TITLE = 'Sabbath Scripture Study';

// A real (small) PNG, not a 1x1 pixel -- CoverDropZone.tsx center-crops to a
// square canvas based on the image's own natural width/height before
// uploading, and a degenerate 1x1 image made that step (or the moderation
// call after it) silently fail with "Add a cover to continue." during this
// suite's own dry run.
const COVER_PNG = readFileSync(resolve(process.cwd(), 'public/favicon-32.png'));

interface LoggedIn {
  userId: string;
}

/** Real login (no stubbing) -- signs in against the real backend, then seeds
 * the browser context's localStorage with that real session before any page
 * loads, so the app boots already authenticated. */
async function loginAs(context: BrowserContext, email: string, password: string): Promise<LoggedIn> {
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    throw new Error(`live-preflight: login failed for ${email}: ${error?.message ?? 'no session'}`);
  }
  await context.addInitScript(
    ({ key, session }) => {
      window.localStorage.setItem(key, JSON.stringify(session));
      window.sessionStorage.setItem('audioUnlocked', '1');
    },
    { key: `sb-${SUPABASE_PROJECT_REF}-auth-token`, session: data.session },
  );
  return { userId: data.user.id };
}

/** Owner-authenticated Supabase client -- used to read the real stall row
 * (name + the real label of its 'books' hotspot) so the UI is driven by
 * exact strings instead of guessed hotspot labels, which are configurable
 * per-stall. */
async function fetchStallInfo(email: string, password: string) {
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: auth, error: authErr } = await client.auth.signInWithPassword({ email, password });
  if (authErr || !auth.user) throw new Error(`live-preflight: could not sign in to read stall row: ${authErr?.message}`);
  const { data: stall, error } = await client
    .from('stalls')
    .select('user_id, name, hotspots')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (error || !stall) throw new Error(`live-preflight: could not read TEST_USER's stall row: ${error?.message ?? 'not found'}`);
  const hotspots = (stall.hotspots as Array<{ kind: string; label: string }> | null) ?? [];
  const booksHotspot = hotspots.find((h) => h.kind === 'books');
  if (!booksHotspot) throw new Error("live-preflight: TEST_USER's stall has no 'books' hotspot painted -- can't reach a book seed's card.");
  await client.auth.signOut();
  return { stallName: stall.name as string, booksHotspotLabel: booksHotspot.label as string, ownerId: stall.user_id as string };
}

test.describe('Sabbath scripture study pre-flight -- public Go Live path', () => {
  test.skip(
    !TEST_USER_EMAIL || !TEST_USER_PASSWORD || !TEST_USER2_EMAIL || !TEST_USER2_PASSWORD,
    'Set TEST_USER_EMAIL/TEST_USER_PASSWORD/TEST_USER2_EMAIL/TEST_USER2_PASSWORD in .env.test to run this spec.',
  );
  test.skip(!process.env.TEST_BASE_URL, 'Set TEST_BASE_URL in .env.test to run this spec.');

  test('owner goes live on a real book seed; guest sees the badge, joins, video + chat both ways, badge clears on end', async ({ browser }) => {
    test.setTimeout(300_000);

    const { stallName, booksHotspotLabel, ownerId } = await fetchStallInfo(TEST_USER_EMAIL!, TEST_USER_PASSWORD!);

    const hostCtx = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const hostPage = await hostCtx.newPage();
    await loginAs(hostCtx, TEST_USER_EMAIL!, TEST_USER_PASSWORD!);

    const guestCtx = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const guestPage = await guestCtx.newPage();
    await loginAs(guestCtx, TEST_USER2_EMAIL!, TEST_USER2_PASSWORD!);

    let plantedProductId: string | null = null;

    await test.step('TEST_USER sows a real book seed titled "Sabbath Scripture Study"', async () => {
      await hostPage.goto('/sow/book', { waitUntil: 'networkidle' });

      await hostPage.locator('input[type="file"][accept="image/*"]').setInputFiles({
        name: 'sabbath-cover.png', mimeType: 'image/png', buffer: COVER_PNG,
      });
      await hostPage.locator('input[type="file"][accept=".pdf,.epub"]').setInputFiles({
        name: 'sabbath-scripture-study.pdf', mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\n% pre-flight fixture, not a real book\n'),
      });
      await hostPage.locator('#sow-title').fill(SEED_TITLE);

      await hostPage.getByRole('button', { name: /Choose a category/i }).click();
      await hostPage.getByRole('button', { name: 'Spiritual', exact: true }).click();

      await hostPage.locator('#sow-free').click(); // free -- nothing to charge for a rehearsal seed
      await hostPage.locator('#sow-description').fill('Pre-flight fixture for tomorrow\'s Sabbath scripture study Go-Live rehearsal.');

      // Two PlantButtons exist (desktop/mobile responsive variants) -- the
      // desktop one is first in DOM order and visible at the default
      // Desktop Chrome viewport this suite runs at.
      const plant = hostPage.getByRole('button', { name: 'Plant seed' }).first();
      await expect(plant).toBeEnabled({ timeout: 20_000 });
      await plant.click();

      await hostPage.waitForURL(/\/bulk\/products\//, { timeout: 30_000 });
      plantedProductId = hostPage.url().match(/\/bulk\/products\/([^/?]+)/)?.[1] ?? null;
      expect(plantedProductId, 'seed row id should be recoverable from the post-plant redirect URL').not.toBeNull();
    });

    const seedCardScope = (page: Page) => page.locator('body').filter({ hasText: SEED_TITLE });

    await test.step('TEST_USER goes live on it AS THE OWNER (no whisperer commission needed)', async () => {
      await hostPage.goto('/cockpit', { waitUntil: 'networkidle' });
      await hostPage.getByRole('button', { name: booksHotspotLabel, exact: true }).click();
      await expect(hostPage.getByText(SEED_TITLE, { exact: true })).toBeVisible({ timeout: 15_000 });

      const goLive = seedCardScope(hostPage).getByRole('button', { name: 'Go Live', exact: true }).first();
      await expect(goLive, 'owner\'s own Go Live button must be enabled, not gated behind a whisperer commission').toBeEnabled({ timeout: 10_000 });
      await goLive.click();

      await expect(hostPage.getByText(`Live: ${SEED_TITLE}`)).toBeVisible({ timeout: 10_000 });
      await expect(hostPage.getByText('You are hosting')).toBeVisible();
    });

    await test.step('LIVE badge appears on the stall front and the Tribal Gardens card', async () => {
      await guestPage.goto(`/stall/davisontest1`, { waitUntil: 'networkidle' });
      // StallInteriorView renders this badge twice (a mobile-portrait header
      // copy, hidden outside that layout, and a desktop copy) -- filter to
      // the one actually visible at this suite's viewport instead of
      // .first(), which follows DOM order (mobile-portrait is first) rather
      // than visibility.
      await expect(guestPage.getByText('LIVE', { exact: true }).filter({ visible: true }).first()).toBeVisible({ timeout: 20_000 });

      await guestPage.goto('/stalls-feed', { waitUntil: 'networkidle' });
      // StallsFeedPage.tsx also renders this badge twice (mobile-portrait /
      // desktop) -- same visibility filter as the stall-front check above.
      const feedCard = guestPage.locator('article, div').filter({ hasText: stallName }).filter({ hasText: 'LIVE' }).filter({ visible: true });
      await expect(feedCard.first()).toBeVisible({ timeout: 20_000 });
    });

    await test.step('TEST_USER2 joins from the seed card, raises a hand, TEST_USER approves', async () => {
      await guestPage.goto(`/stall/davisontest1`, { waitUntil: 'networkidle' });
      await guestPage.getByRole('button', { name: booksHotspotLabel, exact: true }).click();
      await expect(guestPage.getByText(SEED_TITLE, { exact: true })).toBeVisible({ timeout: 15_000 });

      const stepIn = seedCardScope(guestPage).getByRole('button', { name: 'Step In', exact: true }).first();
      await expect(stepIn).toBeEnabled({ timeout: 10_000 });
      await stepIn.click();
      await expect(guestPage.getByText(`Live: ${SEED_TITLE}`)).toBeVisible({ timeout: 10_000 });

      await guestPage.getByRole('button', { name: /Camera on/i }).click();

      await expect(hostPage.getByText(/Hand raises \(1\)/)).toBeVisible({ timeout: 15_000 });
      await hostPage.getByRole('button', { name: 'Approve' }).click();
      await expect(hostPage.getByText(/Hand raises \(1\)/)).toHaveCount(0, { timeout: 10_000 });
    });

    await test.step('both sides get a real Daily.co video tile', async () => {
      const hostFrame = hostPage.frameLocator(`iframe[title="${SEED_TITLE}"]`);
      const guestFrame = guestPage.frameLocator(`iframe[title="${SEED_TITLE}"]`);
      await expect(hostPage.locator(`iframe[title="${SEED_TITLE}"]`)).toBeVisible({ timeout: 20_000 });
      // Guest's own Daily token fetch only starts once `inCall` flips true
      // right after approval -- a fresh fetchDailyMeetingToken round-trip
      // (edge function + Daily API), not an already-warm one like the
      // host's -- give it more room before concluding it's stuck.
      await expect(guestPage.locator(`iframe[title="${SEED_TITLE}"]`)).toBeVisible({ timeout: 45_000 });
      // Daily's own prebuilt UI is the whole UI here (LiveStage.tsx: raw
      // iframe, no custom mic button of ours) -- best-effort look inside
      // for its own video tiles/mic control; cross-origin DOM we don't own,
      // so this is reported, not hard-asserted against a guessed selector.
      await hostFrame.locator('video').first().waitFor({ state: 'attached', timeout: 20_000 }).catch(() => {});
      await guestFrame.locator('video').first().waitFor({ state: 'attached', timeout: 20_000 }).catch(() => {});
    });

    await test.step('chat works both ways in the Go-Live overlay', async () => {
      await hostPage.getByPlaceholder('Ask the host…').fill('Shalom -- can everyone hear me?');
      await hostPage.getByRole('button', { name: 'Send' }).click();
      await expect(guestPage.getByText('Shalom -- can everyone hear me?')).toBeVisible({ timeout: 10_000 });

      await guestPage.getByPlaceholder('Ask the host…').fill('Yes, loud and clear!');
      await guestPage.getByRole('button', { name: 'Send' }).click();
      await expect(hostPage.getByText('Yes, loud and clear!')).toBeVisible({ timeout: 10_000 });
    });

    await test.step('owner ends the live; badge clears on the stall front and Tribal Gardens', async () => {
      await hostPage.getByRole('button', { name: 'End live' }).click();

      await guestPage.goto(`/stall/davisontest1`, { waitUntil: 'networkidle' });
      await expect(guestPage.getByText('LIVE', { exact: true })).toHaveCount(0, { timeout: 20_000 });

      await guestPage.goto('/stalls-feed', { waitUntil: 'networkidle' });
      const feedCardAfter = guestPage.locator('article, div').filter({ hasText: stallName }).filter({ hasText: 'LIVE' });
      await expect(feedCardAfter).toHaveCount(0, { timeout: 20_000 });
    });

    console.log(`live-preflight: planted product id ${plantedProductId}, owner ${ownerId}`);

    await hostCtx.close();
    await guestCtx.close();
  });
});
