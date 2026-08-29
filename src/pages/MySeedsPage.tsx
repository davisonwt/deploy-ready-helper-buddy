import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { invokePaymentFunction } from '@/lib/payments/invokeFunction';
import { resolveItemLink } from '@/lib/media/resolveItemLink';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Loader2, PlayCircle, Sprout } from 'lucide-react';

interface PurchaseRow {
  source: 'product' | 'content' | 'bestowal' | 'topup';
  sourceId: string;
  sowerId: string | null;
  itemId: string | null;
  itemTitle: string | null;
  buyerTotal: number;
  provider: string | null;
  status: string;
  paidAt: string;
}

interface SowerGroup {
  sowerId: string;
  sowerName: string;
  rows: PurchaseRow[];
  latestPaidAt: string;
}

const money = (n: number) => `$${n.toFixed(2)}`;
const when = (d: string) => new Date(d).toLocaleDateString();

export default function MySeedsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<SowerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: rows } = await supabase
        .from('buyer_purchases_v')
        .select('source, source_id, sower_id, item_id, item_title, buyer_total, provider, status, paid_at')
        .eq('buyer_id', user.id)
        .order('paid_at', { ascending: false });

      const purchases: PurchaseRow[] = (rows || []).map((r: any) => ({
        source: r.source,
        sourceId: r.source_id,
        sowerId: r.sower_id,
        itemId: r.item_id,
        itemTitle: r.item_title,
        buyerTotal: Number(r.buyer_total || 0),
        provider: r.provider,
        status: r.status,
        paidAt: r.paid_at,
      }));

      const sowerIds = [...new Set(purchases.map((p) => p.sowerId).filter(Boolean))] as string[];
      const { data: profiles } = sowerIds.length
        ? await supabase.from('profiles').select('user_id, display_name, first_name, last_name').in('user_id', sowerIds)
        : { data: [] as any[] };
      const nameByUser = new Map(
        (profiles || []).map((p: any) => [p.user_id, p.display_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'A sower']),
      );

      const byGroup = new Map<string, SowerGroup>();
      for (const p of purchases) {
        const key = p.sowerId || 'wallet';
        let group = byGroup.get(key);
        if (!group) {
          group = {
            sowerId: key,
            sowerName: p.sowerId ? (nameByUser.get(p.sowerId) || 'A sower') : 'Sow2Grow',
            rows: [],
            latestPaidAt: p.paidAt,
          };
          byGroup.set(key, group);
        }
        group.rows.push(p);
        if (new Date(p.paidAt).getTime() > new Date(group.latestPaidAt).getTime()) {
          group.latestPaidAt = p.paidAt;
        }
      }

      const sortedGroups = [...byGroup.values()].sort(
        (a, b) => new Date(b.latestPaidAt).getTime() - new Date(a.latestPaidAt).getTime(),
      );
      setGroups(sortedGroups);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleDownload = async (row: PurchaseRow) => {
    if (row.source !== 'product' || !row.itemId) return;
    setDownloadingId(row.sourceId);
    try {
      const { url } = await invokePaymentFunction<{ url: string }>('get-seed-file', {
        productId: row.itemId,
        purpose: 'download',
      });
      if (!url) return;
      const a = document.createElement('a');
      a.href = url;
      a.download = row.itemTitle || 'seed';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.warn('get-seed-file download failed', err);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl p-4 space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/dashboard')}
        className="gap-2 px-0"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Button>

      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Sprout className="h-7 w-7 text-emerald-500" /> My Seeds
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Everything you've bestowed to, grouped by the sower who grew it.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sprout className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="font-semibold mb-1">Nothing bestowed yet</p>
            <p className="text-sm text-muted-foreground">
              Seeds you bestow to will show up here, grouped by sower.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.sowerId} className="space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                {group.sowerName}
              </h2>
              <div className="space-y-2">
                {group.rows.map((row) => {
                  const itemLink = row.source === 'product'
                    ? resolveItemLink({ itemId: row.itemId, itemSource: 'product' })
                    : null;
                  return (
                    <Card key={row.sourceId}>
                      <CardContent className="py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">
                              {row.itemTitle || (row.source === 'topup' ? 'Wallet top-up' : 'Bestowal')}
                            </p>
                            {row.status !== 'completed' && (
                              <Badge variant="outline" className="text-xs">{row.status}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {money(row.buyerTotal)} · {when(row.paidAt)}
                          </p>
                        </div>
                        {itemLink && (
                          <div className="flex items-center gap-2 shrink-0">
                            <Link to={itemLink}>
                              <Button size="sm" variant="outline" className="gap-1">
                                <PlayCircle className="h-4 w-4" /> Play
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              onClick={() => handleDownload(row)}
                              disabled={downloadingId === row.sourceId}
                              className="gap-1 bg-emerald-500 hover:bg-emerald-600"
                            >
                              {downloadingId === row.sourceId
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Download className="h-4 w-4" />}
                              Download
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
