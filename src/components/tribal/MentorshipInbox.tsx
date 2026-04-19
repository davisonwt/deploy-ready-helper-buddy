/**
 * MentorshipInbox — tab content for the /my-matches page showing
 * suggested mentor↔mentee pairings (Gentoo's mentorship matcher).
 * Members can accept (which opens a 1:1 chat room) or decline.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Check, X, MessageCircle, GraduationCap, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface PairingRow {
  id: string;
  mentor_id: string;
  mentee_id: string;
  focus_area: string;
  cadence: string;
  status: string;
  match_score: number | null;
  match_reasoning: string | null;
  room_id: string | null;
  suggested_at: string;
  partner_id: string;
  partner_role: 'mentor' | 'mentee';
  partner_name?: string;
  partner_avatar?: string | null;
}

const FOCUS_LABEL: Record<string, string> = {
  orchard_growth: '🌳 Orchard Growth',
  sales_velocity: '💰 Sales Velocity',
  community_building: '🤝 Community Building',
  spiritual_walk: '🌟 Spiritual Walk',
};

export const MentorshipInbox: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<PairingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('mentorship_pairings')
      .select('*')
      .or(`mentor_id.eq.${user.id},mentee_id.eq.${user.id}`)
      .order('suggested_at', { ascending: false })
      .limit(40);

    const list = (data ?? []) as any[];
    const partnerIds = Array.from(new Set(list.map(r =>
      r.mentor_id === user.id ? r.mentee_id : r.mentor_id
    )));

    const map: Record<string, any> = {};
    if (partnerIds.length) {
      const { data: profs } = await supabase
        .from('profiles_public')
        .select('user_id,display_name,avatar_url')
        .in('user_id', partnerIds);
      (profs ?? []).forEach((p: any) => { map[p.user_id] = p; });
    }

    setRows(list.map((r) => {
      const isMentor = r.mentor_id === user.id;
      const partner = isMentor ? r.mentee_id : r.mentor_id;
      return {
        ...r,
        partner_id: partner,
        partner_role: isMentor ? 'mentee' : 'mentor',
        partner_name: map[partner]?.display_name,
        partner_avatar: map[partner]?.avatar_url,
      };
    }));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const scan = useCallback(async () => {
    if (!user?.id) return;
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('agent-gentoo-mentorship-matcher', {
        body: { mode: 'scan_user', user_id: user.id },
      });
      if (error) throw error;
      const n = data?.created ?? 0;
      toast.success(n > 0
        ? `🌿 Gentoo found ${n} mentor${n === 1 ? '' : 's'} for you`
        : 'No new mentors right now — keep growing your score!');
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not scan');
    } finally { setScanning(false); }
  }, [user?.id, load]);

  const respond = useCallback(async (p: PairingRow, accept: boolean) => {
    if (!user?.id) return;

    if (!accept) {
      const { error } = await supabase
        .from('mentorship_pairings')
        .update({ status: 'declined', responded_at: new Date().toISOString() })
        .eq('id', p.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Set aside');
      setRows(prev => prev.map(r => r.id === p.id ? { ...r, status: 'declined' } : r));
      return;
    }

    // Accept → create a direct chat room and link it
    let roomId = p.room_id;
    if (!roomId) {
      const { data: rid, error: rpcErr } = await supabase.rpc('get_or_create_direct_room', {
        user1_id: user.id,
        user2_id: p.partner_id,
      });
      if (rpcErr) { toast.error('Could not create chat room'); return; }
      roomId = rid as string;
    }

    const { error } = await supabase
      .from('mentorship_pairings')
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString(),
        room_id: roomId,
      })
      .eq('id', p.id);
    if (error) { toast.error(error.message); return; }

    toast.success('🌿 Accepted — opening your mentorship chat');
    setRows(prev => prev.map(r => r.id === p.id ? { ...r, status: 'accepted', room_id: roomId } : r));
  }, [user?.id]);

  const buckets = useMemo(() => ({
    suggested: rows.filter(r => r.status === 'suggested'),
    active: rows.filter(r => r.status === 'accepted' || r.status === 'active'),
    declined: rows.filter(r => r.status === 'declined' || r.status === 'completed' || r.status === 'paused'),
  }), [rows]);

  const renderCard = (p: PairingRow) => (
    <motion.article
      key={p.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <Link to={`/member/${p.partner_id}`} className="flex items-center gap-3 min-w-0 group">
          <Avatar className="h-10 w-10 ring-2 ring-amber-500/30">
            <AvatarImage src={p.partner_avatar ?? undefined} />
            <AvatarFallback className="bg-amber-500/15 text-amber-600 text-sm font-bold">
              {(p.partner_name ?? 'M').slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
              {p.partner_name ?? 'Tribe member'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">
                {p.partner_role === 'mentor' ? '🧙 Your mentor' : '🌱 Your mentee'}
              </Badge>
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {p.match_score ? `${Math.round(p.match_score)}% fit` : ''}
              </span>
            </div>
          </div>
        </Link>
        <Badge variant="outline" className="text-[9px] py-0 shrink-0">
          {FOCUS_LABEL[p.focus_area] ?? p.focus_area}
        </Badge>
      </div>

      {p.match_reasoning && (
        <p className="text-[12.5px] leading-relaxed text-foreground/90 mb-3">
          {p.match_reasoning}
        </p>
      )}

      {p.status === 'suggested' ? (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => respond(p, true)} className="flex-1 h-8 gap-1">
            <Check className="h-3.5 w-3.5" /> Accept · {p.cadence}
          </Button>
          <Button size="sm" variant="outline" onClick={() => respond(p, false)} className="h-8 gap-1">
            <X className="h-3.5 w-3.5" /> Pass
          </Button>
        </div>
      ) : p.status === 'accepted' || p.status === 'active' ? (
        <Link to="/chatapp" className="block">
          <Button size="sm" variant="secondary" className="w-full h-8 gap-1.5">
            <MessageCircle className="h-3.5 w-3.5" />
            Open mentorship chat
          </Button>
        </Link>
      ) : (
        <p className="text-[11px] text-muted-foreground italic">Set aside.</p>
      )}
    </motion.article>
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        Listening for mentors…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-amber-600" />
          <h2 className="text-sm font-bold">Mentorship Circles</h2>
        </div>
        <Button size="sm" variant="outline" onClick={scan} disabled={scanning} className="h-7 gap-1 text-[11px]">
          <RefreshCw className={`h-3 w-3 ${scanning ? 'animate-spin' : ''}`} />
          Find mentor
        </Button>
      </div>

      {rows.length === 0 ? (
        <button
          onClick={scan}
          className="w-full rounded-2xl border border-dashed border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-transparent p-8 text-center transition hover:border-amber-500/70"
        >
          <Sparkles className="h-7 w-7 text-amber-600 mx-auto mb-2" />
          <p className="text-sm font-semibold">No pairings yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Tap to let Gentoo find a mentor walking your path.
          </p>
        </button>
      ) : (
        <>
          {buckets.suggested.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Suggested ({buckets.suggested.length})
              </h3>
              {buckets.suggested.map(renderCard)}
            </section>
          )}
          {buckets.active.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Active ({buckets.active.length})
              </h3>
              {buckets.active.map(renderCard)}
            </section>
          )}
          {buckets.declined.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Set aside ({buckets.declined.length})
              </h3>
              {buckets.declined.map(renderCard)}
            </section>
          )}
        </>
      )}
    </div>
  );
};
