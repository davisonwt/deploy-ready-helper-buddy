import { supabase } from '@/integrations/supabase/client';

// Member search for chat pickers, on top of profiles_public -- the only
// sanctioned way to read another member's profile (P0-4, 2026-09-05).
//
// These used to call the SECURITY DEFINER RPCs search_user_profiles /
// get_all_user_profiles. Live, EXECUTE on those functions is revoked for
// the anon role (confirmed 2026-09-05: "permission denied for function"),
// and every caller swallowed that error into "No users found". The view is
// granted to anon and authenticated, exposes only public columns, and needs
// no function grant at all.

export const PUBLIC_PROFILE_SEARCH_COLUMNS =
  'id, user_id, display_name, first_name, last_name, username, avatar_url';

export interface PublicProfileHit {
  id: string | null;
  user_id: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface Opts {
  /** Usually the signed-in member, who should not be offered to themselves. */
  excludeUserId?: string | null;
  limit?: number;
}

/** Characters with meaning inside a PostgREST `or=(...)` filter. */
function sanitizeTerm(term: string): string {
  return term.replace(/[%,().*\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Case-insensitive name/username search. Empty term -> empty result, no request. */
export async function searchPublicProfiles(term: string, opts: Opts = {}) {
  const safe = sanitizeTerm(term);
  if (!safe) return { data: [] as PublicProfileHit[], error: null };
  let query = supabase
    .from('profiles_public')
    .select(PUBLIC_PROFILE_SEARCH_COLUMNS)
    .or(
      `display_name.ilike.%${safe}%,first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,username.ilike.%${safe}%`,
    )
    .order('display_name', { ascending: true, nullsFirst: false })
    .limit(opts.limit ?? 50);
  if (opts.excludeUserId) query = query.neq('user_id', opts.excludeUserId);
  const { data, error } = await query;
  return { data: (data ?? []) as PublicProfileHit[], error };
}

/** First N members by display name, for "pick someone" dropdowns. */
export async function listPublicProfiles(opts: Opts = {}) {
  let query = supabase
    .from('profiles_public')
    .select(PUBLIC_PROFILE_SEARCH_COLUMNS)
    .order('display_name', { ascending: true, nullsFirst: false })
    .limit(opts.limit ?? 200);
  if (opts.excludeUserId) query = query.neq('user_id', opts.excludeUserId);
  const { data, error } = await query;
  return { data: (data ?? []) as PublicProfileHit[], error };
}
