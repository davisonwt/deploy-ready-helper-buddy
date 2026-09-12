import { test, expect, type Page } from '@playwright/test';

// "Karoo Honey" stall (real row: stalls.user_id b6932c56-6892-4648-b171-
// bd181b6c13d1, username wesselsangelique3, name "KAROO BEE/BY" -- the
// interior's own painted sign says "Karoo Honey", the `name` column
// doesn't; see scripts/studio/set-karoo-honey-hotspots.sql for the full
// story) -- its 5 painted wooden plaques now have real hotspots
// (products/books/services/story/custom left to right).
//
// Wiring 'products' and 'services' required a CODE fix, not just data:
// StallHotspotSheet.tsx's type-filter ternary had no branch for either --
// both are valid TileKind values (used elsewhere for stall TILES, a
// different UI element), but a hotspot painted with either kind fell
// through to the generic else (['book','ebook']) and silently showed
// books instead. This spec is the lasting regression coverage for that
// fix: renders the real interior at 1440x900 (the fixture size this was
// verified against when written) with the real hotspots.x/y/w/h this
// stall's row was actually set to, confirms all 5 buttons land where
// painted (elementFromPoint at each button's own center resolves to
// itself), and confirms tapping "Our Products" opens a sheet titled
// "Products" (not the pre-fix "books" fallback).

const SUPABASE_PROJECT_REF = 'zuwkgasbkpjlxzsjzumu';
const SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;
const CALLER_USER_ID = '00000000-0000-4000-8000-000000000070';
const KAROO_USER_ID = 'b6932c56-6892-4648-b171-bd181b6c13d1';
const KAROO_SOWER_ID = '00000000-0000-4000-8000-000000000071';

// Same data: URI trick used elsewhere in this suite -- the fixture only
// needs an image that LOADS (StallVisitPage falls back to a "front" card
// if the interior image errors), not the real photo; the hotspot
// coordinates are what's under test, not the artwork itself.
const TINY_PNG_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const HOTSPOTS = [
  { kind: 'products', label: 'Our Products', x: 2.0, y: 86.0, w: 17.7, h: 11.0 },
  { kind: 'books', label: 'Our Recipes', x: 21.6, y: 86.0, w: 17.7, h: 11.0 },
  { kind: 'services', label: 'Our Services', x: 41.3, y: 86.0, w: 17.5, h: 11.0 },
  { kind: 'story', label: 'Our Story', x: 60.9, y: 86.0, w: 17.6, h: 11.0 },
  { kind: 'custom', label: 'Bee Facts', x: 80.5, y: 86.0, w: 17.7, h: 11.0 },
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
          email: 'karoo-fixture-playwright@example.com', user_metadata: {}, app_metadata: {},
        },
      },
    },
  );
}

async function stubKarooBackend(page: Page) {
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
        id: '3c4917e5-e0a4-4170-b081-5193743e31c5', user_id: KAROO_USER_ID, name: 'KAROO BEE/BY', tagline: 'Anything Bee',
        tier: 'farm_stall', front_image_path: TINY_PNG_DATA_URI, interior_image_path: TINY_PNG_DATA_URI,
        hotspots: HOTSPOTS, published: true,
      }]);
    }
    if (table === 'sowers') return reply([{ id: KAROO_SOWER_ID }]);
    if (table === 'companies') return reply([]);
    if (table === 'radio_djs') return reply([]);
    if (table === 'products') return reply([]);
    if (table === 'sower_books') return reply([]);
    return reply([]);
  });
  await page.route(`${SUPABASE_URL}/rest/v1/rpc/**`, (route) => route.fulfill({ json: null }));
  await page.route(`${SUPABASE_URL}/rest/v1/rpc/get_stall_owner_id_by_username`, (route) =>
    route.fulfill({ json: KAROO_USER_ID }),
  );
}

test.describe('Karoo Honey stall hotspots (1440x900)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('all 5 painted buttons render at their set coordinates and each resolves to itself', async ({ page }) => {
    await stubAuthSession(page);
    await stubKarooBackend(page);
    await page.goto('/stall/wesselsangelique3', { waitUntil: 'networkidle' });

    for (const h of HOTSPOTS) {
      const btn = page.getByRole('button', { name: h.label, exact: true });
      await expect(btn, `"${h.label}" button not found`).toBeVisible({ timeout: 15_000 });
      const box = await btn.boundingBox();
      expect(box, `"${h.label}" has no bounding box`).not.toBeNull();
      const hit = await page.evaluate(({ x, y }) => {
        const top = document.elementFromPoint(x, y);
        return { isSelf: false, ariaLabel: top?.getAttribute?.('aria-label') ?? null, tag: top?.tagName ?? null };
      }, { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 });
      expect(hit.ariaLabel, `elementFromPoint at "${h.label}"'s centre hit "${hit.ariaLabel}" (${hit.tag}) instead`).toBe(h.label);
    }
  });

  test('"Our Products" opens a sheet titled "Products" -- not the pre-fix books fallback', async ({ page }) => {
    await stubAuthSession(page);
    await stubKarooBackend(page);
    await page.goto('/stall/wesselsangelique3', { waitUntil: 'networkidle' });

    await page.getByRole('button', { name: 'Our Products', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Products', exact: true, level: 2 })).toBeVisible({ timeout: 5_000 });
  });

  test('"Our Services" opens a sheet titled "Services" -- not the pre-fix books fallback', async ({ page }) => {
    await stubAuthSession(page);
    await stubKarooBackend(page);
    await page.goto('/stall/wesselsangelique3', { waitUntil: 'networkidle' });

    await page.getByRole('button', { name: 'Our Services', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Services', exact: true, level: 2 })).toBeVisible({ timeout: 5_000 });
  });
});
