/**
 * useLiveStage — realtime "stage director" for any Go-Live surface.
 *
 * Manages the host-broadcast presentation mode (camera / image / whiteboard
 * / video / pdf / clip / seed) and the guest hand-raise queue, over a single
 * Supabase broadcast channel `stage:${seedId}` -- the low-latency path, as
 * before. Gathering Room batch 1 adds one durable row (`gathering_sessions`)
 * per live session: the host's own board changes write through to it
 * (debounced-by-nature -- one write per host action, not a timer), and a
 * late joiner (or a host who refreshes) reads it once on mount so they see
 * the CURRENT board instead of nothing until the next broadcast. Everything
 * else (hand-raise queue, spotlight) stays exactly as ephemeral as before --
 * batch 2 is what persists the queue.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type StageMode = 'camera' | 'image' | 'whiteboard' | 'video' | 'pdf' | 'clip' | 'seed';

export interface NowPlaying {
  seed_id: string;
  title: string;
  sower_user_id?: string | null;
  media_url?: string | null;
  media_kind?: 'audio' | 'video' | null;
  image?: string | null;
}

export interface PinnedSeed {
  id: string;
  kind: 'seed' | 'orchard' | 'music' | 'book' | 'video';
  title: string;
  subtitle?: string | null;
  cover: string | null;
  price: number;
  ownerId: string;
  ownerName?: string | null;
  openPath: string;
}

export interface StagePayload {
  mode: StageMode;
  imageUrl?: string | null;
  imageIdx?: number;
  text?: string;
  mediaPlaying?: boolean;
  mediaTime?: number;
  mediaUrl?: string | null;
  mediaKind?: 'audio' | 'video' | null;
  nowPlaying?: NowPlaying | null;
  /** user_id of the approved guest currently spotlighted on the big screen (null = host) */
  spotlightUserId?: string | null;
  /** Gathering Room batch 1: host-synced PDF page. */
  pdfUrl?: string | null;
  pdfPage?: number;
  pdfPageCount?: number;
  /** Gathering Room batch 1: host-synced short video clip. */
  clipUrl?: string | null;
  clipPlaying?: boolean;
  clipTime?: number;
  /** Gathering Room batch 1: a seed pinned to the board, Bestow-able by any viewer. */
  pinnedSeed?: PinnedSeed | null;
  at: number;
}

export interface SpotlightRequest {
  user_id: string;
  name: string;
  at: number;
}

export interface HandRaise {
  user_id: string;
  name: string;
  avatar?: string | null;
  want: 'voice' | 'video';
  at: number;
  /** Gathering Room batch 2: recorded instead of waiting for a live camera/mic slot -- plays to the room when this hand reaches #1, then the queue advances. */
  voiceNoteUrl?: string | null;
}

/** Gathering Room batch 2: what's currently auto-playing to the whole room (the #1 queue position's voice note). */
export interface PlayingVoiceNote {
  user_id: string;
  name: string;
  url: string;
}

export interface ApprovedGuest {
  user_id: string;
  name: string;
  avatar?: string | null;
  mode: 'voice' | 'video';
  muted?: boolean;
}

/** Exported so goLive() (useTribalLiveOrchard.ts) can seed a brand-new
 * gathering_sessions row with the same starting shape this hook itself
 * starts from -- single source of truth for "what a session looks like
 * before the host has done anything yet." */
export const INITIAL_STAGE: StagePayload = { mode: 'camera', spotlightUserId: null, at: Date.now() };

export function useLiveStage(seedId: string | null, opts: { isHost: boolean; enabled: boolean; hostSessionId?: string | null }) {
  const { user } = useAuth();
  const { isHost, enabled, hostSessionId } = opts;

  const [stage, setStage] = useState<StagePayload>(INITIAL_STAGE);
  const [hands, setHands] = useState<HandRaise[]>([]);
  const [approved, setApproved] = useState<ApprovedGuest[]>([]);
  const [spotlightRequests, setSpotlightRequests] = useState<SpotlightRequest[]>([]);
  const [playingVoiceNote, setPlayingVoiceNote] = useState<PlayingVoiceNote | null>(null);
  const playingVoiceNoteRef = useRef<PlayingVoiceNote | null>(null);
  // Gathering Room batch 2: which #1-position user_ids the host has already
  // triggered a play_voice_note for, so the same note doesn't fire twice
  // while it's playing out (hands still contains the entry until playback
  // finishes and the host removes it).
  const triggeredVoiceNotesRef = useRef<Set<string>>(new Set());
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Gathering Room batch 1: this live's own gathering_sessions.id, once
  // resolved (fetched for a viewer, or handed to us pre-resolved for the
  // host via hostSessionId -- see below). null until then -- board writes
  // are broadcast-only (as always) before it resolves, same as they'd be
  // with no persistence at all.
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !seedId) return;
    let cancelled = false;
    const ch = supabase.channel(`stage:${seedId}`, { config: { broadcast: { self: false } } });
    chRef.current = ch;

    ch.on('broadcast', { event: 'stage_mode' }, ({ payload }) => {
      setStage(payload as StagePayload);
    });
    ch.on('broadcast', { event: 'raise_hand' }, ({ payload }) => {
      const h = payload as HandRaise;
      setHands(prev => prev.find(x => x.user_id === h.user_id) ? prev : [...prev, h]);
    });
    ch.on('broadcast', { event: 'play_voice_note' }, ({ payload }) => {
      const p = payload as PlayingVoiceNote;
      playingVoiceNoteRef.current = p;
      setPlayingVoiceNote(p);
    });
    ch.on('broadcast', { event: 'cancel_hand' }, ({ payload }) => {
      setHands(prev => prev.filter(h => h.user_id !== (payload as any).user_id));
    });
    ch.on('broadcast', { event: 'approve_hand' }, ({ payload }) => {
      const g = payload as ApprovedGuest;
      setApproved(prev => prev.find(x => x.user_id === g.user_id) ? prev : [...prev, g]);
      setHands(prev => prev.filter(h => h.user_id !== g.user_id));
    });
    ch.on('broadcast', { event: 'remove_guest' }, ({ payload }) => {
      setApproved(prev => prev.filter(g => g.user_id !== (payload as any).user_id));
    });
    ch.on('broadcast', { event: 'force_mute' }, ({ payload }) => {
      const { user_id, muted } = payload as any;
      setApproved(prev => prev.map(g => g.user_id === user_id ? { ...g, muted } : g));
    });
    ch.on('broadcast', { event: 'request_spotlight' }, ({ payload }) => {
      const r = payload as SpotlightRequest;
      setSpotlightRequests(prev => prev.find(x => x.user_id === r.user_id) ? prev : [...prev, r]);
    });
    ch.on('broadcast', { event: 'cancel_spotlight_request' }, ({ payload }) => {
      setSpotlightRequests(prev => prev.filter(r => r.user_id !== (payload as any).user_id));
    });
    ch.on('broadcast', { event: 'set_spotlight' }, ({ payload }) => {
      const { user_id } = payload as { user_id: string | null };
      setStage(prev => ({ ...prev, spotlightUserId: user_id, at: Date.now() }));
      if (user_id) setSpotlightRequests(prev => prev.filter(r => r.user_id !== user_id));
    });

    ch.subscribe();

    // Late-joiner hydration (Gathering Room batch 1) -- row CREATION is no
    // longer this effect's job. It used to be: SELECT for an existing row,
    // and if none, INSERT one when `isHost` -- but `isHost` here is derived
    // from presence state (LiveStageOverlay's `liveHere[0]?.user_id ===
    // user?.id`) that can still be mid-sync at the exact moment this effect
    // first fires, racing the SELECT above with no guaranteed winner.
    // Confirmed live, 2026-09-14: a real Go-Live session left mode stuck at
    // 'camera' in gathering_sessions no matter how long the host stayed on
    // the PDF tab -- the INSERT simply never ran that time.
    //
    // Fix: the host's own gathering_sessions row is now created (or reused,
    // if this is a refresh/re-entry) synchronously inside goLive() itself
    // (useTribalLiveOrchard.ts), BEFORE this component (and this effect)
    // ever mounts -- by the time LiveStage/useLiveStage renders, goLive()
    // has already resolved and `hostSessionId` is a real, stable id, not a
    // race. This effect's only remaining job for the host path is to
    // hydrate `stage` from that row's last-known board_state (covers a
    // refresh mid-PDF, where the row already has real content) and point
    // sessionIdRef at it so setStageMode's writes land somewhere.
    (async () => {
      if (hostSessionId) {
        sessionIdRef.current = hostSessionId;
        const { data } = await supabase
          .from('gathering_sessions' as any)
          .select('board_state')
          .eq('id', hostSessionId)
          .maybeSingle();
        if (cancelled) return;
        const board = (data as any)?.board_state as Partial<StagePayload> | null;
        if (board && Object.keys(board).length > 0) {
          setStage(prev => ({ ...prev, ...board }));
        }
        return;
      }

      // Guest (or any caller that hasn't threaded hostSessionId through) --
      // hydrate from whichever un-ended row already exists for this seed.
      // No INSERT branch: a guest never owns this session's row.
      const { data: existing } = await supabase
        .from('gathering_sessions' as any)
        .select('id, board_state')
        .eq('seed_id', seedId)
        .is('ended_at', null)
        .maybeSingle();
      if (cancelled || !existing) return;
      sessionIdRef.current = (existing as any).id;
      const board = (existing as any).board_state as Partial<StagePayload> | null;
      if (board && Object.keys(board).length > 0) {
        setStage(prev => ({ ...prev, ...board }));
      }
    })();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
      chRef.current = null;
      // Primary path for closing the row is the explicit "End live" action
      // (endLive() in useTribalLiveOrchard.ts, which knows the id
      // deterministically -- see goLive()). This is only a defensive
      // fallback for a host tab that closes/navigates away without ever
      // clicking "End live" -- hostSessionId is only ever non-null for the
      // actual host (never a guest), so this can't end someone else's live.
      if (hostSessionId && sessionIdRef.current) {
        // .update().eq() returns a lazy PostgREST thenable -- it only ever
        // issues the request from inside its own .then()/await, same as a
        // Promise executor never runs until you consume it. `void builder`
        // alone (the previous form here) discards that thenable without
        // ever calling .then(), so the request was NEVER actually sent --
        // confirmed live, 2026-09-14: zero PATCH requests for any
        // board_state/ended_at write, on every single test, regardless of
        // whether sessionIdRef was correctly populated. `.then()` is the
        // minimal fix (this fires from a synchronous cleanup fn, can't await).
        supabase.from('gathering_sessions' as any).update({ ended_at: new Date().toISOString() }).eq('id', sessionIdRef.current)
          .then(({ error }) => { if (error) console.error('useLiveStage cleanup: failed to close gathering_sessions row', error); });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedId, enabled]);

  const send = useCallback((event: string, payload: any) => {
    chRef.current?.send({ type: 'broadcast', event, payload });
  }, []);

  // Gathering Room batch 2: the host's own client is the one "director"
  // that decides when the #1 queue position's voice note plays -- avoids
  // every client racing to broadcast the same trigger. Re-checks whenever
  // `hands` changes (a new #1, or the old #1 left the queue some other way).
  useEffect(() => {
    if (!isHost) return;
    const top = hands[0];
    if (!top?.voiceNoteUrl) return;
    if (triggeredVoiceNotesRef.current.has(top.user_id)) return;
    triggeredVoiceNotesRef.current.add(top.user_id);
    const p: PlayingVoiceNote = { user_id: top.user_id, name: top.name, url: top.voiceNoteUrl };
    playingVoiceNoteRef.current = p;
    setPlayingVoiceNote(p);
    send('play_voice_note', p);
  }, [isHost, hands, send]);

  const setStageMode = useCallback((p: Omit<StagePayload, 'at'>) => {
    if (!isHost) return;
    const full: StagePayload = { ...p, at: Date.now() };
    setStage(full);
    send('stage_mode', full);
    if (sessionIdRef.current) {
      // See the unmount-cleanup comment above (same file) -- `void builder`
      // never actually sends a PostgREST update; `.then()` does. This was
      // the real reason board_state stayed stuck at 'camera' forever, even
      // in test runs where sessionIdRef WAS correctly populated.
      supabase.from('gathering_sessions' as any).update({ board_state: full }).eq('id', sessionIdRef.current)
        .then(({ error }) => { if (error) console.error('setStageMode: board_state write failed', error); });
    }
  }, [isHost, send]);

  const raiseHand = useCallback((want: 'voice' | 'video', voiceNoteUrl?: string) => {
    if (!user) return;
    const h: HandRaise = {
      user_id: user.id,
      name: (user as any)?.user_metadata?.display_name || user.email?.split('@')[0] || 'Guest',
      avatar: (user as any)?.user_metadata?.avatar_url || null,
      want,
      at: Date.now(),
      voiceNoteUrl: voiceNoteUrl ?? null,
    };
    send('raise_hand', h);
  }, [user, send]);

  // Gathering Room batch 2: called by every client's own <audio onEnded>
  // once the currently-playing voice note finishes -- clears the local
  // "now playing" banner everywhere, and (host only) actually removes that
  // hand from the queue, advancing whoever's next to #1.
  const finishVoiceNote = useCallback(() => {
    const p = playingVoiceNoteRef.current;
    playingVoiceNoteRef.current = null;
    setPlayingVoiceNote(null);
    if (isHost && p) {
      setHands(prev => prev.filter(h => h.user_id !== p.user_id));
      send('cancel_hand', { user_id: p.user_id });
    }
  }, [isHost, send]);

  const cancelHand = useCallback(() => {
    if (!user) return;
    send('cancel_hand', { user_id: user.id });
  }, [user, send]);

  const approveHand = useCallback((h: HandRaise) => {
    if (!isHost) return;
    const g: ApprovedGuest = { user_id: h.user_id, name: h.name, avatar: h.avatar, mode: h.want, muted: false };
    setApproved(prev => prev.find(x => x.user_id === g.user_id) ? prev : [...prev, g]);
    setHands(prev => prev.filter(x => x.user_id !== h.user_id));
    send('approve_hand', g);
  }, [isHost, send]);

  const denyHand = useCallback((userId: string) => {
    if (!isHost) return;
    setHands(prev => prev.filter(h => h.user_id !== userId));
    send('cancel_hand', { user_id: userId });
  }, [isHost, send]);

  const removeGuest = useCallback((userId: string) => {
    if (!isHost) return;
    setApproved(prev => prev.filter(g => g.user_id !== userId));
    send('remove_guest', { user_id: userId });
  }, [isHost, send]);

  const toggleMute = useCallback((userId: string, muted: boolean) => {
    if (!isHost) return;
    setApproved(prev => prev.map(g => g.user_id === userId ? { ...g, muted } : g));
    send('force_mute', { user_id: userId, muted });
  }, [isHost, send]);

  const setSpotlight = useCallback((userId: string | null) => {
    if (!isHost) return;
    setStage(prev => ({ ...prev, spotlightUserId: userId, at: Date.now() }));
    setSpotlightRequests(prev => userId ? prev.filter(r => r.user_id !== userId) : prev);
    send('set_spotlight', { user_id: userId });
  }, [isHost, send]);

  const requestSpotlight = useCallback(() => {
    if (!user) return;
    const r: SpotlightRequest = {
      user_id: user.id,
      name: (user as any)?.user_metadata?.display_name || user.email?.split('@')[0] || 'Guest',
      at: Date.now(),
    };
    send('request_spotlight', r);
  }, [user, send]);

  const cancelSpotlightRequest = useCallback(() => {
    if (!user) return;
    setSpotlightRequests(prev => prev.filter(r => r.user_id !== user.id));
    send('cancel_spotlight_request', { user_id: user.id });
  }, [user, send]);

  const denySpotlight = useCallback((userId: string) => {
    if (!isHost) return;
    setSpotlightRequests(prev => prev.filter(r => r.user_id !== userId));
    send('cancel_spotlight_request', { user_id: userId });
  }, [isHost, send]);

  return {
    stage, setStageMode,
    hands, raiseHand, cancelHand, approveHand, denyHand,
    approved, removeGuest, toggleMute,
    spotlightRequests, setSpotlight, requestSpotlight, cancelSpotlightRequest, denySpotlight,
    playingVoiceNote, finishVoiceNote,
    myHandRaised: !!user && hands.some(h => h.user_id === user.id),
    iAmApproved: !!user && approved.some(g => g.user_id === user.id),
    mySpotlightRequested: !!user && spotlightRequests.some(r => r.user_id === user.id),
    iAmSpotlighted: !!user && stage.spotlightUserId === user.id,
  };
}
