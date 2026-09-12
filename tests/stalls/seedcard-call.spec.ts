import { test, expect, type Page } from '@playwright/test';

// Regression test for a 2026-09-12 bug report (visitor on a stall, iPhone,
// sow2growapp.com): tapping a SeedCard's Voice/Video button failed with
// "Call failed: unauthorized".
//
// Traced SeedCard.handleCall -> startDirectRoom (get_or_create_direct_room,
// which already creates the pair chat_rooms/chat_participants rows
// synchronously, atomically, in the SAME call -- confirmed by reading the
// RPC's SQL, supabase/migrations/20251106143717_...sql) -> the call route
// it opened. Two real, compounding client-side bugs, both fixed here (see
// the commit this spec ships with for the full writeup):
//
//   1. It opened `/call/chat_room/:roomId` via `window.open(..., '_blank')`
//      -- a brand-new tab boots a whole new React app + Supabase client
//      from scratch. If the session that client's initialize() recovered
//      from localStorage was already past (or very near) expiry,
//      JitsiCall's token fetch could reach create-daily-meeting-token
//      before that session had actually been refreshed.
//   2. invokePaymentFunction called supabase.auth.getSession() and used
//      whatever it returned. CORRECTION (2026-09-12, added while auditing
//      the rest of the SeedCard rail, tests/stalls/seedcard-rail.spec.ts):
//      re-checked against the installed @supabase/supabase-js (2.108.2)
//      source and this specific claim was wrong -- getSession() already
//      re-checks the recovered session's expiry and self-refreshes on
//      EVERY call in this version (see invokeFunction.ts's own correction
//      comment), not just once at client construction. The genuine,
//      still-valid part of this fix is #1 above (same-tab navigation);
//      the explicit refresh check added to invokePaymentFunction is a
//      harmless, likely-redundant duplicate of what the library already
//      does, kept as defensive belt-and-suspenders rather than removed.
//
// Fixed by: SeedCard now navigates to the call in the SAME tab (removing
// bug #1 by construction -- no fresh client boot, no fresh-session race).
// invokePaymentFunction's explicit expiry check/refreshSession() call
// (originally framed as closing bug #2) turned out to be redundant with
// what getSession() already does internally -- see the correction above --
// but is kept as a defensive duplicate.
//
// The edge function's own chat_room authorization (chat_participants
// membership, service-role, checked against the CALLER's own row) was
// read and confirmed already correct for this flow -- no server-side
// change was needed, and none is included here.
//
// This spec proves the two CLIENT-side fixes hermetically (no real
// Supabase login exists in this environment -- .env.test isn't present,
// so a real end-to-end run "as davisontest2 calling Amber" against the
// live edge function's own auth decision isn't possible here; see the
// PR/commit note for what a human with real creds should re-verify).
// What it DOES prove against real code, not a mock of it:
//   - the Voice/Video button never opens a new tab/window,
//   - a session that's already expired when the button is tapped gets
//     refreshed (via a stubbed refresh-token response) BEFORE
//     create-daily-meeting-token is called, and the request that reaches
//     it carries the REFRESHED token, not the stale one,
//   - "Call failed: unauthorized" does not appear once that refresh
//     stub is in place,
//   - leaving the call returns to the exact stall it was started from.

const SUPABASE_PROJECT_REF = 'zuwkgasbkpjlxzsjzumu';
const SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;
const CALLER_USER_ID = '00000000-0000-4000-8000-000000000020'; // stand-in for davisontest2
const AMBER_USER_ID = '00000000-0000-4000-8000-000000000021';
const AMBER_SOWER_ID = '00000000-0000-4000-8000-000000000022';
const ROOM_ID = '00000000-0000-4000-8000-0000000000aa';

const TINY_PNG_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function fakeJwt(payload: Record<string, unknown>): string {
  const b64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.test-signature-not-verified-client-side`;
}

/**
 * Seeds an ALREADY-EXPIRED session into localStorage -- expires_at is 10
 * minutes in the past, so invokePaymentFunction's own staleness check
 * (SESSION_EXPIRY_BUFFER_SECONDS) must trigger a refreshSession() call
 * before create-daily-meeting-token is ever invoked. This is the exact
 * shape of session state a long-idle tab (or, before this fix, a fresh
 * tab recovering an about-to-expire session from localStorage) would have.
 */
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

/** Stubs Supabase Auth's own refresh-token endpoint -- the real client calls this from refreshSession(). */
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

async function stubStallBackend(page: Page) {
  // Playwright checks routes in LAST-registered-first order -- the specific
  // rpc/* handlers below must be registered AFTER this general wildcard so
  // they win over it, not the other way around (an earlier version of this
  // helper registered them first and the wildcard silently ate every rpc
  // call, returning `[]` for e.g. get_stall_owner_id_by_username -- a
  // scalar-returning rpc, where an empty ARRAY is truthy and broke every
  // assumption downstream).
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
        id: 'amber-track-1', title: 'Amber Test Track', description: 'A test music seed', cover_image_url: null,
        image_urls: [], price: 2, category: 'music', file_url: null, preview_url: null, created_at: new Date().toISOString(),
      }]);
    }
    return reply([]);
  });
  await page.route(`${SUPABASE_URL}/rest/v1/rpc/**`, (route) => route.fulfill({ json: null }));
  await page.route(`${SUPABASE_URL}/rest/v1/rpc/get_stall_owner_id_by_username`, (route) =>
    route.fulfill({ json: AMBER_USER_ID }),
  );
  await page.route(`${SUPABASE_URL}/rest/v1/rpc/get_or_create_direct_room`, (route) =>
    route.fulfill({ json: ROOM_ID }),
  );
}

test.describe('SeedCard Voice/Video button on a stall visit', () => {
  test('tapping Voice stays in the same tab, refreshes an expired session, and reaches create-daily-meeting-token with the refreshed token', async ({ page, context }) => {
    const FRESH_TOKEN = fakeJwt({ sub: CALLER_USER_ID, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 });

    await stubExpiredAuthSession(page);
    await stubRefreshEndpoint(page, FRESH_TOKEN);
    await stubStallBackend(page);

    let newPagesOpened = 0;
    context.on('page', () => { newPagesOpened += 1; });

    let capturedAuthHeader: string | null = null;
    let dailyTokenRequestSeen = false;
    await page.route(`${SUPABASE_URL}/functions/v1/create-daily-meeting-token`, (route) => {
      dailyTokenRequestSeen = true;
      capturedAuthHeader = route.request().headers()['authorization'] ?? null;
      route.fulfill({
        json: {
          room_url: 'https://s2g-playwright-test.daily.co/fake-room-never-connects',
          token: 'fake-daily-meeting-token',
          room_name: 'chat_room-' + ROOM_ID,
        },
      });
    });

    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('/stall/amber', { waitUntil: 'networkidle' });

    const musicHotspot = page.getByRole('button', { name: 'Music' });
    await expect(musicHotspot).toBeVisible({ timeout: 15_000 });
    await musicHotspot.click();

    // Attribute selector, not getByRole('button', {name: 'Voice'}) --
    // FeedRailButton sits inside a larger tapBehavior="inline" card whose
    // own accessible name/text can swallow its children's names in the
    // accessibility tree; data-call="voice" (FeedRailButton's own DOM
    // attribute) is unambiguous.
    const voiceButton = page.locator('button[data-call="voice"]').first();
    await expect(voiceButton).toBeVisible({ timeout: 15_000 });
    await voiceButton.click();

    // The actual regression: this used to throw "Call failed: unauthorized"
    // (a toast, role="status"/"alert" region from sonner) within a couple
    // of seconds of the tap.
    await expect(page.getByText('unauthorized', { exact: false })).toHaveCount(0, { timeout: 3_000 });
    await expect(page.getByText('Call failed', { exact: false })).toHaveCount(0);

    // Reached create-daily-meeting-token at all, and with the REFRESHED
    // token (proves refreshSession() ran and its result was actually used,
    // not just that some token happened to be present).
    await expect.poll(() => dailyTokenRequestSeen, { timeout: 15_000, message: 'create-daily-meeting-token was never called' }).toBe(true);
    expect(capturedAuthHeader).toBe(`Bearer ${FRESH_TOKEN}`);

    // Same tab, never a new one.
    expect(newPagesOpened, 'Voice must not open a new tab/window').toBe(0);
    await expect(page).toHaveURL(/\/call\/chat_room\//);

    // CallPage itself rendered (not stuck on "This call link isn't valid" or a blank screen).
    await expect(page.getByRole('button', { name: 'Leave call' })).toBeVisible({ timeout: 15_000 });

    expect(consoleErrors, `uncaught page errors:\n${consoleErrors.join('\n')}`).toEqual([]);

    // Leaving returns to the exact stall this call was started from (same
    // returnTo-state pattern as the Message button), not /dashboard.
    await page.getByRole('button', { name: 'Leave call' }).click();
    await expect(page).toHaveURL(/\/stall\/amber/);
  });
});
