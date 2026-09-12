import { test, expect, type Page } from '@playwright/test';

// Bug report: SeedCard (compact variant, inside StallHotspotSheet) on
// desktop -- the right-hand action rail overlaps the 45s player bar at the
// bottom of the cover; the Report button sits on the bar and a tap starts
// playback instead of opening Report.
//
// Root-caused with a direct elementFromPoint measurement against the real
// built app (no .env.test in this environment -- see seedcard-call.spec.ts's
// own note): the rail (`absolute right-1 top-1 bottom-1 z-10 ... overflow-y-
// auto`, auto-width) and the player bar (`absolute bottom-0 inset-x-0`,
// full cover width, z-index auto) genuinely overlapped in a ~40-44px band
// at the bottom-right corner of the cover -- the rail's own clip box ran
// 4px short of the cover's bottom edge, same depth the player bar
// occupies. Two compounding effects:
//   1. Within that overlap band, whichever rail button actually painted
//      there DID correctly win the tap (z-10 beats the player bar's
//      z-index:auto) -- so this alone doesn't fully explain "tap starts
//      playback."
//   2. The real cause: 7 stacked rail buttons (Message/Voice/Video/Heart/
//      Go Live/Share/Report) don't fit inside the rail's available height
//      on a compact card, so the tail end (Share, Report) scrolls out of
//      the rail's own clipped viewport. Their true (unclipped)
//      getBoundingClientRect() position -- which is what a bug report's
//      "the button is right there, why doesn't tapping it work" reasoning
//      naturally uses -- lands BELOW the visible rail, overlapping
//      whatever real content sits there: the player bar (matches the
//      report) or, if the overflow is larger (as measured here), the
//      content area below the cover entirely. Either way, elementFromPoint
//      at Report's own (unclipped) center never resolved to Report.
//
// Fixed (src/components/seeds/SeedCard.tsx): the rail now has a fixed
// w-10 width (was auto) and, whenever the player bar renders, a bottom-12
// inset (44px player bar + the same 4px margin bottom-1 gives everywhere
// else) instead of bottom-1 -- its clip box now ends strictly above the
// player bar, never overlapping it at all. InlinePreviewBar gained an
// insetForRail prop (set only by the compact variant's in-cover usage):
// right-10 instead of the default inset-x-0, so the bar's own width is
// exactly "cover width minus rail width," and a fixed h-11 (44px, matching
// what the feed variant already gets from its own external wrapper)
// instead of intrinsic/padding-driven height, so the rail's bottom-12 has
// a known quantity to size against.
//
// This does NOT make every rail button fit without scrolling (a bigger
// redesign than "the rail must never overlap the player bar" asked for) --
// Report can still require scrolling the rail's own overflow-y-auto area
// to reach on a compact card with a player bar. What's fixed is that
// wherever it ends up once scrolled into view, it's geometrically
// guaranteed to never coincide with the player bar's own box, so a tap
// there can never land on Play/Pause instead.

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
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test.describe(`SeedCard rail vs. player bar (${viewport.width}x${viewport.height})`, () => {
    test.use({ viewport });

    test('the rail box and the player bar box never geometrically overlap', async ({ page }) => {
      await openMusicCard(page);

      const geom = await page.evaluate(() => {
        const playBtn = document.querySelector('button[aria-label="Play preview"], button[aria-label="Pause preview"]');
        const rail = document.querySelector('button[aria-label="Report"]')?.closest('div.absolute.right-1') ?? null;
        const playerBar = playBtn?.closest('div.absolute.bottom-0') ?? null;
        const r = (el: Element | null) => (el ? el.getBoundingClientRect() : null);
        return { railRect: r(rail), playerBarRect: r(playerBar) };
      });

      expect(geom.railRect, 'rail not found').not.toBeNull();
      expect(geom.playerBarRect, 'player bar not found').not.toBeNull();
      const rail = geom.railRect!;
      const bar = geom.playerBarRect!;
      // No vertical overlap: the rail's own bottom edge must sit at or
      // above the player bar's top edge.
      expect(rail.bottom, `rail bottom (${rail.bottom}) must not dip below the player bar's top (${bar.top})`).toBeLessThanOrEqual(bar.top + 0.5);
      // The player bar must not extend under the rail column horizontally.
      expect(bar.right, `player bar right edge (${bar.right}) must not reach past the rail's left edge (${rail.left})`).toBeLessThanOrEqual(rail.left + 0.5);
    });

    test('elementFromPoint at the play button\'s centre resolves to the play button', async ({ page }) => {
      await openMusicCard(page);
      const result = await page.evaluate(() => {
        const btn = document.querySelector('button[aria-label="Play preview"], button[aria-label="Pause preview"]');
        if (!btn) return { error: 'play button not found' };
        const rect = btn.getBoundingClientRect();
        const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return { isSelf: top === btn || btn.contains(top) || (!!top && top.contains(btn)) };
      });
      expect(result.isSelf).toBe(true);
    });

    test('elementFromPoint at Report\'s centre (once scrolled into view within the rail) resolves to the Report button, and tapping it opens Report, not playback', async ({ page }) => {
      await openMusicCard(page);

      const beforeScroll = await page.evaluate(() => {
        const reportBtn = document.querySelector('button[aria-label="Report"]');
        const rail = reportBtn?.closest('div.absolute.right-1') as HTMLElement | null;
        if (!rail || !reportBtn) return { error: 'not found' };
        rail.scrollTop = rail.scrollHeight; // scroll the rail's own overflow-y-auto area to reveal the last item
        return { scrolled: true };
      });
      expect(beforeScroll.error).toBeUndefined();

      const hit = await page.evaluate(() => {
        const reportBtn = document.querySelector('button[aria-label="Report"]');
        if (!reportBtn) return { error: 'not found' };
        const rect = reportBtn.getBoundingClientRect();
        const cx = rect.x + rect.width / 2;
        const cy = rect.y + rect.height / 2;
        const top = document.elementFromPoint(cx, cy);
        return {
          isSelf: top === reportBtn || reportBtn.contains(top) || (!!top && top.contains(reportBtn)),
          topAriaLabel: top?.getAttribute?.('aria-label') ?? null,
        };
      });
      expect(hit.isSelf, `elementFromPoint at Report's centre hit something else (aria-label="${hit.topAriaLabel}") instead`).toBe(true);

      // Behavioral confirmation, not just geometry: clicking there opens
      // the Report dialog and never toggles playback.
      const playBtn = page.locator('button[aria-label="Play preview"], button[aria-label="Pause preview"]');
      await page.locator('button[aria-label="Report"]').click();
      await expect(page.getByRole('dialog', { name: 'Report content' })).toBeVisible({ timeout: 5_000 });
      await expect(page.locator('button[aria-label="Pause preview"]')).toHaveCount(0); // never started playing
      await expect(playBtn.or(page.locator('button[aria-label="Pause preview"]'))).toHaveCount(1); // still just the one player button, unaffected
    });
  });
}
