import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BUILD_ID } from '@/lib/serviceWorkerUrl';

const CHECK_INTERVAL_MS = 60_000;
// Same stamp format vite.config.ts writes into dist/sw.js (see
// serviceWorkerUrl.ts) -- YYYYMMDD-HHMMSS-ish, already verified against
// real deploys this session.
const BUILD_ID_PATTERN = /\d{8}-\d{6,7}/;

// Belt-and-suspenders alongside main.tsx's service-worker
// controllerchange handler, which silently force-reloads a stale tab --
// fine most of the time, but disruptive if it fires mid-call. This is a
// direct, visible check (fetch sw.js, compare its stamped build id
// against this tab's own BUILD_ID) with a manual "Refresh to update"
// button instead, so a tester is never just silently sitting on a stale
// bundle with no way to tell.
export function BuildUpdateBanner() {
  const [newerAvailable, setNewerAvailable] = useState(false);

  useEffect(() => {
    if (BUILD_ID === 'dev') return; // nothing to compare against in dev
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`/sw.js?bust=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const text = await res.text();
        const match = text.match(BUILD_ID_PATTERN);
        if (!cancelled && match && match[0] !== BUILD_ID) {
          setNewerAvailable(true);
        }
      } catch {
        // best-effort -- a failed check just means we don't know yet, try again next tick
      }
    };

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (!newerAvailable) return null;

  return (
    // z-[95]: above the various fixed bottom-right chips/widgets (z-50/
    // z-[60]) but below the toast viewport (z-[100], which is also
    // top-anchored on mobile) and IncomingCallOverlay (z-[99999], which
    // must always win over everything else).
    <div className="fixed inset-x-0 top-0 z-[95] flex items-center justify-center gap-3 bg-amber-500 px-4 py-1.5 text-xs font-medium text-black">
      A new version of Sow2Grow is live.
      <Button
        size="sm"
        variant="secondary"
        className="h-6 bg-black px-2 text-xs text-white hover:bg-black/80"
        onClick={() => window.location.reload()}
      >
        Refresh to update
      </Button>
    </div>
  );
}
