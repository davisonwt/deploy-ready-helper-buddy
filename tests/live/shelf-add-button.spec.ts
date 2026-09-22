import { test, expect, type Page } from '@playwright/test';
import {
  asUser, createStallFixture, setStallHotspots, deleteStallFixture, sweepStorage, signInThroughUi,
} from './support/fixtures';
import { openHotspot } from './support/interior';

/**
 * The "+" is a property of OWNING a shelf, not of the shelf's kind.
 *
 * Sowers name their own shelves. The first version of this control was keyed
 * off a fixed list of known kinds (books/music/lyrics/products), so a member's
 * own category -- "Family Albums" -- silently had no way in. This walks EVERY
 * shelf on the stall rather than asserting one, so a kind that is added later
 * and forgotten fails here instead of shipping.
 *
 * The second half is the half that matters: an owner-only control a visitor
 * can see would be worse than the missing control it replaced.
 *
 * FIXTURE: this run builds its own stall, with its own four shelves including
 * the custom "Family Albums", and deletes it in afterAll. It used to point at
 * whatever davisontest1's standing stall happened to hold, which is exactly
 * the persistent-fixture pattern the repo has been removing: that stall was
 * torn down, and from then on this spec reported all four shelves missing on
 * every run -- a real-looking failure with no bug behind it.
 *
 * Run: npx playwright test --config=playwright.live.config.ts shelf-add-button
 */

// Owner is davisontest2, NOT davisontest1. stalls.user_id is UNIQUE and one
// stall per account is all you get, so two fixture specs pointed at the same
// account cannot both hold one -- and stall-hotspot-subsets already owns
// davisontest1 for the length of its run. They run in parallel workers, so
// sharing the account would collide on whichever started second.
// The visitor is davisontest1: a real second member, and never the founder.
const OWNER_E = process.env.TEST_B_EMAIL || process.env.TEST_USER3_EMAIL || '';
const OWNER_P = process.env.TEST_B_PASSWORD || process.env.TEST_USER3_PASSWORD || '';
const VISITOR_E = process.env.TEST_A_EMAIL || process.env.TEST_USER_EMAIL || '';
const VISITOR_P = process.env.TEST_A_PASSWORD || process.env.TEST_USER_PASSWORD || '';

/** 'story' lists nothing, so it correctly has no "+" -- every other shelf must. */
const LISTING_SHELVES = ['Books', 'Music', 'Lyrics', 'Family Albums'];

const STAMP = Date.now();
let client: Awaited<ReturnType<typeof asUser>>['client'];
let userId: string;
let stallId: string;
let objectPaths: string[] = [];
let username = 'davisontest2';

test.describe.serial('Shelf add button', () => {
  test.setTimeout(8 * 60_000);

  test.beforeAll(async () => {
    // Missing credentials FAIL here, naming the variable -- never a skip.
    const signedIn = await asUser(OWNER_E, OWNER_P, 'the stall owner');
    client = signedIn.client;
    userId = signedIn.userId;

    const { data: profile } = await client.from('profiles').select('username').eq('user_id', userId).maybeSingle();
    const uname = (profile as { username?: string } | null)?.username;
    if (uname) username = uname;

    const created = await createStallFixture(client, userId, `QA Add-Button Stall ${STAMP}`);
    stallId = created.stallId;
    objectPaths = created.objectPaths;

    // One box per listing kind, including a member-named custom one -- the
    // case the "+" used to miss.
    await setStallHotspots(client, stallId, [
      { id: 'qa-add-books', kind: 'books', label: 'Books', x: 4, y: 55, w: 20, h: 30 },
      { id: 'qa-add-music', kind: 'music', label: 'Music', x: 28, y: 55, w: 20, h: 30 },
      { id: 'qa-add-lyrics', kind: 'lyrics', label: 'Lyrics', x: 52, y: 55, w: 20, h: 30 },
      { id: 'qa-add-custom', kind: 'custom', label: 'Family Albums', x: 76, y: 55, w: 20, h: 30 },
    ]);
    console.log(`[SETUP] add-button stall ${stallId} with ${LISTING_SHELVES.length} shelves`);
  });

  test.afterAll(async () => {
    if (!client) return;
    if (stallId) await deleteStallFixture(client, stallId);
    if (objectPaths.length) {
      const n = await sweepStorage(client, 'stalls', objectPaths);
      console.log(`[TEARDOWN] stall images removed (${n} of ${objectPaths.length} objects)`);
    }
    const { data: left } = await client.from('stalls').select('id').eq('user_id', userId);
    console.log(`[RESIDUE] stalls left for the owner: ${left?.length ?? 0} (expected 0)`);
    expect(left?.length ?? 0, 'fixture stall left behind').toBe(0);
  });

  test('1. the owner sees "+" on EVERY listing shelf, custom categories included', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signInThroughUi(page, OWNER_E, OWNER_P, 'the stall owner');
    await gotoStall(page);

    const missing: string[] = [];
    for (const label of LISTING_SHELVES) {
      const { opened, addControls, why } = await openShelf(page, label);
      console.log(`[OWNER] ${label}: opened=${opened} addControls=${addControls}${why ? ` (${why})` : ''}`);
      if (!opened || addControls < 1) missing.push(`${label} (opened=${opened}, add=${addControls})`);
      await closeShelf(page);
    }
    await page.screenshot({ path: 'test-results/shelf-add-owner.png' });
    expect(
      missing,
      'the owner has no way to add to these shelves -- a "+" keyed on kind instead of ownership is what caused this',
    ).toEqual([]);
  });

  test('2. a VISITOR never sees it, on any shelf', async ({ page }) => {
    // signInThroughUi throws naming the variable if these are unset; the
    // account must simply not be the one that owns the fixture stall.
    await page.setViewportSize({ width: 390, height: 844 });
    await signInThroughUi(page, VISITOR_E, VISITOR_P, 'the visitor');
    await gotoStall(page);

    const leaked: string[] = [];
    for (const label of LISTING_SHELVES) {
      const { opened, addControls, why } = await openShelf(page, label);
      console.log(`[VISITOR] ${label}: opened=${opened} addControls=${addControls}${why ? ` (${why})` : ''}`);
      // The shelf must still OPEN for a visitor -- absence of the "+" must
      // never mean absence of the shelf.
      expect(opened, `the shelf "${label}" did not open for a visitor at all`).toBe(true);
      if (addControls !== 0) leaked.push(`${label} (${addControls})`);
      await closeShelf(page);
    }
    await page.screenshot({ path: 'test-results/shelf-add-visitor.png' });
    expect(leaked, 'a visitor was offered an owner-only Add control').toEqual([]);
  });
});

async function gotoStall(page: Page) {
  await page.goto(`/stall/${username}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button[aria-label="Books"]', { timeout: 30000 });
}

/**
 * Open one shelf by its own label, and report whether the "+" is there.
 *
 * Pans the box into the window (the interior is a strip wider than a phone
 * window) and records WHY it could not be opened instead of throwing, so one
 * unreachable shelf does not hide the state of the other three -- walking
 * every shelf is the point of this spec.
 */
async function openShelf(page: Page, label: string): Promise<{ opened: boolean; addControls: number; why?: string }> {
  try {
    await openHotspot(page, label);
  } catch (e) {
    return { opened: false, addControls: -1, why: (e as Error).message.split('\n')[0].slice(0, 120) };
  }
  const opened = await page.waitForSelector('button[aria-label="Close shelf"]', { timeout: 15000 })
    .then(() => true).catch(() => false);
  const addControls = await page.getByRole('button', { name: /^Add to /i }).count();
  return { opened, addControls };
}

async function closeShelf(page: Page) {
  const close = page.getByRole('button', { name: 'Close shelf' }).first();
  if (await close.count()) await close.click().catch(() => {});
  await page.waitForSelector('button[aria-label="Close shelf"]', { state: 'detached', timeout: 15000 }).catch(() => {});
}
