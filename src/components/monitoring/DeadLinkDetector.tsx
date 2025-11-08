import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { logInfo } from '@/lib/logging';

// Detect clicks that do not result in navigation within a short window
// Useful to surface dead links, disabled buttons, or blocked route guards
export const DeadLinkDetector = () => {
  const location = useLocation();
  const lastPathRef = useRef(location.pathname);

  useEffect(() => {
    lastPathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const clickable = target.closest('a,button,[role="button"],[data-deadlink-watch]') as HTMLElement | null;
      if (!clickable) return;

      const from = location.pathname;
      const to = (clickable as HTMLAnchorElement).getAttribute?.('href') || clickable.getAttribute('data-href') || undefined;
      const start = Date.now();

      // After a short delay, check if navigation occurred
      setTimeout(() => {
        if (lastPathRef.current === from) {
          logInfo('🧯 [DEAD_LINK]', {
            from,
            to,
            tag: clickable.tagName,
            classes: clickable.className,
            text: clickable.textContent?.trim()?.slice(0, 120),
            durationMs: Date.now() - start,
          });
        } else {
          logInfo('🧭 [NAV_RESOLVED]', {
            from,
            to,
            newPath: lastPathRef.current,
            durationMs: Date.now() - start,
          });
        }
      }, 700);
    };

    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [location.pathname]);

  return null;
};
