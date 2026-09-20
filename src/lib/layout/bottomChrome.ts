// Shared mechanism for "don't let a scroll container's last row sit under
// fixed bottom chrome" -- found live (Davison's screenshot, Cockpit right
// panel): Today/Omer/Growth/Wallet's last rows were trapped under the
// fixed bottom action bar, and specifically under the RADIO bar --
// because the bar's own real height isn't constant (its 4th button reads
// "Radio"/"Stop"/"Reconnecting…", and the floating radio pill
// (GlobalRadioPlayer.tsx) mounts globally and can be present or not) --
// so any hardcoded bottom-padding guess is only ever correct for one
// state and wrong for the others. This replaces guessing with measuring.
//
// Model: every persistent fixed-bottom element registers how far ITS OWN
// top edge sits from the viewport's bottom edge (not its own height --
// an element anchored a few pixels above the very bottom, like the
// floating radio pill at bottom-4, needs its intrusion measured from
// there, not from 0). The published --bottom-chrome-h is the MAX across
// every currently-registered element, not the sum: two fixed-bottom
// elements that overlap the same vertical band (the pill sitting inside
// the action bar's own footprint on a page that already shows one) must
// not double-count, and an element that isn't currently mounted (the pill
// while radio is stopped) contributes nothing at all -- unregistering on
// unmount is what makes the value shrink back down with no dead gap left
// behind, the exact case Davison asked to be verified.
//
// Any scrollable column that coexists with this chrome consumes the
// variable directly as its own bottom padding --
// `style={{ paddingBottom: 'var(--bottom-chrome-h, 0px)' }}` -- no hook
// needed on the consumer side; a CSS custom property update on
// :root applies to every reader instantly, including ones that don't
// re-render when it changes.

import { useEffect, useRef, type RefObject } from 'react';

const CSS_VAR = '--bottom-chrome-h';
const registry = new Map<string, number>();

function recompute() {
  const max = registry.size === 0 ? 0 : Math.max(...registry.values());
  document.documentElement.style.setProperty(CSS_VAR, `${Math.max(0, max)}px`);
}

function register(key: string, intrusionPx: number) {
  registry.set(key, intrusionPx);
  recompute();
}

function unregister(key: string) {
  if (registry.delete(key)) recompute();
}

/**
 * Attaches to a fixed-bottom element (the bottom action bar wrapper, the
 * floating radio pill, ...). `active` is whether that element is actually
 * rendered right now -- pass the same condition that gates its own JSX
 * (`!!bottomBar`, `state.isPlaying`, ...) so unmounting it (radio
 * stopping) unregisters immediately rather than leaving a stale, too-tall
 * padding value behind on every consumer.
 */
export function useBottomChromeElement<T extends HTMLElement>(key: string, active: boolean): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;

    const measure = () => register(key, window.innerHeight - el.getBoundingClientRect().top);
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
      unregister(key);
    };
  }, [key, active]);

  return ref;
}

/** Inline style for any scroll container that needs to clear the currently-registered bottom chrome. Spread as `style={BOTTOM_CHROME_PADDING_STYLE}`, or merge `paddingBottom` manually if the container already sets other style props. */
export const BOTTOM_CHROME_PADDING_STYLE: { paddingBottom: string } = {
  paddingBottom: `var(${CSS_VAR}, 0px)`,
};
