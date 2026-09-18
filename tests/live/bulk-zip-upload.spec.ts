import { test, expect, type Page } from '@playwright/test';
import JSZip from 'jszip';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Bulk upload with media, end to end, against production.
 *
 * The shape Davison specified: at least 10 rows with images, 2 rows whose
 * named file is deliberately absent from the ZIP, and 1 row carrying a
 * video_url. The two missing files must be NAMED in the end-of-run report and
 * their rows must still be imported -- one missing photo never costs a member
 * the other rows.
 *
 * Run: npx playwright test --config=playwright.live.config.ts bulk-zip-upload
 */

const EMAIL = process.env.TEST_USER_EMAIL ?? process.env.TEST_A_EMAIL ?? '';
const PASS = process.env.TEST_USER_PASSWORD ?? process.env.TEST_A_PASSWORD ?? '';

/** Smallest valid PNG -- real bytes, so the moderation path runs for real. */
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const STAMP = `QAZIP-${Date.now().toString(36)}`;
const ROWS_WITH_IMAGES = 10;
const MISSING_ROWS = 2;

/** Builds the archive on disk and returns its path. */
async function buildTestZip(): Promise<{ path: string; presentNames: string[]; missingNames: string[] }> {
  const zip = new JSZip();
  const header = 'name,description,price,category,sku,stock_qty,image_file,audio_file,book_file,video_url';
  const lines = [header];
  const presentNames: string[] = [];
  const missingNames: string[] = [];

  for (let i = 1; i <= ROWS_WITH_IMAGES; i++) {
    const img = `${STAMP}-item-${i}.png`;
    presentNames.push(img);
    // Mixed case and a leading folder on purpose: the matcher must be
    // case-insensitive and tolerant of a folder prefix.
    const cell = i % 2 === 0 ? `images/${img.toUpperCase()}` : `images/${img}`;
    zip.file(`images/${img}`, PNG_1PX);
    lines.push(`${STAMP} Item ${i},Bulk zip test row ${i},${10 + i}.00,QA,${STAMP}-${i},5,${cell},,,`);
  }

  // Two rows naming a file that is NOT in the archive.
  for (let i = 1; i <= MISSING_ROWS; i++) {
    const missing = `${STAMP}-missing-${i}.png`;
    missingNames.push(missing);
    lines.push(`${STAMP} Missing ${i},Row whose photo was left out,9.00,QA,${STAMP}-m${i},1,images/${missing},,,`);
  }

  // One row carrying a video link rather than a video file.
  const videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  lines.push(`${STAMP} Video row,Row with a marketing video link,15.00,QA,${STAMP}-v1,3,,,,${videoUrl}`);

  zip.file('products.csv', lines.join('\n') + '\n');
  // A file nothing asks for, so the "unused files" line is exercised too.
  zip.file('images/nobody-asked-for-this.png', PNG_1PX);

  const dir = mkdtempSync(join(tmpdir(), 'bulkzip-'));
  const path = join(dir, 'seeds.zip');
  writeFileSync(path, await zip.generateAsync({ type: 'nodebuffer' }));
  return { path, presentNames, missingNames };
}

async function login(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 }).catch(() => {});
}

test.describe.serial('Bulk upload with media', () => {
  test.skip(!EMAIL || !PASS, 'a sower account is required in .env.test');
  test.setTimeout(10 * 60_000);

  test('1. the page states the required shape before a file is chosen', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard/sower/upload', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);

    const body = await page.evaluate(() => document.body.innerText);
    console.log(`[INSTRUCTIONS] ${body.replace(/\s+/g, ' ').slice(0, 300)}`);

    // Visible up front, not behind a link.
    expect(body, 'the columns are not named on the page').toMatch(/image_file/);
    expect(body, 'video_url is not explained on the page').toMatch(/video_url/);
    expect(body, 'the page does not say video is a link rather than a file').toMatch(/link, not a file|not put in the zip/i);
    expect(body, 'the page does not say a missing file still imports').toMatch(/missing file never costs|imported anyway/i);
    expect(body, 'the limits are not stated').toMatch(/200MB/);
    await expect(page.getByRole('button', { name: /Download the template ZIP/i })).toHaveCount(1);
    await page.screenshot({ path: 'test-results/bulk-instructions.png', fullPage: true });
  });

  test('2. a real ZIP imports every row and names the missing files', async ({ page }) => {
    const { path, missingNames } = await buildTestZip();
    console.log(`[ZIP] ${path}`);

    await login(page);
    await page.goto('/dashboard/sower/upload', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);

    await page.locator('input[type="file"]').first().setInputFiles(path);

    // Unpack + parse + upload/moderate every image. Real network, real
    // moderation -- this is deliberately generous.
    await expect(page.getByText(/Review & edit your seeds|Review and edit your seeds/i))
      .toBeVisible({ timeout: 5 * 60_000 });

    const report = await page.evaluate(() => document.body.innerText);
    console.log(`[REPORT] ${report.replace(/\s+/g, ' ').slice(0, 900)}`);

    // Every row imported: 10 with images + 2 missing + 1 video row.
    const total = ROWS_WITH_IMAGES + MISSING_ROWS + 1;
    const rowCount = await page.locator('tbody tr').count();
    console.log(`[ROWS] table rows: ${rowCount}, expected >= ${total}`);
    expect(rowCount, 'rows were dropped rather than imported').toBeGreaterThanOrEqual(total);

    // The two missing files must be named, by row and by filename.
    for (const missing of missingNames) {
      expect(report, `the report does not name the missing file ${missing}`).toContain(missing);
    }
    expect(report, 'the report does not say the rows were still imported').toMatch(/still imported/i);

    await page.screenshot({ path: 'test-results/bulk-zip-report.png', fullPage: true });
  });
});
