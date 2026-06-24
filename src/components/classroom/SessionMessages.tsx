import { useEffect, useRef, useState } from 'react';
import { Mic, Send, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { LiveMessage, LiveParticipant } from '@/hooks/useClassroomLive';
import { useToast } from '@/hooks/use-toast';

interface Props {
  messages: LiveMessage[];
  participants: LiveParticipant[];
  userId: string;
  hostId: string;
  onSendText: (text: string) => void;
  onSendVoice: (blob: Blob, durationSec: number) => void;
}

export function SessionMessages({ messages, participants, userId, hostId, onSendText, onSendVoice }: Props) {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const nameOf = (uid: string | null) =>
    uid ? (participants.find((p) => p.user_id === uid)?.display_name ?? 'Sower') : 'System';

  const startRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        const duration = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        stream.getTracks().forEach((t) => t.stop());
        onSendVoice(blob, duration);
      };
      recRef.current = rec;
      startedAtRef.current = Date.now();
      rec.start();
      setRecording(true);
      setRecordSec(0);
      tickRef.current = window.setInterval(() => {
        setRecordSec((s) => {
          if (s + 1 >= 120) { stopRecord(); return 120; }
          return s + 1;
        });
      }, 1000);
    } catch (e: any) {
      toast({ title: 'Mic access denied', description: e?.message ?? 'Please allow microphone access.', variant: 'destructive' });
    }
  };

  const stopRecord = () => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop();
    recRef.current = null;
    setRecording(false);
  };

  const submitText = () => {
    if (!text.trim()) return;
    onSendText(text);
    setText('');
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {messages.length === 0 && (
          <p className="text-[12px] italic text-[#E8D9B5]/40 text-center py-4">No messages yet. Say hi 🌱</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === userId;
          const isHostMsg = m.sender_id === hostId;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-1.5 ${
                mine ? 'bg-[#8B5CF6] text-white' : isHostMsg ? 'bg-[#F0B23F]/15 border border-[#F0B23F]/30 text-[#E8D9B5]' : 'bg-[#14101F] border border-[#8B5CF6]/25 text-[#E8D9B5]'
              }`}>
                {!mine && <p className="text-[10px] font-bold opacity-70 mb-0.5">{nameOf(m.sender_id)}{isHostMsg ? ' • Instructor' : ''}</p>}
                {m.message_type === 'voice' && m.metadata?.url ? (
                  <div className="flex items-center gap-2">
                    <audio controls src={m.metadata.url} className="h-8 max-w-[200px]" />
                    {m.metadata.duration_sec && <span className="text-[10px] opacity-70">{m.metadata.duration_sec}s</span>}
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-[#8B5CF6]/20 p-2 flex items-center gap-2">
        {recording ? (
          <>
            <span className="text-xs text-rose-300 tabular-nums flex-1">● Recording {recordSec}s / 120s</span>
            <Button size="icon" onClick={stopRecord} className="bg-rose-500 hover:bg-rose-400 text-white h-9 w-9">
              <Square className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitText(); } }}
              placeholder="Type a message…"
              className="flex-1 bg-[#14101F] border-[#8B5CF6]/30 text-[#E8D9B5] h-9"
            />
            <Button size="icon" variant="ghost" onClick={startRecord} className="h-9 w-9 text-[#E8D9B5] hover:bg-[#8B5CF6]/15" title="Record voice message">
              <Mic className="h-4 w-4" />
            </Button>
            <Button size="icon" onClick={submitText} disabled={!text.trim()} className="bg-[#8B5CF6] hover:bg-[#7C4FE0] text-white h-9 w-9">
              <Send className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
