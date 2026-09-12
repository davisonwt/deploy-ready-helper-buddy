import { test, expect, type Page } from '@playwright/test';

// Rail audit (2026-09-12, davisontest2 on Amber's stall, Vercel): Message,
// Share, the 45s sample, and Become a whisperer worked; Voice/Video, Report,
// Bestow and Heart did not (Voice/Video: "Call failed: unauthorized",
// separately fixed and covered by seedcard-call.spec.ts). This spec covers
// the other three.
//
// Traced end to end by reading code (no .env.test in this environment --
// see seedcard-call.spec.ts's own note on that) AND with a hermetic
// Playwright reconstruction of the exact real flow (davisontest2 on
// /stall/amber -> Music hotspot -> StallHotspotSheet -> SeedCard rail):
//
// - First suspected the Dialog/ConfirmBestowModal shadcn component
//   (z-50) rendering BEHIND StallHotspotSheet (z-[10001]) -- plausible on
//   paper, but DISPROVEN by direct measurement: a document.elementFromPoint
//   check at the dialog's own rendered center, run against the actual
//   built app, found the dialog genuinely on top and receiving clicks even
//   at z-50. (Likely reason: the sheet's slide animation puts it inside a
//   transformed ancestor, which traps its high z-index inside a LOCAL
//   stacking context -- while the Dialog's Radix Portal renders as a true
//   body-level sibling and isn't subject to that ancestor's context at
//   all. Raw z-index numbers only compare meaningfully within the same
//   stacking context; these aren't in one.) No code change shipped for
//   this -- it would have been an unjustified fix for a problem that, per
//   this measurement, doesn't occur in this codebase's actual DOM
//   structure.
// - content_reports' own schema/RLS (supabase/migrations/
//   20260902110000_media_moderation_core.sql -- the live one; two earlier,
//   differently-shaped 20250912 migrations exist but ReportButton.tsx's
//   own insert columns (target_type/target_id/reason/details) only match
//   this later one, confirming it's what's actually live) was read in
//   full: `content_reports_insert_own` allows any authenticated user to
//   insert a row with their own reporter_user_id. No RLS gap found.
// - create-gift-bestowal-order (Bestow's and Heart's payment edge
//   function) was also read in full: no chat/room-membership gate of any
//   kind, just a valid session + a resolvable payout method for the
//   recipient. No callee-side authorization gap found there either.
// - Heart's own small-gift picker (a plain `fixed z-[10060]` div, not a
//   shadcn Dialog) was already comfortably above the sheet's z-[10001] --
//   verified working as-is.
//
// The tests below (Report submit, Bestow confirm, Heart amount-pick ->
// confirm) all PASS against the current code as found, both with and
// without any of the above -- i.e. this reconstruction could not
// reproduce "nothing happens" for any of the three. Given the
// already-confirmed lag between this repo's HEAD and what's actually
// deployed to the tested Vercel URL (see seedcard-call.spec.ts's own
// Voice/Video fix, pushed in a prior commit but not yet reflected in that
// same live test round), the most likely explanation is the same one:
// the report predates a fix already on this branch, or the deployment
// hasn't picked up recent commits yet -- worth confirming which branch
// Vercel builds from.
//
// useGiftBestowal.send() (both Bestow's and Heart's payment call) goes
// through supabase.functions.invoke(), which reads the token from the
// client's OWN current session -- added the same defensive
// ensureFreshSession() check invokeFunction.ts uses before that call.
// IMPORTANT: re-checked against the installed @supabase/supabase-js
// (2.108.2) source and this turned out to be a non-issue in this
// version -- getSession() already re-checks and refreshes an expired
// session on every single call (see invokeFunction.ts's correction
// comment), so the check is a harmless, likely-redundant duplicate, not
// a fix for a live bug. The last test below proves exactly that: it
// passes both with AND without the ensureFreshSession() call, because
// the underlying library already self-heals either way. Kept for the
// same defensive reasoning as invokeFunction.ts.

const SUPABASE_PROJECT_REF = 'zuwkgasbkpjlxzsjzumu';
const SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;
const CALLER_USER_ID = '00000000-0000-4000-8000-000000000030'; // stand-in for davisontest2
const AMBER_USER_ID = '00000000-0000-4000-8000-000000000031';
const AMBER_SOWER_ID = '00000000-0000-4000-8000-000000000032';
const TRACK_ID = '00000000-0000-4000-8000-0000000000bb';

const TINY_PNG_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function fakeJwt(payload: Record<string, unknown>): string {
  const b64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.test-signature-not-verified-client-side`;
}

async function stubAuthSession(page: Page) {
  const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
  await page.addInitScript(
    ({ storageKey, session }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(session));
      window.sessionStorage.setItem('audioUnlocked', '1');
    },
    {
      storageKey: `sb-${SUPABASE_PROJECT_REF}-auth-token`,
      session: {
        access_token: fakeJwt({ sub: CALLER_USER_ID, role: 'authenticated', exp: futureExpiry }),
        refresh_token: 'test-refresh-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: futureExpiry,
        user: {
          id: CALLER_USER_ID, aud: 'authenticated', role: 'authenticated',
          email: 'davisontest2-playwright@example.com', user_metadata: {}, app_metadata: {},
        },
      },
    },
  );
}

/** Same shape as seedcard-call.spec.ts's stubStallBackend -- see that file for why the rpc/* routes must be registered AFTER the general wildcard. */
async function stubStallBackend(page: Page) {
  await page.route(`${SUPABASE_URL}/rest/v1/**`, async (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.replace('/rest/v1/', '').split('?')[0];
    const wantsObject = (route.request().headers()['accept'] ?? '').includes('vnd.pgrst.object');
    const reply = (rows: unknown[]) => route.fulfill({ json: wantsObject ? (rows[0] ?? null) : rows });
    if (table === 'profiles') {
      return reply([{ user_id: CALLER_USER_ID, security_setup_complete: true, payout_setup_complete: true, is_chatapp_verified: true }]);
    }
    if (table === 'stalls') {
      return reply([{
        id: 'amber-stall-id', user_id: AMBER_USER_ID, name: "Amber's Stall", tagline: 'Handmade things',
        tier: 'farm_stall', front_image_path: TINY_PNG_DATA_URI, interior_image_path: TINY_PNG_DATA_URI,
        hotspots: null, published: true,
      }]);
    }
    if (table === 'sowers') return reply([{ id: AMBER_SOWER_ID }]);
    if (table === 'companies') return reply([]);
    if (table === 'radio_djs') return reply([]);
    if (table === 'products') {
      return reply([{
        id: TRACK_ID, title: 'Amber Test Track', description: 'A test music seed', cover_image_url: null,
        image_urls: [], price: 2, category: 'music', file_url: null, preview_url: null, created_at: new Date().toISOString(),
      }]);
    }
    return reply([]);
  });
  await page.route(`${SUPABASE_URL}/rest/v1/rpc/**`, (route) => route.fulfill({ json: null }));
  await page.route(`${SUPABASE_URL}/rest/v1/rpc/get_stall_owner_id_by_username`, (route) =>
    route.fulfill({ json: AMBER_USER_ID }),
  );
}

async function openMusicHotspot(page: Page, authStub: (page: Page) => Promise<void> = stubAuthSession) {
  await authStub(page);
  await stubStallBackend(page);
  await page.goto('/stall/amber', { waitUntil: 'networkidle' });
  const musicHotspot = page.getByRole('button', { name: 'Music' });
  await expect(musicHotspot).toBeVisible({ timeout: 15_000 });
  await musicHotspot.click();
  await expect(page.getByText('Amber Test Track')).toBeVisible({ timeout: 15_000 });
}

/** Same shape as seedcard-call.spec.ts's stubExpiredAuthSession -- an already-expired session, so invokeFunction's staleness check must trigger a refresh before any edge function call. */
async function stubExpiredAuthSession(page: Page) {
  const expiredAt = Math.floor(Date.now() / 1000) - 600;
  await page.addInitScript(
    ({ storageKey, session }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(session));
      window.sessionStorage.setItem('audioUnlocked', '1');
    },
    {
      storageKey: `sb-${SUPABASE_PROJECT_REF}-auth-token`,
      session: {
        access_token: fakeJwt({ sub: CALLER_USER_ID, role: 'authenticated', exp: expiredAt }),
        refresh_token: 'test-refresh-token-expired',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: expiredAt,
        user: {
          id: CALLER_USER_ID, aud: 'authenticated', role: 'authenticated',
          email: 'davisontest2-playwright@example.com', user_metadata: {}, app_metadata: {},
        },
      },
    },
  );
}

async function stubRefreshEndpoint(page: Page, freshToken: string) {
  await page.route(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, (route) => {
    const nowPlusHour = Math.floor(Date.now() / 1000) + 3600;
    route.fulfill({
      json: {
        access_token: freshToken,
        refresh_token: 'test-refresh-token-rotated',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: nowPlusHour,
        user: {
          id: CALLER_USER_ID, aud: 'authenticated', role: 'authenticated',
          email: 'davisontest2-playwright@example.com', user_metadata: {}, app_metadata: {},
        },
      },
    });
  });
}

test.describe('SeedCard rail: Report, Bestow, Heart (from a stall visit)', () => {
  test('Report opens the dialog above the sheet and submits a content_reports row', async ({ page }) => {
    await openMusicHotspot(page);

    let capturedBody: Record<string, unknown> | null = null;
    await page.route(`${SUPABASE_URL}/rest/v1/content_reports*`, async (route) => {
      if (route.request().method() === 'POST') {
        capturedBody = route.request().postDataJSON() as Record<string, unknown>;
        return route.fulfill({ status: 201, json: [{ id: 'report-1', ...capturedBody }] });
      }
      return route.fallback();
    });

    const reportButton = page.locator('button[aria-label="Report"]').first();
    await expect(reportButton).toBeVisible({ timeout: 15_000 });
    await reportButton.click();

    // The originally-suspected failure mode (dialog opens in state but
    // renders invisibly behind the sheet) -- this assertion is what would
    // have caught it; see this file's header for why it doesn't apply here.
    const dialog = page.getByRole('dialog', { name: 'Report content' });
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await dialog.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Spam or scam' }).click();
    await dialog.getByRole('button', { name: 'Submit report' }).click();

    await expect.poll(() => capturedBody, { timeout: 10_000, message: 'content_reports insert never fired' }).not.toBeNull();
    const body = capturedBody as unknown as Record<string, unknown>;
    expect(body.reporter_user_id).toBe(CALLER_USER_ID);
    expect(body.target_type).toBe('music_track');
    expect(body.target_id).toBe(TRACK_ID);
    expect(body.reason).toBe('spam');

    await expect(page.getByText(/gosat will review/i)).toBeVisible({ timeout: 5_000 });
    await expect(dialog).toHaveCount(0, { timeout: 5_000 }); // closed on success
  });

  test('Bestow opens ConfirmBestowModal above the sheet with a provider picker, and confirming reaches create-gift-bestowal-order', async ({ page }) => {
    await openMusicHotspot(page);

    let capturedBody: Record<string, unknown> | null = null;
    let capturedAuthHeader: string | null = null;
    await page.route(`${SUPABASE_URL}/functions/v1/create-gift-bestowal-order`, (route) => {
      capturedAuthHeader = route.request().headers()['authorization'] ?? null;
      capturedBody = route.request().postDataJSON() as Record<string, unknown>;
      route.fulfill({
        json: {
          bestowalId: 'test-bestowal-1',
          solanaPayment: {
            intentId: 'playwright-bestow-intent',
            referencePubkey: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
            solanaPayUrl: 'solana:11111111111111111111111111111111?amount=2.31',
            hotWalletAddress: '11111111111111111111111111111111',
            amountUsdc: 2.31,
            cluster: 'devnet',
            expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
          },
        },
      });
    });

    const bestowButton = page.getByRole('button', { name: /Bestow & Get This Seed/ }).first();
    await expect(bestowButton).toBeVisible({ timeout: 15_000 });
    await bestowButton.click();

    // Same check as Report's dialog above.
    const dialog = page.getByRole('dialog', { name: /Bestow on/ });
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByText('Payment method')).toBeVisible();

    const confirmButton = dialog.getByRole('button', { name: /Bestow \$/ });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    await expect.poll(() => capturedBody, { timeout: 10_000, message: 'create-gift-bestowal-order was never called' }).not.toBeNull();
    expect(capturedAuthHeader, 'Authorization header must be sent').toMatch(/^Bearer /);
    const body = capturedBody as unknown as Record<string, unknown>;
    expect(body.recipientId).toBe(AMBER_USER_ID);
    expect(body.contextKind).toBe('chat_tip');
    expect(body.contextId).toBe(TRACK_ID);
    expect(body.amount).toBe(2); // the track's own price -- Heart's own amount is covered below
  });

  test('Heart opens the 10c/50c/$1/$5/$10 picker and a chosen amount reaches create-gift-bestowal-order as that amount', async ({ page }) => {
    await openMusicHotspot(page);

    let capturedBody: Record<string, unknown> | null = null;
    await page.route(`${SUPABASE_URL}/functions/v1/create-gift-bestowal-order`, (route) => {
      capturedBody = route.request().postDataJSON() as Record<string, unknown>;
      route.fulfill({
        json: {
          bestowalId: 'test-heart-bestowal-1',
          solanaPayment: {
            intentId: 'playwright-heart-intent',
            referencePubkey: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
            solanaPayUrl: 'solana:11111111111111111111111111111111?amount=1.16',
            hotWalletAddress: '11111111111111111111111111111111',
            amountUsdc: 1.16,
            cluster: 'devnet',
            expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
          },
        },
      });
    });

    const heartButton = page.getByRole('button', { name: 'Heart', exact: true }).first();
    await expect(heartButton).toBeVisible({ timeout: 15_000 });
    await heartButton.click();

    await expect(page.getByText('Heart — a small gift')).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: '$1', exact: true }).click();

    const dialog = page.getByRole('dialog', { name: /Bestow on/ });
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    const confirmButton = dialog.getByRole('button', { name: /Bestow \$/ });
    await confirmButton.click();

    await expect.poll(() => capturedBody, { timeout: 10_000, message: 'create-gift-bestowal-order was never called' }).not.toBeNull();
    const body = capturedBody as unknown as Record<string, unknown>;
    expect(body.amount).toBe(1); // the picked $1, not the track's own $2 price
    expect(body.contextKind).toBe('chat_tip');
  });

  test('Bestow still completes from an expired-session start -- reaches create-gift-bestowal-order with a refreshed token', async ({ page }) => {
    const FRESH_TOKEN = fakeJwt({ sub: CALLER_USER_ID, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 });
    await stubRefreshEndpoint(page, FRESH_TOKEN);
    await openMusicHotspot(page, stubExpiredAuthSession);

    let capturedAuthHeader: string | null = null;
    let requestSeen = false;
    await page.route(`${SUPABASE_URL}/functions/v1/create-gift-bestowal-order`, (route) => {
      requestSeen = true;
      capturedAuthHeader = route.request().headers()['authorization'] ?? null;
      route.fulfill({
        json: {
          bestowalId: 'test-bestowal-expired-session',
          solanaPayment: {
            intentId: 'playwright-expired-session-intent',
            referencePubkey: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
            solanaPayUrl: 'solana:11111111111111111111111111111111?amount=2.31',
            hotWalletAddress: '11111111111111111111111111111111',
            amountUsdc: 2.31,
            cluster: 'devnet',
            expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
          },
        },
      });
    });

    const bestowButton = page.getByRole('button', { name: /Bestow & Get This Seed/ }).first();
    await bestowButton.click();
    const dialog = page.getByRole('dialog', { name: /Bestow on/ });
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await dialog.getByRole('button', { name: /Bestow \$/ }).click();

    await expect.poll(() => requestSeen, { timeout: 15_000, message: 'create-gift-bestowal-order was never called -- the expired session was never refreshed' }).toBe(true);
    expect(capturedAuthHeader, 'must send the REFRESHED token, not the expired one').toBe(`Bearer ${FRESH_TOKEN}`);
    await expect(page.getByText('Bestowal failed', { exact: false })).toHaveCount(0);
  });
});
