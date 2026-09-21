import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * One history entry for "an overlay is open on this page".
 *
 * Reported on a phone 2026-09-21 and reproduced at 390x844: from a
 * conversation, tap a SeedCard's sower link to a stall, open the music
 * shelf, press the system Back gesture -- and you land on /conversations,
 * having left the stall entirely. Closing a sheet with Back is what a
 * phone user does; it was the one exit path no spec covered, which is how
 * stall-shelf-close.spec.ts passed 7/7 while this was live.
 *
 * The cause was that an open sheet added NO history entry at all.
 * StallInteriorView synced `#stall-kind=<kind>` with replaceState
 * specifically so opening a shelf would not push one, so Back skipped
 * straight past the stall to whatever preceded it.
 *
 * The contract here:
 *
 *  1. Opening an overlay pushes exactly ONE entry. Switching which overlay
 *     is open while one is already open REPLACES that entry, so browsing
 *     music -> books -> lyrics still costs one Back, not three.
 *  2. popstate with an overlay open closes the overlay and stays put. The
 *     next Back leaves the page, which is correct.
 *  3. Every close path -- the X, the backdrop, Back -- goes through
 *     `requestClose`, which is a history.back(). One code path, so the
 *     stack cannot drift out of step with what is on screen.
 *  4. Loading straight onto a URL that already names an overlay (a deep
 *     link, or Back from an item-detail page, which remounts the interior
 *     with the hash still on it) opens the overlay and ADOPTS the entry it
 *     loaded on rather than pushing a second one. Back therefore closes
 *     the overlay and leaves the member on the stall; the Back after that
 *     leaves the stall. Without this the deep-link case would cost two
 *     Backs to get off the stall, one of which would look like nothing
 *     happened.
 *
 * Pushing goes through react-router's `navigate` rather than raw
 * history.pushState: react-router tracks its own position in
 * `window.history.state.idx`, and a raw push leaves that stale, after
 * which its own navigations start landing on the wrong entry.
 */
export function useOverlayHistory({
  overlayKey,
  hash,
  adoptCurrentEntry,
  onClose,
}: {
  /** Identifies which overlay is open; null when none is. */
  overlayKey: string | null;
  /** Hash for the current overlay, '' to leave the URL alone. */
  hash: string;
  /** True when an overlay was already open on the very first render. */
  adoptCurrentEntry: boolean;
  /** Close whichever overlay is currently open. Must not navigate. */
  onClose: () => void;
}): { requestClose: () => void } {
  const navigate = useNavigate();
  const location = useLocation();

  /** Do we own a history entry for the overlay that is open right now? */
  const owns = useRef(adoptCurrentEntry);
  // Kept in refs so the popstate listener is registered once and never
  // goes stale -- re-registering it on every render is how a Back press
  // that lands between renders gets missed.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const stateRef = useRef(location.state);
  stateRef.current = location.state;

  useEffect(() => {
    if (overlayKey) {
      if (!owns.current) {
        owns.current = true;
        // Carry location.state across: StallVisitPage's own close reads
        // `state.from` off it to decide where leaving the stall goes, and
        // a push that dropped it would send the member to the wrong place.
        navigate({ hash }, { state: stateRef.current });
      } else if (hash !== location.hash) {
        navigate({ hash }, { replace: true, state: stateRef.current });
      }
      return;
    }
    // Closed. If we still own an entry here the overlay was closed by
    // something other than requestClose (a route change from inside it,
    // for instance) and the entry goes with the unmount; just stop
    // claiming it. Otherwise popstate has already taken it.
    owns.current = false;
    if (location.hash && hash === '') {
      navigate({ hash: '' }, { replace: true, state: stateRef.current });
    }
    // location.hash is deliberately not a dependency: this effect reacts to
    // the overlay opening and closing, and reading the hash inside it is
    // only to avoid a redundant navigate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayKey, hash, navigate]);

  useEffect(() => {
    const onPop = () => {
      if (!owns.current) return;
      owns.current = false;
      onCloseRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const requestClose = useCallback(() => {
    if (owns.current) {
      // Back, so the popstate handler above does the actual closing --
      // identical to the member pressing Back themselves.
      navigate(-1);
      return;
    }
    onCloseRef.current();
  }, [navigate]);

  return { requestClose };
}
