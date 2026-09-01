import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Send, Mic, Video, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { detectContactInfo, CONTACT_BLOCKED_MESSAGE } from '@/lib/wanderingHearts/contactDetection';
import { uploadWanderingHeartsNote } from '@/lib/wanderingHearts/media';
import ReportButton from '@/components/moderation/ReportButton';

interface ChatMessage {
  id: string;
  sender_id: string | null;
  content: string | null;
  message_type: string;
  file_url: string | null;
  created_at: string;
}

interface Props {
  roomId: string;
  partnerName: string;
  onBack: () => void;
}

const VOICE_MAX_SEC = 60;
const VIDEO_MAX_SEC = 30;

/**
 * Wandering Hearts 1:1 chat, deliberately separate from the general-purpose
 * ChatRoom.tsx used elsewhere -- that component wires in calling, which
 * this phase explicitly does not touch. Every send (text or recording)
 * goes through the send_wandering_hearts_message RPC, never a direct
 * chat_messages insert -- that RPC (backstopped by a DB trigger) is what
 * actually enforces the contact-detail block; detectContactInfo() below is
 * only for instant client-side feedback before that round trip.
 */
export const WanderingHeartsChat: React.FC<Props> = ({ roomId, partnerName, onBack }) => {
  const { user } = useAuth() as any;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [recordingKind, setRecordingKind] = useState<'voice' | 'video' | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [hiddenMessageIds, setHiddenMessageIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('chat_messages')
      .select('id, sender_id, content, message_type, file_url, created_at')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
    setMessages((data ?? []) as any);

    // A report citing sexual content involving a minor hides that specific
    // message immediately, pending gosat review -- everything else stays
    // visible until a gosat acts (per wh-moderation.txt point 3).
    const ids = (data ?? []).map((m: any) => m.id);
    if (ids.length > 0) {
      const { data: reports } = await supabase
        .from('content_reports')
        .select('target_id')
        .eq('target_type', 'chat_message')
        .eq('status', 'pending')
        .eq('reason', 'minor_sexual_content')
        .in('target_id', ids);
      setHiddenMessageIds(new Set((reports ?? []).map((r: any) => r.target_id)));
    } else {
      setHiddenMessageIds(new Set());
    }
    setLoading(false);
  }, [roomId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`wh-room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendText = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    if (detectContactInfo(trimmed)) {
      toast({ title: 'Kept private', description: CONTACT_BLOCKED_MESSAGE, variant: 'destructive' as any });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.rpc('send_wandering_hearts_message' as any, {
        _room_id: roomId,
        _content: trimmed,
        _message_type: 'text',
      });
      if (error) throw error;
      const res = data as any;
      if (!res?.ok) {
        toast({
          title: res?.code === 'contact_info_blocked' ? 'Kept private' : 'Could not send',
          description: res?.code === 'contact_info_blocked' ? CONTACT_BLOCKED_MESSAGE : 'Please try again.',
          variant: 'destructive' as any,
        });
        return;
      }
      setText('');
    } catch (e: any) {
      console.error('WH send error', e);
      toast({ title: 'Could not send', description: e.message || 'Please try again.', variant: 'destructive' as any });
    } finally {
      setSending(false);
    }
  };

  const startRecording = async (kind: 'voice' | 'video') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        kind === 'voice' ? { audio: true } : { audio: true, video: true },
      );
      if (kind === 'video' && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: kind === 'voice' ? 'audio/webm' : 'video/webm' });
        await sendRecording(kind, blob);
      };
      rec.start();
      recRef.current = rec;
      setRecordingKind(kind);
      const maxMs = (kind === 'voice' ? VOICE_MAX_SEC : VIDEO_MAX_SEC) * 1000;
      setTimeout(() => {
        if (recRef.current?.state === 'recording') recRef.current.stop();
      }, maxMs);
    } catch (e) {
      console.warn('media permission denied', e);
      toast({ title: 'Camera/mic blocked', description: 'Please allow access to record.', variant: 'destructive' as any });
    }
  };

  const stopRecording = () => {
    recRef.current?.stop();
  };

  const sendRecording = async (kind: 'voice' | 'video', blob: Blob) => {
    if (!user?.id) return;
    setSending(true);
    try {
      const url = await uploadWanderingHeartsNote(user.id, blob, kind);
      const { data, error } = await supabase.rpc('send_wandering_hearts_message' as any, {
        _room_id: roomId,
        _content: null,
        _message_type: kind === 'voice' ? 'voice_note' : 'video_note',
        _file_url: url,
      });
      if (error) throw error;
      const res = data as any;
      if (!res?.ok) {
        toast({ title: 'Could not send', description: 'Please try again.', variant: 'destructive' as any });
      }
    } catch (e: any) {
      console.error('WH recording send error', e);
      toast({ title: 'Could not send recording', description: e.message || 'Please try again.', variant: 'destructive' as any });
    } finally {
      setSending(false);
      setRecordingKind(null);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(ellipse at top, hsl(20 30% 12%) 0%, hsl(20 35% 7%) 60%, hsl(0 0% 4%) 100%)' }}
    >
      <header className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: 'hsl(25 30% 20%)' }}>
        <button onClick={onBack} className="p-2 -ml-2" style={{ color: 'hsl(38 50% 75%)' }} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-serif italic" style={{ color: 'hsl(38 95% 85%)' }}>{partnerName}</h1>
          <p className="text-[11px]" style={{ color: 'hsl(38 30% 60%)' }}>All communication stays inside Wandering Hearts.</p>
        </div>
        <ReportButton
          targetType="wandering_hearts_room"
          targetId={roomId}
          size="sm"
          variant="ghost"
          className="text-[hsl(38,50%,75%)] hover:text-[hsl(38,95%,85%)]"
        />
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="text-center text-sm py-8" style={{ color: 'hsl(38 30% 60%)' }}>Loading…</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm py-8 italic" style={{ color: 'hsl(38 30% 60%)' }}>
            Say hello — this is the start of your conversation.
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === user?.id;
            if (hiddenMessageIds.has(m.id) && !mine) {
              return (
                <div key={m.id} className="flex justify-start">
                  <div
                    className="max-w-[75%] rounded-2xl px-4 py-2.5 text-xs italic"
                    style={{ background: 'hsl(20 25% 14%)', color: 'hsl(38 30% 55%)', border: '1px solid hsl(25 30% 22%)' }}
                  >
                    This message is hidden pending review.
                  </div>
                </div>
              );
            }
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm"
                  style={{
                    background: mine
                      ? 'linear-gradient(135deg, hsl(15 70% 30%), hsl(25 70% 35%))'
                      : 'hsl(20 25% 14%)',
                    color: 'hsl(38 90% 90%)',
                    border: mine ? 'none' : '1px solid hsl(25 30% 22%)',
                  }}
                >
                  {m.message_type === 'voice_note' && m.file_url ? (
                    <audio controls src={m.file_url} className="max-w-full" />
                  ) : m.message_type === 'video_note' && m.file_url ? (
                    <video controls src={m.file_url} className="max-w-full rounded-lg" style={{ maxHeight: 220 }} />
                  ) : (
                    <span>{m.content}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </main>

      {recordingKind === 'video' && (
        <div className="px-4 pb-2">
          <video
            ref={videoPreviewRef}
            autoPlay
            muted
            playsInline
            className="w-full max-h-40 rounded-xl object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        </div>
      )}

      <div className="p-4 border-t space-y-2" style={{ borderColor: 'hsl(25 30% 20%)' }}>
        {recordingKind ? (
          <button
            onClick={stopRecording}
            className="w-full py-3 rounded-2xl font-medium flex items-center justify-center gap-2 animate-pulse"
            style={{ background: 'hsl(15 70% 35%)', color: 'hsl(38 95% 88%)' }}
          >
            <Square size={16} fill="currentColor" />
            Recording {recordingKind}… tap to stop
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendText(); }}
              placeholder="Type a message…"
              className="flex-1 rounded-full px-4 py-3 text-sm outline-none"
              style={{ background: 'hsl(20 25% 10%)', border: '1px solid hsl(25 30% 22%)', color: 'hsl(38 90% 88%)' }}
            />
            <button
              onClick={() => startRecording('voice')}
              disabled={sending}
              className="p-3 rounded-full disabled:opacity-40"
              style={{ background: 'hsl(20 25% 14%)', color: 'hsl(38 50% 75%)' }}
              aria-label="Record voice note"
            >
              <Mic size={18} />
            </button>
            <button
              onClick={() => startRecording('video')}
              disabled={sending}
              className="p-3 rounded-full disabled:opacity-40"
              style={{ background: 'hsl(20 25% 14%)', color: 'hsl(38 50% 75%)' }}
              aria-label="Record video note"
            >
              <Video size={18} />
            </button>
            <button
              onClick={sendText}
              disabled={sending || !text.trim()}
              className="p-3 rounded-full disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, hsl(15 85% 55%), hsl(25 95% 60%))', color: 'hsl(20 30% 12%)' }}
              aria-label="Send"
            >
              <Send size={18} />
            </button>
          </div>
        )}
        <p className="text-[11px] text-center" style={{ color: 'hsl(38 25% 50%)' }}>
          Voice notes up to {VOICE_MAX_SEC}s, video notes up to {VIDEO_MAX_SEC}s.
        </p>
      </div>
    </div>
  );
};
