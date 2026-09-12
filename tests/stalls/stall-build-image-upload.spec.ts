import { test, expect, type Page } from '@playwright/test';

// Bug report (Ed, iPhone Safari, /stall/build "Edit stall" step 2 "Shop
// front"): tapping X clears the image and shows "drag and drop or tap to
// upload", but tapping the empty zone never opens the iOS file/photo
// picker, AND the original image reappears.
//
// Two independent, compounding bugs, both fixed here:
//
//   1. StallImageUpload.tsx's hidden <input type="file"> used
//      className="hidden" (display:none). A <label> wrapping a
//      display:none file input does not reliably forward a tap into
//      opening the native picker on iOS Safari -- a long-documented
//      WebKit quirk (the input needs to still be part of the layout/
//      accessibility tree, just visually invisible, for the label's
//      implicit-activation behavior to fire reliably). Fixed: the
//      standard "visually hidden" pattern (Tailwind's sr-only -- absolute
//      position, 1x1px, clipped, NOT display:none) plus an explicit
//      htmlFor/id pairing (React useId(), unique per instance -- up to 5
//      of these render at once on step 3, one per tile). Same fix applied
//      to StallPdfUpload.tsx (the My Story PDF uploader), which had the
//      identical className="hidden" input.
//
//   2. StallBuildPage.tsx's stall-row-hydration effect was
//      `useEffect(() => {...}, [user])` -- keyed on the whole `user`
//      object from useAuth(), not a stable field of it. useAuth's
//      AuthProviderClass hands out a BRAND NEW `user` object on every
//      onAuthStateChange firing: first the raw Supabase auth user
//      (synchronous, as soon as a session is found), then again shortly
//      after (safeFetchProfile, deferred one tick) with a MERGED
//      raw-user + profiles-row object -- a different object reference
//      with the same underlying account. Every real page load produces
//      BOTH of these, not just an occasional background-refresh case. If
//      the second (merged) `user` update lands AFTER the visitor has
//      already tapped X, the effect re-ran, re-fetched the stalls row,
//      and re-hydrated front/interior straight back to their last-SAVED
//      values -- silently reverting the clear. Fixed: keyed on
//      `user?.id` (a stable primitive for the same signed-in member for
//      the whole session) instead of the object itself.
//
// This spec proves both fixes hermetically (no real Supabase login in
// this environment -- see seedcard-call.spec.ts's own note on
// .env.test). It engineers exactly the race in bug #2 by delaying ONLY
// useAuth's own internal profile-merge query (distinguished from
// RequireSecuritySetup's own, differently-shaped `profiles` query by its
// `select=*` vs `select=security_setup_complete` query string -- neither
// ProtectedRoute nor RequireSecuritySetup depend on the merged profile,
// so the wizard itself is not blocked by this delay) so the clear
// happens BEFORE the merge and the assertion happens AFTER it.
//
// Chromium with an iPhone Safari user-agent string + touch emulation,
// matching every other spec in this suite (WebKit is not guaranteed
// installed in every environment this runs in) -- the fix itself is a
// generic HTML-correctness change (a label/input association that no
// longer depends on WebKit-specific quirks to work), so a filechooser
// firing on Chromium is still meaningful signal that the structural HTML
// bug is gone, even though it doesn't reproduce iOS Safari's exact
// failure mode. (Verified once, separately, against real installed
// WebKit locally during development -- not part of the committed suite,
// to keep `npm run test:stalls` portable across environments that don't
// have WebKit installed.)

const SUPABASE_PROJECT_REF = 'zuwkgasbkpjlxzsjzumu';
const SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;
const CALLER_USER_ID = '00000000-0000-4000-8000-000000000040';

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
          email: 'edtest-playwright@example.com', user_metadata: {}, app_metadata: {},
        },
      },
    },
  );
}

/** How long useAuth's own profile-merge query is delayed by -- long enough to reliably land its `user`-identity update after this spec's own clear() action. */
const PROFILE_MERGE_DELAY_MS = 1500;

interface StallBackendHandles {
  stallsGetCount: () => number;
}

async function stubStallBackend(page: Page): Promise<StallBackendHandles> {
  let stallsGetCount = 0;

  // Playwright tries routes in LAST-registered-first order -- the general
  // wildcard below must be registered FIRST so the more specific
  // profiles/stalls handlers (registered after it) win over it, not the
  // other way around (see seedcard-call.spec.ts's own note on this exact
  // ordering gotcha).
  await page.route(`${SUPABASE_URL}/rest/v1/**`, async (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.replace('/rest/v1/', '').split('?')[0];
    const wantsObject = (route.request().headers()['accept'] ?? '').includes('vnd.pgrst.object');
    return route.fulfill({ json: wantsObject ? null : [] });
  });
  await page.route(`${SUPABASE_URL}/rest/v1/rpc/**`, (route) => route.fulfill({ json: null }));

  // RequireSecuritySetup's own `select=security_setup_complete` query
  // answers immediately -- it (and ProtectedRoute) never gate on the
  // MERGED profile, only on this direct query and on isAuthenticated, so
  // delaying useAuth's own internal merge below never blocks the wizard
  // from rendering.
  await page.route(`${SUPABASE_URL}/rest/v1/profiles*`, async (route) => {
    const url = route.request().url();
    const wantsObject = (route.request().headers()['accept'] ?? '').includes('vnd.pgrst.object');
    const row = {
      user_id: CALLER_USER_ID, display_name: 'Ed Playwright', security_setup_complete: true,
      payout_setup_complete: true, is_chatapp_verified: true,
    };
    const body = wantsObject ? row : [row];
    if (url.includes('select=security_setup_complete')) {
      return route.fulfill({ json: body });
    }
    // useAuth's own fetchUserProfile `select('*')` -- delayed on purpose.
    await new Promise((resolve) => setTimeout(resolve, PROFILE_MERGE_DELAY_MS));
    return route.fulfill({ json: body });
  });

  await page.route(`${SUPABASE_URL}/rest/v1/stalls*`, async (route) => {
    if (route.request().method() === 'GET') stallsGetCount += 1;
    const wantsObject = (route.request().headers()['accept'] ?? '').includes('vnd.pgrst.object');
    const row = {
      id: 'ed-stall-id', user_id: CALLER_USER_ID, category: 'music', name: 'Ed Test Stall',
      tagline: 'Test tagline', story: 'MY JOURNEY\n\nTest story.', story_pdf_path: `${CALLER_USER_ID}/story.pdf`,
      front_image_path: TINY_PNG_DATA_URI, interior_image_path: TINY_PNG_DATA_URI, tiles: [], published: false,
    };
    return route.fulfill({ json: wantsObject ? row : [row] });
  });

  return { stallsGetCount: () => stallsGetCount };
}

test.describe('/stall/build image/PDF upload: clear + re-open + survives a user-object re-render', () => {
  test('Shop front (step 1): X clears the image, tapping the empty zone opens a native file picker, and the clear survives useAuth\'s user-object update', async ({ page }) => {
    await stubAuthSession(page);
    const { stallsGetCount } = await stubStallBackend(page);

    await page.goto('/stall/build', { waitUntil: 'domcontentloaded' });
    const nameInput = page.getByPlaceholder(/Lyricist and Writer/);
    await expect(nameInput).toHaveValue('Ed Test Stall', { timeout: 15_000 }); // hydrated from the stubbed stall row

    await page.getByRole('button', { name: 'Next' }).click();
    // Hydrated from the stubbed stall row's front_image_path -- an image
    // is already present, so the "drag & drop" placeholder text isn't
    // rendered yet (StallImageUpload only shows the img/alt when the
    // component has no separate heading of its own).
    const frontImg = page.locator('img[alt="Shop-front image"]');
    await expect(frontImg).toBeVisible({ timeout: 15_000 });

    const zone = page.locator('label').filter({ has: frontImg });
    const clearButton = zone.locator('button');
    await clearButton.click();
    await expect(page.getByText(/drag & drop or tap to upload/)).toBeVisible({ timeout: 5_000 });

    const countRightAfterClear = stallsGetCount();

    // The regression: waiting through useAuth's delayed profile-merge
    // update (its `user` object changes identity here) must NOT bring
    // the image back or re-fetch the stall row.
    await page.waitForTimeout(PROFILE_MERGE_DELAY_MS + 500);
    await expect(page.getByText(/drag & drop or tap to upload/)).toBeVisible();
    await expect(page.locator('img[alt="Shop-front image"]')).toHaveCount(0);
    expect(stallsGetCount(), 'the stalls row must not be re-fetched after the user-object update').toBe(countRightAfterClear);

    // Tapping the now-empty zone must open the native picker -- the
    // original bug: display:none on the <input> under the <label> left
    // this a dead tap on iOS Safari.
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 5_000 }),
      page.locator('label').filter({ hasText: /drag & drop or tap to upload/ }).click(),
    ]);
    expect(chooser).toBeTruthy();
  });

  test('Interior (step 2): clearing also survives the user-object update', async ({ page }) => {
    await stubAuthSession(page);
    const { stallsGetCount } = await stubStallBackend(page);

    await page.goto('/stall/build', { waitUntil: 'domcontentloaded' });
    await expect(page.getByPlaceholder(/Lyricist and Writer/)).toHaveValue('Ed Test Stall', { timeout: 15_000 });
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.locator('img[alt="Shop-front image"]')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Next' }).click();
    const interiorImg = page.locator('img[alt="Interior image"]');
    await expect(interiorImg).toBeVisible({ timeout: 15_000 });

    const zone = page.locator('label').filter({ has: interiorImg });
    await zone.locator('button').click();
    await expect(page.getByText(/drag & drop or tap to upload/)).toBeVisible({ timeout: 5_000 });

    const countRightAfterClear = stallsGetCount();
    await page.waitForTimeout(PROFILE_MERGE_DELAY_MS + 500);
    await expect(page.getByText(/drag & drop or tap to upload/)).toBeVisible();
    await expect(page.locator('img[alt="Interior image"]')).toHaveCount(0);
    expect(stallsGetCount()).toBe(countRightAfterClear);
  });

  test('Story PDF (step 0): clearing opens the native file picker on the next tap', async ({ page }) => {
    await stubAuthSession(page);
    await stubStallBackend(page);

    await page.goto('/stall/build', { waitUntil: 'domcontentloaded' });
    await expect(page.getByPlaceholder(/Lyricist and Writer/)).toHaveValue('Ed Test Stall', { timeout: 15_000 });

    // Hydrated from the stubbed stall row's story_pdf_path.
    await expect(page.getByText('story.pdf')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Remove PDF' }).click();
    const uploadZone = page.getByText(/Upload PDF/);
    await expect(uploadZone).toBeVisible({ timeout: 5_000 });

    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 5_000 }),
      uploadZone.click(),
    ]);
    expect(chooser).toBeTruthy();
  });
});
