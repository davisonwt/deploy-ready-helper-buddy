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

  // --- Seed a client-side-valid (unexpired) fake session so useAuth's
  // `user` is truthy. Never sent anywhere real: every authenticated call
  // this test cares about is intercepted below, and unintercepted ones are
  // read-only public data this fake token is irrelevant to. ---
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

  // --- Stub every Supabase REST read/write the page makes. Unknown
  // tables default to an empty result rather than erroring, so this stays
  // robust to unrelated fetches added elsewhere on the page later. ---
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
            price: TRACK_PRICE,
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
      // profiles upsert and similar -- echo back a minimal representation.
      return route.fulfill({ json: [{}] });
    }
    return route.fulfill({ json: [] }); // product_bestowals, balance_available_v, etc. -- "not owned" / "no balance"
  });

  await page.route(`${SUPABASE_URL}/rest/v1/rpc/**`, (route) => route.fulfill({ json: {} }));

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
