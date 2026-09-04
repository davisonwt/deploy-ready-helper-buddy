// @vitest-environment node
import { describe, it, expect } from 'vitest';

// LIVE test against the DEPLOYED solana-rpc-proxy -- no route stubs can
// fool it. Skipped unless RUN_LIVE_TESTS=1 (it needs network and the
// deployed function). Exists because the first real desktop Phantom
// attempt died at this exact preflight: web3.js sends a `solana-client`
// header, and a deploy of the proxy without it in
// Access-Control-Allow-Headers kills the payment before any request
// reaches the function.
const LIVE = process.env.RUN_LIVE_TESTS === '1';
const PROXY_URL = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/functions/v1/solana-rpc-proxy';

describe.skipIf(!LIVE)('solana-rpc-proxy live CORS (RUN_LIVE_TESTS=1)', () => {
  it('preflight allows every header the browser pay-flow sends, including solana-client', async () => {
    const res = await fetch(PROXY_URL, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://sow2growapp.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'solana-client, authorization, content-type, apikey, x-client-info',
      },
    });
    expect(res.status).toBe(200);
    const allowHeaders = (res.headers.get('access-control-allow-headers') ?? '').toLowerCase();
    for (const h of ['solana-client', 'authorization', 'content-type', 'apikey', 'x-client-info']) {
      expect(allowHeaders, `preflight must allow "${h}"`).toContain(h);
    }
    expect(res.headers.get('access-control-allow-origin')).toBeTruthy();
  });

  it('error responses carry CORS headers too (401 without auth)', async () => {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { Origin: 'https://sow2growapp.com', 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getLatestBlockhash', params: [] }),
    });
    expect(res.status).toBe(401);
    expect(res.headers.get('access-control-allow-origin')).toBeTruthy();
  });
});
