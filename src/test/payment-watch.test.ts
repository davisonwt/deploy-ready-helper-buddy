import { describe, it, expect } from 'vitest';
import { initialWatchState, nextWatchState, BASE_POLL_MS, MAX_POLL_MS } from '@/lib/payments/paymentWatch';

// The poll-loop rules from the 2026-09-04 real-payment post-mortem: a
// 30-minute watch died to a 500 followed by CORS-less 429s, and an intent
// with a wallet-reported signature was abandoned at expiry.
describe('payment watch state machine', () => {
  it('500 twice then paid -> paid, with backoff in between', () => {
    let s = initialWatchState;
    s = nextWatchState(s, { type: 'error' });
    expect(s.done).toBeNull();
    expect(s.delayMs).toBe(16_000);
    s = nextWatchState(s, { type: 'error' });
    expect(s.done).toBeNull();
    expect(s.delayMs).toBe(MAX_POLL_MS); // capped at 30s
    s = nextWatchState(s, { type: 'paid' });
    expect(s.done).toBe('paid');
  });

  it('a 429/failed poll keeps polling -- never a terminal state', () => {
    let s = initialWatchState;
    for (let i = 0; i < 10; i++) s = nextWatchState(s, { type: 'error' });
    expect(s.done).toBeNull();
    expect(s.delayMs).toBe(MAX_POLL_MS);
    // and a success resets the cadence
    s = nextWatchState(s, { type: 'pending' });
    expect(s.delayMs).toBe(BASE_POLL_MS);
    expect(s.errorCount).toBe(0);
  });

  it('expiry with a known wallet signature keeps watching; without one it ends', () => {
    const withSig = nextWatchState(initialWatchState, { type: 'expired', hasSignature: true });
    expect(withSig.done).toBeNull();
    expect(withSig.delayMs).toBe(BASE_POLL_MS);

    const withoutSig = nextWatchState(initialWatchState, { type: 'expired', hasSignature: false });
    expect(withoutSig.done).toBe('expired');
  });
});
