import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface BooksBusiness {
  id: string;
  name: string;
  logo_url: string | null;
  is_verified: boolean | null;
}

/**
 * Resolves the Books workspace owner: a `companies` row owned by auth.uid().
 * Every Books table is scoped by business_id -> companies.id.
 *
 * A user is "business-facing" when they already own a company OR they have a
 * seller (sowers) profile — the latter can provision a company workspace once.
 */
export function useBooksBusiness() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<BooksBusiness | null>(null);
  const [sellerName, setSellerName] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setBusiness(null);
      setSellerName(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [companyRes, sowerRes] = await Promise.all([
        supabase
          .from('companies')
          .select('id, name, logo_url, is_verified')
          .eq('owner_user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('sowers')
          .select('display_name')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);
      setBusiness((companyRes.data as any) ?? null);
      setSellerName(((sowerRes.data as any)?.display_name as string) ?? null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  /** Creates the company row that owns this user's Books workspace. */
  const createWorkspace = useCallback(
    async (name: string) => {
      if (!user) throw new Error('Not signed in');
      setCreating(true);
      try {
        const slug =
          name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 40) || `books-${user.id.slice(0, 8)}`;
        const { data, error } = await supabase
          .from('companies')
          .insert({ owner_user_id: user.id, name, slug: `${slug}-${user.id.slice(0, 6)}` } as any)
          .select('id, name, logo_url, is_verified')
          .single();
        if (error) throw error;
        setBusiness(data as any);
        return data as any as BooksBusiness;
      } finally {
        setCreating(false);
      }
    },
    [user]
  );

  return {
    loading,
    business,
    businessId: business?.id ?? null,
    /** True when the Books entry should be visible in business-facing nav. */
    isBusinessUser: Boolean(business || sellerName),
    suggestedName: sellerName,
    creating,
    createWorkspace,
    reload: load,
  };
}
