/**
 * MyMatchesPage — full inbox of every tribal_match the current member is part of,
 * grouped by status (Pending • Accepted • Declined). Lets members revisit warm
 * collabs Gentoo found, accept/decline them, and jump into the ChatApp DM that
 * Debian dispatches once a match is accepted.
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Handshake, RefreshCw, Inbox, Sparkles, Check, X, MessageCircle, ArrowLeft, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { MentorshipInbox } from '@/components/tribal/MentorshipInbox';

interface MatchRow {
  id: string;
  member_a_id: string;
  member_b_id: string;
  match_type: string;
  match_reason: string;
  suggested_action: string | null;
  confidence_score: number;
  status: string;
  member_a_response: string | null;
  member_b_response: string | null;
  metadata: any;
  created_at: string;
  partner_id: string;
  partner_name?: string;
  partner_avatar?: string | null;
}

const labelForType = (t: string) =>
  t === 'bundle' ? '🌿 Bundle' : t === 'co_promotion' ? '📣 Co-promo' : '🤝 Collab';

export default function MyMatchesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('tribal_matches')
      .select('*')
      .or(`member_a_id.eq.${user.id},member_b_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(60);
    const list = (data ?? []) as any[];
    const partnerIds = Array.from(new Set(list.map(r => r.member_a_id === user.id ? r.member_b_id : r.member_a_id)));
    const map: Record<string, any> = {};
    if (partnerIds.length) {
      const { data: profs } = await supabase
        .from('profiles_public')
        .select('user_id,display_name,avatar_url')
        .in('user_id', partnerIds);
      (profs ?? []).forEach((p: any) => { map[p.user_id] = p; });
    }
    setRows(list.map((r) => {
      const partner = r.member_a_id === user.id ? r.member_b_id : r.member_a_id;
      return {
        ...r,
        partner_id: partner,
        partner_name: map[partner]?.display_name,
        partner_avatar: map[partner]?.avatar_url,
      };
    }));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('agent-bestowal-matcher', {
        body: { mode: 'scan', dispatch_dm: true, max_pairs: 5 },
      });
      if (error) throw error;
      toast.success(`🤝 ${data?.created ?? 0} new match${(data?.created ?? 0) === 1 ? '' : 'es'}`);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not refresh');
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, load]);

  const respond = useCallback(async (m: MatchRow, accept: boolean) => {
    if (!user?.id) return;
    const isA = m.member_a_id === user.id;
    const responseField = isA ? 'member_a_response' : 'member_b_response';
    const newStatus = accept ? 'accepted' : 'declined';
    const { error } = await supabase
      .from('tribal_matches')
      .update({ [responseField]: newStatus, status: newStatus })
      .eq('id', m.id);
    if (error) { toast.error(error.message); return; }
    toast.success(accept ? '🌿 Accepted — Debian will deliver a warm DM shortly' : 'Set aside');
    setRows(prev => prev.map(r => r.id === m.id ? { ...r, status: newStatus, [responseField]: newStatus } : r));
  }, [user?.id]);

  const buckets = useMemo(() => ({
    pending: rows.filter(r => r.status === 'pending'),
    accepted: rows.filter(r => r.status === 'accepted'),
    declined: rows.filter(r => r.status === 'declined' || r.status === 'expired'),
  }), [rows]);

  const renderCard = (m: MatchRow) => (
    <motion.article
      key={m.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <Link to={`/member/${m.partner_id}`} className="flex items-center gap-3 min-w-0 group">
          <Avatar className="h-10 w-10 ring-2 ring-primary/20">
            <AvatarImage src={m.partner_avatar ?? undefined} />
            <AvatarFallback className="bg-primary/15 text-primary text-sm font-bold">
              {(m.partner_name ?? 'T').slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
              {m.partner_name ?? 'Tribe member'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">{labelForType(m.match_type)}</Badge>
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {Math.round(m.confidence_score * 100)}% fit
              </span>
            </div>
          </div>
        </Link>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {new Date(m.created_at).toLocaleDateString()}
        </span>
      </div>

      <p className="text-[12.5px] leading-relaxed text-foreground/90 mb-2">🌱 {m.match_reason}</p>
      {m.suggested_action && (
        <p className="text-[11px] italic text-muted-foreground mb-3">{m.suggested_action}</p>
      )}

      {m.status === 'pending' ? (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => respond(m, true)} className="flex-1 h-8 gap-1">
            <Check className="h-3.5 w-3.5" /> Accept
          </Button>
          <Button size="sm" variant="outline" onClick={() => respond(m, false)} className="h-8 gap-1">
            <X className="h-3.5 w-3.5" /> Pass
          </Button>
        </div>
      ) : m.status === 'accepted' ? (
        <Link to="/chatapp" className="block">
          <Button size="sm" variant="secondary" className="w-full h-8 gap-1.5">
            <MessageCircle className="h-3.5 w-3.5" />
            Open ChatApp DM
          </Button>
        </Link>
      ) : (
        <p className="text-[11px] text-muted-foreground italic">Set aside.</p>
      )}
    </motion.article>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/dashboard">
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="rounded-lg p-1.5 bg-primary/15">
            <Handshake className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold leading-tight">My Tribal Matches</h1>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Warm collabs Gentoo found across the tribe
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={refresh} disabled={refreshing} className="h-8 gap-1">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline text-[11px]">{refreshing ? 'Listening…' : 'Find more'}</span>
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            Listening to the tribe…
          </div>
        ) : rows.length === 0 ? (
          <button
            onClick={refresh}
            className="w-full rounded-2xl border border-dashed border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-8 text-center transition hover:border-primary/70"
          >
            <Sparkles className="h-7 w-7 text-primary mx-auto mb-2" />
            <p className="text-sm font-semibold">No matches yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tap to let Gentoo scan the tribe for warm collaborations.
            </p>
          </button>
        ) : (
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="pending" className="gap-1.5">
                <Inbox className="h-3.5 w-3.5" />
                Pending
                {buckets.pending.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">{buckets.pending.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="accepted">Accepted ({buckets.accepted.length})</TabsTrigger>
              <TabsTrigger value="declined">Set aside ({buckets.declined.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-3">
              {buckets.pending.length === 0
                ? <p className="text-center text-sm text-muted-foreground py-8">All caught up 🌿</p>
                : buckets.pending.map(renderCard)}
            </TabsContent>
            <TabsContent value="accepted" className="space-y-3">
              {buckets.accepted.length === 0
                ? <p className="text-center text-sm text-muted-foreground py-8">No accepted collabs yet.</p>
                : buckets.accepted.map(renderCard)}
            </TabsContent>
            <TabsContent value="declined" className="space-y-3">
              {buckets.declined.length === 0
                ? <p className="text-center text-sm text-muted-foreground py-8">Nothing set aside.</p>
                : buckets.declined.map(renderCard)}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
