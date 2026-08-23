import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { captureWhispererRefFromUrl } from '@/lib/whisperer/attribution';

/**
 * Captures `?w=<REF_CODE>` (+ optional `?ws=<liveSessionId>`) on every
 * navigation so the whisperer whose link actually brought the buyer is the one
 * credited at checkout. The visit is also logged server-side.
 * When the URL looks like a seed page (/product/:id, /seed/:id, /music/:id …)
 * the credit is scoped to that seed; otherwise it is kept as last-touch.
 */
const SEED_PATHS = /\/(product|products|seed|seeds|book|books|music|track|orchard|orchards|library)\/([^/?#]+)/i;

export function useWhispererCapture() {
  const location = useLocation();

  useEffect(() => {
    if (!location.search.includes('w=')) return;
    const match = SEED_PATHS.exec(location.pathname);
    captureWhispererRefFromUrl(location.search, match?.[2] ?? null);
  }, [location.pathname, location.search]);
}
