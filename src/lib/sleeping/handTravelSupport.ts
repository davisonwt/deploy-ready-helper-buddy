import { supabase } from '@/integrations/supabase/client';

/**
 * Whether hand_seed_details has the travel-charge columns yet.
 *
 * The columns arrive in a migration the database owner runs by hand, which
 * can land before or after this code deploys. Sending an unknown column to
 * PostgREST fails the whole upsert, so a form that always wrote them would
 * break every hand listing during the gap. Asking once costs one tiny query
 * and lets the feature appear the moment the migration lands, with no
 * second deploy.
 */
let cached: Promise<boolean> | null = null;

export function handTravelColumnsAvailable(): Promise<boolean> {
  if (!cached) {
    cached = supabase
      .from('hand_seed_details')
      .select('rate_callout')
      .limit(1)
      .then(({ error }) => !error)
      .then(undefined, () => false);
  }
  return cached;
}
