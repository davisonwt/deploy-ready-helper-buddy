import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Unique-visitor count for a stall, via the stall_visitor_count(uuid) RPC
 * (supabase/migrations/20260915150000_stall_visitor_count.sql) on top of
 * the existing stall_visits table (built for the "new seeds" indicator).
 * SECURITY DEFINER on the DB side enforces stall_owner = auth.uid(), so
 * this only ever returns a count for the CALLER'S OWN stall -- owner-only
 * by design, same as the wallet balance in StallTodayPanel. Callers should
 * only invoke this when `enabled` (the current viewer really is the
 * stall's owner) -- passing someone else's id just gets a thrown RPC
 * error, not their private count.
 */
export function useStallVisitorCount(ownerId: string | null | undefined, enabled: boolean) {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !ownerId) { setCount(null); return; }
    let alive = true;
    setLoading(true);
    supabase.rpc('stall_visitor_count' as any, { stall_owner: ownerId })
      .then(({ data, error }) => {
        if (!alive) return;
        setCount(error ? null : (data as number ?? 0));
        setLoading(false);
      });
    return () => { alive = false; };
  }, [ownerId, enabled]);

  return { count, loading };
}
