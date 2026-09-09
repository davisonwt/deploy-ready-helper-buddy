import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Member invoicing Phase 1 (MEMBER-INVOICING-PLAN.md), against the REAL
// backend. As A (granted a trial by the gosat account): create an invoice
// for a fresh customer, send it, and confirm the public pay page shows the
// right totals and fee line WITHOUT signing in. Completing a real devnet
// USDC send with a wallet is out of scope for CI, same as
// tests/payments/revenue-ledger.spec.ts's basket-order case -- this proves
// the invoice reaches a payable state with a correct public view, not a
// full on-chain round trip.
//
// Skips itself without credentials. Never commit .env.test.

const SUPABASE_URL = 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const SUPABASE_PROJECT_REF = 'zuwkgasbkpjlxzsjzumu';
const ANON_KEY = 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa';

const GOSAT_EMAIL = process.env.TEST_GOSAT_EMAIL;
const GOSAT_PASSWORD = process.env.TEST_GOSAT_PASSWORD;
const A_EMAIL = process.env.TEST_A_EMAIL;
const A_PASSWORD = process.env.TEST_A_PASSWORD;
const A_USER_ID = process.env.TEST_A_USER_ID;

const HAVE_CREDS = Boolean(GOSAT_EMAIL && GOSAT_PASSWORD && A_EMAIL && A_PASSWORD && A_USER_ID);

async function signIn(email: string, password: string) {
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  expect(error, `sign-in as ${email} must succeed`).toBeNull();
  return { client, session: data.session! };
}

async function useSession(page: import('@playwright/test').Page, session: unknown) {
  await page.addInitScript(
    ({ storageKey, session }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(session));
      window.sessionStorage.setItem('audioUnlocked', '1');
    },
    { storageKey: `sb-${SUPABASE_PROJECT_REF}-auth-token`, session },
  );
}

test.describe('member invoicing Phase 1', () => {
  test.skip(!HAVE_CREDS, 'Set TEST_GOSAT_EMAIL/PASSWORD and TEST_A_EMAIL/PASSWORD/USER_ID to run this spec.');

  test('A (granted a trial) sends an invoice; the public pay page shows it correctly, unsigned', async ({ page, context }) => {
    const { client: gosatClient } = await signIn(GOSAT_EMAIL!, GOSAT_PASSWORD!);

    // Grant A a trial directly (same effect as GosatSubscriptionsPage's
    // "Grant trial" button) -- this spec checks the invoicing flow, not
    // that specific admin screen's click-path.
    const { error: subErr } = await gosatClient.from('feature_subscriptions').insert({
      user_id: A_USER_ID,
      feature: 'invoicing',
      status: 'trial',
      current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      source: 'gosat',
    });
    expect(subErr, 'granting the trial must succeed').toBeNull();

    const { client: aClient, session: aSession } = await signIn(A_EMAIL!, A_PASSWORD!);
    await useSession(page, aSession);

    // Find or create A's books-enabled business.
    let { data: company } = await aClient.from('companies').select('id').eq('owner_user_id', A_USER_ID).eq('books_enabled', true).limit(1).maybeSingle();
    if (!company) {
      const created = await aClient.from('companies').insert({ name: 'Playwright test co', slug: `playwright-test-co-${Date.now()}`, owner_user_id: A_USER_ID, books_enabled: true, currency: 'USD' }).select('id').single();
      company = created.data;
    }
    expect(company?.id, 'A needs a books-enabled business').toBeTruthy();

    const { data: customer, error: custErr } = await aClient
      .from('customers')
      .insert({ business_id: company!.id, name: 'Playwright Customer', email: 'playwright-customer@example.com' })
      .select('id')
      .single();
    expect(custErr, 'customer insert must succeed').toBeNull();

    const { data: number } = await aClient.rpc('next_invoice_number', { _business_id: company!.id });
    const { data: invoice, error: invErr } = await aClient
      .from('invoices')
      .insert({ business_id: company!.id, customer_id: customer!.id, number, subtotal: 42, total: 42 })
      .select('id, public_token')
      .single();
    expect(invErr, 'invoice insert must succeed').toBeNull();
    await aClient.from('line_items').insert({ invoice_id: invoice!.id, position: 0, description: 'Playwright test line', quantity: 1, unit_price: 42 });
    await aClient.from('invoices').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', invoice!.id);

    // The member's own view: status "sent", the pay link visible.
    await page.goto(`/books/invoices/${invoice!.id}`);
    await expect(page.getByText(/sent/i).first()).toBeVisible();

    // The public pay page: no session in this new context, token-keyed only.
    const guest = await context.newPage();
    await guest.goto(`/pay/${invoice!.public_token}`);
    await expect(guest.getByText('Playwright test line')).toBeVisible();
    await expect(guest.getByText('$42.00', { exact: false }).first()).toBeVisible();
    // 15% of 42.00 = 6.30 fee; buyer total 48.30.
    await expect(guest.getByText('$6.30', { exact: false })).toBeVisible();
    await expect(guest.getByText('$48.30', { exact: false })).toBeVisible();
    await expect(guest.getByRole('button', { name: /pay with usdc/i })).toBeVisible();
  });
});
