import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Diagnoses the reported bug: AdminButton.jsx's teal "gosat's (...)" dropdown
// in StallSideNav (wired back in, 123c1ed4) shows but tapping it does
// nothing. Radix's DropdownMenuContent already renders via a Portal (see
// src/components/ui/dropdown-menu.tsx) -- NOT the same clipped-popup class
// of bug as the phone-portrait spotlight fix, so this checks for the actual
// cause directly: does the trigger's data-state flip to "open", does the
// portaled content actually mount with real on-screen coordinates, and does
// /admin/dashboard load cleanly by direct URL.

const SUPABASE_URL = 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const SUPABASE_PROJECT_REF = 'zuwkgasbkpjlxzsjzumu';
const ANON_KEY = 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa';
const GOSAT_EMAIL = process.env.TEST_GOSAT_EMAIL;
const GOSAT_PASSWORD = process.env.TEST_GOSAT_PASSWORD;

test('diagnose: AdminButton dropdown in StallSideNav', async ({ page }) => {
  test.skip(!GOSAT_EMAIL || !GOSAT_PASSWORD, 'Set TEST_GOSAT_EMAIL / TEST_GOSAT_PASSWORD to run this spec.');
  test.setTimeout(60_000);

  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email: GOSAT_EMAIL!, password: GOSAT_PASSWORD! });
  expect(error).toBeNull();
  await page.addInitScript(({ key, session }) => {
    window.localStorage.setItem(key, JSON.stringify(session));
    window.sessionStorage.setItem('audioUnlocked', '1');
    window.localStorage.setItem('sw:disabled', '1');
  }, { key: `sb-${SUPABASE_PROJECT_REF}-auth-token`, session: data.session });

  const consoleErrors: string[] = [];
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  await page.goto('/cockpit', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const trigger = page.locator("button:has-text(\"gosat's\")").first();
  await expect(trigger, 'the teal AdminButton trigger should be visible').toBeVisible({ timeout: 15000 });

  const stateBefore = await trigger.getAttribute('data-state');
  console.log('DIAGNOSE: trigger data-state BEFORE click:', stateBefore);

  await trigger.click();
  await page.waitForTimeout(600);

  const stateAfter = await trigger.getAttribute('data-state');
  console.log('DIAGNOSE: trigger data-state AFTER click:', stateAfter);

  const menuItem = page.locator('text="Admin Dashboard & Wallet Settings"');
  const inDom = await menuItem.count();
  console.log('DIAGNOSE: "Admin Dashboard & Wallet Settings" menu item count in DOM:', inDom);

  let box = null;
  if (inDom > 0) {
    box = await menuItem.first().boundingBox();
    console.log('DIAGNOSE: menu item bounding box:', JSON.stringify(box));
    console.log('DIAGNOSE: menu item visible (Playwright isVisible):', await menuItem.first().isVisible());
  }

  console.log('DIAGNOSE: console/page errors captured:', JSON.stringify(consoleErrors.slice(0, 10)));

  // Direct-URL check, independent of the dropdown.
  await page.goto('/admin/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const directUrlOk = await page.getByText(/Gosat.?s — Admin Dashboard|Admin Dashboard/i).first().isVisible().catch(() => false);
  console.log('DIAGNOSE: /admin/dashboard loads directly by URL:', directUrlOk, 'final URL:', page.url());

  // Report only -- this run's purpose is diagnosis, not pass/fail yet.
  expect(true).toBe(true);
});
