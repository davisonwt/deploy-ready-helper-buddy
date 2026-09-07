import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// P0-5 Phase C3, against the REAL backend:
//   1. as the owner's gosat account (TEST_GOSAT_EMAIL / TEST_GOSAT_PASSWORD in
//      .env.test): /admin/orchards lists the two test orchards with their
//      states, refuses to cancel the released one and shows why, and the
//      cancelled one's refund row reads Confirmed with the devnet signature;
//   2. as member A (the bestower): the cancelled orchard's pocket reads
//      "Refunded" with the transaction link, on the orchard page and on My Seeds;
//   3. as member B (the sower): the Cancelled badge and the reason.
// Nothing is changed: no cancel is confirmed, no RPC that writes is called.
//
// Skips itself without the credentials. Never commit .env.test.

const SUPABASE_URL = 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const SUPABASE_PROJECT_REF = 'zuwkgasbkpjlxzsjzumu';
const ANON_KEY = 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa';

// The two orchards the Phase B and Phase C2 proofs left behind (2026-09-06).
const RELEASED_ORCHARD = '9d8fbab2';   // "Phase B release test orchard", released
const CANCELLED_ORCHARD = '55f4e02e-32fe-4013-aa7b-4eff6da77d37'; // "Phase A test orchard", cancelled, one pocket refunded
const REFUND_SIGNATURE_PREFIX = '2iuoASMsL5sW';

const GOSAT_EMAIL = process.env.TEST_GOSAT_EMAIL;
const GOSAT_PASSWORD = process.env.TEST_GOSAT_PASSWORD;
const A_EMAIL = process.env.TEST_A_EMAIL;
const A_PASSWORD = process.env.TEST_A_PASSWORD;
const B_EMAIL = process.env.TEST_B_EMAIL;
const B_PASSWORD = process.env.TEST_B_PASSWORD;

async function signIn(email: string, password: string) {
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  expect(error, `sign-in as ${email} must succeed`).toBeNull();
  return data.session!;
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

test.describe('orchard console (Phase C3)', () => {
  test.skip(!GOSAT_EMAIL || !GOSAT_PASSWORD, 'Set TEST_GOSAT_EMAIL / TEST_GOSAT_PASSWORD (the owner\'s gosat account) to run this spec.');

  test('as gosat: states, the released orchard refuses cancel, the cancelled one shows its confirmed refund', async ({ page }) => {
    const session = await signIn(GOSAT_EMAIL!, GOSAT_PASSWORD!);
    await useSession(page, session);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/admin/orchards', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('orchards-table')).toBeVisible({ timeout: 30_000 });

    const released = page.locator(`[data-testid="orchard-row"][data-orchard-id^="${RELEASED_ORCHARD}"]`);
    await expect(released).toHaveCount(1);
    await expect(released).toHaveAttribute('data-state', 'released');
    await expect(released.getByTestId('orchard-state')).toHaveText('Funded & released');
    await expect(released.getByTestId('orchard-cancel')).toBeDisabled();
    await expect(released.getByTestId('orchard-cancel-refusal')).toHaveText('Released orchards cannot be cancelled: the sower has already been paid.');

    const cancelled = page.locator(`[data-testid="orchard-row"][data-orchard-id="${CANCELLED_ORCHARD}"]`);
    await expect(cancelled).toHaveCount(1);
    await expect(cancelled).toHaveAttribute('data-state', 'cancelled');
    await expect(cancelled.getByTestId('orchard-state')).toHaveText('Cancelled');
    await expect(cancelled.getByTestId('orchard-held')).toHaveText('$0.00');
    await expect(cancelled.getByTestId('orchard-cancel')).toBeDisabled();
    await expect(cancelled.getByTestId('orchard-cancel-refusal')).toHaveText('Already cancelled.');

    const progress = page.locator(`[data-testid="refund-progress"][data-orchard-id="${CANCELLED_ORCHARD}"]`);
    await expect(progress).toBeVisible();
    await expect(progress.getByText(/cancelled, 1 of 1 refunded/)).toBeVisible();
    const refundRow = progress.getByTestId('refund-row');
    await expect(refundRow).toHaveCount(1);
    await expect(refundRow).toHaveAttribute('data-status', 'confirmed');
    await expect(refundRow.getByTestId('refund-state')).toHaveText('Confirmed');
    const refLink = refundRow.getByTestId('refund-reference').locator('a');
    await expect(refLink).toContainText(REFUND_SIGNATURE_PREFIX.slice(0, 10));
    await expect(refLink).toHaveAttribute('href', new RegExp(`solscan\\.io/tx/${REFUND_SIGNATURE_PREFIX}.*cluster=devnet`));
    await expect(refundRow.getByTestId('refund-retry')).toHaveCount(0);   // confirmed: nothing to retry or write off
    await expect(refundRow.getByTestId('refund-write-off')).toHaveCount(0);

    expect(errors, 'no uncaught page errors').toEqual([]);
  });

  test('as the bestower (A): the cancelled orchard\'s pocket reads Refunded with the transaction', async ({ page }) => {
    test.skip(!A_EMAIL || !A_PASSWORD, 'Set TEST_A_EMAIL / TEST_A_PASSWORD.');
    const session = await signIn(A_EMAIL!, A_PASSWORD!);
    await useSession(page, session);

    await page.goto(`/orchard/${CANCELLED_ORCHARD}`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('orchard-cancelled-badge')).toHaveText('Cancelled', { timeout: 30_000 });
    await expect(page.getByTestId('funding-progress')).toHaveAttribute('data-state', 'cancelled');
    await expect(page.getByTestId('orchard-cancelled-alert')).toBeVisible();
    await expect(page.getByTestId('orchard-bestow-button')).toHaveCount(0);

    const pocket = page.getByTestId('my-pocket-state');
    await expect(pocket).toHaveCount(1);
    await expect(pocket).toHaveAttribute('data-tone', 'done');
    await expect(pocket).toContainText('Refunded to the wallet you paid from · tx 2iuoASMs…iHva');
    await expect(pocket.locator('a')).toHaveAttribute('href', new RegExp(`solscan\\.io/tx/${REFUND_SIGNATURE_PREFIX}.*cluster=devnet`));
    // The reason is for the sower, not the bestower.
    await expect(page.getByTestId('orchard-cancel-reason')).toHaveCount(0);

    await page.goto('/my-seeds', { waitUntil: 'networkidle' });
    // A has more than one refunded pocket since the 2026-09-06 mainnet
    // refund proof, so pick this orchard's pocket by its own signature.
    const seedsPocket = page.getByTestId('pocket-state').filter({ hasText: 'tx 2iuoASMs…iHva' });
    await expect(seedsPocket.first()).toBeVisible({ timeout: 30_000 });
    await expect(seedsPocket.first()).toContainText('Refunded');
  });

  test('as the sower (B): the Cancelled badge with the reason, and no bestow button', async ({ page }) => {
    test.skip(!B_EMAIL || !B_PASSWORD, 'Set TEST_B_EMAIL / TEST_B_PASSWORD.');
    const session = await signIn(B_EMAIL!, B_PASSWORD!);
    await useSession(page, session);

    await page.goto(`/orchard/${CANCELLED_ORCHARD}`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('orchard-cancelled-badge')).toHaveText('Cancelled', { timeout: 30_000 });
    await expect(page.getByTestId('orchard-cancel-reason')).toContainText('Reason given: Phase C2 devnet proof');
    await expect(page.getByTestId('orchard-bestow-button')).toHaveCount(0);
  });
});
