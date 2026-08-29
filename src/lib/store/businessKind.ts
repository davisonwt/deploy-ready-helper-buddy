import { supabase } from '@/integrations/supabase/client';

export type BusinessKind = 'field' | 'hearth' | 'forge' | 'shop';

export const BUSINESS_KIND_OPTIONS: { value: BusinessKind; label: string; description: string }[] = [
  { value: 'field', label: 'Field', description: 'Smallholdings & farms supplying the community' },
  { value: 'hearth', label: 'Hearth', description: 'Home-owned business' },
  { value: 'forge', label: 'Forge', description: 'Factory / workshop' },
  { value: 'shop', label: 'Shop', description: 'General stock' },
];

/** shop has no dedicated products.kind of its own — it's the general case. */
export function productKindForBusinessKind(kind: BusinessKind): 'field' | 'hearth' | 'forge' | 'product' {
  return kind === 'shop' ? 'product' : kind;
}

/**
 * Sets a business's `kind` (Field / Hearth / Forge / Shop) — everything
 * that business sows inherits it (spec-sowing-forms.md, revised: kind
 * lives on the business, not chosen per seed). Same side effect as role
 * unlock (RegisterWanderingPage): the business's `store_theme.preset` is
 * defaulted to match, but only if it has no preset yet — an owner who
 * already picked a different theme keeps it.
 */
export async function saveBusinessKind(companyId: string, kind: BusinessKind): Promise<void> {
  const { data: company } = await supabase
    .from('companies')
    .select('store_theme')
    .eq('id', companyId)
    .maybeSingle();
  const theme = (company as any)?.store_theme as { preset?: string } | null;

  const patch: Record<string, unknown> = { kind };
  if (!theme?.preset) {
    patch.store_theme = { ...(theme || {}), preset: kind };
  }

  const { error } = await supabase.from('companies').update(patch).eq('id', companyId);
  if (error) throw error;
}
