// Pure state machine for the Solana payment watch loop -- extracted so the
// poll/backoff/terminal rules are unit-testable without React or timers.
//
// Rules (from the 2026-09-04 real-payment post-mortem, where a 500 + a
// CORS-less 429 killed a 30-minute watch):
//  - a failed poll (network error, 429, 500) is "still watching", never a
//    failure state, and never stops the loop; errors back the interval off
//    8s -> 16s -> 30s (cap), a successful poll resets it to 8s.
//  - 'expired' from the server is terminal ONLY when no wallet signature
//    was ever recorded. Once Phantom reported a signature, the transfer may
//    confirm late and the server now credits expired intents -- so the
//    watch keeps going.
//  - 'paid' is the only success terminal.

export const BASE_POLL_MS = 8_000;
export const MAX_POLL_MS = 30_000;

export interface WatchState {
  /** Delay before the next poll, ms. */
  delayMs: number;
  /** Consecutive failed polls. */
  errorCount: number;
  /** Terminal outcome, or null while still watching. */
  done: 'paid' | 'expired' | null;
}

export const initialWatchState: WatchState = { delayMs: BASE_POLL_MS, errorCount: 0, done: null };

export type WatchEvent =
  | { type: 'paid' }
  | { type: 'pending' }
  | { type: 'underpaid' }
  | { type: 'expired'; hasSignature: boolean }
  | { type: 'error' };

export function nextWatchState(prev: WatchState, event: WatchEvent): WatchState {
  switch (event.type) {
    case 'paid':
      return { ...prev, done: 'paid' };
    case 'expired':
      if (!event.hasSignature) return { ...prev, done: 'expired' };
      // A signature exists -- the payment may confirm late; keep watching
      // at the calm base rate (the server re-checks expired intents now).
      return { delayMs: BASE_POLL_MS, errorCount: 0, done: null };
    case 'error': {
      const errorCount = prev.errorCount + 1;
      return {
        delayMs: Math.min(BASE_POLL_MS * 2 ** errorCount, MAX_POLL_MS),
        errorCount,
        done: null,
      };
    }
    case 'pending':
    case 'underpaid':
    default:
      return { delayMs: BASE_POLL_MS, errorCount: 0, done: null };
  }
}
