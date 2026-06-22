import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Mic, Video as VideoIcon, Send, Phone, PhoneOff, Square, X } from 'lucide-react';
import { useLiveRoomMessages } from '@/hooks/useLiveRoomMessages';
import { useMediaRecorder } from '@/hooks/useMediaRecorder';
import { uploadLiveRoomMedia } from '@/lib/liveRoom/uploadMedia';
import JitsiRoom from '@/components/jitsi/JitsiRoom';

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
    let cancelled = false;
    supabase.from('live_room_participants' as any).select('user_id, display_name, role').eq('room_id', roomId).then(({ data }) => {
      if (!cancelled && data) setParticipants(data as any);
    });
    return () => { cancelled = true; };
  }, [roomId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const otherParticipant = useMemo(() => participants.find(p => p.user_id !== user?.id), [participants, user?.id]);
  const myName = useMemo(() => {
    const me = participants.find(p => p.user_id === user?.id);
    return me?.display_name || user?.email?.split('@')[0] || 'Me';
  }, [participants, user?.id, user?.email]);

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

  const renderMessage = (m: typeof messages[number]) => {
    const own = m.sender_id === user?.id;
    const align = own ? 'items-end ml-auto' : 'items-start mr-auto';
    const bubble = own ? 'bg-cyan-500/20 border-cyan-400/30' : 'bg-white/5 border-white/10';
    return (
      <div key={m.id} className={`flex flex-col ${align} max-w-[80%] gap-1`}>
        <div className={`rounded-2xl border px-4 py-2 ${bubble}`}>
          {m.message_type === 'text' && <p className="text-sm text-white whitespace-pre-wrap">{m.content}</p>}
          {m.message_type === 'voice' && <SignedMedia path={m.media_url!} kind="audio" />}
          {m.message_type === 'video' && <SignedMedia path={m.media_url!} kind="video" />}
        </div>
        <span className="text-[10px] text-slate-500">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#0a0f1a] text-white">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#0f172a]/80 px-4 py-3">
        <div className="flex flex-col">
          <span className="text-lg font-black">{roomName}</span>
          <span className="text-xs text-slate-400">with {otherParticipant?.display_name || 'guest'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setCall({ audioOnly: true })} className="gap-2 bg-emerald-500/20 border border-emerald-400/40 hover:bg-emerald-500/30"><Phone className="h-4 w-4" /> Audio call</Button>
          <Button size="sm" onClick={() => setCall({ audioOnly: false })} className="gap-2 bg-violet-500/20 border border-violet-400/40 hover:bg-violet-500/30"><VideoIcon className="h-4 w-4" /> Video call</Button>
          <Button size="sm" variant="ghost" onClick={onLeave} className="gap-2 text-rose-300 hover:text-rose-200"><PhoneOff className="h-4 w-4" /> Leave</Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && <p className="text-center text-sm text-slate-500 mt-8">No messages yet. Say hi.</p>}
        {messages.map(renderMessage)}
        <div ref={endRef} />
      </div>

      {recording && (
        <div className="border-t border-amber-400/30 bg-amber-500/10 px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-amber-200">● Recording {kind === 'audio' ? 'voice' : 'video'} — {elapsed}s</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={cancel} className="text-rose-300"><X className="h-4 w-4" /> Cancel</Button>
            <Button size="sm" onClick={stop} className="bg-amber-500/30 hover:bg-amber-500/50"><Square className="h-4 w-4 mr-1" /> Stop & send</Button>
          </div>
        </div>
      )}

      <footer className="flex items-center gap-2 border-t border-white/10 bg-[#0f172a]/80 px-4 py-3">
        <Button size="icon" variant="ghost" disabled={recording} onClick={() => handleRecord('voice')} title="Record voice note"><Mic className="h-5 w-5" /></Button>
        <Button size="icon" variant="ghost" disabled={recording} onClick={() => handleRecord('video')} title="Record video clip"><VideoIcon className="h-5 w-5" /></Button>
        <Input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); } }} placeholder="Write a message…" className="flex-1" disabled={recording} />
        <Button onClick={handleSendText} disabled={!text.trim() || recording} className="gap-2 bg-gradient-to-r from-cyan-500 to-violet-500"><Send className="h-4 w-4" /> Send</Button>
      </footer>
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
  if (!url) return <span className="text-xs text-slate-400">Loading…</span>;
  if (kind === 'audio') return <audio controls src={url} className="max-w-full" />;
  return <video controls src={url} className="max-w-[280px] rounded" />;
}
