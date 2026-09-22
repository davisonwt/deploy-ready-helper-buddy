import { test, expect, type Page } from '@playwright/test';
import {
  asUser, createStallFixture, createShelfSeedFixture, setStallHotspots,
  deleteStallFixture, sweepProducts, sweepStorage, reportSweep, signInThroughUi,
} from './support/fixtures';

/**
 * Per-hotspot seed subsets: two boxes of the same kind open DIFFERENT finds.
 *
 * Everything here is this run's own -- its own stall, its own four book
 * seeds, its own three hotspots -- created in beforeAll and deleted in
 * afterAll. No real member's stall, listing or hotspot is written to, on
 * any account. davisontest1 is used because it is a test account
 * (profiles.is_test = true) that owns no stall of its own; the fixture
 * refuses to run if that ever stops being true.
 *
 * Run: npx playwright test --config=playwright.live.config.ts stall-hotspot-subsets
 */

// Checked in beforeAll by asUser, which throws naming the missing variable
// rather than skipping. NOT checked at module scope: this file is also
// collected (and cannot run) by `vitest run`, whose config excludes
// tests/payments but not tests/live, and a module-scope throw there is a
// setup error about nothing. It still never skips -- see beforeAll.
const EMAIL = process.env.TEST_USER_EMAIL || '';
const PASS = process.env.TEST_USER_PASSWORD || '';

const STAMP = Date.now();
const TITLES = [
  `QA Subset Seed One ${STAMP}`,
  `QA Subset Seed Two ${STAMP}`,
  `QA Subset Seed Three ${STAMP}`,
  `QA Subset Seed Four ${STAMP}`,
];
/** Two boxes deliberately SHARE a label -- same-kind, same-label repeats are the point, never a bug. */
const NOOK = 'Reading Nook';
const WHOLE = 'The Whole Shelf';

let client: Awaited<ReturnType<typeof asUser>>['client'];
let userId: string;
let stallId: string;
let objectPaths: string[] = [];
let seedIds: string[] = [];
let username = 'davisontest1';

test.describe.serial('per-hotspot seed subsets', () => {
  test.beforeAll(async () => {
    const signedIn = await asUser(EMAIL, PASS, 'davisontest1');
    client = signedIn.client;
    userId = signedIn.userId;

    const { data: profile } = await client.from('profiles').select('username').eq('user_id', userId).maybeSingle();
    const uname = (profile as { username?: string } | null)?.username;
    if (uname) username = uname;

    seedIds = [];
    for (const t of TITLES) seedIds.push(await createShelfSeedFixture(client, userId, t));

    const created = await createStallFixture(client, userId, `QA Subset Stall ${STAMP}`);
    stallId = created.stallId;
    objectPaths = created.objectPaths;

    await setStallHotspots(client, stallId, [
      { id: 'qa-box-a', kind: 'books', label: NOOK, x: 5, y: 55, w: 22, h: 30, seed_ids: [seedIds[0], seedIds[1]] },
      { id: 'qa-box-b', kind: 'books', label: NOOK, x: 35, y: 55, w: 22, h: 30, seed_ids: [seedIds[2]] },
      { id: 'qa-box-c', kind: 'books', label: WHOLE, x: 65, y: 55, w: 22, h: 30 },
    ]);
    console.log(`[SETUP] 3 books boxes on ${stallId}: A=2 seeds, B=1 seed, C=unassigned`);
  });

  test.afterAll(async () => {
    if (!client) return;
    if (stallId) await deleteStallFixture(client, stallId);
    if (objectPaths.length) {
      const objects = await sweepStorage(client, 'stalls', objectPaths);
      console.log(`[TEARDOWN] stall images removed (${objects} of ${objectPaths.length} objects)`);
    }
    const swept = await sweepProducts(client, userId, TITLES);
    reportSweep('stall-hotspot-subsets', swept);

    // Residue check: prove it, do not claim it.
    const { data: stallsLeft } = await client.from('stalls').select('id').eq('user_id', userId);
    const { data: sowers } = await client.from('sowers').select('id').eq('user_id', userId);
    const { data: seedsLeft } = await client
      .from('products').select('id')
      .in('sower_id', (sowers ?? []).map((s: { id: string }) => s.id))
      .in('title', TITLES);
    console.log(`[RESIDUE] stalls left for davisontest1: ${stallsLeft?.length ?? 0} (expected 0)`);
    console.log(`[RESIDUE] QA seeds left: ${seedsLeft?.length ?? 0} (expected 0)`);
    expect(stallsLeft?.length ?? 0, 'fixture stall left behind').toBe(0);
    expect(seedsLeft?.length ?? 0, 'fixture seeds left behind').toBe(0);
  });

  test('1. an assigned box opens ONLY its own seeds', async ({ page }) => {
    await login(page);
    await openInterior(page);
    await openBox(page, NOOK, 0);
    await expectSeeds(page, [TITLES[0], TITLES[1]], [TITLES[2], TITLES[3]]);
  });

  test('2. the other box of the SAME kind and SAME label opens a different find', async ({ page }) => {
    await login(page);
    await openInterior(page);
    await openBox(page, NOOK, 1);
    await expectSeeds(page, [TITLES[2]], [TITLES[0], TITLES[1], TITLES[3]]);
  });

  test('3. the unassigned box still opens everything -- unchanged behaviour', async ({ page }) => {
    await login(page);
    await openInterior(page);
    await openBox(page, WHOLE, 0);
    await expectSeeds(page, TITLES, []);
  });

  test('4. a logged-out visitor sees the same subset through a shared link', async ({ browser }) => {
    // A signed-out TAP does not open a shelf at all -- it opens the join
    // sheet (StallInteriorView.handleHotspotTap returns early on !user).
    // That is pre-existing behaviour this change did not alter, so the
    // guest path is exercised the only way it is actually reachable: the
    // shared link, which names the box.
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await page.goto(`/stall/${username}#stall-kind=books&box=qa-box-a`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(8000);
      await expectSeeds(page, [TITLES[0], TITLES[1]], [TITLES[2], TITLES[3]]);
    } finally {
      await ctx.close();
    }
  });

  test('5. a signed-out tap still opens the join sheet, not a shelf', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await openInterior(page);
      await page.getByRole('button', { name: NOOK }).first().click();
      await page.waitForTimeout(2500);
      await expect(page.getByText(TITLES[0])).toHaveCount(0);
    } finally {
      await ctx.close();
    }
  });
});

async function login(page: Page) {
  await signInThroughUi(page, EMAIL, PASS, 'davisontest1');
}

async function openInterior(page: Page) {
  await page.goto(`/stall/${username}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);
}

/**
 * Open one box by label and POSITION. Never asserts a label is unique --
 * two of these three share one on purpose (CLAUDE.md: repeated hotspots
 * are the point).
 */
async function openBox(page: Page, label: string, nth: number) {
  const boxes = page.getByRole('button', { name: label });
  await expect(boxes.nth(nth), `box "${label}" #${nth} should be painted`).toBeVisible({ timeout: 30000 });
  await boxes.nth(nth).click();
  await page.waitForTimeout(4000);
}

/** Seed titles only ever render inside the open shelf, so page-level text is a sound check. */
async function expectSeeds(page: Page, present: string[], absent: string[]) {
  for (const t of present) {
    await expect(page.getByText(t, { exact: false }).first(), `"${t}" should be on this box`).toBeVisible({ timeout: 20000 });
  }
  for (const t of absent) {
    await expect(page.getByText(t, { exact: false }), `"${t}" must NOT be on this box`).toHaveCount(0);
  }
}
