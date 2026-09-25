import { test, expect, type Page } from '@playwright/test';
import { deflateSync } from 'node:zlib';

// Regression test for a 2026-09-12 bug report (Ed, iPhone, sow2growapp.com,
// /stall/build "Edit stall" step 1): the Category buttons (Music, Books &
// Writing, ...) did not respond to taps, while the Stall name / Tagline
// inputs lower on the page worked fine.
//
// Root-caused via document.elementFromPoint at each button's rendered
// center on a 390x844 touch-emulated viewport, two compounding bugs:
//
//   1. src/index.css had a blanket mobile rule --
//      `.grid { @apply grid-cols-1 !important; }` inside a max-width:768px
//      media query -- that collapsed EVERY grid on the site to one column
//      below 768px, including this page's `grid grid-cols-2
//      sm:grid-cols-4` Category picker. That stacked all 8 buttons full
//      width, one per row, roughly doubling the section's height.
//   2. NotificationBanner (and PayoutSetupBanner, same pattern) render as
//      `fixed bottom-20 right-4 max-w-md` -- max-w-md (28rem/448px) is
//      WIDER than a 390px phone viewport, so with no `left` anchor it
//      overflows well past the left edge, visually covering most of the
//      screen's bottom third. Because of bug #1 the tall single-column
//      Category list reached down into exactly that band, so taps on
//      "Food & Home" / "Whisperer" / "Orchard" landed on the notification
//      card instead of the button underneath.
//
// Fixed by: removing the blanket .grid override (src/index.css), clamping
// both banners to the viewport width (`w-[calc(100vw-2rem)] max-w-md`),
// and -- since any WizardContainer flow's own Back/Next/Submit bar sits at
// the bottom of a short single-column page, the same corner real estate --
// hiding both banners entirely while AppContext.wizardOpen is true
// (WizardContainer sets it on mount/unmount, mirroring the existing
// stallInteriorOpen precedent that already hides the FAB/wallet-chip/
// Groundskeeper trio during a stall interior view).
//
// This spec re-proves the original report (category taps select, with a
// visible highlight -- selecting a variant used to be a no-op visually,
// see below) AND generalizes the elementFromPoint audit across all 5
// wizard steps, per "also check steps 2-5 for the same".
//
// Separately: src/components/ui/button.tsx's `default`/`outline`/etc.
// variants were all byte-for-byte identical
// ("bg-white text-[#0A1931] border-2 border-[#0A1931] ..."), so toggling
// variant on selection was a complete visual no-op app-wide. Rather than
// touch that shared component (used everywhere, out of scope for this
// bug), StallBuildPage's Category and Tile-kind buttons now get an
// explicit selected className (bg-primary/text-primary-foreground) plus
// aria-pressed, which is what this spec asserts on.

const SUPABASE_PROJECT_REF = 'zuwkgasbkpjlxzsjzumu';
const SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;
const FAKE_USER_ID = '00000000-0000-4000-8000-000000000010';

const CATEGORY_LABELS = [
  'Music', 'Books & Writing', 'Art & Craft', 'Faith & Teaching',
  'Trades & Services', 'Food & Home', 'Whisperer', 'Orchard',
];

/** A solid-colour RGB PNG. The wizard rejects stall images under 800px wide (724c2c86, 2026-09-13). */
function solidPng(width: number, height: number): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc32 = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x++) { row[1 + x * 3] = 90; row[2 + x * 3] = 60; row[3 + x * 3] = 30; }
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}
const STALL_PNG = solidPng(1200, 675);

function fakeJwt(payload: Record<string, unknown>): string {
  const b64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.test-signature-not-verified-client-side`;
}

/** Client-side-valid fake session so useAuth's `user` is truthy -- never sent anywhere real. */
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
        access_token: fakeJwt({ sub: FAKE_USER_ID, role: 'authenticated', exp: futureExpiry }),
        refresh_token: 'test-refresh-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: futureExpiry,
        user: {
          id: FAKE_USER_ID, aud: 'authenticated', role: 'authenticated',
          email: 'stallbuild-playwright-test@example.com', user_metadata: {}, app_metadata: {},
        },
      },
    },
  );
}

/** Everything to-the-wizard's REST/edge-function traffic needs, hermetically stubbed. */
async function stubBackend(page: Page) {
  await page.route(`${SUPABASE_URL}/rest/v1/**`, async (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.replace('/rest/v1/', '').split('?')[0];
    const wantsObject = (route.request().headers()['accept'] ?? '').includes('vnd.pgrst.object');
    const reply = (rows: unknown[]) => route.fulfill({ json: wantsObject ? (rows[0] ?? null) : rows });
    if (table === 'profiles') {
      // security_setup_complete/is_chatapp_verified keep the route's guards
      // (RequireSecuritySetup, RequireVerification) from bouncing away;
      // payout_setup_complete:true keeps PayoutSetupBanner's own gate closed
      // too so this spec isolates the wizardOpen suppression specifically.
      return reply([{ user_id: FAKE_USER_ID, security_setup_complete: true, payout_setup_complete: true, is_chatapp_verified: true }]);
    }
    if (table === 'stalls') return reply([]); // no existing row -- fresh "Build your stall"
    return reply([]);
  });
  await page.route(`${SUPABASE_URL}/rest/v1/rpc/**`, (route) => route.fulfill({ json: null }));
  // Uploads get a Key back; reading an object back (the wizard shows the
  // uploaded interior to mark shelves on) gets real image bytes.
  await page.route(`${SUPABASE_URL}/storage/v1/object/**`, (route) => (route.request().method() === 'GET'
    ? route.fulfill({ contentType: 'image/png', body: STALL_PNG })
    : route.fulfill({ json: { Key: 'test/fake.png', signedURL: '/object/public/test/fake.png' } })));
  await page.route(`${SUPABASE_URL}/functions/v1/moderate-media`, (route) => route.fulfill({ json: { verdict: 'allow', reason: null } }));
}

/**
 * Every visible, in-viewport button/input/textarea must resolve back to
 * itself (or a descendant/ancestor of itself) via elementFromPoint at its
 * own rendered center -- otherwise something else is sitting on top of it
 * and would swallow a real tap there. Returns the list of violations.
 */
async function findObscuredControls(page: Page): Promise<Array<{ el: string; blockedBy: string }>> {
  return page.evaluate(() => {
    const interactive = [...document.querySelectorAll('button, input, textarea, [role="button"]')].filter((el) => {
      // A visually-hidden (sr-only: clipped to ~1px, not display:none) file
      // input wrapped in its own <label> is intentional, not a bug -- the
      // LABEL is the real tap target (StallImageUpload/StallPdfUpload's own
      // fix for iOS Safari's file-picker quirk requires exactly this
      // shape). Checking the input's own 1x1 hit-point isn't meaningful;
      // the label itself still gets checked as its own entry here.
      if (el instanceof HTMLInputElement && el.type === 'file' && (el.closest('label') || el.labels?.length)) {
        return false;
      }
      const rect = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
    });
    const blocked: Array<{ el: string; blockedBy: string }> = [];
    for (const el of interactive) {
      const rect = el.getBoundingClientRect();
      const cx = rect.x + rect.width / 2;
      const cy = rect.y + rect.height / 2;
      if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) continue; // needs scrolling first -- not what's on screen right now
      const top = document.elementFromPoint(cx, cy);
      if (!top) continue;
      if (top !== el && !el.contains(top) && !top.contains(el)) {
        blocked.push({
          el: el.tagName + (el.textContent ? `:"${el.textContent.trim().slice(0, 40)}"` : ''),
          blockedBy: `${top.tagName}.${typeof top.className === 'string' ? top.className.split(' ').slice(0, 3).join('.') : ''}`,
        });
      }
    }
    return blocked;
  });
}

test.describe('/stall/build wizard: category taps and no-obscured-controls', () => {
  test.beforeEach(async ({ page }) => {
    await stubAuthSession(page);
    await stubBackend(page);
  });

  test('tapping a Category button toggles it (visible highlight) and no other button steals the tap', async ({ page }) => {
    await page.goto('/stall/build', { waitUntil: 'networkidle' });

    // Multi-select since f96f2a69 (2026-09-16): "Tick as many as genuinely
    // apply". Each tap toggles only the button tapped.
    await expect(page.getByText('Tick as many as genuinely apply', { exact: false })).toBeVisible({ timeout: 15_000 });

    // "Books & Writing" is the default selection (StallBuildPage's initial useState).
    const booksBtn = page.getByRole('button', { name: 'Books & Writing', exact: true });
    await expect(booksBtn).toHaveAttribute('aria-pressed', 'true');

    for (const label of CATEGORY_LABELS.filter((l) => l !== 'Books & Writing')) {
      const btn = page.getByRole('button', { name: label, exact: true });
      await btn.tap();
      await expect(btn, `${label} must show aria-pressed=true after a tap`).toHaveAttribute('aria-pressed', 'true');
      await expect(btn, `${label} must visibly highlight once ticked`).toHaveClass(/(^|\s)bg-amber-500(\s|$)/);
      await expect(booksBtn, 'ticking another category leaves Books & Writing ticked').toHaveAttribute('aria-pressed', 'true');
      await btn.tap();
      await expect(btn, `${label} must untick on a second tap`).toHaveAttribute('aria-pressed', 'false');
      await expect(btn).not.toHaveClass(/(^|\s)bg-amber-500(\s|$)/);
    }
    // Unticking the last one leaves the plain "Pick at least one" error, and Next stays disabled.
    await booksBtn.tap();
    await expect(booksBtn).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByText('Pick at least one category.')).toBeVisible();
    await booksBtn.tap();

    const obscured = await findObscuredControls(page);
    expect(obscured, `step 0 (Category): controls obscured by another element:\n${JSON.stringify(obscured, null, 1)}`).toEqual([]);
  });

  test('no interactive control is obscured on any of the 5 wizard steps', async ({ page }) => {
    await page.goto('/stall/build', { waitUntil: 'networkidle' });

    const nameInput = page.getByPlaceholder(/Lyricist and Writer/);
    await expect(nameInput).toBeVisible({ timeout: 15_000 });
    await nameInput.fill('Playwright Test Stall');

    let obscured = await findObscuredControls(page);
    expect(obscured, `step 0 (Your stall): ${JSON.stringify(obscured)}`).toEqual([]);

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Shop-front image')).toBeVisible({ timeout: 15_000 });
    obscured = await findObscuredControls(page);
    expect(obscured, `step 1 (Shop front): ${JSON.stringify(obscured)}`).toEqual([]);

    await page.locator('input[type="file"]').first().setInputFiles({ name: 'front.png', mimeType: 'image/png', buffer: STALL_PNG });
    const next1 = page.getByRole('button', { name: 'Next' });
    await expect(next1).toBeEnabled({ timeout: 15_000 });
    await next1.click();
    await expect(page.getByText('Interior image')).toBeVisible({ timeout: 15_000 });
    obscured = await findObscuredControls(page);
    expect(obscured, `step 2 (Interior): ${JSON.stringify(obscured)}`).toEqual([]);

    await page.locator('input[type="file"]').first().setInputFiles({ name: 'interior.png', mimeType: 'image/png', buffer: STALL_PNG });
    const next2 = page.getByRole('button', { name: 'Next' });
    await expect(next2).toBeEnabled({ timeout: 15_000 });
    await next2.click();
    // "Mark your shelves" replaced the fixed tiles (c64baead, 2026-09-13):
    // tap the picture to drop a box, name it; Next needs MIN_HOTSPOTS (3).
    await expect(page.getByText('Tap the image to mark a shelf', { exact: false })).toBeVisible({ timeout: 15_000 });
    obscured = await findObscuredControls(page);
    expect(obscured, `step 3 (Mark your shelves): ${JSON.stringify(obscured)}`).toEqual([]);

    const canvas = page.locator('div.aspect-video.touch-none').first();
    await expect(page.getByAltText('Your stall interior')).toHaveJSProperty('complete', true);
    await page.screenshot({ path: 'test-results/stall-build-step4.png' });
    // The step card must settle inside the phone's width (it slides in, so
    // one early reading can catch it mid-transition), not stay off an edge.
    const vw = page.viewportSize()!.width;
    await expect.poll(async () => {
      const b = await canvas.boundingBox();
      return !!b && b.x >= 0 && b.x + b.width <= vw;
    }, { message: 'the shelf canvas settles fully on screen', timeout: 5_000 }).toBe(true);
    for (const [i, fx] of [0.2, 0.5, 0.8].entries()) {
      // Re-measure every time: opening and closing the sheet can scroll the page.
      await canvas.scrollIntoViewIfNeeded();
      const b = (await canvas.boundingBox())!;
      await page.touchscreen.tap(b.x + b.width * fx, b.y + b.height * 0.5);
      const labelInput = page.getByPlaceholder('e.g. Family Albums');
      await expect(labelInput, `box ${i + 1} opens its label field`).toBeVisible({ timeout: 10_000 });
      await labelInput.fill(`Shelf ${i + 1}`);
      // The "What's here?" bottom sheet covers the canvas until Done, as for a member.
      await page.getByRole('button', { name: 'Done', exact: true }).tap();
      await expect(labelInput).toHaveCount(0);
      // Done must actually close the sheet: no dialog left, the page usable again.
      await expect(page.getByRole('dialog'), `Done closes box ${i + 1}'s sheet`).toHaveCount(0, { timeout: 5_000 });
      await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).pointerEvents), { timeout: 5_000 }).not.toBe('none');
    }
    // The just-marked box is selected and shows its red delete dot. Tapping
    // that dot must open the delete confirmation -- at default size on a
    // phone the box is ~21px tall, and its resize handle must not swallow it.
    const delBtn = canvas.getByRole('button', { name: 'Delete Shelf 3' });
    await expect(delBtn).toBeVisible();
    const dot = (await delBtn.locator('span').first().boundingBox())!;
    await page.touchscreen.tap(dot.x + dot.width / 2, dot.y + dot.height / 2);
    const confirm = page.getByRole('alertdialog');
    await expect(confirm, 'tapping the red delete dot opens the delete confirmation').toBeVisible({ timeout: 5_000 });
    await confirm.getByRole('button', { name: 'Cancel' }).tap();
    await expect(confirm).toHaveCount(0);

    obscured = await findObscuredControls(page);
    expect(obscured, `step 3 with 3 shelves marked: ${JSON.stringify(obscured)}`).toEqual([]);
    const next3 = page.getByRole('button', { name: 'Next' });
    await expect(next3).toBeEnabled({ timeout: 15_000 });
    await next3.click();
    await expect(page.getByRole('heading', { name: 'Preview & publish' })).toBeVisible({ timeout: 15_000 });
    obscured = await findObscuredControls(page);
    expect(obscured, `step 4 (Preview & publish): ${JSON.stringify(obscured)}`).toEqual([]);
  });

  test('NotificationBanner does not render while the wizard is open, even when eligible to show', async ({ page }) => {
    // No 'notification-banner-dismissed' localStorage key set, and
    // useNotifications() reports disabled by default in this stub
    // environment (no Notification permission) -- the banner would render
    // on any ordinary page right now (see the /stalls-feed check below).
    await page.goto('/stall/build', { waitUntil: 'networkidle' });
    await expect(page.getByPlaceholder(/Lyricist and Writer/)).toBeVisible({ timeout: 15_000 }); // real page loaded, not a blank/error screen
    await expect(page.getByRole('heading', { name: 'Enable Notifications' })).toHaveCount(0);

    // Sanity check the stub setup actually would have shown the banner
    // elsewhere (a plain, non-wizard page), so a future change that breaks
    // the wizardOpen suppression doesn't pass this spec by coincidence.
    // Not /stalls-feed: nag cards are suppressed there on purpose (e4702110).
    await page.goto('/disclaimer', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Enable Notifications' })).toBeVisible({ timeout: 15_000 });
  });
});
