import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BookOpen, Plus, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CreateSessionForm from '@/components/sessions/CreateSessionForm';

type Kind = 'classroom' | 'skilldrop';

interface Props {
  kind: Kind;
}

interface SessionRow {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string | null;
  status: string | null;
  chat_room_id: string | null;
  creator_id: string;
  created_at: string;
}

const COPY: Record<Kind, { label: string; route: string; tableCreatorCol: string; icon: typeof BookOpen; accent: string; titleFont: string; }> = {
  classroom: {
    label: 'Classroom',
    route: '/classroom',
    tableCreatorCol: 'instructor_id',
    icon: BookOpen,
    accent: '#8B5CF6',
    titleFont: 'Classroom',
  },
  skilldrop: {
    label: 'SkillDrop',
    route: '/skilldrop',
    tableCreatorCol: 'presenter_id',
    icon: Zap,
    accent: '#F59E0B',
    titleFont: 'SkillDrop',
  },
};

export default function SessionListPage({ kind }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const cfg = COPY[kind];
  const Icon = cfg.icon;
  const [createOpen, setCreateOpen] = useState(false);

  const table = kind === 'classroom' ? 'classroom_sessions' : 'skilldrop_sessions';
  const creatorCol = cfg.tableCreatorCol;

  // Sessions I created.
  const ownQuery = useQuery({
    queryKey: [`${kind}-sessions-own`, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table as any)
        .select('id, title, description, scheduled_at, status, chat_room_id, ' + creatorCol + ', created_at')
        .eq(creatorCol, user!.id)
        .order('scheduled_at', { ascending: false });
      if (error) throw error;
      return ((data || []) as any[]).map(r => ({ ...r, creator_id: r[creatorCol] })) as SessionRow[];
    },
  });

  // Chat rooms where I'm a participant — used to surface sessions I was invited to.
  const participantRoomsQuery = useQuery({
    queryKey: ['my-chat-room-ids', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_participants' as any)
        .select('room_id')
        .eq('user_id', user!.id)
        .eq('is_active', true);
      if (error) throw error;
      return (data || []).map((r: any) => r.room_id as string);
    },
  });

  const invitedQuery = useQuery({
    queryKey: [`${kind}-sessions-invited`, user?.id, (participantRoomsQuery.data || []).join(',')],
    enabled: !!user?.id && (participantRoomsQuery.data?.length || 0) > 0,
    queryFn: async () => {
      const ids = participantRoomsQuery.data || [];
      const { data, error } = await supabase
        .from(table as any)
        .select('id, title, description, scheduled_at, status, chat_room_id, ' + creatorCol + ', created_at')
        .in('chat_room_id', ids)
        .neq(creatorCol, user!.id)
        .order('scheduled_at', { ascending: false });
      if (error) throw error;
      return ((data || []) as any[]).map(r => ({ ...r, creator_id: r[creatorCol] })) as SessionRow[];
    },
  });

  const sessions = useMemo(() => {
    const own = ownQuery.data || [];
    const invited = invitedQuery.data || [];
    const seen = new Set<string>();
    return [...own, ...invited].filter(s => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [ownQuery.data, invitedQuery.data]);

  const isLoading = ownQuery.isLoading || participantRoomsQuery.isLoading;

  return (
    <div className="min-h-screen bg-[#0B1420] text-[#EAF4F2]">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-10 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/communications-hub')}
              className="mb-3 gap-2 text-[#7E9498] hover:text-[#EAF4F2] hover:bg-transparent px-0"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Go-Live
            </Button>
            <h1 className="text-5xl tracking-tight mb-2 flex items-center gap-3" style={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}>
              <Icon className="h-9 w-9" style={{ color: cfg.accent }} /> {cfg.label}
            </h1>
            <p className="text-[#7E9498] text-base">
              {kind === 'classroom'
                ? 'Live teaching sessions you host or were invited to.'
                : 'Short skill-sharing drops you host or were invited to.'}
            </p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 text-[#0B1420] hover:opacity-90"
            style={{ backgroundColor: cfg.accent }}
          >
            <Plus className="h-4 w-4" /> Create {cfg.label.toLowerCase()} session
          </Button>
        </div>

        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: cfg.accent }} />
          </div>
        )}

        {!isLoading && sessions.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
            <p className="text-2xl mb-3" style={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}>
              No {cfg.label.toLowerCase()} sessions yet
            </p>
            <p className="text-[#7E9498] mb-6">Create the first one to bring the tribe together.</p>
            <Button onClick={() => setCreateOpen(true)} className="text-[#0B1420]" style={{ backgroundColor: cfg.accent }}>
              <Plus className="h-4 w-4 mr-2" /> Create {cfg.label.toLowerCase()} session
            </Button>
          </div>
        )}

        {!isLoading && sessions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {sessions.map(s => {
              const hosting = s.creator_id === user?.id;
              const when = s.scheduled_at ? new Date(s.scheduled_at) : null;
              return (
                <button
                  key={s.id}
                  onClick={() => navigate(`${cfg.route}/${s.id}`)}
                  className="text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all p-5 group"
                  style={{ borderColor: `${cfg.accent}33` }}
                >
                  <div className="flex items-baseline justify-between gap-2 mb-2">
                    <span className="text-xl truncate" style={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}>
                      {s.title}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-[#7E9498] shrink-0">
                      {hosting ? 'hosting' : 'invited'}
                    </span>
                  </div>
                  {s.description && <p className="text-sm text-[#7E9498] line-clamp-2">{s.description}</p>}
                  <div className="mt-3 flex items-center justify-between text-xs text-[#7E9498]/80">
                    <span>{when ? when.toLocaleString() : 'Unscheduled'}</span>
                    <span className="uppercase tracking-wide">{s.status || 'scheduled'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl bg-[#0f172a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl" style={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}>
              <Icon className="h-6 w-6" style={{ color: cfg.accent }} /> New {cfg.label.toLowerCase()} session
            </DialogTitle>
          </DialogHeader>
          <CreateSessionForm kind={kind} onCreated={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
