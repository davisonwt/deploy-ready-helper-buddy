import { test, expect } from '@playwright/test';

// Regression test for the "Buffer is not defined" crash on desktop
// Phantom's "Pay with Phantom" button (src/lib/payments/solanaWallet.ts /
// useSolanaWalletPay.ts). That crash only happens inside real
// @solana/web3.js + @solana/spl-token calls (associated-token-address
// derivation, SPL instruction encoding), which unit tests never exercise
// because they don't load an actual browser bundle. This test does: it
// loads the real production build in headless Chromium, stubs the Phantom
// wallet provider (no real wallet exists in CI), clicks the real button,
// and asserts the built transaction actually reaches the provider carrying
// the mainnet USDC mint -- with zero console errors along the way, which
// is exactly what "Buffer is not defined" would have produced instead.
//
// Everything the page would normally fetch from Supabase is stubbed
// (REST, the order-creation edge function, the Solana RPC) so this test is
// hermetic -- no live credentials, no live product/inventory state, no
// dependency on real backend config (e.g. the SOLANA_CLUSTER secret) to
// pass or fail deterministically.

const SUPABASE_PROJECT_REF = 'zuwkgasbkpjlxzsjzumu';
const SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;
const MAINNET_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// Real, valid (32-byte-decoding) Solana addresses, reused as stand-ins --
// buildUsdcTransferTransaction calls `new PublicKey(...)` on each of these,
// which throws on anything that doesn't decode to exactly 32 bytes, so
// these can't just be arbitrary strings.
const FAKE_BUYER_WALLET = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const FAKE_HOT_WALLET = '11111111111111111111111111111111';
const FAKE_REFERENCE = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
const FAKE_BLOCKHASH = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';

// A real, currently-published music seed (products row) -- id/price/sower
// confirmed live via `npx supabase db query` against the production
// database when this test was written. Only the shape matters here (every
// field this fixture omits, the page tolerates as null/empty); the id
// itself isn't touched for real since the order-creation call is stubbed
// below, never reaching the live create-basket-bestowal-order function.
const TRACK_ID = 'c09dd521-97c3-4fe4-a6a1-ed2d852158f5';
const TRACK_PRICE = 2.3;
const SOWER_USER_ID = '287e1afa-2bb0-4f4f-b6e7-49d5920c0866';
const FAKE_BUYER_USER_ID = '00000000-0000-4000-8000-000000000001';

function fakeJwt(payload: Record<string, unknown>): string {
  const b64url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.test-signature-not-verified-client-side`;
}

/** Client-side-valid fake session so useAuth's `user` is truthy. Never sent anywhere real. */
async function stubAuthSession(page: import('@playwright/test').Page) {
  const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
  await page.addInitScript(
    ({ storageKey, session }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(session));
    },
    {
      storageKey: `sb-${SUPABASE_PROJECT_REF}-auth-token`,
      session: {
        access_token: fakeJwt({ sub: FAKE_BUYER_USER_ID, role: 'authenticated', exp: futureExpiry }),
        refresh_token: 'test-refresh-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: futureExpiry,
        user: {
          id: FAKE_BUYER_USER_ID,
          aud: 'authenticated',
          role: 'authenticated',
          email: 'phantom-playwright-test@example.com',
          user_metadata: {},
          app_metadata: {},
        },
      },
    },
  );
}

/** Stub every Supabase REST read/write the page makes, with a configurable product price. */
async function stubRest(page: import('@playwright/test').Page, price: number) {
  await page.route(`${SUPABASE_URL}/rest/v1/**`, async (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.replace('/rest/v1/', '').split('?')[0];
    const method = route.request().method();

    if (table === 'dj_music_tracks') {
      return route.fulfill({ json: [] });
    }
    if (table === 'products') {
      return route.fulfill({
        json: [
          {
            id: TRACK_ID,
            title: 'Playwright Test Seed',
            artist_name: 'Test Sower',
            cover_image_url: null,
            image_urls: [],
            file_url: 'https://example.com/fake.mp3',
            preview_url: null,
            price,
            duration: 180,
            music_genre: 'test',
            music_mood: null,
            sower_id: 'test-sower-row-id',
            company_id: null,
            sowers: { user_id: SOWER_USER_ID },
          },
        ],
      });
    }
    if (table === 'sowers') {
      return route.fulfill({ json: [{ display_name: 'Test Sower' }] });
    }
    if (method === 'POST' || method === 'PATCH') {
      return route.fulfill({ json: [{}] });
    }
    return route.fulfill({ json: [] }); // product_bestowals, balance_available_v, etc.
  });
  await page.route(`${SUPABASE_URL}/rest/v1/rpc/**`, (route) => route.fulfill({ json: {} }));
}

test('desktop Phantom pay button builds a mainnet-USDC transaction with no console errors', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

  // --- Stub window.phantom.solana before any page script runs ---
  await page.addInitScript(
    ({ buyerWallet }) => {
      (window as any).__phantomCalls = { connect: 0, signAndSendTransaction: 0 };
      (window as any).__capturedTxMintCandidates = null;
      (window as any).phantom = {
        solana: {
          isPhantom: true,
          publicKey: null,
          connect: async () => {
            (window as any).__phantomCalls.connect += 1;
            const pk = { toString: () => buyerWallet };
            (window as any).phantom.solana.publicKey = pk;
            return { publicKey: pk };
          },
          signAndSendTransaction: async (transaction: any) => {
            (window as any).__phantomCalls.signAndSendTransaction += 1;
            try {
              (window as any).__capturedTxMintCandidates = (transaction.instructions ?? []).flatMap(
                (ix: any) => (ix.keys ?? []).map((k: any) => k.pubkey.toBase58()),
              );
            } catch (e) {
              (window as any).__capturedTxMintCandidates = [`capture-failed: ${(e as Error).message}`];
            }
            return { signature: 'FakeSignatureForPlaywrightTest11111111111111111111111111111' };
          },
        },
      };
    },
    { buyerWallet: FAKE_BUYER_WALLET },
  );

  await stubAuthSession(page);
  await stubRest(page, TRACK_PRICE);

  // --- The order-creation call: force a deterministic mainnet-USDC
  // response instead of hitting the live edge function (which would
  // create a real order and depends on live SOLANA_CLUSTER config). ---
  await page.route(`${SUPABASE_URL}/functions/v1/create-basket-bestowal-order`, (route) =>
    route.fulfill({
      json: {
        solanaPayment: {
          intentId: 'playwright-test-intent',
          referencePubkey: FAKE_REFERENCE,
          solanaPayUrl: `solana:${FAKE_HOT_WALLET}?amount=${TRACK_PRICE}&spl-token=${MAINNET_USDC_MINT}&reference=${FAKE_REFERENCE}`,
          hotWalletAddress: FAKE_HOT_WALLET,
          amountUsdc: TRACK_PRICE,
          cluster: 'mainnet-beta',
          expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
        },
      },
    }),
  );

  // Panel polls this every 5s -- keep it quiet and deterministic.
  await page.route(`${SUPABASE_URL}/functions/v1/check-solana-payment`, (route) =>
    route.fulfill({
      json: {
        status: 'pending',
        signature: null,
        receivedAmountUsdc: null,
        amountUsdc: TRACK_PRICE,
        expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      },
    }),
  );

  // --- Solana RPC calls buildUsdcTransferTransaction/pay() make against
  // getSolanaRpcUrl('mainnet-beta') -- getTokenAccountBalance (wallet
  // balance check), getLatestBlockhash, simulateTransaction. ---
  await page.route('https://api.mainnet-beta.solana.com/**', async (route) => {
    const body = route.request().postDataJSON() as { method: string; id: number };
    const respond = (result: unknown) =>
      route.fulfill({ json: { jsonrpc: '2.0', id: body.id, result } });

    switch (body.method) {
      case 'getTokenAccountBalance':
        return respond({
          context: { slot: 1 },
          value: { amount: '1000000000', decimals: 6, uiAmount: 1000, uiAmountString: '1000' },
        });
      case 'getLatestBlockhash':
        return respond({ context: { slot: 1 }, value: { blockhash: FAKE_BLOCKHASH, lastValidBlockHeight: 1_000_000 } });
      case 'simulateTransaction':
        return respond({ context: { slot: 1 }, value: { err: null, logs: [], accounts: null, unitsConsumed: 0 } });
      default:
        return respond(null);
    }
  });

  await page.goto(`/music-track/${TRACK_ID}`);

  const bestowButton = page.getByRole('button', { name: /Bestow \$/ });
  await expect(bestowButton).toBeVisible({ timeout: 15_000 });
  await bestowButton.click();

  // The Solana payment screen opens; click "Pay with Phantom".
  const payButton = page.getByRole('button', { name: /Pay \$.*with Phantom/ });
  await expect(payButton).toBeVisible({ timeout: 15_000 });
  await payButton.click();

  // The real buildUsdcTransferTransaction path runs here -- this is exactly
  // where "Buffer is not defined" threw before the fix.
  await expect
    .poll(async () => page.evaluate(() => (window as any).__phantomCalls.signAndSendTransaction), {
      timeout: 15_000,
      message: 'Phantom stub\'s signAndSendTransaction was never called -- the transaction never reached the wallet',
    })
    .toBeGreaterThan(0);

  const mintCandidates = await page.evaluate(() => (window as any).__capturedTxMintCandidates as string[]);
  expect(mintCandidates, 'transaction sent to Phantom must reference the mainnet USDC mint').toContain(
    MAINNET_USDC_MINT,
  );

  expect(consoleErrors, `console errors during checkout:\n${consoleErrors.join('\n')}`).toEqual([]);
});

// The fee is applied at exactly ONE layer, and it's the server's. Written
// after a "$2.66 instead of $2.31 -- the fee must be applied twice"
// report: traced live, the client never sends an amount at all (the
// request body is just productId+qty+provider; the server reads
// products.price itself, grosses up 15% once, adds the flat $0.01 network
// fee once), and the $2.66 came from the seed's stored price being $2.30,
// not $2.00. This test pins the whole browser-visible chain for a genuine
// $2.00 seed so any future re-fee-ing at either layer fails loudly:
//   1. the Bestow button shows the fee-inclusive $2.30 (client display),
//   2. the request body carries NO amount/price field (one-layer invariant),
//   3. the payment panel shows the server-computed $2.31.
// The create-basket-bestowal-order stub COMPUTES its amount from the
// request + fixture price using the deployed function's exact rule
// (verified on-wire against real orders b71ffbdd/557cf099: price 2.30 ->
// intent 2.66), rather than hardcoding 2.31 -- so if the client ever
// started sending a pre-grossed amount, the displayed total would drift
// and the assertions below would catch it.
test('a $2.00 seed shows Bestow $2.30, sends no amount in the request, and the payment panel shows $2.31', async ({ page }) => {
  const BASE_PRICE = 2.0;

  await stubAuthSession(page);
  await stubRest(page, BASE_PRICE);

  let capturedBody: Record<string, unknown> | null = null;
  await page.route(`${SUPABASE_URL}/functions/v1/create-basket-bestowal-order`, (route) => {
    capturedBody = route.request().postDataJSON() as Record<string, unknown>;

    // Mirror of the deployed function's amount rule (create-basket-
    // bestowal-order): per item, priceBreakdown(price) once -- base + 15%,
    // rounded to cents -- then computeBuyerFee('solana', subtotal) adds the
    // flat $0.01. Keep in sync with supabase/functions/_shared/platformFee.ts
    // and _shared/paypal/fees.ts.
    const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
    const items = (capturedBody?.items ?? []) as Array<{ productId: string; qty?: number }>;
    const subtotal = items.reduce((sum, item) => {
      const price = item.productId === TRACK_ID ? BASE_PRICE : 0;
      const lineTotal = round2(round2(price + round2(price * 0.15)) * Math.max(1, item.qty ?? 1));
      return round2(sum + lineTotal);
    }, 0);
    const amountUsdc = round2(subtotal + 0.01);

    return route.fulfill({
      json: {
        solanaPayment: {
          intentId: 'playwright-amount-test-intent',
          referencePubkey: FAKE_REFERENCE,
          solanaPayUrl: `solana:${FAKE_HOT_WALLET}?amount=${amountUsdc}&spl-token=${MAINNET_USDC_MINT}&reference=${FAKE_REFERENCE}`,
          hotWalletAddress: FAKE_HOT_WALLET,
          amountUsdc,
          cluster: 'mainnet-beta',
          expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
        },
      },
    });
  });

  await page.route(`${SUPABASE_URL}/functions/v1/check-solana-payment`, (route) =>
    route.fulfill({
      json: {
        status: 'pending',
        signature: null,
        receivedAmountUsdc: null,
        amountUsdc: 2.31,
        expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      },
    }),
  );

  await page.goto(`/music-track/${TRACK_ID}`);

  // 1. Client display: fee-inclusive total, computed from the $2.00 base.
  const bestowButton = page.getByRole('button', { name: /Bestow \$/ });
  await expect(bestowButton).toBeVisible({ timeout: 15_000 });
  await expect(bestowButton).toContainText('Bestow $2.30');

  await bestowButton.click();

  // 3. Server-computed amount on the payment panel: $2.31, exactly once-fee'd.
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('$2.31', { exact: false })).toBeVisible({ timeout: 15_000 });

  // 2. One-layer invariant: the request body carries no amount of any kind.
  expect(capturedBody, 'create-basket-bestowal-order was never called').not.toBeNull();
  const body = capturedBody as unknown as Record<string, unknown>;
  expect(body.provider).toBe('solana');
  expect(body.items).toEqual([{ productId: TRACK_ID, qty: 1 }]);
  for (const forbidden of ['amount', 'amountUsdc', 'price', 'total', 'buyerTotal', 'subtotal']) {
    expect(body, `client must never send "${forbidden}" -- the server owns all pricing`).not.toHaveProperty(forbidden);
  }
});
