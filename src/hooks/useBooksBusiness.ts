import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { presetFor } from '@/lib/books/presets';

export interface BooksBusiness {
  id: string;
  name: string;
  logo_url: string | null;
  is_verified: boolean | null;
  country: string | null;
  currency: string;
  books_enabled: boolean;
  books_activated_at: string | null;
}

const SELECT = 'id, name, logo_url, is_verified, country, currency, books_enabled, books_activated_at';

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
  const [saving, setSaving] = useState(false);

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
          .select(SELECT)
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
          .select(SELECT)
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

  /** Country / currency / add-on updates on the business itself. */
  const updateBusiness = useCallback(
    async (patch: Partial<Pick<BooksBusiness, 'country' | 'currency' | 'books_enabled'>>) => {
      if (!business) throw new Error('No business');
      setSaving(true);
      try {
        const payload: Record<string, unknown> = { ...patch };
        if (patch.books_enabled) payload.books_activated_at = new Date().toISOString();
        const { data, error } = await supabase
          .from('companies')
          .update(payload as any)
          .eq('id', business.id)
          .select(SELECT)
          .single();
        if (error) throw error;
        setBusiness(data as any);
        return data as any as BooksBusiness;
      } finally {
        setSaving(false);
      }
    },
    [business]
  );

  /**
   * Applies the ONE built-in country preset (South Africa). Any other country
   * leaves the statutory deduction list untouched/empty for the business.
   */
  const applyCountryPreset = useCallback(
    async (country: string) => {
      if (!business) throw new Error('No business');
      const preset = presetFor(country);
      if (!preset) return false;
      const existing = await supabase
        .from('statutory_deductions' as any)
        .select('id')
        .eq('business_id', business.id)
        .limit(1);
      if ((existing.data as any[])?.length) return false;
      const { error } = await supabase.from('statutory_deductions' as any).insert(
        preset.deductions.map((d) => ({
          business_id: business.id,
          label: d.label,
          employee_pct: d.employee_pct,
          employer_pct: d.employer_pct,
          wage_cap: d.wage_cap,
          applies: d.applies,
          tax_code: d.tax_code ?? null,
          sort_order: d.sort_order ?? 0,
        })) as any
      );
      if (error) throw error;
      return true;
    },
    [business]
  );

  return {
    loading,
    business,
    businessId: business?.id ?? null,
    /** True when the Books entry should be visible in business-facing nav. */
    isBusinessUser: Boolean(business || sellerName),
    suggestedName: sellerName,
    creating,
    saving,
    createWorkspace,
    updateBusiness,
    applyCountryPreset,
    reload: load,
  };
}
