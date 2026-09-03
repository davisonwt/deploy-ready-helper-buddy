// Settlement consent (non-custodial model, legal 2026-09-03). Checks
// whether the signed-in user has accepted the CURRENT version of the
// settlement checkbox -- has_accepted_settlement_consent() compares
// against app_settings.settlement_consent_version, so a version bump
// alone makes every existing acceptance stop matching, with no other
// code change needed to re-prompt everyone.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { invokePaymentFunction } from '@/lib/payments/invokeFunction';

export function useSettlementConsent() {
  const { user } = useAuth();
  const [hasAccepted, setHasAccepted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  const check = useCallback(async () => {
    if (!user) {
      setHasAccepted(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('has_accepted_settlement_consent' as any);
      if (error) throw error;
      setHasAccepted(!!data);
    } catch (err) {
      console.error('useSettlementConsent check failed', err);
      setHasAccepted(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { check(); }, [check]);

  const accept = useCallback(async (): Promise<boolean> => {
    setAccepting(true);
    try {
      await invokePaymentFunction('accept-settlement-consent', {});
      setHasAccepted(true);
      return true;
    } catch (err) {
      console.error('useSettlementConsent accept failed', err);
      return false;
    } finally {
      setAccepting(false);
    }
  }, []);

  return { hasAccepted, loading, accepting, accept, refetch: check };
}
