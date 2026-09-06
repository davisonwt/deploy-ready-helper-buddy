import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// The admin entry path a gosat actually uses: /dashboard -> the "Gosat's"
// tile -> /admin/dashboard, as a client-side navigation inside the running
// bundle (not a fresh URL load). 2026-09-06: reported as looping back to
// the dashboard after a publish; the route guard bounced on any failed
// role query. This pins the happy path and the guard's no-bounce rule.
//
// Skips itself without TEST_GOSAT_EMAIL / TEST_GOSAT_PASSWORD.

const SUPABASE_URL = 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const SUPABASE_PROJECT_REF = 'zuwkgasbkpjlxzsjzumu';
const ANON_KEY = 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa';
const GOSAT_EMAIL = process.env.TEST_GOSAT_EMAIL;
const GOSAT_PASSWORD = process.env.TEST_GOSAT_PASSWORD;

test.describe('admin entry (gosat)', () => {
  test.skip(!GOSAT_EMAIL || !GOSAT_PASSWORD, 'Set TEST_GOSAT_EMAIL / TEST_GOSAT_PASSWORD to run this spec.');

  test("the Gosat's tile on /dashboard opens /admin/dashboard, no bounce", async ({ page }) => {
    const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { data, error } = await client.auth.signInWithPassword({ email: GOSAT_EMAIL!, password: GOSAT_PASSWORD! });
    expect(error).toBeNull();
    await page.addInitScript(({ key, session }) => {
      window.localStorage.setItem(key, JSON.stringify(session));
      window.sessionStorage.setItem('audioUnlocked', '1');
      window.localStorage.setItem('sw:disabled', '1');
    }, { key: `sb-${SUPABASE_PROJECT_REF}-auth-token`, session: data.session });

    const visited: string[] = [];
    page.on('framenavigated', (f) => { if (f === page.mainFrame()) visited.push(new URL(f.url()).pathname); });

    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    const tile = page.getByText("Gosat's", { exact: false }).first();
    await expect(tile).toBeVisible({ timeout: 30_000 });
    await tile.click();

    await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 30_000 });
    await expect(page.getByText("Gosat's — Admin Dashboard")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('role-check-error')).toHaveCount(0);
    // Never bounced back after reaching the admin route.
    const afterAdmin = visited.slice(visited.indexOf('/admin/dashboard') + 1);
    expect(afterAdmin.filter((p) => p === '/dashboard')).toEqual([]);
  });

  test('a failed role query shows an error with retry instead of bouncing to /dashboard', async ({ page }) => {
    const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { data } = await client.auth.signInWithPassword({ email: GOSAT_EMAIL!, password: GOSAT_PASSWORD! });
    await page.addInitScript(({ key, session }) => {
      window.localStorage.setItem(key, JSON.stringify(session));
      window.sessionStorage.setItem('audioUnlocked', '1');
      window.localStorage.setItem('sw:disabled', '1');
    }, { key: `sb-${SUPABASE_PROJECT_REF}-auth-token`, session: data.session });
    // Make the role table unreachable for this page only.
    await page.route('**/rest/v1/user_roles**', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'simulated outage' }) }));
    await page.route('**/rest/v1/rpc/has_role**', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'simulated outage' }) }));

    await page.goto('/admin/dashboard', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('role-check-error')).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/admin\/dashboard$/);
  });
});
