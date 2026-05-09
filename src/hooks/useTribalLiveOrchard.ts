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
      if (refCount <= 0) {
        refCount = 0;
        teardownChannel();
      }
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
      return presence;
    },
    [presenceKey, user]
  );

  const endLive = useCallback(async (opts?: { seedId?: string; seedTitle?: string; transcript?: string; bestowers?: Array<{ user_id: string; name?: string; amount?: number; chat_snippet?: string }> }) => {
    if (channel) {
      try { await channel.untrack(); } catch {}
    }
    myPresenceMap.clear();
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
