import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { useReferralCode } from './useReferralCode';
import { supabase } from '@/integrations/supabase/client';
import { buildInviteUrl } from '@/lib/invite/inviteLink';

/** The signed-in member's own invite link (null until their code and username have loaded). */
export function useMyInviteLink() {
  const { user } = useAuth();
  const { code, loading: codeLoading } = useReferralCode();
  const [username, setUsername] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!user?.id) { setUsername(null); return; }
    let alive = true;
    supabase.from('profiles').select('username').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (alive) setUsername((data as { username: string | null } | null)?.username ?? null); });
    return () => { alive = false; };
  }, [user?.id]);

  const loading = codeLoading || username === undefined;
  return { url: code && !loading ? buildInviteUrl(username, code) : null, code, loading };
}
