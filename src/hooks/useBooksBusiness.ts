import { useCallback, useEffect, useMemo, useState } from 'react';
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
  is_default: boolean;
}

const SELECT = 'id, name, logo_url, is_verified, country, currency, books_enabled, books_activated_at, is_default';

const currentKey = (userId: string) => `books:currentBusiness:${userId}`;

/**
 * Every `companies` row a member owns is one set of books
 * (spec-books.md §3). Businesses are created and edited in Profile → My
 * businesses (MyBusinessesSection.tsx) — this hook never creates rows,
 * only lists them and tracks which one Books is currently showing.
 * `current` defaults to the owner's `is_default` business and is
 * remembered per user in localStorage across visits.
 */
export function useBooksBusiness() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<BooksBusiness[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setBusinesses([]);
      setCurrentId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await supabase
        .from('companies')
        .select(SELECT)
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: true });
      const list = ((data as any) ?? []) as BooksBusiness[];
      setBusinesses(list);

      let stored: string | null = null;
      try { stored = window.localStorage.getItem(currentKey(user.id)); } catch { /* private browsing */ }
      const fallback = list.find((b) => b.is_default) ?? list[0] ?? null;
      setCurrentId(stored && list.some((b) => b.id === stored) ? stored : fallback?.id ?? null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const setCurrent = useCallback(
    (id: string) => {
      setCurrentId(id);
      if (user) {
        try { window.localStorage.setItem(currentKey(user.id), id); } catch { /* private browsing */ }
      }
    },
    [user]
  );

  const current = useMemo(() => businesses.find((b) => b.id === currentId) ?? null, [businesses, currentId]);

  /** Country / currency / add-on updates on the currently-selected business. */
  const updateBusiness = useCallback(
    async (patch: Partial<Pick<BooksBusiness, 'country' | 'currency' | 'books_enabled'>>) => {
      if (!current) throw new Error('No business selected');
      setSaving(true);
      try {
        const payload: Record<string, unknown> = { ...patch };
        if (patch.books_enabled) payload.books_activated_at = new Date().toISOString();
        const { data, error } = await supabase
          .from('companies')
          .update(payload as any)
          .eq('id', current.id)
          .select(SELECT)
          .single();
        if (error) throw error;
        setBusinesses((prev) => prev.map((b) => (b.id === current.id ? (data as any) : b)));
        return data as any as BooksBusiness;
      } finally {
        setSaving(false);
      }
    },
    [current]
  );

  /**
   * Applies the ONE built-in country preset (South Africa) to the
   * currently-selected business. Any other country leaves the statutory
   * deduction list untouched/empty for it.
   */
  const applyCountryPreset = useCallback(
    async (country: string) => {
      if (!current) throw new Error('No business selected');
      const preset = presetFor(country);
      if (!preset) return false;
      const existing = await supabase
        .from('statutory_deductions' as any)
        .select('id')
        .eq('business_id', current.id)
        .limit(1);
      if ((existing.data as any[])?.length) return false;
      const { error } = await supabase.from('statutory_deductions' as any).insert(
        preset.deductions.map((d) => ({
          business_id: current.id,
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
    [current]
  );

  return {
    loading,
    businesses,
    current,
    setCurrent,
    saving,
    updateBusiness,
    applyCountryPreset,
    reload: load,
  };
}
