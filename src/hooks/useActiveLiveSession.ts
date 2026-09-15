import { useSyncExternalStore } from 'react';
import { getActiveLiveSession, subscribeActiveLiveSession, type ActiveLiveSessionInfo } from '@/lib/liveSession/activeLiveSession';

/** Reactive read of the shared active-live-session store -- see
 * activeLiveSession.ts's own doc comment for the full design. */
export function useActiveLiveSession(): ActiveLiveSessionInfo | null {
  return useSyncExternalStore(subscribeActiveLiveSession, getActiveLiveSession, getActiveLiveSession);
}
