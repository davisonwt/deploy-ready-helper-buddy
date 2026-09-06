// My Wallet tile (2026-09-06): a failed balance read must never render as
// $0.00. The hook reports the error, leaves the balance unknown, and never
// caches a failure; only a real answer from the chain is cached.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const invoke = vi.fn();
vi.mock('@/lib/payments/invokeFunction', () => ({
  invokePaymentFunction: (...args: unknown[]) => invoke(...args),
}));

import {
  useLiveWalletBalance,
  describeBalanceError,
  clearLiveWalletBalanceCache,
} from '@/lib/payments/liveWalletBalance';

const ADDR = '414KU8dRj7LtfFQbsQTPFwMGhQstb4yPPohU3c3cRqzQ';

beforeEach(() => {
  invoke.mockReset();
  clearLiveWalletBalanceCache();
});

describe('useLiveWalletBalance', () => {
  it('a real zero is a zero: no token account yet reads 0.00 with no error', async () => {
    invoke.mockResolvedValueOnce({ balance: 0 });
    const { result } = renderHook(() => useLiveWalletBalance(ADDR));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.balance).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('a failed read is unknown, not zero, and is not cached', async () => {
    invoke.mockRejectedValueOnce(new Error('Could not reach the payment service.'));
    const { result } = renderHook(() => useLiveWalletBalance(ADDR));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.balance).toBeNull();
    expect(result.current.error).toBe("Couldn't reach the balance service.");

    // Retry after the failure hits the function again (nothing was cached) and recovers.
    invoke.mockResolvedValueOnce({ balance: 4.277931 });
    await act(async () => { await result.current.refetch(); });
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(result.current.balance).toBe(4.277931);
    expect(result.current.error).toBeNull();
  });

  it('a successful read is cached for the next mount; a failure never overwrites it', async () => {
    invoke.mockResolvedValueOnce({ balance: 2 });
    const first = renderHook(() => useLiveWalletBalance(ADDR));
    await waitFor(() => expect(first.result.current.balance).toBe(2));

    const second = renderHook(() => useLiveWalletBalance(ADDR));
    await waitFor(() => expect(second.result.current.loading).toBe(false));
    expect(second.result.current.balance).toBe(2);
    expect(invoke).toHaveBeenCalledTimes(1); // served from cache
  });

  it('a non-numeric answer from the service is an error, not a balance', async () => {
    invoke.mockResolvedValueOnce({ balance: undefined });
    const { result } = renderHook(() => useLiveWalletBalance(ADDR));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.balance).toBeNull();
    expect(result.current.error).toMatch(/no number/);
  });

  it('no address means no read, no error', async () => {
    const { result } = renderHook(() => useLiveWalletBalance(null));
    expect(result.current.balance).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });
});

describe('describeBalanceError', () => {
  it('names the three common causes plainly', () => {
    expect(describeBalanceError(new Error('Your session expired — please sign in again and retry.'))).toBe('Sign in again to read your balance.');
    expect(describeBalanceError(new Error('TypeError: Failed to fetch'))).toBe("Couldn't reach the balance service.");
    expect(describeBalanceError(new Error('unauthorized'))).toBe("Couldn't read balance: unauthorized");
    expect(describeBalanceError(undefined)).toBe("Couldn't read balance.");
  });
});
