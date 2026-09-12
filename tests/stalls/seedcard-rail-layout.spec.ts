import { test, expect, type Page } from '@playwright/test';

// SeedCard compact rail (inside StallHotspotSheet): fixed 6 slots
// (Message/Voice/Video/Heart/Go Live/More), never scrolls, never overlaps
// the 45s player bar. Superseded an earlier overflow-y-auto version --
// Windows Chrome/Edge paint real scrollbars for that (no-scrollbar was
// never actually defined), and whichever button scrolled past the clip
// edge still resolved to the player bar via elementFromPoint. Share/Gift/
// Report moved into the More (⋯) popover.

const SUPABASE_PROJECT_REF = 'zuwkgasbkpjlxzsjzumu';
const SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;
const CALLER_USER_ID = '00000000-0000-4000-8000-000000000060';
const AMBER_USER_ID = '00000000-0000-4000-8000-000000000061';
const AMBER_SOWER_ID = '00000000-0000-4000-8000-000000000062';
const TRACK_ID = '00000000-0000-4000-8000-0000000000dd';

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
        id: TRACK_ID, title: 'Truth Will Mend', description: 'A test music seed', cover_image_url: null,
        image_urls: [], price: 2, category: 'music', file_url: null,
        preview_url: 'https://example.com/preview.mp3', created_at: new Date().toISOString(),
      }]);
    }
    return reply([]);
  });
  await page.route(`${SUPABASE_URL}/rest/v1/rpc/**`, (route) => route.fulfill({ json: null }));
  await page.route(`${SUPABASE_URL}/rest/v1/rpc/get_stall_owner_id_by_username`, (route) =>
    route.fulfill({ json: AMBER_USER_ID }),
  );
}

async function openMusicCard(page: Page) {
  await stubAuthSession(page);
  await stubStallBackend(page);
  await page.goto('/stall/amber', { waitUntil: 'networkidle' });
  const musicHotspot = page.getByRole('button', { name: 'Music' });
  await expect(musicHotspot).toBeVisible({ timeout: 15_000 });
  await musicHotspot.click();
  await expect(page.getByText('Truth Will Mend')).toBeVisible({ timeout: 15_000 });
  // Sheet slides in over transition-transform duration-200 -- let it settle
  // before reading button geometry, or boundingBox() can be measured
  // mid-slide and go stale by the time elementFromPoint runs against it.
  await page.waitForTimeout(350);
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test.describe(`SeedCard rail vs. player bar (${viewport.width}x${viewport.height})`, () => {
    test.use({ viewport });

    test('the rail box and the player bar box never geometrically overlap', async ({ page }) => {
      await openMusicCard(page);

      const geom = await page.evaluate(() => {
        const playBtn = document.querySelector('button[aria-label="Play preview"], button[aria-label="Pause preview"]');
        const rail = document.querySelector('button[aria-label="Message"]')?.closest('div.absolute.right-1') ?? null;
        const playerBar = playBtn?.closest('div.absolute.bottom-0') ?? null;
        const r = (el: Element | null) => (el ? el.getBoundingClientRect() : null);
        return { railRect: r(rail), playerBarRect: r(playerBar) };
      });

      expect(geom.railRect, 'rail not found').not.toBeNull();
      expect(geom.playerBarRect, 'player bar not found').not.toBeNull();
      const rail = geom.railRect!;
      const bar = geom.playerBarRect!;
      expect(rail.bottom, `rail bottom (${rail.bottom}) must not dip below the player bar's top (${bar.top})`).toBeLessThanOrEqual(bar.top + 0.5);
      expect(bar.right, `player bar right edge (${bar.right}) must not reach past the rail's left edge (${rail.left})`).toBeLessThanOrEqual(rail.left + 0.5);
    });

    test('no element with overflow:auto/scroll inside the card', async ({ page }) => {
      await openMusicCard(page);
      const offenders = await page.evaluate(() => {
        const card = document.querySelector('button[aria-label="Message"]')?.closest('.overflow-hidden, [class*="Card"]') ?? document.body;
        const all = [card, ...card.querySelectorAll('*')];
        return all
          .filter((el) => {
            const cs = getComputedStyle(el);
            return cs.overflowY === 'auto' || cs.overflowY === 'scroll' || cs.overflowX === 'auto' || cs.overflowX === 'scroll';
          })
          .map((el) => el.className);
      });
      expect(offenders).toEqual([]);
    });

    test('elementFromPoint at every rail button\'s centre resolves to that button', async ({ page }) => {
      await openMusicCard(page);
      for (const label of ['Message', 'Voice', 'Video', 'Heart', 'Go Live', 'More']) {
        const btn = page.locator(`button[aria-label="${label}"]`).first();
        await expect(btn, `"${label}" not found`).toBeVisible({ timeout: 10_000 });
        const box = await btn.boundingBox();
        // elementFromPoint's own top hit is the icon glyph (an <svg> painted
        // inside the button, no aria-label of its own) -- real clicks still
        // land on/bubble to the button underneath it, so climb to the
        // nearest button ancestor rather than reading the top node directly.
        const hit = await page.evaluate(({ x, y }) => {
          const top = document.elementFromPoint(x, y);
          const btnEl = top instanceof Element ? top.closest('button') : null;
          return btnEl?.getAttribute?.('aria-label') ?? null;
        }, { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 });
        expect(hit, `elementFromPoint at "${label}"'s centre hit "${hit}" instead`).toBe(label);
      }
    });

    test('"More" opens a popover; Report from it opens the Report dialog, never toggles playback', async ({ page }) => {
      await openMusicCard(page);
      await page.locator('button[aria-label="More"]').click();
      await page.getByRole('button', { name: 'Report', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Report content' })).toBeVisible({ timeout: 5_000 });
      await expect(page.locator('button[aria-label="Pause preview"]')).toHaveCount(0);
    });
  });
}
