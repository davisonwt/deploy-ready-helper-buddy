import { test, expect, type Page } from '@playwright/test';
import { asUser, sweepProducts, reportSweep } from './support/fixtures';

// Live verification for factory-sower dropship support: bulk-import a
// dropship-flagged product as the real sower account, confirm the "ships
// direct from supplier" note on the product card (My Products / stall
// build) and at checkout (basket), then initiate a real bestowal order to
// confirm the 85/15 split math and capture which PayPal environment this
// deployment is wired to (sandbox vs live) before any money would move.
//
// Run: npx playwright test --config=playwright.live.config.ts dropship-verification

const HOST_EMAIL = process.env.TEST_USER_EMAIL ?? '';
const HOST_PASS = process.env.TEST_USER_PASSWORD ?? '';
const BUYER_EMAIL = process.env.TEST_USER2_EMAIL ?? '';
const BUYER_PASS = process.env.TEST_USER2_PASSWORD ?? '';

// Overridable so tests 2/3 can be re-run in a separate CLI invocation
// against the exact product test 1 already published (each invocation
// reloads this file, so a fresh Date.now() would mint a title nothing
// matches).
const STAMP = process.env.TEST_DROPSHIP_STAMP ?? String(Date.now());
const PRODUCT_TITLE = `QA Dropship Test ${STAMP}`;
const PRODUCT_PRICE = '5.00';

async function login(page: Page, email: string, pass: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 }).catch(() => {});
}

/** Dismiss the floating "Enable Notifications"/"Set up your payout method"
 * cards and any toast still on screen -- these are legitimate, dismissible
 * UI, but their fixed positioning intercepts pointer events on buttons
 * underneath for a few seconds, which is a test-harness timing problem,
 * not a product bug. */
async function dismissOverlays(page: Page) {
  for (const btn of await page.locator('button[aria-label="Dismiss"], button:has-text("Dismiss")').all()) {
    await btn.click({ timeout: 1000 }).catch(() => {});
  }
  await page.waitForTimeout(500);
}

test.describe.serial('Dropship support (factory-sower products)', () => {
  /**
   * Teardown in a hook, never a final test: this block is serial, so a
   * failure marks every later test "did not run" and a cleanup test
   * would be skipped on exactly the runs that leak.
   */
  test.afterAll(async () => {
    if (!HOST_EMAIL || !HOST_PASS) return;
    const { client, userId } = await asUser(HOST_EMAIL, HOST_PASS, 'dropship-verification');
    reportSweep('dropship-verification', await sweepProducts(client, userId, [PRODUCT_TITLE]));
  });

  test('1. bulk-import a dropship-flagged product as the sower', async ({ page }) => {
    let parseStatus = 0;
    let parseSawDropshipTrue = false;
    page.on('requestfinished', async (req) => {
      if (req.url().includes('bulk-parse-products')) {
        const resp = await req.response();
        parseStatus = resp?.status() ?? 0;
        const body = await resp?.text().catch(() => '');
        parseSawDropshipTrue = /"dropship":true/.test(body ?? '');
      }
    });

    await login(page, HOST_EMAIL, HOST_PASS);
    await page.goto('/dashboard/sower/upload?skip_verification=true', { waitUntil: 'domcontentloaded' });

    // Settlement consent gate, if not already accepted for this account.
    const acceptConsent = page.getByRole('button', { name: /accept|agree|continue/i }).first();
    if (await acceptConsent.count() > 0 && await acceptConsent.isVisible().catch(() => false)) {
      await acceptConsent.click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    await expect(page.locator('input[type="file"]')).toBeEnabled({ timeout: 15000 });

    const csv = `name,price,category,sku,stock_qty,dropship\n${PRODUCT_TITLE},${PRODUCT_PRICE},QA,QA-DROPSHIP-${STAMP},10,true\n`;
    await page.setInputFiles('input[type="file"]', {
      name: 'dropship-batch.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv, 'utf-8'),
    });

    await page.waitForTimeout(5000);

    // Step 2: review table -- name is rendered inside an <Input value=...>,
    // not text content, so match on the input's current value, not getByText.
    await expect
      .poll(async () => (await page.locator(`input[value="${PRODUCT_TITLE}"]`).count()), { timeout: 30000 })
      .toBeGreaterThan(0);
    await dismissOverlays(page);
    // dispatchEvent fires the click directly on the matched node, bypassing
    // hit-testing entirely -- unlike click({force:true}) (which still does a
    // real coordinate-based click and can land on a floating overlay's
    // element if one happens to cover that screen position), this can never
    // be mis-targeted by the payout/notifications banners.
    await page.getByRole('button', { name: /Continue.*Images/i }).dispatchEvent('click');

    // Step 3: images -- skip straight to review & publish.
    await expect(page.getByRole('button', { name: /Continue.*Review/i })).toBeVisible({ timeout: 15000 });
    await dismissOverlays(page);
    await page.getByRole('button', { name: /Continue.*Review/i }).dispatchEvent('click');

    // Step 4: publish.
    await expect(page.getByRole('button', { name: /Plant your products/i })).toBeVisible({ timeout: 15000 });
    await dismissOverlays(page);
    await page.getByRole('button', { name: /Plant your products/i }).dispatchEvent('click');

    // Step 5: success.
    await expect(page.getByText(/planted|success|published/i).first()).toBeVisible({ timeout: 30000 });

    // The edge function itself parsed the CSV's dropship column into a real
    // boolean, not just the client's own display -- server-side proof for
    // requirement 5's CSV support.
    expect(parseStatus).toBe(200);
    expect(parseSawDropshipTrue).toBe(true);
  });

  test('2. "ships direct from supplier" note appears on the sower\'s product card', async ({ page }) => {
    await login(page, HOST_EMAIL, HOST_PASS);
    await page.goto('/stall/build?tab=products', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(PRODUCT_TITLE)).toBeVisible({ timeout: 20000 });

    const card = page.locator('div', { hasText: PRODUCT_TITLE }).filter({ hasText: 'Ships direct from supplier' });
    await expect(card.first()).toBeVisible({ timeout: 10000 });
  });

  test('3. "ships direct from supplier" note appears at checkout, order created with correct 85/15 split', async ({ page }) => {
    // Resolved out-of-band (via a direct read-only DB query) after test 1
    // publishes the row, and passed in through the environment -- avoids
    // needing a Supabase anon key inside this spec.
    const productId = process.env.TEST_DROPSHIP_PRODUCT_ID ?? '';
    expect(productId, 'TEST_DROPSHIP_PRODUCT_ID must be set to the id published in test 1').toBeTruthy();

    let orderStatus = 0;
    page.on('requestfinished', async (req) => {
      if (req.url().includes('create-basket-bestowal-order')) {
        orderStatus = (await req.response())?.status() ?? 0;
      }
    });

    await login(page, BUYER_EMAIL, BUYER_PASS);
    await page.goto(`/bulk/products/${productId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: PRODUCT_TITLE })).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: /Add to basket/i }).click();

    await page.goto('/products/basket', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(PRODUCT_TITLE)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Ships direct from supplier')).toBeVisible({ timeout: 10000 });

    // Subtotal/fee/"To Sowers" breakdown in the basket UI is evidence the
    // 85/15 split math is untouched: on a $5.00 line, S2G's 15% fee is
    // $0.75 added ON TOP (buyer pays $5.75), and the sower still gets the
    // full $5.00 -- unaffected by is_dropship.
    await expect(page.getByText('Subtotal').locator('..')).toContainText('$5.00');
    await expect(page.getByText('Sow2Grow Fee').locator('..')).toContainText('$0.75');
    await expect(page.getByText('To Sowers').locator('..')).toContainText('$5.00');

    // Select PayPal and initiate the order to prove the full create-order
    // path (including the new is_dropship join) works end-to-end -- capture
    // the approval host WITHOUT following it, so no real payment is
    // authorized from this run.
    const paypalOption = page.getByRole('radio', { name: /paypal/i }).or(page.getByText(/^paypal$/i));
    if (await paypalOption.count() > 0) {
      await paypalOption.first().click().catch(() => {});
    }

    // Capture the approval URL's HOST (sandbox.paypal.com vs paypal.com)
    // from the outgoing navigation request itself, then abort it -- proves
    // the order-creation path (auth -> basket -> is_dropship join -> fee
    // split -> real PayPal order created server-side) works end-to-end,
    // WITHOUT ever loading PayPal's page or authorizing a real payment.
    let approveUrl = '';
    await page.route('**/*paypal.com/**', (route) => {
      approveUrl = route.request().url();
      route.abort();
    });

    await page.getByRole('button', { name: /Complete Bestowal/i }).click();
    await expect.poll(() => approveUrl, { timeout: 10000 }).toContain('paypal.com/checkoutnow');
    expect(orderStatus).toBe(200);
    console.log('PayPal approve URL host (order created, payment NOT authorized):', new URL(approveUrl).host);
  });
});
