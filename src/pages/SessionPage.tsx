import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Calendar, ChevronDown, Loader2, Users, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type SessionKind = 'classroom' | 'skilldrop';

interface SessionPageProps {
  kind: SessionKind;
}

interface LessonMessage {
  id: string;
  content: string | null;
  created_at: string;
  sender_id: string | null;
}

function LessonRail({ roomId, instructorId }: { roomId: string; instructorId: string | null }) {
  const [messages, setMessages] = useState<LessonMessage[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('id, content, created_at, sender_id')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });
      if (!cancelled && data) setMessages(data as any);
    })();

    const channel = supabase
      .channel(`lesson-rail-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const m = payload.new as any;
          setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, {
            id: m.id, content: m.content, created_at: m.created_at, sender_id: m.sender_id,
          }]));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const lessonPoints = useMemo(() => {
    if (!instructorId) return [];
    return messages
      .filter((m) => m.sender_id === instructorId && m.content && m.content.trim().length > 0)
      .map((m, i) => ({
        n: i + 1,
        id: m.id,
        label: (m.content || '').trim().slice(0, 40) + ((m.content || '').trim().length > 40 ? '…' : ''),
        time: new Date(m.created_at),
      }));
  }, [messages, instructorId]);

  const inner = (
    <div className="px-4 py-5">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="h-4 w-4 text-[#8B5CF6]" />
        <h2 className="font-spectral text-[#E8D9B5] text-lg tracking-wide">Lesson Outline</h2>
      </div>
      {lessonPoints.length === 0 ? (
        <p className="text-xs text-[#E8D9B5]/50 italic">
          Lesson points will appear here as the instructor speaks.
        </p>
      ) : (
        <ol className="space-y-3">
          {lessonPoints.map((p) => (
            <li key={p.id} className="flex gap-3 group">
              <span
                className="font-spectral text-[#8B5CF6] text-lg leading-none tabular-nums shrink-0 w-6 text-right"
                aria-hidden
              >
                {p.n}.
              </span>
              <div className="min-w-0">
                <p className="text-[13px] text-[#E8D9B5] leading-snug group-hover:text-white transition-colors">
                  {p.label}
                </p>
                <p className="text-[10px] text-[#E8D9B5]/40 mt-0.5 tabular-nums">
                  {p.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop: full rail content */}
      <div className="hidden lg:block">{inner}</div>
      {/* Mobile: collapsible */}
      <div className="lg:hidden">
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#8B5CF6]" />
              <span className="font-spectral text-[#E8D9B5]">
                Lesson Outline {lessonPoints.length > 0 && `(${lessonPoints.length})`}
              </span>
            </div>
            <ChevronDown className={`h-4 w-4 text-[#E8D9B5]/60 transition-transform ${open ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>{inner}</CollapsibleContent>
        </Collapsible>
      </div>
    </>
  );
}

export default function SessionPage({ kind }: SessionPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);

  const isClassroom = kind === 'classroom';
  const table = isClassroom ? 'classroom_sessions' : 'skilldrop_sessions';
  const label = isClassroom ? 'Classroom' : 'SkillDrop';
  const Icon = isClassroom ? BookOpen : Zap;

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from(table as any)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setError(error?.message || 'Session not found or you do not have access.');
      } else {
        setSession(data);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, table]);

  // ---------- Classroom branch ----------
  if (isClassroom) {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#14101F] text-[#E8D9B5]">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      );
    }
    if (error || !session) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#14101F] text-[#E8D9B5] p-6">
          <p className="text-center max-w-md font-spectral">{error || 'Session not found.'}</p>
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 text-[#E8D9B5] hover:text-white hover:bg-[#8B5CF6]/15">
            <ArrowLeft className="h-4 w-4" /> Go back
          </Button>
        </div>
      );
    }
    const instructorId = session.instructor_id as string | null;
    return (
      <main
        className="min-h-screen text-[#E8D9B5]"
        style={{
          background:
            'radial-gradient(ellipse at top, rgba(139,92,246,0.18) 0%, rgba(139,92,246,0) 55%), linear-gradient(180deg, #1a1430 0%, #14101F 60%, #100c1a 100%)',
        }}
      >
        <div className="mx-auto max-w-6xl px-4 py-5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/communications-hub')}
            className="mb-4 gap-2 px-0 text-[#E8D9B5]/70 hover:text-[#E8D9B5] hover:bg-transparent"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Go-Live
          </Button>

          <header className="mb-5 rounded-2xl border border-[#8B5CF6]/30 bg-[#1a1430]/70 backdrop-blur p-5">
            <div className="flex items-center gap-3 mb-2">
              <Icon className="h-7 w-7 text-[#8B5CF6]" />
              <h1 className="font-spectral text-3xl md:text-4xl text-[#E8D9B5] tracking-tight">
                {session.title}
              </h1>
            </div>
            {session.description && (
              <p className="text-[#E8D9B5]/80 font-spectral italic">{session.description}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-[#E8D9B5]/60">
              {session.scheduled_at && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-4 w-4" /> {new Date(session.scheduled_at).toLocaleString()}
                </span>
              )}
              {session.status && (
                <span className="rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/50 px-3 py-0.5 font-semibold text-[#E8D9B5] uppercase tracking-wider text-xs">
                  {session.status}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Users className="h-4 w-4" /> {label}
              </span>
            </div>
          </header>

          {session.chat_room_id ? (
            <div
              className="rounded-2xl border border-[#8B5CF6]/30 bg-[#14101F]/80 overflow-hidden"
              style={{ height: 'calc(100vh - 320px)', minHeight: 540 }}
            >
              <ChatRoom
                roomId={session.chat_room_id}
                onBack={() => navigate(-1)}
                instructorId={instructorId || undefined}
                rail={<LessonRail roomId={session.chat_room_id} instructorId={instructorId} />}
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E8D9B5]/30 bg-[#E8D9B5]/5 p-5 text-[#E8D9B5]">
              This classroom has no chat thread linked yet. Ask the instructor to recreate it from the Communications Hub.
            </div>
          )}
        </div>
      </main>
    );
  }

  // ---------- SkillDrop branch ----------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A1308] text-[#F5A623]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#1A1308] text-[#F5A623] p-6">
        <p className="text-center max-w-md font-[\"Space_Grotesk\",sans-serif]">{error || 'Session not found.'}</p>
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 text-[#F5A623] hover:text-white hover:bg-[#F5A623]/15">
          <ArrowLeft className="h-4 w-4" /> Go back
        </Button>
      </div>
    );
  }

  return (
    <main
      className="min-h-screen text-[#F5E6C8]"
      style={{
        background:
          'radial-gradient(ellipse at top, rgba(245,166,35,0.15) 0%, rgba(255,107,74,0.05) 35%, rgba(26,19,8,0) 60%), linear-gradient(180deg, #241a0d 0%, #1A1308 60%, #120c04 100%)',
      }}
    >
      <div className="mx-auto max-w-5xl px-4 py-5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/communications-hub')}
          className="mb-4 gap-2 px-0 text-[#F5E6C8]/60 hover:text-[#F5A623] hover:bg-transparent"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Go-Live
        </Button>

        <header className="mb-5 rounded-2xl border border-[#F5A623]/35 bg-[#241a0d]/70 backdrop-blur p-5 relative overflow-hidden">
          <div
            aria-hidden
            className="absolute -top-12 -right-12 h-40 w-40 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(255,107,74,0.35) 0%, rgba(255,107,74,0) 70%)' }}
          />
          <div className="flex items-center gap-3 mb-2 relative">
            <Icon className="h-7 w-7 text-[#F5A623]" />
            <h1
              className="text-3xl md:text-4xl tracking-tight text-white"
              style={{ fontFamily: '"Space Grotesk", Inter, sans-serif', fontWeight: 700 }}
            >
              {session.title}
            </h1>
          </div>
          {session.description && (
            <p className="text-[#F5E6C8]/80 relative" style={{ fontFamily: '"Space Grotesk", Inter, sans-serif' }}>
              {session.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-[#F5E6C8]/60 relative">
            {session.scheduled_at && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-4 w-4" /> {new Date(session.scheduled_at).toLocaleString()}
              </span>
            )}
            {session.status && (
              <span
                className="rounded-full px-3 py-0.5 uppercase tracking-wider text-xs font-bold"
                style={{
                  background: 'linear-gradient(90deg, rgba(245,166,35,0.25), rgba(255,107,74,0.25))',
                  border: '1px solid rgba(245,166,35,0.55)',
                  color: '#F5A623',
                }}
              >
                {session.status}
              </span>
            )}
            <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> {label}</span>
          </div>
        </header>

        {session.chat_room_id ? (
          <div
            className="rounded-2xl border border-[#F5A623]/30 bg-[#1A1308]/80 overflow-hidden"
            style={{ height: 'calc(100vh - 320px)', minHeight: 500 }}
          >
            <ChatRoom
              roomId={session.chat_room_id}
              onBack={() => navigate(-1)}
              dropAnimation
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-[#FF6B4A]/30 bg-[#FF6B4A]/5 p-5 text-[#F5E6C8]">
            This drop has no chat thread linked yet. Ask the host to recreate it from the Communications Hub.
          </div>
        )}
      </div>
    </main>
  );
}
