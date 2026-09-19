import { test, expect } from '@playwright/test';

const A_EMAIL = process.env.TEST_USER_EMAIL || process.env.TEST_A_EMAIL || '';
const A_PASS = process.env.TEST_USER_PASSWORD || process.env.TEST_A_PASSWORD || '';

test.use({ viewport: { width: 390, height: 844 } });

test.describe.serial('Nav redirect verification (390x844, live)', () => {
  test.skip(!A_EMAIL || !A_PASS, 'TEST_USER_EMAIL/PASSWORD required in .env.test.');

  test('login', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', A_EMAIL);
    await page.fill('input[type="password"]', A_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 });
  });

  for (const path of ['/chatapp', '/community-chats', '/live-rooms', '/classroom', '/classroom/00000000-0000-0000-0000-000000000000', '/skilldrop', '/communications-hub']) {
    test(`redirect: ${path} -> /conversations`, async ({ page }) => {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.fill('input[type="email"]', A_EMAIL);
      await page.fill('input[type="password"]', A_PASS);
      await page.click('button[type="submit"]');
      await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 });
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForURL((u) => u.pathname === '/conversations', { timeout: 20000 });
      console.log(`[EVIDENCE] ${path} -> ${page.url()}`);
      expect(page.url()).toContain('/conversations');
    });
  }

  test('Dashboard "💬 Chat" button (the phone nav entry from the bug report) lands on /conversations', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', A_EMAIL);
    await page.fill('input[type="password"]', A_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 });
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const link = page.getByRole('link').filter({ hasText: 'Chat' }).first();
    await link.waitFor({ state: 'visible', timeout: 20000 });
    await link.click();
    await page.waitForURL((u) => u.pathname === '/conversations', { timeout: 20000 });
    console.log(`[EVIDENCE] Dashboard Chat button tap -> ${page.url()}`);
    expect(page.url()).toContain('/conversations');
  });

  test('cockpitNav "ChatApp" entry (StallSideNav) points at /conversations', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', A_EMAIL);
    await page.fill('input[type="password"]', A_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 });
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const href = await page.locator('a:has-text("ChatApp")').first().getAttribute('href');
    console.log(`[EVIDENCE] cockpitNav ChatApp href -> ${href}`);
    expect(href).toBe('/conversations');
  });

  test('room id is carried across: /chatapp?room=<AB_ROOM> -> /conversations?c=<AB_ROOM>', async ({ page }) => {
    const AB_ROOM = '2a4dbece-11f6-47a6-9df9-1ff9ae9dbf2a';
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', A_EMAIL);
    await page.fill('input[type="password"]', A_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 });
    await page.goto(`/chatapp?room=${AB_ROOM}`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL((u) => u.pathname === '/conversations', { timeout: 20000 });
    console.log(`[EVIDENCE] /chatapp?room=${AB_ROOM} -> ${page.url()}`);
    expect(page.url()).toContain(`c=${AB_ROOM}`);
  });
});
