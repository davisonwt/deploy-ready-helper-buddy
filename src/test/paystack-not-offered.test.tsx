import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

/**
 * The regression this pins: Paystack was removed from four ProviderPicker
 * call sites while three others kept offering it. Filtering at the call site
 * is how a rail stays half-open, so the filter lives in useBalanceProvider
 * and this test asserts it there -- whatever any call site asks for.
 */

vi.mock('@/hooks/useBalance', () => ({
  useBalance: () => ({ available: 0, loading: false, refetch: vi.fn() }),
}));

import { useBalanceProvider } from '@/hooks/useBalanceProvider';
import { PAYSTACK_ENABLED } from '@/lib/payments/railAvailability';

describe('no checkout offers Paystack', () => {
  it('is disabled', () => {
    expect(PAYSTACK_ENABLED).toBe(false);
  });

  it('drops paystack even when a call site explicitly asks for it', () => {
    const { result } = renderHook(() =>
      useBalanceProvider(10, ['solana', 'paypal', 'paystack']),
    );
    expect(result.current.providers).not.toContain('paystack');
    expect(result.current.providers).toEqual(['solana', 'paypal']);
  });

  it('never preselects paystack when it is listed first', () => {
    const { result } = renderHook(() =>
      useBalanceProvider(10, ['paystack', 'solana']),
    );
    expect(result.current.provider).not.toBe('paystack');
    expect(result.current.provider).toBe('solana');
  });

  it('leaves the other rails alone', () => {
    const { result } = renderHook(() => useBalanceProvider(10, ['solana', 'paypal']));
    expect(result.current.providers).toEqual(['solana', 'paypal']);
  });
});
