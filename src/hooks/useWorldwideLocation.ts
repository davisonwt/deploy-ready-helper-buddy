import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Where the viewer is, for proximity-gated directories.
 *
 * Deliberately NOT src/hooks/useUserLocation.ts, which defaults to
 * Johannesburg and carries a hardcoded list of six South African cities.
 * That hook is left exactly as it is so the calendar keeps working.
 *
 * This one has no default location, no country list and no fallback city.
 * Browser geolocation is asked for once. If it is refused or unavailable,
 * the viewer types any place on earth and the geocode-place edge function
 * resolves it through Nominatim, server-side and cached.
 *
 * Until a location is known there is nothing to show. That is the correct
 * state, not an error: a proximity directory without a viewer position has
 * no meaningful contents.
 */

const STORAGE_KEY = 's2g.sleeping.location.v1';
const ASKED_KEY = 's2g.sleeping.location.asked.v1';

export interface ViewerLocation {
  lat: number;
  lng: number;
  /** What to show the viewer, e.g. "Lyon, France" or "Your current position". */
  label: string;
  source: 'browser' | 'typed';
}

export type LocationStatus =
  | 'unknown'      // nothing yet, and we have not asked
  | 'locating'     // waiting on the browser
  | 'ready'        // we have coordinates
  | 'needs-place'  // browser said no, or could not tell us -- ask for a typed place
  | 'error';

function readStored(): ViewerLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.lat === 'number' && typeof parsed?.lng === 'number') {
      return parsed as ViewerLocation;
    }
  } catch {
    // Private windows and blocked site data both land here. Not an error.
  }
  return null;
}

function writeStored(loc: ViewerLocation | null) {
  try {
    if (loc) localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage is a convenience here. The session still works without it.
  }
}

function hasAsked(): boolean {
  try {
    return localStorage.getItem(ASKED_KEY) === '1';
  } catch {
    return false;
  }
}

function markAsked() {
  try {
    localStorage.setItem(ASKED_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function useWorldwideLocation() {
  const [location, setLocation] = useState<ViewerLocation | null>(() => readStored());
  const [status, setStatus] = useState<LocationStatus>(() => (readStored() ? 'ready' : 'unknown'));
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  /** Ask the browser. Safe to call again from a button. */
  const requestBrowserLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('needs-place');
      return;
    }
    setStatus('locating');
    setError(null);
    markAsked();

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!mounted.current) return;
        const next: ViewerLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: 'Your current position',
          source: 'browser',
        };
        setLocation(next);
        writeStored(next);
        setStatus('ready');
      },
      () => {
        if (!mounted.current) return;
        // Denied, unavailable or timed out all mean the same thing to us:
        // we need the viewer to type a place instead.
        setStatus('needs-place');
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60 * 1000 },
    );
  }, []);

  /** Resolve any free-text place on earth through the server-side geocoder. */
  const setPlace = useCallback(async (place: string): Promise<boolean> => {
    const trimmed = place.trim();
    if (trimmed.length < 2) {
      setError('Type a town, city or area name.');
      return false;
    }

    setResolving(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('geocode-place', {
        body: { place: trimmed },
      });

      if (fnError) {
        // supabase-js hides the function's own body on a non-2xx. Read it.
        let message = 'Could not look that place up. Try again in a moment.';
        try {
          const body = await (fnError as unknown as { context?: Response }).context?.json?.();
          if (body?.message) message = body.message;
        } catch {
          /* keep the generic message */
        }
        if (mounted.current) setError(message);
        return false;
      }

      const lat = Number(data?.lat);
      const lng = Number(data?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        if (mounted.current) setError('We could not find that place. Try adding the country.');
        return false;
      }

      const next: ViewerLocation = {
        lat,
        lng,
        label: data?.displayName || trimmed,
        source: 'typed',
      };
      if (mounted.current) {
        setLocation(next);
        writeStored(next);
        setStatus('ready');
      }
      return true;
    } catch {
      if (mounted.current) setError('Could not look that place up. Try again in a moment.');
      return false;
    } finally {
      if (mounted.current) setResolving(false);
    }
  }, []);

  /** Forget the stored position, e.g. "use a different place". */
  const clear = useCallback(() => {
    setLocation(null);
    writeStored(null);
    setStatus('needs-place');
    setError(null);
  }, []);

  // Ask the browser once, on the first visit only. A viewer who already
  // answered is never prompted again by this hook.
  useEffect(() => {
    if (location) return;
    if (hasAsked()) {
      setStatus('needs-place');
      return;
    }
    requestBrowserLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { location, status, error, resolving, requestBrowserLocation, setPlace, clear };
}
