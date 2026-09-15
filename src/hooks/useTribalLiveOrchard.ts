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
import { INITIAL_STAGE, type StagePayload } from '@/hooks/useLiveStage';

export type BloomStage = 'seed' | 'leaf' | 'tree';

export type SessionAccess = 'open' | 'restricted';

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
  /** "Live Now" directory (2026-09-15): 'open' (default -- directly
   * joinable from the directory) or 'restricted' (invite-link only, shown
   * as invite-only rather than joinable). Mirrors
   * gathering_sessions.access -- kept on presence too since the directory
   * lists from presence, not a DB query, for the same realtime-without-
   * polling reason everything else here does. */
  access: SessionAccess;
  /** "Live Now" directory: how many people are currently on this live --
   * updated by the HOST's own tab (see updateParticipantCount below,
   * called from LiveStage.tsx) whenever its approved-guest count changes.
   * Starts at 0 (just the host) at goLive() time. */
  participant_count: number;
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
// Resolves once THIS channel instance has actually reached Realtime's
// SUBSCRIBED state -- goLive() awaits this before ch.track(presence).
// Confirmed live (silent-rejoin bug, 2026-09-15): a resumed session's
// gathering_sessions row/Daily call/board all came back correctly, but
// the host vanished from everyone else's Live Now list -- ch.subscribe()
// is fire-and-forget, and calling ch.track() on a channel that hasn't
// finished its SUBSCRIBED handshake yet is silently ineffective. The
// FIRST "Go Live" tap of a normal session never hit this (the channel,
// mounted earlier via useTribalLiveOrchard's own effect, has almost
// always finished subscribing by the time a real person gets around to
// tapping Go Live); the auto-rejoin path calls goLive() again within
// moments of a fresh page load, before that handshake reliably completes.
let channelSubscribedPromise: Promise<void> | null = null;

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

  channelSubscribedPromise = new Promise((resolve) => {
    ch.subscribe((status) => {
      // Resolve on ANY terminal status, not just SUBSCRIBED -- presence
      // tracking is best-effort; goLive() awaiting this must never hang
      // forever just because a connection had trouble.
      if (status === 'SUBSCRIBED' || status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
        resolve();
      }
    });
  });
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
    async (
      seed: { id: string; title: string; image?: string | null },
      opts?: {
        access?: SessionAccess;
        /** Ad-hoc "Go Live" (no seed): seeds board_state with the host's own
         * stall interior as the initial backdrop instead of INITIAL_STAGE's
         * plain camera mode -- same visual pattern Scripture Study/other
         * Gathering Room places already use. Only applied on a genuinely
         * NEW row, same reuse-over-remint rule `access` above follows (a
         * host re-entering their own still-live session keeps whatever's
         * already on the board, not reset to this every time). */
        initialBoard?: Partial<StagePayload>;
      }
    ) => {
      const ch = ensureChannel(presenceKey);
      if (!user?.id) return null;

      // Gathering Room: resolve (reuse, on a refresh/re-entry) or create
      // this session's DB row HERE -- synchronously, deterministically, as
      // the one action that actually IS "I am starting/resuming as host,"
      // rather than useLiveStage's mount effect trying to infer host-ness
      // later from presence state that can still be mid-sync. By the time
      // the caller renders <LiveStage hostSessionId={...}>, this has
      // already resolved -- no race for that hook to lose. Reuse (not a
      // fresh INSERT) covers a host who refreshed the tab or re-entered
      // their own still-live room: `eq('host_id', user.id).is('ended_at',
      // null)` finds their own un-ended row for this seed rather than
      // leaving an orphaned duplicate behind every time.
      //
      // jitsi_room is now reused right alongside the row id -- root cause
      // of a live incident, 2026-09-14 (3 real participants: one guest
      // landed in an empty room, host lost one participant's audio, a
      // spotlighted guest lost audio+upload rights): this used to mint a
      // FRESH `Date.now()`-suffixed room on every single goLive() call,
      // including this exact "re-entering my own still-live room" path.
      // gathering_sessions.id was already correctly reused; the Daily room
      // name was not. Any host-side re-trigger of goLive() (refresh,
      // re-navigating to the card) while others were already connected
      // silently moved the HOST to a brand-new Daily room while
      // board_state and the stage:${seedId} broadcast channel -- both
      // keyed by the stable seed/row id -- stayed identical for everyone.
      // Board/spotlight state kept syncing perfectly (it never left the
      // shared channel); only audio/video silently split across two Daily
      // rooms, with no error anywhere for anyone to notice.
      let gatheringSessionId: string | null = null;
      let room: string;
      // "Live Now" directory (2026-09-15): access follows the exact same
      // reuse-over-remint rule jitsi_room just got fixed to follow --
      // resuming an already-live session keeps whatever access it already
      // has (a host re-entering their own live shouldn't silently flip an
      // already-Restricted session back to Open); only a genuinely NEW
      // session takes opts?.access, defaulting to 'open'.
      //
      // Deliberately a SEPARATE query from the id/jitsi_room one below, not
      // one extra column added to it: that select (and the insert) are the
      // already-proven-safe room-identity fix from the previous incident --
      // coupling access's column to the SAME statement would mean a
      // deploy that ships this code before its own migration has run
      // reintroduces THAT bug (an unknown column fails the whole query,
      // not just the new field), not just fail to add access. Isolated
      // here so a missing access column can only ever cost the access
      // feature, never the session-identity fix it's built next to.
      let access: SessionAccess = opts?.access || 'open';
      try {
        const { data: existing } = await supabase
          .from('gathering_sessions' as any)
          .select('id, jitsi_room')
          .eq('seed_id', seed.id)
          .eq('host_id', user.id)
          .is('ended_at', null)
          .maybeSingle();
        const existingRoom = (existing as any)?.jitsi_room as string | null | undefined;
        room = existingRoom || `s2g_seed_${seed.id.replace(/-/g, '')}_${Date.now().toString(36)}`;

        if (existing) {
          gatheringSessionId = (existing as any).id;
          if (!existingRoom) {
            // Row predates the jitsi_room column, or was somehow created
            // without one -- backfill it now so every future reuse of
            // THIS row (including this same tab's next goLive() call)
            // reads the identical value back instead of minting again.
            await supabase.from('gathering_sessions' as any).update({ jitsi_room: room }).eq('id', gatheringSessionId);
          }
          try {
            const { data: accessRow } = await supabase
              .from('gathering_sessions' as any)
              .select('access')
              .eq('id', gatheringSessionId)
              .maybeSingle();
            const existingAccess = (accessRow as any)?.access as SessionAccess | null | undefined;
            if (existingAccess === 'open' || existingAccess === 'restricted') access = existingAccess;
          } catch (e) {
            console.warn('goLive: access column not readable yet (migration pending?) -- defaulting to', access, e);
          }
        } else {
          const boardState: StagePayload = opts?.initialBoard
            ? { ...INITIAL_STAGE, ...opts.initialBoard, at: Date.now() }
            : INITIAL_STAGE;
          let created: { id: string } | null = null;
          let error: unknown = null;
          ({ data: created, error } = await supabase
            .from('gathering_sessions' as any)
            .insert({ seed_id: seed.id, host_id: user.id, board_state: boardState, jitsi_room: room, access })
            .select('id')
            .maybeSingle() as any);
          if (error) {
            // Most likely cause: the access column doesn't exist on this
            // DB yet (migration not applied). Retry WITHOUT it so session
            // creation itself -- the part that actually matters -- still
            // succeeds; access just falls back to the local default above.
            console.warn('goLive: insert with access failed, retrying without it (migration pending?)', error);
            const retry = await supabase
              .from('gathering_sessions' as any)
              .insert({ seed_id: seed.id, host_id: user.id, board_state: boardState, jitsi_room: room })
              .select('id')
              .maybeSingle();
            created = retry.data as any;
            error = retry.error;
          }
          if (!error && created) gatheringSessionId = created.id;
          else if (error) console.error('goLive: gathering_sessions insert failed', error);
        }
      } catch (e) {
        console.error('goLive: gathering_sessions row failed', e);
        room = `s2g_seed_${seed.id.replace(/-/g, '')}_${Date.now().toString(36)}`;
      }
      myGatheringSessionId = gatheringSessionId;
      console.warn(`[useTribalLiveOrchard] goLive -- seed: ${seed.id}, gatheringSessionId: ${gatheringSessionId}, jitsi_room: ${room}, access: ${access}`);

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
        access,
        participant_count: 0,
      };
      myPresenceMap.set(seed.id, presence);
      // Wait for the channel's own SUBSCRIBED handshake before tracking --
      // see ensureChannel's doc comment; ch.track() on a not-yet-subscribed
      // channel is silently ineffective, the exact cause of the silent-
      // rejoin presence bug.
      if (channelSubscribedPromise) await channelSubscribedPromise;
      // Track the most recent presence (Supabase presence per key is replace-style)
      await ch.track(presence);

      return { ...presence, gatheringSessionId };
    },
    [presenceKey, user]
  );

  // "Live Now" directory: the host's own tab reports how many approved
  // guests are currently on the live (LiveStage.tsx calls this whenever
  // its `approved.length` changes) -- presence has no other channel for
  // this, and a directory listing needs it without joining every session
  // just to count heads.
  const updateParticipantCount = useCallback((seedId: string, count: number) => {
    const ch = ensureChannel(presenceKey);
    const existing = myPresenceMap.get(seedId);
    if (!existing || existing.participant_count === count) return;
    const updated: LivePresence = { ...existing, participant_count: count };
    myPresenceMap.set(seedId, updated);
    void ch.track(updated);
  }, [presenceKey]);

  // "Live Now" directory: host-only access toggle (LiveStageOverlay.tsx) --
  // updates the durable row (source of truth for a late joiner reading
  // straight from gathering_sessions) and re-tracks presence (source of
  // truth for the directory listing itself) together, so neither can be
  // seen briefly out of sync with the other.
  const updateSessionAccess = useCallback(async (seedId: string, access: SessionAccess) => {
    const ch = ensureChannel(presenceKey);
    const existing = myPresenceMap.get(seedId);
    if (existing) {
      const updated: LivePresence = { ...existing, access };
      myPresenceMap.set(seedId, updated);
      void ch.track(updated);
    }
    if (myGatheringSessionId) {
      const { error } = await supabase.from('gathering_sessions' as any).update({ access }).eq('id', myGatheringSessionId);
      if (error) console.error('updateSessionAccess: gathering_sessions update failed', error);
    }
  }, [presenceKey]);

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
    updateParticipantCount,
    updateSessionAccess,
  };
}
