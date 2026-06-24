import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, Clock, Hand, Send, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SessionRow {
  id: string;
  title: string;
  description: string | null;
  instructor_id: string;
  scheduled_at: string | null;
  duration_minutes: number | null;
  status: string;
  attendance_mode: string | null;
  require_camera: boolean | null;
  started_at: string | null;
  ended_at: string | null;
}
interface InviteRow {
  id: string; invitee_id: string; status: string; invited_at: string; responded_at: string | null;
}
interface ParticipantRow {
  user_id: string; joined_at: string | null; left_at: string | null;
  presence_status: string | null;
  total_active_seconds: number | null;
  total_away_seconds: number | null;
  hands_raised_count: number | null;
  missed_check_ins: number | null;
}
interface ProfileLite { user_id: string; display_name: string | null; username: string | null; avatar_url: string | null; }

const fmtMin = (s: number) => `${Math.max(0, Math.round(s / 60))}m`;

export default function ClassroomDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [session, setSession] = useState<SessionRow | null>(null);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const { data: s, error: sErr } = await supabase
          .from('classroom_sessions' as any)
          .select('*')
          .eq('id', id)
          .single();
        if (sErr) throw sErr;
        if (cancelled) return;
        setSession(s as any);

        const [{ data: inv }, { data: parts }] = await Promise.all([
          supabase.from('classroom_invites' as any).select('*').eq('session_id', id),
          supabase.from('live_session_participants' as any).select('user_id, joined_at, left_at, presence_status, total_active_seconds, total_away_seconds, hands_raised_count, missed_check_ins').eq('session_id', id),
        ]);
        if (cancelled) return;
        const invRows = (inv || []) as any as InviteRow[];
        const pRows = (parts || []) as any as ParticipantRow[];
        setInvites(invRows);
        setParticipants(pRows);

        const ids = Array.from(new Set([
          ...invRows.map(r => r.invitee_id),
          ...pRows.map(r => r.user_id),
        ])).filter(Boolean);
        if (ids.length) {
          const { data: pp } = await supabase
            .from('public_profiles' as any)
            .select('user_id, display_name, username, avatar_url')
            .in('user_id', ids);
          if (!cancelled) {
            const map: Record<string, ProfileLite> = {};
            (pp || []).forEach((row: any) => { map[row.user_id] = row; });
            setProfiles(map);
          }
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'Could not load dashboard.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const stats = useMemo(() => {
    const invited = invites.length;
    const accepted = invites.filter(i => i.status === 'accepted').length;
    const declined = invites.filter(i => i.status === 'declined').length;
    const pending = invites.filter(i => i.status === 'pending' || !i.status).length;

    const attended = participants.filter(p => p.joined_at).length;
    const totalActive = participants.reduce((s, p) => s + (p.total_active_seconds || 0), 0);
    const avgActive = attended ? totalActive / attended : 0;
    const totalHands = participants.reduce((s, p) => s + (p.hands_raised_count || 0), 0);
    const attendanceRate = invited ? Math.round((attended / invited) * 100) : 0;
    return { invited, accepted, declined, pending, attended, avgActive, totalHands, attendanceRate };
  }, [invites, participants]);

  const isHost = session?.instructor_id && user?.id && session.instructor_id === user.id;

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a] text-cyan-200">Loading…</div>;
  if (err || !session) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a] text-rose-300">
      {err || 'Session not found.'}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Link to={`/classroom/${id}`} className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to session
        </Link>

        <div className="mb-6">
          <div className="text-xs uppercase tracking-widest text-cyan-400/70">Classroom dashboard</div>
          <h1 className="text-3xl md:text-4xl font-black text-white" style={{ fontFamily: '"Fraunces", serif' }}>
            {session.title}
          </h1>
          <div className="mt-1 text-sm text-slate-400">
            {session.scheduled_at ? new Date(session.scheduled_at).toLocaleString() : 'Unscheduled'}
            {session.duration_minutes ? ` · ${session.duration_minutes} min` : ''}
            {' · '}<span className="capitalize">{session.status}</span>
            {' · '}attendance mode: <span className="capitalize">{session.attendance_mode || 'standard'}</span>
            {session.require_camera ? ' · camera required' : ''}
          </div>
          {!isHost && (
            <div className="mt-3 inline-flex items-center gap-2 text-xs text-amber-300/80 bg-amber-500/10 border border-amber-400/20 px-3 py-1.5 rounded-md">
              <AlertCircle className="h-3.5 w-3.5" /> You are viewing this as a non-host. Some data may be limited by policy.
            </div>
          )}
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <KpiCard icon={<Send className="h-4 w-4" />} label="Invited" value={stats.invited} />
          <KpiCard icon={<Users className="h-4 w-4" />} label="Attended" value={stats.attended} hint={`${stats.attendanceRate}% of invites`} />
          <KpiCard icon={<Clock className="h-4 w-4" />} label="Avg time present" value={fmtMin(stats.avgActive)} />
          <KpiCard icon={<Hand className="h-4 w-4" />} label="Hands raised" value={stats.totalHands} />
        </div>

        {/* Invites */}
        <Section title="Invitations" subtitle={`${stats.accepted} accepted · ${stats.declined} declined · ${stats.pending} pending`}>
          {invites.length === 0 ? (
            <Empty text="No invitations sent yet." />
          ) : (
            <ul className="divide-y divide-white/5">
              {invites.map(inv => {
                const p = profiles[inv.invitee_id];
                const name = p?.display_name || p?.username || 'Sower';
                return (
                  <li key={inv.id} className="flex items-center gap-3 py-2.5">
                    <Avatar profile={p} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-100 truncate">{name}</div>
                      <div className="text-xs text-slate-500">Invited {new Date(inv.invited_at).toLocaleString()}</div>
                    </div>
                    <StatusPill status={inv.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        {/* Attendees */}
        <Section title="Attendees" subtitle="Per-attendee presence and engagement from the live session.">
          {participants.length === 0 ? (
            <Empty text="No one has joined the room yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="py-2 pr-3">Member</th>
                    <th className="py-2 pr-3">Presence</th>
                    <th className="py-2 pr-3">Active</th>
                    <th className="py-2 pr-3">Away</th>
                    <th className="py-2 pr-3">Hands</th>
                    <th className="py-2 pr-3">Missed check-ins</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map(pt => {
                    const p = profiles[pt.user_id];
                    const name = p?.display_name || p?.username || 'Sower';
                    return (
                      <tr key={pt.user_id} className="border-t border-white/5">
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2"><Avatar profile={p} /><span className="font-semibold">{name}</span></div>
                        </td>
                        <td className="py-2.5 pr-3"><PresencePill status={pt.presence_status} /></td>
                        <td className="py-2.5 pr-3">{fmtMin(pt.total_active_seconds || 0)}</td>
                        <td className="py-2.5 pr-3">{fmtMin(pt.total_away_seconds || 0)}</td>
                        <td className="py-2.5 pr-3">{pt.hands_raised_count || 0}</td>
                        <td className="py-2.5 pr-3">{pt.missed_check_ins || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-cyan-300/80">{icon}{label}</div>
      <div className="mt-1 text-2xl font-black text-white">{value}</div>
      {hint && <div className="text-xs text-slate-500 mt-0.5">{hint}</div>}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
      <div className="mb-3">
        <h2 className="text-lg font-black text-white" style={{ fontFamily: '"Fraunces", serif' }}>{title}</h2>
        {subtitle && <div className="text-xs text-slate-400">{subtitle}</div>}
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-sm text-slate-500 p-3">{text}</div>;
}

function Avatar({ profile }: { profile?: ProfileLite }) {
  const initial = (profile?.display_name || profile?.username || 'S').slice(0, 1).toUpperCase();
  return (
    <div className="h-7 w-7 rounded-full bg-cyan-500/20 flex items-center justify-center text-[11px] font-bold overflow-hidden shrink-0">
      {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : initial}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    accepted: { cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30', icon: <CheckCircle2 className="h-3 w-3" />, label: 'Accepted' },
    declined: { cls: 'bg-rose-500/15 text-rose-300 border-rose-400/30', icon: <XCircle className="h-3 w-3" />, label: 'Declined' },
    pending:  { cls: 'bg-amber-500/15 text-amber-200 border-amber-400/30', icon: <Clock className="h-3 w-3" />, label: 'Pending' },
  };
  const v = map[status] || map.pending;
  return <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${v.cls}`}>{v.icon}{v.label}</span>;
}

function PresencePill({ status }: { status: string | null }) {
  const map: Record<string, string> = {
    present: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
    away:    'bg-amber-500/15 text-amber-200 border-amber-400/30',
    absent:  'bg-rose-500/15 text-rose-300 border-rose-400/30',
  };
  const cls = map[status || ''] || 'bg-slate-500/15 text-slate-300 border-slate-400/30';
  return <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border capitalize ${cls}`}>{status || 'unknown'}</span>;
}
