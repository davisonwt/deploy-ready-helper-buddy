import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// P0-5 Phase A, against the REAL backend as member A (see .env.test):
//   1. the orchard page renders funding progress from
//      public.orchard_funding_status(), not from a hand-set filled_pockets;
//   2. the bestow dialog requires a delivery address for a "claim a unit"
//      pocket on a physical orchard, and drops the requirement for a
//      "gift a unit" pocket.
// No payment is started: the dialog is opened and inspected, never submitted.
//
// Skips itself without TEST_A_EMAIL / TEST_A_PASSWORD.

const SUPABASE_URL = 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const SUPABASE_PROJECT_REF = 'zuwkgasbkpjlxzsjzumu';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1d2tnYXNia3BqbHh6c2p6dW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDk4MjEsImV4cCI6MjA2ODQyNTgyMX0.ffH_7MzNCgyjXf8BFzGDCiVE7Qjptqb9qKBkq3gVbiU';

const A_EMAIL = process.env.TEST_A_EMAIL;
const A_PASSWORD = process.env.TEST_A_PASSWORD;

test.describe('orchard holdings (Phase A)', () => {
  test.skip(!A_EMAIL || !A_PASSWORD, 'Set TEST_A_EMAIL / TEST_A_PASSWORD (a non-admin member) to run this spec.');

  test('orchard page shows funding from orchard_funding_status and the bestow dialog enforces the delivery address', async ({ page }) => {
    const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { data: signIn, error: signInErr } = await client.auth.signInWithPassword({ email: A_EMAIL!, password: A_PASSWORD! });
    expect(signInErr, 'sign-in as A must succeed').toBeNull();
    const session = signIn.session!;

    // Pick an active PHYSICAL orchard that is not fully funded.
    const { data: orchards, error: orchErr } = await client
      .from('orchards')
      .select('id, title, product_type, total_pockets, pocket_price')
      .eq('status', 'active')
      .eq('product_type', 'physical')
      .gt('total_pockets', 0)
      .order('created_at', { ascending: false })
      .limit(10);
    expect(orchErr).toBeNull();
    let target: any = null;
    for (const o of orchards ?? []) {
      const { data: f } = await client.rpc('orchard_funding_status', { _orchard_id: o.id });
      const row = Array.isArray(f) ? f[0] : f;
      if (row && !row.funded) { target = { ...o, funding: row }; break; }
    }
    test.skip(!target, 'No active, physical, not-yet-funded orchard to test against.');

    await page.addInitScript(
      ({ storageKey, session }) => {
        window.localStorage.setItem(storageKey, JSON.stringify(session));
        window.sessionStorage.setItem('audioUnlocked', '1');
      },
      { storageKey: `sb-${SUPABASE_PROJECT_REF}-auth-token`, session },
    );

    // 1. Progress comes from the function: capture its response and compare.
    const fundingResponse = page.waitForResponse(
      (res) => res.url().includes('/rest/v1/rpc/orchard_funding_status') && res.status() < 300,
      { timeout: 30_000 },
    );
    await page.goto(`/orchard/${target.id}`, { waitUntil: 'networkidle' });
    const funding = await (await fundingResponse).json();
    const row = Array.isArray(funding) ? funding[0] : funding;
    expect(row, 'orchard_funding_status must answer').toBeTruthy();

    const percent = row.target > 0 ? Math.min(100, Math.round((Number(row.held_total) / Number(row.target)) * 100)) : 0;
    await expect(page.getByTestId('funding-percent')).toHaveText(`${percent}%`);
    await expect(page.getByTestId('funding-pockets')).toHaveText(`${row.pockets_held} / ${row.pockets_total}`);
    await expect(page.getByTestId('funding-progress')).toHaveAttribute('data-funded', row.funded ? '1' : '0');

    // 2. Bestow dialog: "claim a unit" on a physical orchard needs an address.
    await page.getByTestId('orchard-bestow-button').click();
    await expect(page.getByTestId('pocket-kind')).toBeVisible();
    await expect(page.getByTestId('delivery-address')).toBeVisible();
    await expect(page.getByTestId('bestow-submit')).toBeDisabled();

    // Filling the required fields enables the button; a gap disables it again.
    await page.getByTestId('addr-name').fill('Test Member A');
    await page.getByTestId('addr-line1').fill('1 Orchard Lane');
    await page.getByTestId('addr-city').fill('Cape Town');
    await page.getByTestId('addr-postal').fill('8001');
    await page.getByTestId('addr-country').fill('ZA');
    await expect(page.getByTestId('bestow-submit')).toBeEnabled();
    await page.getByTestId('addr-city').fill('');
    await expect(page.getByTestId('bestow-submit')).toBeDisabled();
    await expect(page.getByTestId('addr-problem')).toContainText('city');

    // "Gift a unit" needs no address at all.
    await page.getByTestId('pocket-kind-gift').click();
    await expect(page.getByTestId('delivery-address')).toHaveCount(0);
    await expect(page.getByTestId('bestow-submit')).toBeEnabled();

    // Never submit: no payment is started by this spec.
  });
});
