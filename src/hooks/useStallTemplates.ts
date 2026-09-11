import { useEffect, useState } from 'react';
import type { StallTemplatesByCategory } from '@/lib/stalls/stallTypes';

let cached: StallTemplatesByCategory | null = null;
let inflight: Promise<StallTemplatesByCategory | null> | null = null;

/** Fetches public/stalls/templates/templates.json once per session (module-level cache) -- needed wherever a stall's hotspots must be resolved against its template. */
export function useStallTemplates(): StallTemplatesByCategory | null {
  const [templates, setTemplates] = useState<StallTemplatesByCategory | null>(cached);

  useEffect(() => {
    if (cached) { setTemplates(cached); return; }
    if (!inflight) {
      inflight = fetch('/stalls/templates/templates.json')
        .then((r) => r.json())
        .then((data: StallTemplatesByCategory) => { cached = data; return data; })
        .catch(() => null);
    }
    let alive = true;
    inflight.then((data) => { if (alive) setTemplates(data); });
    return () => { alive = false; };
  }, []);

  return templates;
}
