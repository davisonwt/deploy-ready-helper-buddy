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

export function useLiveStage(seedId: string | null, opts: { isHost: boolean; enabled: boolean; hostSessionId?: string | null; isModerator?: boolean }) {
  const { user } = useAuth();
  const { isHost, enabled, hostSessionId, isModerator = false } = opts;
  // Gathering Room moderators (useGatheringModerators.ts): mute/remove a
  // participant and advance/skip the raise-hand queue are allowed for the
  // host OR a session moderator -- everything else here (approve/deny a
  // hand, spotlight, board control) stays host-only, per spec.
  const canModerate = isHost || isModerator;

  const [stage, setStage] = useState<StagePayload>(INITIAL_STAGE);
  const [hands, setHands] = useState<HandRaise[]>([]);
  const [approved, setApproved] = useState<ApprovedGuest[]>([]);
  const [spotlightRequests, setSpotlightRequests] = useState<SpotlightRequest[]>([]);
  const [playingVoiceNote, setPlayingVoiceNote] = useState<PlayingVoiceNote | null>(null);
  // Scripture Study speaker-permission fix (2026-09-15): who, among
  // `approved` (non-host) guests, currently has the floor -- the ONE
  // non-host mic LiveStage.tsx's own Daily-enforcement effect will ever
  // unmute.
  //
  // Silent-rejoin revision (2026-09-15): `approved` and `liveSpeakerUserId`
  // are now ALSO persisted to gathering_sessions.queue_state (see
  // persistQueueState/hydrateQueueState below) -- backgrounding the app,
  // answering a call, or a memory-pressure tab reload all unmount this
  // hook and reset its state to empty; without durable state, a
  // previously-approved participant returning would have to raise their
  // hand and wait for re-approval all over again, exactly the re-prompt
  // this feature exists to remove. `hands` (pending, not-yet-approved
  // raises) stays broadcast-only -- losing a raised-but-not-yet-approved
  // hand on a rare unmount is a much smaller inconvenience than losing
  // already-granted speaking rights, and persisting it too would mean
  // writing on every single raise/cancel, not just approve/remove.
  const [liveSpeakerUserId, setLiveSpeakerUserId] = useState<string | null>(null);
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

  // Silent-rejoin (see liveSpeakerUserId's own doc comment above): applies
  // a hydrated queue_state row on mount -- called from both the host and
  // guest branches of the mount effect below, same "only overwrite if
  // there's real content" shape board_state hydration already uses (an
  // empty/missing queue_state means a brand-new session, nothing to
  // restore, `approved`/`liveSpeakerUserId` correctly stay at their
  // cold-start empty defaults).
  const hydrateQueueState = (raw: unknown) => {
    const q = raw as { approved?: ApprovedGuest[]; liveSpeakerUserId?: string | null } | null;
    if (!q) return;
    if (Array.isArray(q.approved) && q.approved.length > 0) setApproved(q.approved);
    if (q.liveSpeakerUserId) setLiveSpeakerUserId(q.liveSpeakerUserId);
  };

  // Writes through on every approved/liveSpeakerUserId change -- host-only
  // (gathering_sessions' UPDATE policy is host_id = auth.uid(), same as
  // every other write to this row), so a moderator's own approve/remove/
  // advance action doesn't attempt (and fail) this write directly; the
  // HOST's own client sees that same change via broadcast (approved/
  // liveSpeakerUserId are already updated by the broadcast handlers below
  // regardless of who triggered it) and persists it from here instead --
  // one durable copy, one writer, no RLS-rejected duplicate attempts.
  const lastPersistedQueueRef = useRef<string>('');
  useEffect(() => {
    if (!isHost || !sessionIdRef.current) return;
    const queue_state = { approved, liveSpeakerUserId };
    const serialized = JSON.stringify(queue_state);
    if (serialized === lastPersistedQueueRef.current) return;
    lastPersistedQueueRef.current = serialized;
    supabase.from('gathering_sessions' as any).update({ queue_state }).eq('id', sessionIdRef.current)
      .then(({ error }) => { if (error) console.error('useLiveStage: queue_state write failed', error); });
  }, [isHost, approved, liveSpeakerUserId]);

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
    ch.on('broadcast', { event: 'set_live_speaker' }, ({ payload }) => {
      setLiveSpeakerUserId((payload as { user_id: string | null }).user_id);
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
      // Which gathering_sessions row / stage broadcast channel THIS
      // participant actually landed on -- see useTribalLiveOrchard.ts's
      // goLive() for the room-identity bug this pairs with. A guest here
      // whose logged sessionId doesn't match the host's own
      // gatheringSessionId log line is the "different session entirely"
      // failure mode, independent of which Daily room either of them joined.
      if (hostSessionId) {
        sessionIdRef.current = hostSessionId;
        console.warn(`[useLiveStage] HOST on channel stage:${seedId}, sessionId: ${hostSessionId}`);
        const { data } = await supabase
          .from('gathering_sessions' as any)
          .select('board_state, queue_state')
          .eq('id', hostSessionId)
          .maybeSingle();
        if (cancelled) return;
        const board = (data as any)?.board_state as Partial<StagePayload> | null;
        if (board && Object.keys(board).length > 0) {
          setStage(prev => ({ ...prev, ...board }));
        }
        hydrateQueueState((data as any)?.queue_state);
        return;
      }

      // Guest (or any caller that hasn't threaded hostSessionId through) --
      // hydrate from whichever un-ended row already exists for this seed.
      // No INSERT branch: a guest never owns this session's row.
      const { data: existing } = await supabase
        .from('gathering_sessions' as any)
        .select('id, board_state, queue_state')
        .eq('seed_id', seedId)
        .is('ended_at', null)
        .maybeSingle();
      if (cancelled || !existing) {
        console.warn(`[useLiveStage] GUEST on channel stage:${seedId} -- NO active gathering_sessions row found (board-only fallback, broadcast-only sync)`);
        return;
      }
      sessionIdRef.current = (existing as any).id;
      console.warn(`[useLiveStage] GUEST on channel stage:${seedId}, sessionId: ${(existing as any).id}`);
      const board = (existing as any).board_state as Partial<StagePayload> | null;
      if (board && Object.keys(board).length > 0) {
        setStage(prev => ({ ...prev, ...board }));
      }
      hydrateQueueState((existing as any).queue_state);
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
    // Board control belongs to the host OR whoever's currently spotlighted
    // -- a panelist the host has put on the big screen can drive their own
    // content, same as the host would.
    const isPresenter = isHost || (!!user && stage.spotlightUserId === user.id);
    if (!isPresenter) return;
    // spotlightUserId is presenter-CONTROL metadata, not board content -- it
    // must always reflect the live value, never whatever `p` happens to
    // carry. A caller can otherwise clobber it with a stale one: LiveStage's
    // own host-reclaim effect restores a *snapshot* of the whole stage taken
    // back when spotlight was first handed to a guest (so the guest's id is
    // baked into that snapshot's spotlightUserId), and replays it via this
    // same function right after setSpotlight(null) has just cleared it --
    // silently re-spotlighting the guest and leaving the host permanently
    // unable to become the active editor again. Confirmed live, 2026-09-14,
    // via the E2E test: the host's Text tab stopped rendering a <textarea>
    // for the rest of the session after any single spotlight handoff.
    const full: StagePayload = { ...p, spotlightUserId: stage.spotlightUserId, at: Date.now() };
    setStage(full);
    send('stage_mode', full);
    // DB persistence stays host-only: gathering_sessions' RLS UPDATE policy
    // only allows auth.uid() = host_id (see its own migration), so a
    // presenting-but-not-host panelist's write would just be silently
    // rejected by Postgres anyway. Their content still reaches everyone
    // live via the broadcast above; it just isn't the durable copy. When
    // spotlight returns to the host, LiveStage.tsx's own snapshot/restore
    // effect re-asserts (and re-persists) the host's own last content.
    if (isHost && sessionIdRef.current) {
      // See the unmount-cleanup comment above (same file) -- `void builder`
      // never actually sends a PostgREST update; `.then()` does. This was
      // the real reason board_state stayed stuck at 'camera' forever, even
      // in test runs where sessionIdRef WAS correctly populated.
      supabase.from('gathering_sessions' as any).update({ board_state: full }).eq('id', sessionIdRef.current)
        .then(({ error }) => { if (error) console.error('setStageMode: board_state write failed', error); });
    }
  }, [isHost, send, stage.spotlightUserId, user]);

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

  // Scripture Study speaker-permission fix: who currently has the floor,
  // host-only. Broadcasts to every client (so everyone's own view of "who's
  // speaking" agrees), but the actual audio enforcement -- muting/unmuting
  // real Daily tracks -- happens in LiveStage.tsx's own effect, which is
  // the only place that has both this value AND the Daily call object.
  const setLiveSpeaker = useCallback((userId: string | null) => {
    if (!canModerate) return;
    setLiveSpeakerUserId(userId);
    send('set_live_speaker', { user_id: userId });
  }, [canModerate, send]);

  const approveHand = useCallback((h: HandRaise) => {
    if (!isHost) return;
    const g: ApprovedGuest = { user_id: h.user_id, name: h.name, avatar: h.avatar, mode: h.want, muted: false };
    // A lone approved guest (the ordinary 1:1 "seller demos a seed to one
    // buyer" shape, not a multi-guest panel) gets the floor immediately --
    // the reported bug only ever happens once a SECOND+ guest is also
    // approved and nothing arbitrates between them, so gating a solo guest
    // too would just be a needless regression (the host having to
    // remember to click "Next speaker" for a call that only ever has one
    // possible speaker to begin with). Approving a second/third/etc. guest
    // does NOT touch who currently has the floor -- the host decides that
    // via setLiveSpeaker/advanceQueue once there's an actual choice to make.
    if (approved.length === 0) setLiveSpeaker(h.user_id);
    setApproved(prev => prev.find(x => x.user_id === g.user_id) ? prev : [...prev, g]);
    setHands(prev => prev.filter(x => x.user_id !== h.user_id));
    send('approve_hand', g);
  }, [isHost, send, approved, setLiveSpeaker]);

  const denyHand = useCallback((userId: string) => {
    if (!isHost) return;
    setHands(prev => prev.filter(h => h.user_id !== userId));
    send('cancel_hand', { user_id: userId });
  }, [isHost, send]);

  // Host-only: hands the floor to the next approved guest after whoever's
  // currently speaking, in approval order -- wraps to the first once past
  // the end, clears to "nobody" once no approved guest is left. Optional
  // `presentUserIds` additionally excludes anyone `approved` still lists
  // but whose Daily participant is already gone (LiveStage.tsx passes this
  // from its own live call-participant map so a just-disconnected guest is
  // never picked as the "next" speaker before their `approved` entry is
  // cleaned up).
  const advanceQueue = useCallback((presentUserIds?: Set<string>) => {
    if (!canModerate) return;
    const list = presentUserIds ? approved.filter(g => presentUserIds.has(g.user_id)) : approved;
    if (list.length === 0) { setLiveSpeaker(null); return; }
    const curIdx = liveSpeakerUserId ? list.findIndex(g => g.user_id === liveSpeakerUserId) : -1;
    const next = list[(curIdx + 1) % list.length];
    setLiveSpeaker(next.user_id);
  }, [canModerate, approved, liveSpeakerUserId, setLiveSpeaker]);

  const removeGuest = useCallback((userId: string) => {
    if (!canModerate) return;
    setApproved(prev => prev.filter(g => g.user_id !== userId));
    send('remove_guest', { user_id: userId });
    // Requirement: a participant leaving (here, host/mod-removed) while
    // they're the live speaker must auto-advance, not just leave the room
    // silently muted-forever with nobody able to talk.
    if (liveSpeakerUserId === userId) {
      const remaining = approved.filter(g => g.user_id !== userId);
      setLiveSpeaker(remaining[0]?.user_id ?? null);
    }
  }, [canModerate, send, approved, liveSpeakerUserId, setLiveSpeaker]);

  const toggleMute = useCallback((userId: string, muted: boolean) => {
    if (!canModerate) return;
    setApproved(prev => prev.map(g => g.user_id === userId ? { ...g, muted } : g));
    send('force_mute', { user_id: userId, muted });
  }, [canModerate, send]);

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
    liveSpeakerUserId, setLiveSpeaker, advanceQueue,
    spotlightRequests, setSpotlight, requestSpotlight, cancelSpotlightRequest, denySpotlight,
    playingVoiceNote, finishVoiceNote,
    myHandRaised: !!user && hands.some(h => h.user_id === user.id),
    iAmApproved: !!user && approved.some(g => g.user_id === user.id),
    iAmLiveSpeaker: !!user && liveSpeakerUserId === user.id,
    mySpotlightRequested: !!user && spotlightRequests.some(r => r.user_id === user.id),
    iAmSpotlighted: !!user && stage.spotlightUserId === user.id,
  };
}
