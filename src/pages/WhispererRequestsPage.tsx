/**
 * WhispererRequestsPage — the SOWER's permission desk.
 *
 * Step (c) of the prescribed whisperer path (see src/lib/whisperer/policy.ts):
 * a whisperer asked to market one of my seeds, and only I can say yes.
 * Until I approve, that seed pays NO whisper share — it stays with me.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Megaphone, Check, X, ArrowLeft, Home } from 'lucide-react';
import {
  WHISPER_SHARE_PERCENT,
  WHISPER_FALLBACK_NOTE,
  isWhisperPayable,
} from '@/lib/whisperer/policy';

type Row = {
  id: string;
  status: string;
  commission_percent: number | null;
  created_at: string | null;
  product_id: string | null;
  orchard_id: string | null;
  book_id: string | null;
  whisperer_id: string;
  whisperers?: { id: string; display_name: string; headline: string | null; avatar_url: string | null } | null;
};

export default function WhispererRequestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Whisperer Requests — Sow2Grow';
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('product_whisperer_assignments')
      .select(
        'id, status, commission_percent, created_at, product_id, orchard_id, book_id, whisperer_id, whisperers:whisperer_id (id, display_name, headline, avatar_url)',
      )
      .eq('sower_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const list = (data as any as Row[]) || [];
    setRows(list);

    // Resolve seed titles
    const productIds = list.map((r) => r.product_id).filter(Boolean) as string[];
    const orchardIds = list.map((r) => r.orchard_id).filter(Boolean) as string[];
    const map: Record<string, string> = {};
    if (productIds.length) {
      const { data: p } = await supabase.from('products').select('id, title').in('id', productIds);
      (p || []).forEach((x: any) => { map[x.id] = x.title; });
    }
    if (orchardIds.length) {
      const { data: o } = await supabase.from('orchards').select('id, title').in('id', orchardIds);
      (o || []).forEach((x: any) => { map[x.id] = x.title; });
    }
    setTitles(map);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (row: Row, status: 'active' | 'declined' | 'revoked') => {
    setBusy(row.id);
    const { error } = await supabase
      .from('product_whisperer_assignments')
      .update({ status })
      .eq('id', row.id);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(
      status === 'active'
        ? `Permission granted — this whisperer now earns the ${WHISPER_SHARE_PERCENT}% whisper share on this seed.`
        : `Link ${status}. The ${WHISPER_SHARE_PERCENT}% whisper share stays with you.`,
    );
    load();
  };

  if (!user) {
    return <div className="container mx-auto py-16 text-center text-muted-foreground">Please sign in.</div>;
  }

  const pending = rows.filter((r) => r.status === 'pending');
  const active = rows.filter((r) => isWhisperPayable(r.status));
  const closed = rows.filter((r) => !['pending', 'active'].includes(r.status));

  const seedLabel = (r: Row) =>
    titles[r.product_id || r.orchard_id || r.book_id || ''] || 'Seed';

  const RowCard = ({ r, actions }: { r: Row; actions: React.ReactNode }) => (
    <Card className="p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-muted overflow-hidden shrink-0">
        {r.whisperers?.avatar_url ? (
          <img src={r.whisperers.avatar_url} alt={r.whisperers.display_name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-full w-full flex items-center justify-center"><Megaphone className="h-4 w-4 text-muted-foreground" /></div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{r.whisperers?.display_name || 'Whisperer'}</div>
        <div className="text-xs text-muted-foreground truncate">
          wants to whisper “{seedLabel(r)}” · {r.commission_percent ?? WHISPER_SHARE_PERCENT}%
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">{actions}</div>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
          <Home className="h-4 w-4 mr-1" /> Home
        </Button>
      </div>

      <h1 className="text-3xl font-bold mb-2">Whisperer Requests</h1>
      <p className="text-muted-foreground mb-4">
        Whisperers must ask your permission before they can market one of your seeds.
      </p>

      <Card className="p-4 mb-8 border-dashed">
        <div className="text-sm space-y-1">
          <div className="font-semibold">How the {WHISPER_SHARE_PERCENT}% whisper share works</div>
          <div className="text-muted-foreground">1. Whisperer registers and asks to link to your seed.</div>
          <div className="text-muted-foreground">2. You approve here — nothing is paid before you do.</div>
          <div className="text-muted-foreground">3. {WHISPER_FALLBACK_NOTE}</div>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-8">
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-xl font-semibold">Awaiting your permission</h2>
              <Badge variant="secondary">{pending.length}</Badge>
            </div>
            {pending.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground text-sm">
                No pending requests. Every whisper share on your seeds currently falls back to you.
              </Card>
            ) : (
              <div className="space-y-3">
                {pending.map((r) => (
                  <RowCard
                    key={r.id}
                    r={r}
                    actions={
                      <>
                        <Button size="sm" disabled={busy === r.id} onClick={() => setStatus(r, 'active')}>
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => setStatus(r, 'declined')}>
                          <X className="h-4 w-4 mr-1" /> Decline
                        </Button>
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-xl font-semibold">Active whisperers</h2>
              <Badge variant="secondary">{active.length}</Badge>
            </div>
            {active.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground text-sm">
                No active whisperers — you keep 100% of the whisper share.
              </Card>
            ) : (
              <div className="space-y-3">
                {active.map((r) => (
                  <RowCard
                    key={r.id}
                    r={r}
                    actions={
                      <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => setStatus(r, 'revoked')}>
                        Revoke
                      </Button>
                    }
                  />
                ))}
              </div>
            )}
          </section>

          {closed.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-3">Closed</h2>
              <div className="space-y-3">
                {closed.map((r) => (
                  <RowCard key={r.id} r={r} actions={<Badge variant="outline">{r.status}</Badge>} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <div className="mt-8 text-sm text-muted-foreground">
        Looking to whisper for others? <Link to="/become-a-whisperer" className="text-primary underline">Become a Whisperer</Link>
      </div>
    </div>
  );
}
