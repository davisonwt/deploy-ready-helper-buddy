import { test, expect, type Page } from '@playwright/test';
import { SUPA, PUBKEY } from './support/fixtures';

/**
 * BulkSeedFeedPage's "Trending" tab orders by products.bestowal_count.
 * Until 20260925160000 that column read 0 on every product, so Trending was
 * just insertion order. It now equals each product's completed bestowals,
 * so a bestowed seed must sort ahead of unbestowed ones.
 *
 * Read-only: real sowers' public feeds, nothing written. The feed's cards
 * carry no id attribute, so order is read from where each title appears in
 * the page. Counts measured 2026-09-25: Not the blood 2; You, I love. 4;
 * The Psalms Project (VOL 1) 1; everything else on those feeds 0. A later
 * sale can legitimately change the order -- the failure prints it.
 *
 *   npx playwright test --config=playwright.live.config.ts bulk-feed-trending
 */

async function openTrending(page: Page, slug: string, waitFor: string): Promise<string> {
  await page.goto(`/bulk/sower/${slug}/feed`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Trending' }).click({ timeout: 45000 });
  await expect(page.getByText(waitFor, { exact: false }).first()).toBeVisible({ timeout: 45000 });
  await page.waitForTimeout(2500);
  return page.locator('body').innerText();
}

/** The same public lookups the page makes: sower by slug, then its non-archived products. */
async function feedTitles(slug: string): Promise<string[]> {
  const h = { apikey: PUBKEY, Authorization: `Bearer ${PUBKEY}` };
  const [sower] = await (await fetch(`${SUPA}/rest/v1/sowers?select=id&slug=eq.${slug}`, { headers: h })).json();
  if (!sower) throw new Error(`no sower with slug ${slug}`);
  const rows = await (await fetch(`${SUPA}/rest/v1/products?select=title&sower_id=eq.${sower.id}&status=neq.archived`, { headers: h })).json();
  return (rows as { title: string }[]).map((r) => r.title.trim()).filter(Boolean);
}

test('Trending puts the only bestowed seed first (the-r-i-s-e-coach)', async ({ page }) => {
  const titles = await feedTitles('the-r-i-s-e-coach-1225d4');
  const body = await openTrending(page, 'the-r-i-s-e-coach-1225d4', 'Not the blood');
  const shown = titles.map((t) => ({ t, at: body.indexOf(t) })).filter((x) => x.at >= 0).sort((a, b) => a.at - b.at);
  console.log(`[TRENDING the-r-i-s-e-coach] ${shown.length} of ${titles.length} titles shown, in order: ${JSON.stringify(shown.map((x) => x.t))}`);
  expect(shown.length, 'the feed shows several seeds').toBeGreaterThan(1);
  expect(shown[0].t, '"Not the blood" (2 bestowals) leads Trending').toBe('Not the blood');
});

test('Trending orders by bestowals, most first (Amber)', async ({ page }) => {
  const want = ['You, I love.', 'The Psalms Project (VOL 1)', 'The Psalms Project (VOL 2)'];
  const body = await openTrending(page, 'amber-wheeles-9ccd3c', want[0]);
  const order = want.map((t) => ({ t, at: body.indexOf(t) })).filter((x) => x.at >= 0).sort((a, b) => a.at - b.at).map((x) => x.t);
  console.log(`[TRENDING amber] order: ${JSON.stringify(order)}`);
  expect(order).toEqual(want);
});
