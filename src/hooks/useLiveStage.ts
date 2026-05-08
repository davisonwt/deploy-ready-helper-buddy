/**
 * useLiveStage — realtime "stage director" for any Go-Live surface.
 *
 * Manages the host-broadcast presentation mode (camera / image / whiteboard / video)
 * and the guest hand-raise queue, all over a single Supabase broadcast channel
 * `stage:${seedId}`. No DB tables — ephemeral for the duration of the live session.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type StageMode = 'camera' | 'image' | 'whiteboard' | 'video';

export interface NowPlaying {
  seed_id: string;
  title: string;
  sower_user_id?: string | null;
  media_url?: string | null;
  media_kind?: 'audio' | 'video' | null;
  image?: string | null;
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
}

export interface ApprovedGuest {
  user_id: string;
  name: string;
  avatar?: string | null;
  mode: 'voice' | 'video';
  muted?: boolean;
}

export function useLiveStage(seedId: string | null, opts: { isHost: boolean; enabled: boolean }) {
  const { user } = useAuth();
  const { isHost, enabled } = opts;

  const [stage, setStage] = useState<StagePayload>({ mode: 'camera', spotlightUserId: null, at: Date.now() });
  const [hands, setHands] = useState<HandRaise[]>([]);
  const [approved, setApproved] = useState<ApprovedGuest[]>([]);
  const [spotlightRequests, setSpotlightRequests] = useState<SpotlightRequest[]>([]);
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!enabled || !seedId) return;
    const ch = supabase.channel(`stage:${seedId}`, { config: { broadcast: { self: false } } });
    chRef.current = ch;

    ch.on('broadcast', { event: 'stage_mode' }, ({ payload }) => {
      setStage(payload as StagePayload);
    });
    ch.on('broadcast', { event: 'raise_hand' }, ({ payload }) => {
      const h = payload as HandRaise;
      setHands(prev => prev.find(x => x.user_id === h.user_id) ? prev : [...prev, h]);
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
    return () => { supabase.removeChannel(ch); chRef.current = null; };
  }, [seedId, enabled]);

  const send = useCallback((event: string, payload: any) => {
    chRef.current?.send({ type: 'broadcast', event, payload });
  }, []);

  const setStageMode = useCallback((p: Omit<StagePayload, 'at'>) => {
    if (!isHost) return;
    const full: StagePayload = { ...p, at: Date.now() };
    setStage(full);
    send('stage_mode', full);
  }, [isHost, send]);

  const raiseHand = useCallback((want: 'voice' | 'video') => {
    if (!user) return;
    const h: HandRaise = {
      user_id: user.id,
      name: (user as any)?.user_metadata?.display_name || user.email?.split('@')[0] || 'Guest',
      avatar: (user as any)?.user_metadata?.avatar_url || null,
      want,
      at: Date.now(),
    };
    send('raise_hand', h);
  }, [user, send]);

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
    myHandRaised: !!user && hands.some(h => h.user_id === user.id),
    iAmApproved: !!user && approved.some(g => g.user_id === user.id),
    mySpotlightRequested: !!user && spotlightRequests.some(r => r.user_id === user.id),
    iAmSpotlighted: !!user && stage.spotlightUserId === user.id,
  };
}
