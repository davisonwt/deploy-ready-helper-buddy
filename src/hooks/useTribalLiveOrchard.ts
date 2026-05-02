/**
 * useTribalLiveOrchard
 * --------------------
 * Ephemeral, realtime "who is alive in the orchard right now" hook.
 *
 * - Joins a single global Supabase Realtime presence channel.
 * - Tracks the current user when they "Go Live" on a seed.
 * - Streams bloom reactions (🌱 → 🌿 → 🌳) via broadcast.
 *
 * No DB writes. When a session ends, presence vanishes — that is the design.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  started_at: string; // ISO
}

export interface BloomEvent {
  seed_id: string;
  stage: BloomStage;
  from: string;
  at: number;
}

const CHANNEL = 'tribal-orchard:global';

export function useTribalLiveOrchard() {
  const { user } = useAuth();
  const [liveSeeds, setLiveSeeds] = useState<LivePresence[]>([]);
  const [blooms, setBlooms] = useState<Record<string, { seed: number; leaf: number; tree: number }>>({});
  const [recentBloom, setRecentBloom] = useState<BloomEvent | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const myPresenceRef = useRef<LivePresence | null>(null);

  // --- subscribe ---
  useEffect(() => {
    const ch = supabase.channel(CHANNEL, {
      config: { presence: { key: user?.id || `anon-${Math.random().toString(36).slice(2)}` } },
    });

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState() as Record<string, LivePresence[]>;
      const flat: LivePresence[] = [];
      Object.values(state).forEach((arr) => arr.forEach((p) => flat.push(p)));
      // newest first
      flat.sort((a, b) => (b.started_at || '').localeCompare(a.started_at || ''));
      setLiveSeeds(flat);
    });

    ch.on('broadcast', { event: 'bloom' }, ({ payload }) => {
      const ev = payload as BloomEvent;
      if (!ev?.seed_id || !ev?.stage) return;
      setBlooms((prev) => {
        const cur = prev[ev.seed_id] || { seed: 0, leaf: 0, tree: 0 };
        return { ...prev, [ev.seed_id]: { ...cur, [ev.stage]: cur[ev.stage] + 1 } };
      });
      setRecentBloom(ev);
    });

    ch.subscribe();
    channelRef.current = ch;

    return () => {
      try {
        if (myPresenceRef.current) ch.untrack();
      } catch {}
      supabase.removeChannel(ch);
      channelRef.current = null;
      myPresenceRef.current = null;
    };
  }, [user?.id]);

  // --- actions ---
  const goLive = useCallback(
    async (seed: { id: string; title: string; image?: string | null }) => {
      if (!channelRef.current || !user?.id) return null;
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
      myPresenceRef.current = presence;
      await channelRef.current.track(presence);
      return presence;
    },
    [user]
  );

  const endLive = useCallback(async () => {
    if (!channelRef.current) return;
    try { await channelRef.current.untrack(); } catch {}
    myPresenceRef.current = null;
  }, []);

  const sendBloom = useCallback(
    (seedId: string, stage: BloomStage) => {
      const ch = channelRef.current;
      if (!ch || !user?.id) return;
      const ev: BloomEvent = { seed_id: seedId, stage, from: user.id, at: Date.now() };
      ch.send({ type: 'broadcast', event: 'bloom', payload: ev });
      // optimistic local update
      setBlooms((prev) => {
        const cur = prev[seedId] || { seed: 0, leaf: 0, tree: 0 };
        return { ...prev, [seedId]: { ...cur, [stage]: cur[stage] + 1 } };
      });
      setRecentBloom(ev);
    },
    [user?.id]
  );

  // --- derived ---
  const liveCount = liveSeeds.length;
  const isLive = useMemo(() => Boolean(myPresenceRef.current), [liveSeeds]);

  return { liveSeeds, blooms, recentBloom, liveCount, isLive, goLive, endLive, sendBloom };
}
