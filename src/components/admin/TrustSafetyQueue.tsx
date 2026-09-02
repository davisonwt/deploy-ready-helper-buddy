import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldAlert, Flag, ImageIcon, CheckCircle2, XCircle, UserX, AlertTriangle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * The real trust & safety queue: content_reports (user-filed),
 * media_moderation (Sightengine verdicts that need a human -- block or
 * uncertain, not yet reviewed), and abuse_flags (text-based detector --
 * see 20260902130000_abuse_detection.sql). Actions here directly flip the
 * RLS conditions in 20260902114500 (media_is_allowed) and
 * content_hidden_pending_minor_report -- this is not cosmetic.
 */
interface ReportRow {
  id: string; reporter_user_id: string; target_type: string; target_id: string;
  reason: string; details: string | null; status: string; created_at: string;
}
interface ModRow {
  id: string; bucket_id: string | null; object_path: string | null; subject_type: string;
  subject_ref: string | null; uploader_user_id: string; verdict: string; minor_suspected: boolean;
  reason: string | null; created_at: string;
}
interface AbuseFlagRow {
  id: string; content_type: string; content_id: string | null; room_id: string | null;
  author_id: string; matched_rule: string; category: string; severity: string;
  action_taken: 'flagged' | 'blocked'; repeat_offender: boolean; status: string; created_at: string;
}

const SEVERITY_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
const SEVERITY_VARIANT: Record<string, 'destructive' | 'secondary'> = {
  critical: 'destructive', high: 'destructive', medium: 'secondary', low: 'secondary',
};

export default function TrustSafetyQueue() {
  const { user } = useAuth() as any;
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [modRows, setModRows] = useState<ModRow[]>([]);
  const [abuseRows, setAbuseRows] = useState<AbuseFlagRow[]>([]);
  const [messagePreviews, setMessagePreviews] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: r }, { data: m }, { data: a }] = await Promise.all([
      supabase.from('content_reports').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('media_moderation').select('*').in('verdict', ['block', 'uncertain']).is('reviewed_at', null)
        .order('minor_suspected', { ascending: false }).order('created_at', { ascending: true }),
      supabase.from('abuse_flags').select('*').eq('status', 'pending_review').order('created_at', { ascending: false }),
    ]);
    setReports((r ?? []) as any);
    setModRows((m ?? []) as any);
    const abuse = ((a ?? []) as any as AbuseFlagRow[])
      .slice()
      .sort((x, y) => (SEVERITY_RANK[y.severity] ?? 0) - (SEVERITY_RANK[x.severity] ?? 0));
    setAbuseRows(abuse);
    setLoading(false);

    // Audit trail: every gosat view of a flag writes a row -- "who
    // looked, at what, when." One row per flag actually shown, written
    // once per page load (not on every render).
    if (user?.id && abuse.length > 0) {
      await supabase.from('abuse_flag_views').insert(
        abuse.map((row) => ({ flag_id: row.id, viewed_by: user.id }))
      );
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const loadMessagePreview = async (row: AbuseFlagRow) => {
    if (row.content_type !== 'chat_message' || !row.content_id || messagePreviews[row.id]) return;
    const { data } = await supabase.from('chat_messages').select('content').eq('id', row.content_id).maybeSingle();
    setMessagePreviews((prev) => ({ ...prev, [row.id]: (data as any)?.content || '(message no longer available)' }));
  };

  const resolveAbuseFlag = async (row: AbuseFlagRow, status: 'reviewed_allowed' | 'reviewed_dismissed' | 'reviewed_suspended') => {
    if (!user?.id) return;
    setActing(row.id);
    try {
      const { error } = await supabase.from('abuse_flags')
        .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user.id })
        .eq('id', row.id);
      if (error) throw error;

      if (status === 'reviewed_suspended') {
        // abuse_flags already carries the resolved author_id directly --
        // no per-content-type uploader lookup needed, unlike
        // suspendTargetUploader below (which exists for content_reports,
        // where the target's uploader isn't known up front).
        await supabase.from('profiles').update({ suspended: true } as any).eq('user_id', row.author_id);
      }
      toast.success(
        status === 'reviewed_allowed' ? 'Marked allowed' : status === 'reviewed_dismissed' ? 'Dismissed' : 'Author suspended'
      );
      setAbuseRows((prev) => prev.filter((x) => x.id !== row.id));
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not resolve flag');
    } finally {
      setActing(null);
    }
  };

  const resolveReport = async (row: ReportRow, status: 'allowed' | 'removed' | 'suspended') => {
    if (!user?.id) return;
    setActing(row.id);
    try {
      const { error } = await supabase.from('content_reports')
        .update({ status, resolved_at: new Date().toISOString(), resolved_by: user.id })
        .eq('id', row.id);
      if (error) throw error;

      if (status === 'suspended') {
        // Best-effort: suspend the uploader if the target maps to one we
        // can resolve. content_reports has no FK to a uploader, so this
        // only covers the target types we can look up directly.
        await suspendTargetUploader(row.target_type, row.target_id);
      }
      toast.success('Report resolved');
      setReports((prev) => prev.filter((x) => x.id !== row.id));
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not resolve report');
    } finally {
      setActing(null);
    }
  };

  const resolveMod = async (row: ModRow, action: 'allow' | 'remove' | 'suspend_uploader') => {
    if (!user?.id) return;
    setActing(row.id);
    try {
      const { error } = await supabase.from('media_moderation')
        .update({ reviewed_by: user.id, reviewed_at: new Date().toISOString(), review_action: action })
        .eq('id', row.id);
      if (error) throw error;

      if (action === 'suspend_uploader') {
        await supabase.from('profiles').update({ suspended: true } as any).eq('user_id', row.uploader_user_id);
      }
      toast.success(
        action === 'allow' ? 'Marked allowed' : action === 'remove' ? 'Marked removed -- hidden now' : 'Uploader suspended'
      );
      setModRows((prev) => prev.filter((x) => x.id !== row.id));
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not resolve');
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><ShieldAlert className="h-5 w-5" /> Trust &amp; Safety Queue</h2>
        <p className="text-sm text-muted-foreground">
          User reports and automated content-scan verdicts that need a human decision. Reported content
          stays visible until you act, except sexual content involving a minor, which hides immediately.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Abuse flags ({abuseRows.length})</CardTitle>
              <CardDescription>
                Automated text detection -- chat, listings, bios, orchard descriptions. Sorted by severity;
                wallet-address and credential attempts below were already blocked before they were ever sent.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {abuseRows.length === 0 && <p className="text-sm text-muted-foreground py-4">Nothing waiting on review.</p>}
              {abuseRows.map((row) => (
                <div key={row.id} className={`flex items-start justify-between gap-3 rounded-md border p-3 ${row.severity === 'critical' ? 'border-destructive bg-destructive/5' : ''}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {row.repeat_offender && <Badge variant="destructive">REPEAT OFFENDER</Badge>}
                      <Badge variant={SEVERITY_VARIANT[row.severity] ?? 'secondary'}>{row.severity}</Badge>
                      <Badge variant={row.action_taken === 'blocked' ? 'destructive' : 'secondary'}>
                        {row.action_taken === 'blocked' ? 'blocked before send' : 'flagged'}
                      </Badge>
                      <span className="text-sm font-medium">{row.category}</span>
                      <span className="text-xs text-muted-foreground">({row.matched_rule})</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {row.content_type}
                      {row.content_id && ` · ${row.content_id}`}
                      {row.room_id && ` · room ${row.room_id}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      author {row.author_id} · {new Date(row.created_at).toLocaleString()}
                    </p>
                    {row.content_type === 'chat_message' && row.content_id && (
                      messagePreviews[row.id] ? (
                        <p className="text-sm mt-1.5 rounded bg-muted p-2 italic">"{messagePreviews[row.id]}"</p>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-6 px-2 mt-1 text-xs" onClick={() => loadMessagePreview(row)}>
                          <Eye className="h-3 w-3 mr-1" /> View message
                        </Button>
                      )
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {row.action_taken === 'flagged' && (
                      <Button size="sm" variant="outline" disabled={acting === row.id} onClick={() => resolveAbuseFlag(row, 'reviewed_allowed')}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Allow
                      </Button>
                    )}
                    <Button size="sm" variant="outline" disabled={acting === row.id} onClick={() => resolveAbuseFlag(row, 'reviewed_dismissed')}>
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Dismiss
                    </Button>
                    <Button size="sm" variant="destructive" disabled={acting === row.id} onClick={() => resolveAbuseFlag(row, 'reviewed_suspended')}>
                      <UserX className="h-3.5 w-3.5 mr-1" /> Suspend
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Flag className="h-4 w-4" /> Reports ({reports.length})</CardTitle>
              <CardDescription>Filed by members against a specific piece of content.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reports.length === 0 && <p className="text-sm text-muted-foreground py-4">No pending reports.</p>}
              {reports.map((r) => (
                <div key={r.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={r.reason === 'minor_sexual_content' ? 'destructive' : 'secondary'}>{r.reason}</Badge>
                      <span className="text-sm font-medium">{r.target_type}</span>
                      <span className="text-xs text-muted-foreground font-mono truncate max-w-[16rem]">{r.target_id}</span>
                    </div>
                    {r.details && <p className="text-sm mt-1">{r.details}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" disabled={acting === r.id} onClick={() => resolveReport(r, 'allowed')}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Allow
                    </Button>
                    <Button size="sm" variant="destructive" disabled={acting === r.id} onClick={() => resolveReport(r, 'removed')}>
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Remove
                    </Button>
                    <Button size="sm" variant="destructive" disabled={acting === r.id} onClick={() => resolveReport(r, 'suspended')}>
                      <UserX className="h-3.5 w-3.5 mr-1" /> Suspend
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Scan verdicts ({modRows.length})</CardTitle>
              <CardDescription>Automated block/uncertain results awaiting review. Minor-suspected items are listed first.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {modRows.length === 0 && <p className="text-sm text-muted-foreground py-4">Nothing waiting on review.</p>}
              {modRows.map((m) => (
                <div key={m.id} className={`flex items-start justify-between gap-3 rounded-md border p-3 ${m.minor_suspected ? 'border-destructive bg-destructive/5' : ''}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {m.minor_suspected && <Badge variant="destructive">SUSPECTED MINOR</Badge>}
                      <Badge variant={m.verdict === 'block' ? 'destructive' : 'secondary'}>{m.verdict}</Badge>
                      <span className="text-xs text-muted-foreground">{m.reason}</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate max-w-[24rem] mt-1">
                      {m.subject_type === 'avatar' ? `avatar of ${m.subject_ref}` : `${m.bucket_id}/${m.object_path}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      uploader {m.uploader_user_id} · {new Date(m.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" disabled={acting === m.id} onClick={() => resolveMod(m, 'allow')}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Allow
                    </Button>
                    <Button size="sm" variant="destructive" disabled={acting === m.id} onClick={() => resolveMod(m, 'remove')}>
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Remove
                    </Button>
                    <Button size="sm" variant="destructive" disabled={acting === m.id} onClick={() => resolveMod(m, 'suspend_uploader')}>
                      <UserX className="h-3.5 w-3.5 mr-1" /> Suspend uploader
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/**
 * Best-effort uploader lookup for a "suspend" action on a content_report --
 * content_reports has no FK to an uploader (targets span many tables), so
 * this only covers target types we can resolve directly. Anything else is
 * silently skipped rather than guessed at; the report is still marked
 * resolved either way.
 */
async function suspendTargetUploader(targetType: string, targetId: string) {
  let uploaderId: string | null = null;
  if (targetType === 'profile' || targetType === 'wandering_hearts_profile' || targetType === 'wandering_hearts_room') {
    uploaderId = targetType === 'wandering_hearts_room' ? null : targetId;
  } else if (targetType === 'chat_message') {
    const { data } = await supabase.from('chat_messages').select('sender_id').eq('id', targetId).maybeSingle();
    uploaderId = (data as any)?.sender_id ?? null;
  } else if (targetType === 'seed') {
    // The seeds table (Free-Will Gifting) -- gifter_id is the auth id directly.
    const { data } = await supabase.from('seeds').select('gifter_id').eq('id', targetId).maybeSingle();
    uploaderId = (data as any)?.gifter_id ?? null;
  } else if (targetType === 'orchard') {
    const { data } = await supabase.from('orchards').select('user_id').eq('id', targetId).maybeSingle();
    uploaderId = (data as any)?.user_id ?? null;
  } else if (targetType === 'community_video') {
    const { data } = await supabase.from('community_videos').select('uploader_id').eq('id', targetId).maybeSingle();
    uploaderId = (data as any)?.uploader_id ?? null;
  } else if (targetType === 'library_item') {
    // s2g_library_items -- a third, separate "book/ebook/course" table
    // from products and sower_books, with its own direct user_id column.
    const { data } = await supabase.from('s2g_library_items').select('user_id').eq('id', targetId).maybeSingle();
    uploaderId = (data as any)?.user_id ?? null;
  } else if (targetType === 'product') {
    uploaderId = await resolveProductUploader(targetId);
  } else if (targetType === 'music_track') {
    // MusicTrackDetailPage's track.id can be either a products row or a
    // dj_music_tracks row (see its own normalization logic) -- and
    // products.sower_id is a FK to sowers.id (that table's own PK), NOT
    // the seller's auth id, so it must be resolved through sowers.user_id
    // rather than used directly (same bug class as product_bestowals
    // .sower_id, already fixed elsewhere this session -- see git log).
    uploaderId = await resolveProductUploader(targetId);
    if (!uploaderId) {
      const { data: djTrack } = await supabase
        .from('dj_music_tracks')
        .select('radio_djs(user_id)')
        .eq('id', targetId)
        .maybeSingle();
      uploaderId = (djTrack as any)?.radio_djs?.user_id ?? null;
    }
  } else if (targetType === 'book') {
    // Same dual-source shape as music_track: TribalAliveFeedPage's 'book'
    // kind can be a products row (type='book'/'ebook') or a sower_books
    // row -- sower_books has its own user_id column directly, no
    // sowers-table join needed there.
    uploaderId = await resolveProductUploader(targetId);
    if (!uploaderId) {
      const { data: book } = await supabase.from('sower_books').select('user_id').eq('id', targetId).maybeSingle();
      uploaderId = (book as any)?.user_id ?? null;
    }
  }
  if (uploaderId) {
    await supabase.from('profiles').update({ suspended: true } as any).eq('user_id', uploaderId);
  }
}

// products.sower_id is a FK to sowers.id (that table's own PK), NOT the
// seller's auth id -- must be resolved through sowers.user_id rather than
// used directly (same bug class as product_bestowals.sower_id, already
// fixed elsewhere this session -- see git log).
async function resolveProductUploader(productId: string): Promise<string | null> {
  const { data } = await supabase
    .from('products')
    .select('sower_id, sowers:sower_id(user_id)')
    .eq('id', productId)
    .maybeSingle();
  return (data as any)?.sowers?.user_id ?? null;
}
