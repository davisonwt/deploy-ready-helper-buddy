import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Mic, Video as VideoIcon, Send, Phone, ChevronLeft, Square, X } from 'lucide-react';
import { useLiveRoomMessages } from '@/hooks/useLiveRoomMessages';
import { useMediaRecorder } from '@/hooks/useMediaRecorder';
import { uploadLiveRoomMedia } from '@/lib/liveRoom/uploadMedia';
import JitsiRoom from '@/components/jitsi/JitsiRoom';
import { PresenceAura, classifyAura } from './PresenceAura';

const VOICE_MAX_SECONDS = 60;
const VIDEO_MAX_SECONDS = 30;

type Participant = { user_id: string; display_name: string | null; role: string };

export default function OneOnOneRoom({ roomId, roomName, onLeave }: { roomId: string; roomName: string; onLeave: () => void }) {
  const { user } = useAuth();
  const { messages, sendText, sendMedia } = useLiveRoomMessages(roomId);
  const { recording, kind, elapsed, start, stop, cancel } = useMediaRecorder();
  const [text, setText] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [call, setCall] = useState<null | { audioOnly: boolean }>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      // Make sure the current user is registered as a participant so RLS allows
      // reading/sending messages even for rooms whose seed insert was interrupted.
      const { data: room } = await supabase
        .from('live_rooms')
        .select('created_by')
        .eq('id', roomId)
        .maybeSingle();
      const role = room?.created_by === user.id ? 'host' : 'audience';
      await supabase
        .from('live_room_participants' as any)
        .upsert(
          {
            room_id: roomId,
            user_id: user.id,
            role,
            display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Me',
          },
          { onConflict: 'room_id,user_id', ignoreDuplicates: true } as any,
        );
      const { data } = await supabase
        .from('live_room_participants' as any)
        .select('user_id, display_name, role')
        .eq('room_id', roomId);
      if (!cancelled && data) setParticipants(data as any);
    })();
    return () => { cancelled = true; };
  }, [roomId, user?.id]);

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
      if (!blob) return;
      const ext = k === 'voice' ? 'webm' : 'webm';
      const { path, signedUrl } = await uploadLiveRoomMedia(roomId, blob, ext);
      await sendMedia(user.id, k, path, blob.type, elapsed || 0);
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

  if (call) {
    return (
      <JitsiRoom
        roomName={`s2g-1v1-${roomId}`}
        displayName={myName}
        audioOnly={call.audioOnly}
        onLeave={() => setCall(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#0B1420] text-[#EAF4F2]">
      <div className="mx-auto w-full max-w-[640px] flex-1 flex flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-[#1FB6A8]/10 px-2 sm:px-4 py-5">
          <div className="flex items-center gap-4 min-w-0">
            <PresenceAura state={auraState} size={56}>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold border border-[#1FB6A8]/30"
                style={{ background: 'linear-gradient(135deg, #123330 0%, #0B1420 100%)', color: '#EAF4F2' }}
                aria-label={otherName}
              >
                {otherInitial}
              </div>
            </PresenceAura>
            <div className="flex flex-col min-w-0">
              <span
                className="text-[26px] leading-tight tracking-tight truncate"
                style={{ fontFamily: '"Fraunces", "Playfair Display", serif', fontWeight: 500 }}
              >
                {otherName}
              </span>
              <span className="text-xs text-[#7E9498] truncate">
                {auraState === 'active' ? 'here now' : auraState === 'recent' ? 'recently here' : 'away'}
                {roomName ? ` · ${roomName}` : ''}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button size="sm" onClick={() => setCall({ audioOnly: true })}
              className="gap-2 bg-transparent border border-[#1FB6A8]/40 text-[#EAF4F2] hover:bg-[#1FB6A8]/10 hover:text-[#EAF4F2]">
              <Phone className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={() => setCall({ audioOnly: false })}
              className="gap-2 bg-transparent border border-[#1FB6A8]/40 text-[#EAF4F2] hover:bg-[#1FB6A8]/10 hover:text-[#EAF4F2]">
              <VideoIcon className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onLeave}
              className="gap-2 text-[#7E9498] hover:text-[#FF8A5B] hover:bg-transparent">
              <PhoneOff className="h-4 w-4" />
            </Button>
          </div>
        </header>

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
          <div className="border-t border-[#FF8A5B]/30 bg-[#FF8A5B]/10 px-4 py-2 flex items-center justify-between">
            <span className="text-sm text-[#FF8A5B] tabular-nums">● Recording {kind === 'audio' ? 'voice' : 'video'} — {elapsed}s</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={cancel} className="text-[#7E9498] hover:text-[#FF8A5B] hover:bg-transparent"><X className="h-4 w-4" /> Cancel</Button>
              <Button size="sm" onClick={stop} className="bg-[#FF8A5B]/20 hover:bg-[#FF8A5B]/30 text-[#FF8A5B] border border-[#FF8A5B]/40"><Square className="h-4 w-4 mr-1" /> Stop & send</Button>
            </div>
          </div>
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
            onClick={handleSendText}
            disabled={!text.trim() || recording}
            className="gap-2 bg-[#1FB6A8] text-[#0B1420] hover:bg-[#1FB6A8]/90 disabled:opacity-40"
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
