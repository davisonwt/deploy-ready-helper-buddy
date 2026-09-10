import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Mic, Video as VideoIcon, Send, Phone, ChevronLeft, PhoneOff } from 'lucide-react';
import { useLiveRoomMessages } from '@/hooks/useLiveRoomMessages';
import { useMediaRecorder } from '@/hooks/useMediaRecorder';
import { RecordingBanner } from '@/components/media/RecordingBanner';
import { CallErrorBoundary } from '@/components/media/CallErrorBoundary';
import { DockedCallPane } from '@/components/media/DockedCallPane';
import { uploadLiveRoomMedia } from '@/lib/liveRoom/uploadMedia';
import JitsiRoom from '@/components/jitsi/JitsiRoom';
import { PresenceAura, classifyAura } from './PresenceAura';
import { startSimpleRingtone } from '@/lib/ringtone';
import { logCallEvent } from '@/lib/daily-config';

const VOICE_MAX_SECONDS = 60;
const VIDEO_MAX_SECONDS = 30;

type Participant = { user_id: string; display_name: string | null; role: string };

export default function OneOnOneRoom({ roomId, roomName, onLeave }: { roomId: string; roomName: string; onLeave: () => void }) {
  const { user } = useAuth();
  const { messages, sendText, sendMedia } = useLiveRoomMessages(roomId);
  const { recording, kind, elapsed, stream, mimeType, error: recorderError, start, stop, cancel } = useMediaRecorder();
  const [text, setText] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [call, setCall] = useState<null | { audioOnly: boolean }>(null);
  // Neither the Voice/Video call buttons nor the Daily room itself ever
  // signalled the other participant before -- clicking either just set
  // local `call` state, so the other side only ever joined the SAME
  // deterministic s2g-1v1-<roomId> Daily room if they happened to also
  // click their own call button, with no ring and no guarantee they'd do
  // it around the same time. This broadcasts the invite on a channel both
  // sides subscribe to while the room is open, and the callee gets a real
  // ring + Answer/Decline instead of needing to notice and click on their own.
  const [incomingCallInvite, setIncomingCallInvite] = useState<null | { from: string; audioOnly: boolean }>(null);
  // Same three-state signal (see useCallManager.jsx) -- exposed so the
  // call-invite UI can show whether the broadcast channel is actually up
  // or we're relying on the poll fallback below.
  const [signalStatus, setSignalStatus] = useState<'connecting' | 'ws' | 'polling'>('connecting');
  const callChannelRef = useRef<RealtimeChannel | null>(null);
  const ringRef = useRef<{ stop: () => void } | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  // handleRecord is one continuous async closure spanning the whole
  // recording, so its own `elapsed` param is frozen at 0 (its value when
  // the recording started) -- a ref tracks the live value so the final
  // send has the real duration instead of always storing 0.
  const elapsedRef = useRef(0);
  useEffect(() => { elapsedRef.current = elapsed; }, [elapsed]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      // Use a SECURITY DEFINER RPC so the join always runs under the real
      // authenticated user (auth.uid()), even if the cached client user is
      // stale — otherwise the participant insert fails RLS silently and
      // every subsequent message send is blocked.
      const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Me';
      const { error: joinErr } = await supabase.rpc('join_live_room_as_self' as any, {
        p_room_id: roomId,
        p_display_name: displayName,
      });
      if (joinErr) {
        toast.error(joinErr.message || 'Could not join this room.');
        return;
      }
      const { data } = await supabase
        .from('live_room_participants' as any)
        .select('user_id, display_name, role')
        .eq('room_id', roomId);
      if (!cancelled && data) setParticipants(data as any);
    })();
    return () => { cancelled = true; };
  }, [roomId, user?.id, user?.email, user?.user_metadata]);

  // Call-invite signaling: both participants subscribe to the same
  // broadcast channel while the room is open. Whoever clicks Voice/Video
  // call sends 'call-invite'; the other side rings and can Answer/Decline
  // instead of needing to separately notice and click their own call
  // button (which is what silently put them in different Daily rooms --
  // there was never anything guaranteeing they'd do it together).
  //
  // Instrumented the same way as useCallManager.jsx's call_sessions flow:
  // subscribe-status tracking + reconnect-with-fresh-token on
  // CHANNEL_ERROR/TIMED_OUT/CLOSED, and every hop logged to call_events
  // (room_name = this live room's id, so invite_sent with no matching
  // invite_seen from the other user is visible in a CSV export the same
  // way it is for the call_sessions flow).
  useEffect(() => {
    if (!roomId || !user?.id) return;
    let cancelled = false;
    let reconnectTimer: number | null = null;

    const setupChannel = () => {
      const channel = supabase
        .channel(`live-room-call-${roomId}`)
        .on('broadcast', { event: 'call-invite' }, (payload) => {
          const from = payload.payload?.from;
          const audioOnly = !!payload.payload?.audioOnly;
          if (!from || from === user.id) return;
          setIncomingCallInvite({ from, audioOnly });
          void logCallEvent(roomId, 'invite_seen');
          ringRef.current?.stop();
          ringRef.current = startSimpleRingtone();
        })
        .on('broadcast', { event: 'call-cancel' }, (payload) => {
          const from = payload.payload?.from;
          if (!from || from === user.id) return;
          setIncomingCallInvite(null);
          ringRef.current?.stop();
          ringRef.current = null;
        })
        .subscribe((status) => {
          console.log('📡 [ONEONONE][SIGNAL] call-invite channel status:', status, 'roomId:', roomId);
          if (status === 'SUBSCRIBED') {
            setSignalStatus('ws');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.error('📡 [ONEONONE][SIGNAL] ❌ call-invite channel unhealthy:', status, '-- falling back to polling and attempting reconnect');
            setSignalStatus('polling');
            supabase.auth.refreshSession().catch((e) => {
              console.warn('📡 [ONEONONE][SIGNAL] Session refresh before reconnect failed (continuing anyway):', e);
            }).finally(() => {
              reconnectTimer = window.setTimeout(() => {
                if (cancelled) return;
                try { supabase.removeChannel(channel); } catch { /* already gone */ }
                if (callChannelRef.current === channel) callChannelRef.current = null;
                setupChannel();
              }, 2000);
            });
          }
        });
      callChannelRef.current = channel;
      return channel;
    };

    const channel = setupChannel();

    return () => {
      cancelled = true;
      if (reconnectTimer != null) clearTimeout(reconnectTimer);
      ringRef.current?.stop();
      ringRef.current = null;
      supabase.removeChannel(channel);
      if (callChannelRef.current === channel) callChannelRef.current = null;
    };
  }, [roomId, user?.id]);

  // Poll fallback for a missed 'call-invite' broadcast -- this channel has
  // no call_sessions-style DB row of its own to poll, so it polls
  // call_events instead (see 20260910180000_call_events_room_participant_select.sql
  // for the RLS letting the other participant see it). Every 3s
  // regardless of signalStatus, plus an immediate check on
  // visibilitychange -- iOS Safari suspends both timers and the socket
  // while backgrounded/locked, same rationale as useCallManager.jsx.
  useEffect(() => {
    if (!roomId || !user?.id) return;
    if (call || incomingCallInvite) return;

    const checkForMissedInvite = async () => {
      try {
        const sinceIso = new Date(Date.now() - 30000).toISOString();
        const { data, error } = await supabase
          .from('call_events' as any)
          .select('user_id, created_at')
          .eq('room_name', roomId)
          .eq('event_type', 'invite_sent')
          .neq('user_id', user.id)
          .gt('created_at', sinceIso)
          .order('created_at', { ascending: false })
          .limit(1);
        if (error || !data?.length) return;
        // call_events doesn't carry audioOnly -- default to video, the
        // more common case; if the broadcast does still arrive it
        // overwrites this with the real value.
        setIncomingCallInvite((prev) => prev ?? { from: (data[0] as any).user_id, audioOnly: false });
        ringRef.current?.stop();
        ringRef.current = startSimpleRingtone();
      } catch (e) {
        console.error('⚠️ [ONEONONE][POLL] call-invite poll error:', e);
      }
    };

    const poll = setInterval(checkForMissedInvite, 3000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkForMissedInvite();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [roomId, user?.id, call, incomingCallInvite]);

  const sendCallInvite = (audioOnly: boolean) => {
    callChannelRef.current?.send({ type: 'broadcast', event: 'call-invite', payload: { from: user?.id, audioOnly } });
    void logCallEvent(roomId, 'invite_sent');
    setCall({ audioOnly });
  };

  const answerCallInvite = () => {
    if (!incomingCallInvite) return;
    ringRef.current?.stop();
    ringRef.current = null;
    void logCallEvent(roomId, 'answered_sent');
    setCall({ audioOnly: incomingCallInvite.audioOnly });
    setIncomingCallInvite(null);
  };

  const declineCallInvite = () => {
    if (!incomingCallInvite) return;
    ringRef.current?.stop();
    ringRef.current = null;
    callChannelRef.current?.send({ type: 'broadcast', event: 'call-cancel', payload: { from: user?.id } });
    setIncomingCallInvite(null);
  };

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const otherParticipant = useMemo(() => participants.find(p => p.user_id !== user?.id), [participants, user?.id]);
  const myName = useMemo(() => {
    const me = participants.find(p => p.user_id === user?.id);
    return me?.display_name || user?.email?.split('@')[0] || 'Me';
  }, [participants, user?.id, user?.email]);

  // Honest presence signal: most recent message sent by the other participant.
  // No real presence/typing channel exists in this code path yet.
  const otherLastSignalAt = useMemo(() => {
    if (!otherParticipant) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender_id === otherParticipant.user_id) return messages[i].created_at;
    }
    return null;
  }, [messages, otherParticipant]);
  const auraState = useMemo(() => classifyAura(otherLastSignalAt), [otherLastSignalAt]);

  const handleSendText = async () => {
    if (!user || !text.trim()) return;
    try { await sendText(user.id, text); setText(''); }
    catch (e: any) { toast.error(e?.message || 'Failed to send'); }
  };

  const handleRecord = async (k: 'voice' | 'video') => {
    if (!user) return;
    if (recording) { stop(); return; }
    try {
      const blob = await start(k === 'voice' ? 'audio' : 'video', k === 'voice' ? VOICE_MAX_SECONDS : VIDEO_MAX_SECONDS);
      if (!blob || blob.size === 0) {
        if (blob) toast.error('Nothing was captured — please try again.');
        return;
      }
      // Derived from the blob's own type rather than hardcoded -- iOS
      // Safari's MediaRecorder produces video/mp4, not video/webm (see
      // src/hooks/useMediaRecorder.ts's mimeType fallback chain).
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const { path, signedUrl } = await uploadLiveRoomMedia(roomId, blob, ext);
      await sendMedia(user.id, k, path, blob.type, elapsedRef.current);
      void signedUrl;
    } catch (e: any) {
      toast.error(e?.message || `Could not send ${k} clip`);
    }
  };

  const otherName = otherParticipant?.display_name || 'guest';
  const otherInitial = (otherName[0] || 'G').toUpperCase();

  const renderMessage = (m: typeof messages[number]) => {
    const own = m.sender_id === user?.id;
    const align = own ? 'items-end ml-auto' : 'items-start mr-auto';
    const bubble = own
      ? 'bg-[#1FB6A8]/15 border-[#1FB6A8]/40 text-[#EAF4F2]'
      : 'bg-[#123330] border-[#1FB6A8]/15 text-[#EAF4F2]';
    return (
      <div key={m.id} className={`flex flex-col ${align} max-w-[78%] gap-1 animate-fade-in`}>
        <div className={`rounded-2xl border px-4 py-2.5 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset] ${bubble}`}>
          {m.message_type === 'text' && <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{m.content}</p>}
          {m.message_type === 'voice' && <SignedMedia path={m.media_url!} kind="audio" />}
          {m.message_type === 'video' && <SignedMedia path={m.media_url!} kind="video" />}
        </div>
        <span className="text-[10px] tabular-nums text-[#7E9498] px-1">
          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#0B1420] text-[#EAF4F2]">
      <div className="mx-auto w-full max-w-[640px] flex-1 flex flex-col min-h-0">
        {/* Sticky so Voice/Video call buttons stay reachable while the
            message list scrolls underneath. */}
        <header className="sticky top-0 z-20 flex items-center gap-2 sm:gap-3 border-b border-[#1FB6A8]/10 bg-[#0B1420] px-2 sm:px-4 py-3">
          <Button
            size="icon"
            variant="ghost"
            onClick={onLeave}
            aria-label="Back"
            className="shrink-0 text-[#7E9498] hover:text-[#EAF4F2] hover:bg-[#1FB6A8]/10"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <PresenceAura state={auraState} size={44}>
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-base font-semibold border border-[#1FB6A8]/30 shrink-0"
              style={{ background: 'linear-gradient(135deg, #123330 0%, #0B1420 100%)', color: '#EAF4F2' }}
              aria-label={otherName}
            >
              {otherInitial}
            </div>
          </PresenceAura>

          <div className="flex flex-col min-w-0 flex-1">
            <span
              className="text-lg leading-tight tracking-tight truncate"
              style={{ fontFamily: '"Fraunces", "Playfair Display", serif', fontWeight: 500 }}
            >
              {otherName}
            </span>
            <span className="text-xs text-[#7E9498] truncate">
              {auraState === 'active' ? 'here now' : auraState === 'recent' ? 'recently here' : 'away'}
              {roomName ? ` · ${roomName}` : ''}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* signal: whether the call-invite channel is actually up, or
                we're relying on the 3s poll fallback. */}
            <span className="hidden sm:flex items-center gap-1 text-[10px] text-[#7E9498]" title={`signal: ${signalStatus === 'ws' ? 'ws ok' : signalStatus === 'polling' ? 'polling' : 'connecting'}`}>
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${signalStatus === 'ws' ? 'bg-green-500' : signalStatus === 'polling' ? 'bg-amber-500' : 'bg-gray-500'}`} />
            </span>
            <Button size="icon" disabled={!!call} onClick={() => sendCallInvite(true)} aria-label="Voice call"
              className="bg-transparent border border-[#1FB6A8]/40 text-[#EAF4F2] hover:bg-[#1FB6A8]/10 hover:text-[#EAF4F2]">
              <Phone className="h-4 w-4" />
            </Button>
            <Button size="icon" disabled={!!call} onClick={() => sendCallInvite(false)} aria-label="Video call"
              className="bg-transparent border border-[#1FB6A8]/40 text-[#EAF4F2] hover:bg-[#1FB6A8]/10 hover:text-[#EAF4F2]">
              <VideoIcon className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Docked call pane -- doesn't take over the screen. Messages,
            the text input, and voice/video note buttons below stay
            usable for the whole call; tap the corner button to expand
            to fullscreen and back. */}
        {call && (
          <DockedCallPane>
            <CallErrorBoundary onBack={() => setCall(null)}>
              <JitsiRoom
                roomName={`s2g-1v1-${roomId}`}
                displayName={myName}
                audioOnly={call.audioOnly}
                fullscreen={false}
                onLeave={() => setCall(null)}
              />
            </CallErrorBoundary>
          </DockedCallPane>
        )}

        {incomingCallInvite && (
          <div className="border-b border-[#1FB6A8]/30 bg-[#1FB6A8]/10 px-4 py-2.5 flex items-center justify-between gap-3">
            <span className="text-sm text-[#1FB6A8]">
              {otherName} is calling — {incomingCallInvite.audioOnly ? 'Voice' : 'Video'}
            </span>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="ghost" onClick={declineCallInvite} className="text-[#7E9498] hover:text-[#FF8A5B] hover:bg-transparent">
                <PhoneOff className="h-4 w-4" /> Decline
              </Button>
              <Button size="sm" onClick={answerCallInvite} className="bg-[#1FB6A8]/20 hover:bg-[#1FB6A8]/30 text-[#1FB6A8] border border-[#1FB6A8]/40">
                <Phone className="h-4 w-4 mr-1" /> Answer
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-6 space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-sm text-[#7E9498] mt-12" style={{ fontFamily: '"Fraunces", serif', fontStyle: 'italic' }}>
              The room is quiet. Say hello.
            </p>
          )}
          {messages.map(renderMessage)}
          <div ref={endRef} />
        </div>

        {recording && (
          <RecordingBanner
            kind={kind}
            elapsed={elapsed}
            stream={stream}
            mimeType={mimeType}
            error={recorderError}
            onCancel={cancel}
            onStop={stop}
          />
        )}

        <footer className="flex items-center gap-2 border-t border-[#1FB6A8]/10 px-2 sm:px-4 py-4">
          <Button size="icon" variant="ghost" disabled={recording} onClick={() => handleRecord('voice')}
            title="Record voice note" className="text-[#7E9498] hover:text-[#1FB6A8] hover:bg-transparent">
            <Mic className="h-5 w-5" />
          </Button>
          <Button size="icon" variant="ghost" disabled={recording} onClick={() => handleRecord('video')}
            title="Record video clip" className="text-[#7E9498] hover:text-[#1FB6A8] hover:bg-transparent">
            <VideoIcon className="h-5 w-5" />
          </Button>
          <Input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
            placeholder="Write a message…"
            className="flex-1 bg-[#123330]/60 border-[#1FB6A8]/20 text-[#EAF4F2] placeholder:text-[#7E9498] focus-visible:ring-[#1FB6A8]/40 focus-visible:border-[#1FB6A8]/50"
            disabled={recording}
          />
          <Button
            size="icon"
            onClick={handleSendText}
            disabled={!text.trim() || recording}
            aria-label="Send"
            className="shrink-0 bg-[#1FB6A8] text-[#0B1420] hover:bg-[#1FB6A8]/90 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </Button>
        </footer>
      </div>
    </div>
  );
}

function SignedMedia({ path, kind }: { path: string; kind: 'audio' | 'video' }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase.storage.from('chat-media').createSignedUrl(path, 60 * 5).then(({ data }) => {
      if (!cancelled && data?.signedUrl) setUrl(data.signedUrl);
    });
    return () => { cancelled = true; };
  }, [path]);
  if (!url) return <span className="text-xs text-[#7E9498]">Loading…</span>;
  if (kind === 'audio') return <audio controls src={url} className="max-w-full" />;
  return <video controls src={url} className="max-w-[280px] rounded" />;
}
