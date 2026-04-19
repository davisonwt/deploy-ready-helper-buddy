/**
 * useTribalHeartsAccess — Tribal Hearts is gated behind Ambassador membership
 * (or an admin-granted free pass via s2g_agent_free_access).
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useTribalHeartsAccess() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const [amb, free] = await Promise.all([
        supabase.from('ambassador_applications').select('id').eq('user_id', user.id).eq('status', 'approved').maybeSingle(),
        supabase.from('s2g_agent_free_access').select('user_id').eq('user_id', user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setHasAccess(!!amb.data || !!free.data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  return { loading, hasAccess };
}
