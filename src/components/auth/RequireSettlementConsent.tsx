import { ReactNode } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useSettlementConsent } from '@/hooks/useSettlementConsent';
import { SettlementConsentPrompt } from '@/components/payouts/SettlementConsentPrompt';

/**
 * Gates a listing-creation route behind the settlement-consent checkbox
 * (non-custodial model, legal 2026-09-03). This is UX only -- the real
 * block is a DB trigger on products/orchards insert (see
 * 20260903160000_settlement_consents.sql), which fires regardless of
 * whether this component was ever rendered. This just turns that into a
 * clean prompt instead of a raw insert error.
 */
export function RequireSettlementConsent({ children }: { children: ReactNode }) {
  const { hasAccepted, loading, refetch } = useSettlementConsent();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (hasAccepted === false) {
    return (
      <div className="max-w-lg mx-auto py-10 px-4">
        <SettlementConsentPrompt onAccepted={refetch} />
      </div>
    );
  }

  return <>{children}</>;
}
