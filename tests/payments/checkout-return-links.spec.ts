import { test, expect, type Page } from '@playwright/test';

// Flow v2 step 14 (docs/FLOW-V2-MAP.md): the checkout pages' "go to my own
// home" links pointed at the legacy /dashboard alias -- now /cockpit
// directly. Same hermetic stub pattern as the rest of this suite: real
// production bundle, fake auth session, stubbed Supabase REST.

const SUPABASE_PROJECT_REF = 'zuwkgasbkpjlxzsjzumu';
const SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;
const CALLER_USER_ID = '00000000-0000-4000-8000-000000000090';

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
          email: 'checkout-fixture-playwright@example.com', user_metadata: {}, app_metadata: {},
        },
      },
    },
  );
}

async function stubBackend(page: Page) {
  await page.route(`${SUPABASE_URL}/rest/v1/**`, async (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.replace('/rest/v1/', '').split('?')[0];
    const wantsObject = (route.request().headers()['accept'] ?? '').includes('vnd.pgrst.object');
    const reply = (rows: unknown[]) => route.fulfill({ json: wantsObject ? (rows[0] ?? null) : rows });
    if (table === 'profiles') {
      return reply([{ user_id: CALLER_USER_ID, security_setup_complete: true, payout_setup_complete: true, is_chatapp_verified: true }]);
    }
    return reply([]);
  });
  await page.route(`${SUPABASE_URL}/rest/v1/rpc/**`, (route) => route.fulfill({ json: null }));
}

test.describe('checkout pages link back to /cockpit, not the legacy /dashboard alias (Flow v2 step 14)', () => {
  test('/products/basket "My Stall" button targets /cockpit', async ({ page }) => {
    await stubAuthSession(page);
    await stubBackend(page);
    await page.goto('/products/basket', { waitUntil: 'networkidle' });

    await expect(page.getByRole('link', { name: 'My Stall' })).toHaveAttribute('href', '/cockpit');
    // No returnTo state on a direct visit -- falls back to generic /products, not a stall.
    await expect(page.getByRole('link', { name: 'Products' })).toHaveAttribute('href', '/products');
  });
});
