import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BookOpen, Plus, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CreateSessionForm from '@/components/sessions/CreateSessionForm';
import PageHeroBanner from '@/components/chat/PageHeroBanner';

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
    accent: '#F5A623',
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

  const isClassroom = kind === 'classroom';
  const isSkillDrop = kind === 'skilldrop';
  const bg = isClassroom ? '#14101F' : isSkillDrop ? '#1A1308' : '#0B1420';
  const fg = isClassroom ? '#E8D9B5' : isSkillDrop ? '#F5E6C8' : '#EAF4F2';
  const mutedFg = isClassroom ? '#E8D9B5' : isSkillDrop ? '#F5E6C8' : '#7E9498';
  const titleFontFamily = isClassroom
    ? '"Spectral", Georgia, serif'
    : isSkillDrop
      ? '"Space Grotesk", Inter, sans-serif'
      : '"Fraunces", serif';
  const titleFontWeight = isClassroom ? 600 : isSkillDrop ? 700 : 500;
  const cardBorder = isClassroom || isSkillDrop ? `${cfg.accent}55` : `${cfg.accent}33`;
  const themed = isClassroom || isSkillDrop;
  const themedTintWeak = isClassroom ? 'rgba(139,92,246,0.06)' : isSkillDrop ? 'rgba(245,166,35,0.07)' : 'rgba(255,255,255,0.05)';
  const themedTintStrong = isClassroom ? 'rgba(139,92,246,0.12)' : isSkillDrop ? 'rgba(245,166,35,0.14)' : 'rgba(255,255,255,0.10)';
  const buttonFg = isClassroom ? '#14101F' : isSkillDrop ? '#1A1308' : '#0B1420';
  const mutedColor = isSkillDrop ? 'rgba(245,230,200,0.6)' : isClassroom ? 'rgba(232,217,181,0.6)' : '#7E9498';
  const pageBgStyle: React.CSSProperties = isSkillDrop
    ? { background: 'radial-gradient(ellipse at top, rgba(245,166,35,0.10) 0%, rgba(26,19,8,0) 55%), linear-gradient(180deg, #241a0d 0%, #1A1308 70%, #120c04 100%)', color: fg }
    : { backgroundColor: bg, color: fg };

  return (
    <div className="min-h-screen" style={pageBgStyle}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-10 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/communications-hub')}
              className="mb-3 gap-2 hover:bg-transparent px-0"
              style={{ color: mutedColor }}
            >
              <ArrowLeft className="h-4 w-4" /> Back to Go-Live
            </Button>
            <h1
              className="text-5xl tracking-tight mb-2 flex items-center gap-3"
              style={{ fontFamily: titleFontFamily, fontWeight: titleFontWeight }}
            >
              <Icon className="h-9 w-9" style={{ color: cfg.accent }} /> {cfg.label}
            </h1>
            <p className="text-base" style={{ color: themed ? mutedColor : '#7E9498' }}>
              {kind === 'classroom'
                ? 'Live teaching sessions you host or were invited to.'
                : 'Short skill-sharing drops you host or were invited to.'}
            </p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 hover:opacity-90"
            style={
              isSkillDrop
                ? {
                    background: 'linear-gradient(90deg, #F5A623 0%, #FF6B4A 100%)',
                    color: buttonFg,
                  }
                : { backgroundColor: cfg.accent, color: buttonFg }
            }
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
          <div
            className="rounded-2xl p-12 text-center"
            style={{
              border: themed ? `1px solid ${cfg.accent}33` : '1px solid rgba(255,255,255,0.1)',
              backgroundColor: themedTintWeak,
            }}
          >
            <p className="text-2xl mb-3" style={{ fontFamily: titleFontFamily, fontWeight: titleFontWeight }}>
              No {cfg.label.toLowerCase()} sessions yet
            </p>
            <p className="mb-6" style={{ color: mutedFg, opacity: themed ? 0.7 : 1 }}>
              {isClassroom
                ? 'Open your first classroom to gather the tribe.'
                : isSkillDrop
                  ? 'Drop your first skill — share something the tribe can learn fast.'
                  : 'Create the first one to bring the tribe together.'}
            </p>
            <Button
              onClick={() => setCreateOpen(true)}
              style={
                isSkillDrop
                  ? { background: 'linear-gradient(90deg, #F5A623 0%, #FF6B4A 100%)', color: buttonFg }
                  : { backgroundColor: cfg.accent, color: buttonFg }
              }
            >
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
                  className="text-left rounded-2xl transition-all p-5 group relative overflow-hidden"
                  style={{
                    border: `1px solid ${cardBorder}`,
                    backgroundColor: themedTintWeak,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = themedTintStrong; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = themedTintWeak; }}
                >
                  {isSkillDrop && (
                    <div
                      aria-hidden
                      className="absolute -top-10 -right-10 h-28 w-28 rounded-full pointer-events-none opacity-70 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'radial-gradient(circle, rgba(255,107,74,0.35) 0%, rgba(255,107,74,0) 70%)' }}
                    />
                  )}
                  <div className="flex items-baseline justify-between gap-2 mb-2 relative">
                    <span className="text-xl truncate" style={{ fontFamily: titleFontFamily, fontWeight: titleFontWeight }}>
                      {s.title}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider shrink-0" style={{ color: mutedFg, opacity: themed ? 0.6 : 1 }}>
                      {hosting ? 'hosting' : 'invited'}
                    </span>
                  </div>
                  {s.description && (
                    <p className="text-sm line-clamp-2 relative" style={{ color: mutedFg, opacity: themed ? 0.75 : 1 }}>
                      {s.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between text-xs relative" style={{ color: mutedFg, opacity: themed ? 0.55 : 0.8 }}>
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
        <DialogContent
          className="max-w-2xl text-white"
          style={{
            backgroundColor: isClassroom ? '#1a1430' : isSkillDrop ? '#241a0d' : '#0f172a',
            border: isClassroom
              ? '1px solid rgba(139,92,246,0.3)'
              : isSkillDrop
                ? '1px solid rgba(245,166,35,0.35)'
                : '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl" style={{ fontFamily: titleFontFamily, fontWeight: titleFontWeight }}>
              <Icon className="h-6 w-6" style={{ color: cfg.accent }} /> New {cfg.label.toLowerCase()} session
            </DialogTitle>
          </DialogHeader>
          <CreateSessionForm kind={kind} onCreated={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
