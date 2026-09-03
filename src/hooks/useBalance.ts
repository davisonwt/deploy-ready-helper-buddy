import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * The member's S2G Balance (balance_ledger, via the balance_available_v
 * computed view — never a stored mutable number). A user with no ledger
 * rows yet has no view row at all, which reads as 0.
 *
 * balance_available_v/balance_ledger predate the generated Supabase types
 * (src/integrations/supabase/types.ts) — same situation as the `payouts`
 * table per this session's research; hence the `as any` casts below.
 */
export function useBalance() {
  const { user } = useAuth();
  const [available, setAvailable] = useState(0);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user?.id) {
      setAvailable(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('balance_available_v' as any)
      .select('available_balance')
      .eq('user_id', user.id)
      .maybeSingle();
    setAvailable(Number((data as any)?.available_balance ?? 0));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { available, loading, refetch };
}
