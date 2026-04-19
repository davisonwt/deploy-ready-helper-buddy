import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OrchardBlessing {
  id: string;
  orchard_id: string;
  granted_by_user_id: string;
  granted_at: string;
  message: string | null;
}

/**
 * Batch-fetches active council blessings for the given orchard IDs.
 * Returns a Set of orchard IDs that have at least one blessing.
 */
export function useOrchardBlessings(orchardIds: string[]) {
  const [blessedSet, setBlessedSet] = useState<Set<string>>(new Set());
  const [blessingsByOrchard, setBlessingsByOrchard] = useState<Record<string, OrchardBlessing[]>>({});
  const [loading, setLoading] = useState(false);

  // Stable key so we don't refetch on every render
  const idsKey = orchardIds.filter(Boolean).sort().join(',');

  useEffect(() => {
    const ids = idsKey ? idsKey.split(',') : [];
    if (ids.length === 0) {
      setBlessedSet(new Set());
      setBlessingsByOrchard({});
      return;
    }

    let cancelled = false;
    setLoading(true);

    supabase
      .from('orchard_blessings')
      .select('id, orchard_id, granted_by_user_id, granted_at, message')
      .in('orchard_id', ids)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setBlessedSet(new Set());
          setBlessingsByOrchard({});
          setLoading(false);
          return;
        }
        const set = new Set<string>();
        const map: Record<string, OrchardBlessing[]> = {};
        for (const row of data as OrchardBlessing[]) {
          set.add(row.orchard_id);
          (map[row.orchard_id] ||= []).push(row);
        }
        setBlessedSet(set);
        setBlessingsByOrchard(map);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [idsKey]);

  return { blessedSet, blessingsByOrchard, loading };
}
