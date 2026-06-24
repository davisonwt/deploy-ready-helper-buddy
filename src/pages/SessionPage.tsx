import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Calendar, Loader2, Users, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ChatRoom } from '@/components/chat/ChatRoom';

type SessionKind = 'classroom' | 'skilldrop';

interface SessionPageProps {
  kind: SessionKind;
}

export default function SessionPage({ kind }: SessionPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);

  const table = kind === 'classroom' ? 'classroom_sessions' : 'skilldrop_sessions';
  const label = kind === 'classroom' ? 'Classroom' : 'SkillDrop';
  const Icon = kind === 'classroom' ? BookOpen : Zap;

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060a12] text-slate-300">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#060a12] text-slate-300 p-6">
        <p className="text-center max-w-md">{error || 'Session not found.'}</p>
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2"><ArrowLeft className="h-4 w-4" /> Go back</Button>
      </div>
    );
  }

  return (
    <main className="min-h-screen text-slate-100" style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #060a12 100%)' }}>
      <div className="mx-auto max-w-5xl px-4 py-5">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 gap-2 text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/10">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <header className="mb-5 rounded-2xl border border-cyan-400/25 bg-[#0f172a]/80 p-5">
          <div className="flex items-center gap-3 mb-2">
            <Icon className="h-7 w-7 text-cyan-300" />
            <h1 className="text-2xl md:text-3xl font-black text-white">{session.title}</h1>
          </div>
          {session.description && <p className="text-slate-300">{session.description}</p>}
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-400">
            {session.scheduled_at && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-4 w-4" /> {new Date(session.scheduled_at).toLocaleString()}
              </span>
            )}
            {session.status && (
              <span className="rounded-full bg-cyan-500/15 border border-cyan-400/30 px-3 py-0.5 font-bold text-cyan-200">{session.status}</span>
            )}
            <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> {label}</span>
          </div>
        </header>

        {session.chat_room_id ? (
          <div className="rounded-2xl border border-fuchsia-400/25 bg-[#0f172a]/80 overflow-hidden" style={{ height: 'calc(100vh - 320px)', minHeight: 500 }}>
            <ChatRoom roomId={session.chat_room_id} onBack={() => navigate(-1)} />
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-400/25 bg-amber-500/5 p-5 text-amber-200">
            This session has no chat thread linked yet. Ask the host to recreate it from the Communications Hub.
          </div>
        )}
      </div>
    </main>
  );
}
