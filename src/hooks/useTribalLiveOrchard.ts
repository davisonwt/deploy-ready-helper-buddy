/**
 * useTribalLiveOrchard
 * --------------------
 * Ephemeral, realtime "who is alive in the orchard right now" hook.
 *
 * IMPORTANT: This hook uses a MODULE-LEVEL singleton channel + pub/sub fanout.
 * Many components (every LivingSeedCard) call this hook simultaneously. We must
 * NEVER create more than one Supabase channel named 'tribal-orchard:global',
 * otherwise Supabase Realtime throws:
 *   "cannot add `presence` callbacks for realtime:tribal-orchard:global after `subscribe()`"
 * because the second channel object is the same already-subscribed instance.
 */
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { INITIAL_STAGE } from '@/hooks/useLiveStage';

export type BloomStage = 'seed' | 'leaf' | 'tree';

export interface LivePresence {
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
  seed_id: string;
  seed_title: string;
  seed_image?: string | null;
  jitsi_room: string;
  started_at: string;
  /** Gathering Room: this live's own gathering_sessions.id, created (or
   * reused, on a refresh/re-entry) synchronously in goLive() below --
   * null only if that write itself failed. Passed down as `hostSessionId`
   * to useLiveStage so it never has to guess/race for its own row -- see
   * that hook's own comment for the bug this replaces. */
  gatheringSessionId?: string | null;
}

export interface BloomEvent {
  seed_id: string;
  stage: BloomStage;
  from: string;
  at: number;
}

// Bumped to v2 on 2026-05-09 to flush all stale active-live presences.
const CHANNEL_NAME = 'tribal-orchard:global:v2';

// ─── module-level singleton store ────────────────────────────────────────────
type Store = {
  liveSeeds: LivePresence[];
  blooms: Record<string, { seed: number; leaf: number; tree: number }>;
  recentBloom: BloomEvent | null;
};

let storeState: Store = { liveSeeds: [], blooms: {}, recentBloom: null };
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const getSnapshot = () => storeState;
const setStore = (next: Partial<Store>) => {
  storeState = { ...storeState, ...next };
  listeners.forEach((l) => l());
};

let channel: ReturnType<typeof supabase.channel> | null = null;
let refCount = 0;
let myPresenceMap: Map<string, LivePresence> = new Map(); // tracks live presences by seed_id (for owner's untrack)
// This tab's own currently-open gathering_sessions row id, set by goLive()
// and cleared by endLive() -- module-level (per-tab, not per-component)
// same as myPresenceMap above, and for the same reason: a same-account
// second tab gets its own fresh copy of this module, so it can never end
// or write to the wrong tab's session.
let myGatheringSessionId: string | null = null;

function ensureChannel(presenceKey: string) {
  if (channel) return channel;
  const ch = supabase.channel(CHANNEL_NAME, { config: { presence: { key: presenceKey } } });

  ch.on('presence', { event: 'sync' }, () => {
    const state = ch.presenceState() as Record<string, LivePresence[]>;
    const flat: LivePresence[] = [];
    Object.values(state).forEach((arr) => arr.forEach((p) => p?.seed_id && flat.push(p)));
    flat.sort((a, b) => (b.started_at || '').localeCompare(a.started_at || ''));
    setStore({ liveSeeds: flat });
  });

  ch.on('broadcast', { event: 'bloom' }, ({ payload }) => {
    const ev = payload as BloomEvent;
    if (!ev?.seed_id || !ev?.stage) return;
    const prev = storeState.blooms[ev.seed_id] || { seed: 0, leaf: 0, tree: 0 };
    setStore({
      blooms: { ...storeState.blooms, [ev.seed_id]: { ...prev, [ev.stage]: prev[ev.stage] + 1 } },
      recentBloom: ev,
    });
  });

  ch.subscribe();
  channel = ch;
  return ch;
}

function teardownChannel() {
  if (!channel) return;
  try { channel.untrack(); } catch {}
  supabase.removeChannel(channel);
  channel = null;
  myPresenceMap = new Map();
  setStore({ liveSeeds: [], blooms: {}, recentBloom: null });
}

// ─── hook ────────────────────────────────────────────────────────────────────
export function useTribalLiveOrchard() {
  const { user } = useAuth();
  const presenceKey = user?.id || 'anon';
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    ensureChannel(presenceKey);
    refCount++;
    return () => {
      refCount--;
      // NOTE: We intentionally do NOT teardown the singleton channel on refCount=0.
      // SPA navigation briefly drops refCount to 0 between page transitions, and
      // tearing down the channel would untrack the host's live presence — making
      // the live falsely appear "ended" when the host clicks "See everyone" or
      // simply navigates within the app.
    };
  }, [presenceKey]);

  const goLive = useCallback(
    async (seed: { id: string; title: string; image?: string | null }) => {
      const ch = ensureChannel(presenceKey);
      if (!user?.id) return null;
      const room = `s2g_seed_${seed.id.replace(/-/g, '')}_${Date.now().toString(36)}`;
      const presence: LivePresence = {
        user_id: user.id,
        display_name:
          (user as any)?.user_metadata?.display_name ||
          (user as any)?.user_metadata?.full_name ||
          user.email?.split('@')[0] ||
          'Tribe member',
        avatar_url: (user as any)?.user_metadata?.avatar_url || null,
        seed_id: seed.id,
        seed_title: seed.title,
        seed_image: seed.image || null,
        jitsi_room: room,
        started_at: new Date().toISOString(),
      };
      myPresenceMap.set(seed.id, presence);
      // Track the most recent presence (Supabase presence per key is replace-style)
      await ch.track(presence);

      // Gathering Room: create (or reuse, on a refresh/re-entry) this
      // session's DB row HERE -- synchronously, deterministically, as the
      // one action that actually IS "I am starting/resuming as host,"
      // rather than useLiveStage's mount effect trying to infer host-ness
      // later from presence state that can still be mid-sync. By the time
      // the caller renders <LiveStage hostSessionId={...}>, this has
      // already resolved -- no race for that hook to lose. Reuse (not a
      // fresh INSERT) covers a host who refreshed the tab or re-entered
      // their own still-live room: `eq('host_id', user.id).is('ended_at',
      // null)` finds their own un-ended row for this seed rather than
      // leaving an orphaned duplicate behind every time.
      let gatheringSessionId: string | null = null;
      try {
        const { data: existing } = await supabase
          .from('gathering_sessions' as any)
          .select('id')
          .eq('seed_id', seed.id)
          .eq('host_id', user.id)
          .is('ended_at', null)
          .maybeSingle();
        if (existing) {
          gatheringSessionId = (existing as any).id;
        } else {
          const { data: created, error } = await supabase
            .from('gathering_sessions' as any)
            .insert({ seed_id: seed.id, host_id: user.id, board_state: INITIAL_STAGE })
            .select('id')
            .maybeSingle();
          if (!error && created) gatheringSessionId = (created as any).id;
          else if (error) console.error('goLive: gathering_sessions insert failed', error);
        }
      } catch (e) {
        console.error('goLive: gathering_sessions row failed', e);
      }
      myGatheringSessionId = gatheringSessionId;

      return { ...presence, gatheringSessionId };
    },
    [presenceKey, user]
  );

  const endLive = useCallback(async (opts?: { seedId?: string; seedTitle?: string; transcript?: string; bestowers?: Array<{ user_id: string; name?: string; amount?: number; chat_snippet?: string }> }) => {
    if (channel) {
      try { await channel.untrack(); } catch {}
    }
    myPresenceMap.clear();
    // Close this tab's own gathering_sessions row (the one goLive() just
    // created/reused) -- deterministic, no dependency on useLiveStage's
    // mount/unmount timing or an isHost read that could be stale.
    if (myGatheringSessionId) {
      const idToClose = myGatheringSessionId;
      myGatheringSessionId = null;
      try {
        await supabase.from('gathering_sessions' as any).update({ ended_at: new Date().toISOString() }).eq('id', idToClose);
      } catch (e) {
        console.error('endLive: failed to close gathering_sessions row', e);
      }
    }
    // Fire-and-forget Grove harvest pipeline
    try {
      if (user?.id) {
        const { supabase } = await import("@/integrations/supabase/client");
        await supabase.functions.invoke("grove-session-harvest", {
          body: {
            sower_id: user.id,
            session_id: opts?.seedId,
            session_kind: "live_room",
            seed_title: opts?.seedTitle ?? "your seed",
            transcript: opts?.transcript ?? "",
            bestowers: opts?.bestowers ?? [],
          },
        });
      }
    } catch (e) {
      console.warn("grove-session-harvest dispatch failed", e);
    }
  }, [channel, user?.id]);

  const sendBloom = useCallback(
    (seedId: string, stage: BloomStage) => {
      const ch = ensureChannel(presenceKey);
      if (!user?.id) return;
      const ev: BloomEvent = { seed_id: seedId, stage, from: user.id, at: Date.now() };
      ch.send({ type: 'broadcast', event: 'bloom', payload: ev });
      const prev = storeState.blooms[seedId] || { seed: 0, leaf: 0, tree: 0 };
      setStore({
        blooms: { ...storeState.blooms, [seedId]: { ...prev, [stage]: prev[stage] + 1 } },
        recentBloom: ev,
      });
    },
    [presenceKey, user?.id]
  );

  const liveCount = state.liveSeeds.length;
  const isLive = useMemo(() => myPresenceMap.size > 0, [state.liveSeeds]);

  return {
    liveSeeds: state.liveSeeds,
    blooms: state.blooms,
    recentBloom: state.recentBloom,
    liveCount,
    isLive,
    goLive,
    endLive,
    sendBloom,
  };
}
