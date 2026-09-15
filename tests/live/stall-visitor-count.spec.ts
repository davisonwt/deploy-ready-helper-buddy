import { test, expect, type Page } from '@playwright/test';

// Live verification for the stall visitor counter (stall_visitor_count
// RPC on top of the existing stall_visits table). Only 2 real test
// accounts are configured in this environment (TEST_USER = the stall
// owner, TEST_USER2 = the only available visitor) -- davisontest2 had
// already visited davisontest1's stall in earlier session testing, so
// test 1 first resets THEIR OWN stall_visits row (a legitimate,
// reversible self-delete under RLS: viewer_id = auth.uid(), not someone
// else's data) to get a clean "never visited" baseline, then visits
// once (distinct-visitor count should go up by exactly 1) and again
// (repeat visit -- count must NOT go up again). The owner's own count is
// read from the real rendered "Visitors" panel, not just the RPC, so this
// proves the live UI, not just the database.
//
// Run: npx playwright test --config=playwright.live.config.ts stall-visitor-count

const OWNER_EMAIL = process.env.TEST_USER_EMAIL ?? '';
const OWNER_PASS = process.env.TEST_USER_PASSWORD ?? '';
const OWNER_ID = 'de22c876-d477-4a5e-81a2-cd22091ce125'; // davisontest1
const VISITOR_EMAIL = process.env.TEST_USER2_EMAIL ?? '';
const VISITOR_PASS = process.env.TEST_USER2_PASSWORD ?? '';
const VISITOR_ID = 'a8872ed5-951c-4343-ba05-d4921af18eb2'; // davisontest2
const OWNER_STALL_USERNAME = 'davisontest1';

const SUPABASE_URL = 'https://zuwkgasbkpjlxzsjzumu.supabase.co';

async function login(page: Page, email: string, pass: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 }).catch(() => {});
}

/** Reads the owner-only "Visitors" number from StallTodayPanel on the
 * owner's own /cockpit (StallInteriorView with effectiveIsOwner=true). */
async function readOwnerVisitorCount(page: Page): Promise<number> {
  await page.goto('/cockpit', { waitUntil: 'domcontentloaded' });
  // StallTodayPanel is mounted more than once at once (desktop column +
  // mobile stacked + mobile drawer, only one actually visible per
  // viewport) -- both show the same RPC result, so filter to whichever
  // copy is actually visible rather than requiring exactly one match.
  const row = page.locator('div.flex.items-center.justify-between:visible').filter({ hasText: 'Unique visitors' }).first();
  await expect(row).toBeVisible({ timeout: 20000 });
  // Retry briefly -- the RPC fetch can lag a beat behind the section itself rendering.
  let text = '';
  for (let i = 0; i < 10; i++) {
    text = (await row.innerText()).replace('Unique visitors', '').trim();
    if (/^\d+$/.test(text)) break;
    await page.waitForTimeout(500);
  }
  expect(text, `visitor count should be a plain number, got "${text}"`).toMatch(/^\d+$/);
  return Number(text);
}

/** Self-delete THIS viewer's own stall_visits row for the given owner --
 * legitimate under RLS (viewer_id = auth.uid()), used only to reset OUR
 * OWN test account to a clean "never visited" baseline before test 1. */
async function resetOwnVisitRow(page: Page, ownerId: string) {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' }).catch(() => {});
  const token = await page.evaluate((supaUrl) => {
    const key = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (!key) return null;
    try { return JSON.parse(localStorage.getItem(key) ?? '{}')?.access_token ?? null; } catch { return null; }
  }, SUPABASE_URL);
  expect(token, 'visitor account must have a stored session token').toBeTruthy();

  const res = await page.request.delete(
    `${SUPABASE_URL}/rest/v1/stall_visits?stall_user_id=eq.${ownerId}`,
    { headers: { apikey: 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa', Authorization: `Bearer ${token}` } },
  );
  expect(res.ok(), `reset delete should succeed, got ${res.status()}`).toBeTruthy();
}

test.describe.serial('Stall visitor counter', () => {
  test('0. reset the visitor test account to a clean baseline', async ({ page }) => {
    await login(page, VISITOR_EMAIL, VISITOR_PASS);
    await resetOwnVisitRow(page, OWNER_ID);
  });

  test('1. owner sees baseline count with the visitor NOT yet counted', async ({ page }) => {
    await login(page, OWNER_EMAIL, OWNER_PASS);
    const baseline = await readOwnerVisitorCount(page);
    console.log('Baseline visitor count (after reset):', baseline);
    (test.info() as any).annotations.push({ type: 'baseline', description: String(baseline) });
  });

  test('2. a first visit from a new distinct viewer increases the count by exactly 1', async ({ page, browser }) => {
    // Read baseline fresh (own page/session) rather than trust cross-test state.
    const ownerCtx = await browser.newContext();
    const ownerPage = await ownerCtx.newPage();
    await login(ownerPage, OWNER_EMAIL, OWNER_PASS);
    const before = await readOwnerVisitorCount(ownerPage);

    await login(page, VISITOR_EMAIL, VISITOR_PASS);
    await page.goto(`/stall/${OWNER_STALL_USERNAME}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000); // stall_visits upsert fires in an effect, not on click

    await ownerPage.reload({ waitUntil: 'domcontentloaded' });
    const after = await readOwnerVisitorCount(ownerPage);
    console.log('Visitor count before/after FIRST visit:', before, '->', after);
    expect(after).toBe(before + 1);
    await ownerCtx.close();
  });

  test('3. a repeat visit from the SAME viewer does not inflate the count', async ({ page, browser }) => {
    const ownerCtx = await browser.newContext();
    const ownerPage = await ownerCtx.newPage();
    await login(ownerPage, OWNER_EMAIL, OWNER_PASS);
    const before = await readOwnerVisitorCount(ownerPage);

    await login(page, VISITOR_EMAIL, VISITOR_PASS);
    await page.goto(`/stall/${OWNER_STALL_USERNAME}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    // Leave and revisit -- a genuinely separate "session" of viewing, not just one mount.
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.goto(`/stall/${OWNER_STALL_USERNAME}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    await ownerPage.reload({ waitUntil: 'domcontentloaded' });
    const after = await readOwnerVisitorCount(ownerPage);
    console.log('Visitor count before/after REPEAT visit:', before, '->', after);
    expect(after).toBe(before);
    await ownerCtx.close();
  });

  test('4. the RPC refuses to return another stall\'s count, and a non-owner never sees the section', async ({ page }) => {
    await login(page, VISITOR_EMAIL, VISITOR_PASS);

    // A non-owner calling the RPC for someone ELSE's stall must be refused
    // server-side (stall_owner must equal auth.uid()) -- not just hidden
    // client-side.
    const rpcResult = await page.evaluate(async ({ url, ownerId }) => {
      const key = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
      const token = key ? JSON.parse(localStorage.getItem(key) ?? '{}')?.access_token : null;
      const res = await fetch(`${url}/rest/v1/rpc/stall_visitor_count`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stall_owner: ownerId }),
      });
      return { status: res.status, body: await res.text() };
    }, { url: SUPABASE_URL, ownerId: OWNER_ID });
    console.log('Non-owner RPC call for owner\'s stall:', rpcResult.status, rpcResult.body);
    expect(rpcResult.status, 'RPC must refuse (not 2xx) when stall_owner != caller').toBeGreaterThanOrEqual(400);
    expect(rpcResult.body).toContain('stall_visitor_count');

    // And the UI itself: browsing the owner's stall as a non-owner must never render the section at all.
    await page.goto(`/stall/${OWNER_STALL_USERNAME}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await expect(page.getByText('Unique visitors')).toHaveCount(0);
  });
});
