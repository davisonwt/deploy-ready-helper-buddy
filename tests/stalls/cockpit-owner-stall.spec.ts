import { test, expect, type Page } from '@playwright/test';

// Flow v2 step 13 (docs/FLOW-V2-MAP.md): /cockpit is now the owner's own
// StallInteriorView, full stop -- no dashboard chrome (stats/tiers/week
// beads/header) left around it. Same hermetic stub pattern as
// tests/stalls/karoo-honey-hotspots.spec.ts: real production bundle, fake
// auth session, stubbed Supabase REST.

const SUPABASE_PROJECT_REF = 'zuwkgasbkpjlxzsjzumu';
const SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;
const CALLER_USER_ID = '00000000-0000-4000-8000-000000000080';

const TINY_PNG_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const HOTSPOTS = [
  { kind: 'products', label: 'Our Products', x: 2.0, y: 86.0, w: 17.7, h: 11.0 },
];

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
          email: 'cockpit-fixture-playwright@example.com', user_metadata: {}, app_metadata: {},
        },
      },
    },
  );
}

async function stubBackend(page: Page, opts: { hasStall: boolean }) {
  await page.route(`${SUPABASE_URL}/rest/v1/**`, async (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.replace('/rest/v1/', '').split('?')[0];
    const wantsObject = (route.request().headers()['accept'] ?? '').includes('vnd.pgrst.object');
    const reply = (rows: unknown[]) => route.fulfill({ json: wantsObject ? (rows[0] ?? null) : rows });
    if (table === 'profiles') {
      return reply([{ user_id: CALLER_USER_ID, security_setup_complete: true, payout_setup_complete: true, is_chatapp_verified: true }]);
    }
    if (table === 'stalls') {
      if (!opts.hasStall) return reply([]);
      return reply([{
        name: 'Fixture Stall', tier: 'farm_stall',
        front_image_path: TINY_PNG_DATA_URI, interior_image_path: TINY_PNG_DATA_URI,
        hotspots: HOTSPOTS, published: true,
      }]);
    }
    if (table === 'stall_visits') return reply([]);
    return reply([]);
  });
  await page.route(`${SUPABASE_URL}/rest/v1/rpc/**`, (route) => route.fulfill({ json: null }));
}

test.describe('/cockpit is the owner\'s own stall (Flow v2 step 13)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('shows only the stall interior, Owner Menu, and bottom bar -- no dashboard chrome', async ({ page }) => {
    await stubAuthSession(page);
    await stubBackend(page, { hasStall: true });
    await page.goto('/cockpit', { waitUntil: 'networkidle' });

    // The stall interior itself (StallSideNav's own "My Stall / Cockpit" row is proof the frame rendered).
    await expect(page.getByText('My Stall / Cockpit', { exact: false })).toBeVisible({ timeout: 15_000 });

    // Header-tap Owner Menu (the interior's own "Edit stall" pill).
    await expect(page.getByRole('button', { name: 'Owner menu' })).toBeVisible();

    // Bottom bar (Plant Seed / Go Live / Chat) survives alongside the interior.
    await expect(page.getByText('🌱 Plant Seed')).toBeVisible();
    await expect(page.getByText('🔴 Go Live')).toBeVisible();
    // Renamed "Global Chat" and repointed at the Global room (2b4f7aa5, 2026-09-19).
    await expect(page.getByText('💬 Global Chat')).toBeVisible();

    // No dashboard chrome left: stats/tiers/week-beads sections and the old header are gone.
    await expect(page.getByText("Day's Beads", { exact: false })).toHaveCount(0);
    await expect(page.getByText('Tribal Tiers', { exact: false })).toHaveCount(0);
    await expect(page.getByText('SEEDFLOW TIP', { exact: false })).toHaveCount(0);
    await expect(page.getByText('Welcome back', { exact: false })).toHaveCount(0);

    // hideClose swapped the X for Log out -- there's nowhere else to sign out from this page.
    await expect(page.getByRole('button', { name: 'Close' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
  });

  test('shows the "your plot is ready" first-run page, with a way to start building, when the owner has no stall yet', async ({ page }) => {
    await stubAuthSession(page);
    await stubBackend(page, { hasStall: false });
    await page.goto('/cockpit', { waitUntil: 'networkidle' });

    // EmptyPlotView replaced the plain "Build your stall" card (08d5251f, 2026-09-13).
    await expect(page.getByRole('heading', { name: 'your plot is ready' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('link', { name: 'start building' }).first()).toHaveAttribute('href', '/stall/build');
  });
});
