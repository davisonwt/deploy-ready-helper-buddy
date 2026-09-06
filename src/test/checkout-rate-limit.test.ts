// Checkout rate limit (2026-09-06): order creation has its own generous
// bucket, a rejected attempt never counts, and the 429 says when to retry.
//
// The counting change lives inside two Deno functions, so the placement is
// proven by reading their source: the checkRateLimit call must come AFTER
// every validation return (400/404/409) and BEFORE the point of no return
// (the order insert / the PayPal capture). If someone moves it back above
// validation, this test fails.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CHECKOUT_LIMIT, rateLimitBody, rateLimitMessage, retryAfterMinutes } from '../../supabase/functions/_shared/rateLimitCopy';

function read(rel: string): string {
  return readFileSync(resolve(__dirname, '../../', rel), 'utf8').replace(/\r\n/g, '\n');
}

describe('checkout bucket', () => {
  it('is its own limit type, generous, fail-closed', () => {
    expect(CHECKOUT_LIMIT.limitType).toBe('checkout');
    expect(CHECKOUT_LIMIT.maxAttempts).toBeGreaterThanOrEqual(20);
    expect(CHECKOUT_LIMIT.timeWindowMinutes).toBeLessThanOrEqual(15);
    expect(CHECKOUT_LIMIT.failClosed).toBe(true);
  });

  it('create-basket-bestowal-order counts only attempts that reach the order insert', () => {
    const src = read('supabase/functions/create-basket-bestowal-order/index.ts');
    const rl = src.indexOf('RateLimitPresets.CHECKOUT.limitType');
    expect(rl).toBeGreaterThan(0);
    expect(src.includes('RateLimitPresets.PAYMENT')).toBe(false); // no longer in the money-out bucket
    for (const rejection of ['"invalid_json"', '"empty_basket"', '"invalid_provider"', '"sower_settlement_consent_pending"', '"product_not_found"', '"product_price_invalid"']) {
      const at = src.indexOf(rejection);
      expect(at, `${rejection} must be checked before the rate limit`).toBeGreaterThan(0);
      expect(at).toBeLessThan(rl);
    }
    expect(src.indexOf('.from("basket_orders")')).toBeGreaterThan(rl); // and the limit precedes the insert
  });

  it('capture-paypal-order counts only attempts that reach the PayPal capture', () => {
    const src = read('supabase/functions/capture-paypal-order/index.ts');
    const rl = src.indexOf('RateLimitPresets.CHECKOUT.limitType');
    expect(rl).toBeGreaterThan(0);
    expect(src.includes('RateLimitPresets.PAYMENT')).toBe(false);
    for (const rejection of ['"invalid_json"', '"order_not_found"', '"forbidden"', '"not_paypal_order"', 'status: "completed" })', '"paypal_order_id_missing"']) {
      const at = src.indexOf(rejection);
      expect(at, `${rejection} must be checked before the rate limit`).toBeGreaterThan(0);
      expect(at).toBeLessThan(rl);
    }
    expect(src.indexOf('captureAndFinalize(service')).toBeGreaterThan(rl);
  });

  it('the money-out functions keep the tight PAYMENT bucket', () => {
    for (const fn of ['request-earnings-payout', 'request-balance-withdrawal', 'update-crypto-payout', 'create-wallet-topup']) {
      expect(read(`supabase/functions/${fn}/index.ts`).includes('RateLimitPresets.PAYMENT')).toBe(true);
    }
  });
});

describe('429 wording', () => {
  it('says when to retry, in minutes, never "Rate limit exceeded"', () => {
    expect(rateLimitMessage(900)).toBe('Too many attempts, try again in 15 minutes.');
    expect(rateLimitMessage(60)).toBe('Too many attempts, try again in 1 minute.');
    expect(rateLimitMessage(61)).toBe('Too many attempts, try again in 2 minutes.');
    expect(retryAfterMinutes(0)).toBe(1);
    expect(retryAfterMinutes(NaN)).toBe(1);
    const body = rateLimitBody(900);
    expect(body.error).toBe(body.message);
    expect(body.code).toBe('rate_limited');
    expect(body.retryAfter).toBe(900);
    expect(body.error.includes('Rate limit exceeded')).toBe(false);
  });
});
