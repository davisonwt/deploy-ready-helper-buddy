import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { searchPublicProfiles, type PublicProfileHit } from '@/lib/profiles/publicProfileSearch';

interface SubscriptionRow {
  id: string;
  user_id: string;
  feature: string;
  status: string;
  current_period_end: string | null;
  source: string;
  created_at: string;
}

const statusStyles: Record<string, string> = {
  trial: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  active: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  past_due: 'bg-orange-500/15 text-orange-300 border-orange-400/30',
  cancelled: 'bg-slate-500/15 text-slate-300 border-slate-400/30',
};

/** Read-only list of invoicing subscriptions, plus a grant-trial modal --
 * the only way to get invoicing access until the checkout in phase 6. */
export default function GosatSubscriptionsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [hits, setHits] = useState<PublicProfileHit[]>([]);
  const [granting, setGranting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('feature_subscriptions' as any)
        .select('*')
        .eq('feature', 'invoicing')
        .order('created_at', { ascending: false });
      const list = ((data as any[]) ?? []) as SubscriptionRow[];
      setRows(list);
      if (list.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles_public')
          .select('user_id, display_name, first_name')
          .in('user_id', list.map((r) => r.user_id));
        const map: Record<string, string> = {};
        for (const p of (profiles as any[]) ?? []) {
          map[p.user_id] = p.display_name || p.first_name || p.user_id;
        }
        setNames(map);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (search.trim()) searchPublicProfiles(search).then((r) => setHits(r.data));
      else setHits([]);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const grantTrial = async (userId: string) => {
    setGranting(true);
    try {
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 30);
      const { error } = await supabase.from('feature_subscriptions' as any).insert({
        user_id: userId,
        feature: 'invoicing',
        status: 'trial',
        source: 'gosat',
        current_period_end: periodEnd.toISOString(),
      } as any);
      if (error) throw error;
      toast.success('30-day trial granted');
      setDialogOpen(false);
      setSearch('');
      setHits([]);
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not grant a trial');
    } finally {
      setGranting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Grant trial</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Grant an invoicing trial</DialogTitle>
              <DialogDescription>30 days, starting now. The only way to get invoicing access until the subscription checkout ships.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="member-search">Find a member</Label>
              <Input id="member-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or username" />
              <div className="max-h-60 space-y-1 overflow-y-auto">
                {hits.map((h) => (
                  <button
                    key={h.user_id}
                    type="button"
                    onClick={() => h.user_id && grantTrial(h.user_id)}
                    disabled={granting}
                    className="flex w-full items-center justify-between rounded-md border border-border/50 px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <span>{h.display_name || h.first_name || h.username}</span>
                    {granting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="text-base">Invoicing subscriptions</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {loading && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
          {!loading && rows.length === 0 && <p className="text-sm text-muted-foreground">No one has invoicing access yet.</p>}
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/40 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{names[r.user_id] ?? r.user_id}</p>
                <p className="text-xs text-muted-foreground">
                  {r.source} · {r.current_period_end ? `until ${new Date(r.current_period_end).toLocaleDateString()}` : 'no end date'}
                </p>
              </div>
              <Badge variant="outline" className={`uppercase ${statusStyles[r.status] ?? ''}`}>{r.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
