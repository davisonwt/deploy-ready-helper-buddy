import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Full audit of every "Sow a seed" form + routing, triggered by the
// Gosat's Boardroom hotspot bug (an admin route accidentally opened the
// physical-goods sow form instead of /admin/seeds). Three concerns:
//  1. Every /sow/* route is reachable only from the /sow chooser (or the
//     Plant Seed bottom bar -> /sow), never from an admin route/hotspot.
//  2. Submitting each form tags the resulting products row with the
//     correct type/kind/category/delivery_type -- no cross-wiring.
//  3. The resulting seed renders with the matching SeedCard variant
//     (sample player for music/book, plain Bestow for a physical seed).
// Hand (needs a completed wandering-role registration first) and
// Wheel/Pillow (routes don't exist at all yet, see test 0b) are not
// full-submitted here -- out of scope for a routing/tagging audit.
//
// Run: npx playwright test --config=playwright.live.config.ts sow-forms-audit

const HOST_EMAIL = process.env.TEST_USER_EMAIL ?? '';
const HOST_PASS = process.env.TEST_USER_PASSWORD ?? '';
const STAMP = process.env.SOW_AUDIT_STAMP ?? String(Date.now());

// A real, existing app asset -- content moderation (sightengine via
// moderate-media) errored ('scanner_error' -> blocked, cover state never
// set, Plant seed stuck disabled forever) on a synthetic 70-byte 1x1 PNG
// on an earlier run of this exact test; a real photo passes cleanly.
const COVER = path.resolve(__dirname, '../../src/assets/tier-grove.jpg');
const AUDIO = path.resolve(__dirname, 'fixtures/silent-mic.wav');
const PDF = path.resolve(__dirname, 'fixtures/test3page.pdf');

async function login(page: Page, email: string, pass: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 }).catch(() => {});
}

/**
 * PlantButton's OWN progress text is "N of 6 planted" -- true and visible
 * BEFORE the button is even clicked, once every field is filled. Matching
 * on /planted/i (an earlier version of this helper) therefore always
 * passed instantly regardless of whether the real submit succeeded. The
 * only genuine success signal is the post-insert redirect each form does
 * (`navigate(`/bulk/products/${inserted.id}`)` etc.) -- wait for THAT.
 */
async function plant(page: Page, expectUrl: RegExp): Promise<string> {
  const btn = page.getByRole('button', { name: /^Plant seed$/ });
  await expect(btn).toBeEnabled({ timeout: 15000 });
  await btn.click();
  await page.waitForURL(expectUrl, { timeout: 20000 });
  const id = page.url().split('/').pop()!;
  return id;
}

test.describe.serial('Sow forms audit', () => {
  test('0. /sow chooser routes every tile to its correct destination', async ({ page }) => {
    await login(page, HOST_EMAIL, HOST_PASS);
    await page.goto('/sow', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: /^Music$/ }).click();
    await expect(page).toHaveURL(/\/sow\/music$/, { timeout: 10000 });

    await page.goto('/sow', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /^Art$/ }).click();
    await expect(page).toHaveURL(/\/sow\/art$/, { timeout: 10000 });

    await page.goto('/sow', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /^Books$/ }).click();
    await expect(page).toHaveURL(/\/sow\/book$/, { timeout: 10000 });

    await page.goto('/sow', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /^Product$/ }).click();
    await expect(page).toHaveURL(/\/sow\/product$/, { timeout: 10000 });

    // Hand: davisontest1 has no unlocked wandering_roles -- correctly
    // gated to the unlock screen, not the form itself (by design, per
    // SowChooserPage's own chooseService()).
    await page.goto('/sow', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /^Hand$/ }).click();
    await expect(page).toHaveURL(/\/register-wandering\?role=hand$/, { timeout: 10000 });
  });

  test('0b. /sow/wheel and /sow/pillow are dead links (no route defined)', async ({ page }) => {
    await login(page, HOST_EMAIL, HOST_PASS);
    // SowChooserPage's Wheel/Pillow tiles point at these two routes, but
    // AppRoutes.tsx never defines them -- only reachable once a viewer has
    // already unlocked that wandering role (the chooser gates unlocked
    // ones straight through, no visible symptom for anyone without the
    // role). Confirmed here by navigating directly, bypassing the gate.
    for (const p of ['/sow/wheel', '/sow/pillow']) {
      await page.goto(p, { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(/not found|404/i).first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('1. Physical goods (/sow/product): submit creates type=product, delivery_type=physical', async ({ page }) => {
    await login(page, HOST_EMAIL, HOST_PASS);
    await page.goto('/sow/product', { waitUntil: 'domcontentloaded' });

    // davisontest1's default business has no kind set yet -- the inline
    // "What kind of business is this?" picker appears (only once the
    // async companies fetch resolves -- an immediate count()===0 check
    // here raced that fetch and silently skipped the click on an earlier
    // run). Shop -> kind:'product'.
    const shopBtn = page.getByRole('button', { name: /Shop/ });
    await shopBtn.waitFor({ state: 'visible', timeout: 15000 });
    await shopBtn.click();

    await page.locator('input[type="file"]').first().setInputFiles(COVER);
    await page.fill('#sow-title', `QA Sow Audit Product ${STAMP}`);
    await page.fill('#sow-price', '4.00');
    await page.fill('#sow-category', 'Home & Kitchen');
    await page.fill('#sow-stock', '5');
    await page.fill('#sow-description', 'QA sow-forms audit -- physical product.');
    const id = await plant(page, /\/bulk\/products\/[0-9a-f-]+$/);
    console.log('PRODUCT SEED ID:', id);
  });

  test('2. Music (/sow/music): submit creates type=music', async ({ page }) => {
    await login(page, HOST_EMAIL, HOST_PASS);
    await page.goto('/sow/music', { waitUntil: 'domcontentloaded' });

    // DOM order (single-track mode, the default): CoverDropZone renders
    // BEFORE the track's own SeedDropZone -- input[0] is the cover image,
    // input[1] is the audio track.
    await page.locator('input[type="file"]').nth(0).setInputFiles(COVER);
    await page.locator('input[type="file"]').nth(1).setInputFiles(AUDIO);
    await page.waitForTimeout(6000); // preview-generation round trip
    await page.fill('#sow-title', `QA Sow Audit Music ${STAMP}`);
    await page.fill('#sow-price', '3.00');
    await page.getByRole('button', { name: /Choose a genre/i }).click();
    await page.getByRole('button', { name: /Other/i }).first().click();
    await page.fill('#sow-description', 'QA sow-forms audit -- music track.');
    const id = await plant(page, /\/music-track\/[0-9a-f-]+$/);
    console.log('MUSIC SEED ID:', id);
  });

  test('3. Books (/sow/book, category=Lyrics): submit creates type=ebook, category=lyrics', async ({ page }) => {
    await login(page, HOST_EMAIL, HOST_PASS);
    await page.goto('/sow/book', { waitUntil: 'domcontentloaded' });

    // Same DOM order as Music: CoverDropZone first (input[0]), then the
    // document SeedDropZone (input[1], DOCUMENT_ACCEPT), then an optional
    // audio-sample SeedDropZone (input[2], skipped -- not required).
    await page.locator('input[type="file"]').nth(0).setInputFiles(COVER);
    await page.locator('input[type="file"]').nth(1).setInputFiles(PDF);
    await page.waitForTimeout(5000);
    await page.fill('#sow-title', `QA Sow Audit Lyrics ${STAMP}`);
    await page.fill('#sow-price', '2.00');
    await page.getByRole('button', { name: /Choose a category/i }).click();
    await page.getByRole('button', { name: /^Lyrics$/ }).click();
    await page.fill('#sow-description', 'QA sow-forms audit -- lyrics/book.');
    const id = await plant(page, /\/bulk\/products\/[0-9a-f-]+$/);
    console.log('BOOK/LYRICS SEED ID:', id);
  });

  test('4. Art (/sow/art): submit creates type=art', async ({ page }) => {
    await login(page, HOST_EMAIL, HOST_PASS);
    await page.goto('/sow/art', { waitUntil: 'domcontentloaded' });

    await page.locator('input[type="file"]').first().setInputFiles(COVER);
    await page.waitForTimeout(2000);
    await page.fill('#sow-title', `QA Sow Audit Art ${STAMP}`);
    await page.fill('#sow-price', '2.50');
    await page.getByRole('button', { name: /Choose a category/i }).click();
    await page.getByRole('button', { name: /Other/i }).first().click();
    await page.fill('#sow-description', 'QA sow-forms audit -- art.');
    const id = await plant(page, /\/bulk\/products\/[0-9a-f-]+$/);
    console.log('ART SEED ID:', id);
  });

  test('5. My Products: each seed renders the SeedCard variant matching its real kind', async ({ page }) => {
    await login(page, HOST_EMAIL, HOST_PASS);
    await page.goto('/stall/build?tab=products', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // A `div` hasText match on a Carousel-based grid resolves to the whole
    // shared scroll container first (every card is a text-match ancestor
    // of every other), not one card -- scope instead via SeedCard's own
    // root class, filtered down to the ONE card whose Bestow button shows
    // this seed's own distinct price (each of the 4 audit seeds priced
    // differently on purpose, for exactly this).
    const cardWithPrice = (price: string) =>
      page.locator('.overflow-hidden.border-amber-500\\/20')
        .filter({ has: page.getByRole('button', { name: new RegExp(`\\$${price}\\b`) }) });

    // Physical product ($4.00): plain Bestow, no play button (SeedCard's
    // hasSamplePlayer = kind==='music' || kind==='book' -- a plain
    // product maps to the 'seed' fallback kind, neither).
    const productCard = cardWithPrice('4\\.00');
    await expect(productCard).toHaveCount(1, { timeout: 10000 });
    await expect(productCard.locator('button[aria-label*="play" i]')).toHaveCount(0);

    // Music ($3.00): sample player present (kind:'music' -> hasSamplePlayer, preview_url set).
    const musicCard = cardWithPrice('3\\.00');
    await expect(musicCard).toHaveCount(1, { timeout: 10000 });
    await expect(musicCard.locator('button[aria-label*="play" i]')).toHaveCount(1);

    // Lyrics/book ($2.00): kind:'book' -> hasSamplePlayer, but no play
    // button renders without a preview_url -- test 3 never uploaded the
    // book form's OPTIONAL audio sample, so preview_url is genuinely null
    // here. Confirms the correct SeedCard *branch*, not a specific
    // optional field.
    const lyricsCard = cardWithPrice('2\\.00');
    await expect(lyricsCard).toHaveCount(1, { timeout: 10000 });
    await expect(lyricsCard.locator('button[aria-label*="play" i]')).toHaveCount(0);

    // Art ($2.50): no dedicated SeedCard kind (falls back to 'seed') -- plain Bestow, no player.
    const artCard = cardWithPrice('2\\.50');
    await expect(artCard).toHaveCount(1, { timeout: 10000 });
    await expect(artCard.locator('button[aria-label*="play" i]')).toHaveCount(0);
  });
});
