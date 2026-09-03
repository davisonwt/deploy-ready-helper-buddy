import { useEffect, useRef, useState } from 'react';
import { useBalance } from '@/hooks/useBalance';
import type { PayoutProviderId } from '@/lib/payments/providerFees';
import { S2G_BALANCE_ENABLED } from '@/lib/featureFlags';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Standard "offer S2G Balance at checkout" wiring, shared by every
 * ProviderPicker call site (spec-payments.md's S2G Balance section):
 * 'balance' is only offered when it fully covers the amount, and is
 * preselected the first time it becomes affordable — never overriding a
 * provider the buyer already picked by hand.
 *
 * S2G_BALANCE_ENABLED gates this whole hook to a no-op (never offers
 * 'balance', never reports a shortfall) -- the single choke point every
 * call site goes through, so turning the flag off removes 'balance' from
 * every checkout at once without touching any of them individually.
 */
export function useBalanceProvider(amount: number, otherProviders: PayoutProviderId[] = ['solana', 'paypal']) {
  const { available, loading: balanceLoading, refetch } = useBalance();
  const [provider, setProvider] = useState<PayoutProviderId>(otherProviders[0] ?? 'solana');
  const autoSelected = useRef(false);

  const affordable = S2G_BALANCE_ENABLED && !balanceLoading && amount > 0 && available >= amount;

  useEffect(() => {
    if (affordable && !autoSelected.current) {
      autoSelected.current = true;
      setProvider('balance');
    }
  }, [affordable]);

  const providers: PayoutProviderId[] = affordable ? ['balance', ...otherProviders] : otherProviders;
  const shortBy = !S2G_BALANCE_ENABLED || balanceLoading || amount <= 0 ? 0 : Math.max(0, round2(amount - available));

  return {
    provider,
    setProvider,
    providers,
    balanceAvailable: available,
    balanceLoading,
    balanceAffordable: affordable,
    balanceShortBy: shortBy,
    refetchBalance: refetch,
  };
}

/** True when the response is the immediate-success shape create-*-order returns for provider:'balance'. */
export function isBalanceSuccess(data: unknown): data is { balance: { debited: true } } {
  return !!data && typeof data === 'object' && (data as any).balance?.debited === true;
}
