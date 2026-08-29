import { supabase } from '@/integrations/supabase/client';

/**
 * The default set of books for a sower's own account — what every
 * products writer stamps onto company_id (spec-books.md §4). Resolves via
 * sowers.id -> sowers.user_id -> companies.owner_user_id, since every
 * writer already has a sower_id in hand by the time it's ready to insert.
 * Returns null if the sower row (or its default company) can't be found —
 * callers should surface that as a real error rather than insert with a
 * null company_id, which the DB will now reject anyway (NOT NULL).
 */
export async function getDefaultCompanyId(sowerId: string): Promise<string | null> {
  const { data: sower } = await supabase.from('sowers').select('user_id').eq('id', sowerId).maybeSingle();
  if (!sower?.user_id) return null;
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_user_id', sower.user_id)
    .eq('is_default', true)
    .maybeSingle();
  return company?.id ?? null;
}
