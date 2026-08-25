import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoles } from '@/hooks/useRoles';
import { fetchEscrowQueue, gosatResolveEscrow, type EscrowBestowal } from '@/api/escrow';
import EscrowStatusBadge from '@/components/escrow/EscrowStatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, LayoutDashboard, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const money = (n: number | null | undefined) => `$${Number(n || 0).toFixed(2)}`;
const when = (d?: string | null) => (d ? new Date(d).toLocaleString() : '—');

export default function EscrowQueuePage() {
  const navigate = useNavigate();
  const { isAdminOrGosat, loading: rolesLoading } = useRoles();
  const [rows, setRows] = useState<EscrowBestowal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await fetchEscrowQueue());
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not load the escrow queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!rolesLoading && isAdminOrGosat) load();
    else if (!rolesLoading) setLoading(false);
  }, [rolesLoading, isAdminOrGosat]);

  const resolve = async (row: EscrowBestowal, action: 'release' | 'refund') => {
    setBusy(row.id);
    try {
      await gosatResolveEscrow(row.id, action);
      toast.success(action === 'release' ? 'Released to the sower' : 'Marked refunded');
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  if (!rolesLoading && !isAdminOrGosat) {
    return (
      <div className="container mx-auto max-w-2xl p-8 text-center">
        <p className="text-muted-foreground">This escrow queue is for GoSats only.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
          <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
        </Button>
      </div>

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ShieldCheck className="h-6 w-6" /> Escrow Queue
        </h1>
        <p className="text-sm text-muted-foreground">
          Bestowals S2G is holding. Releasing pays the sower and any whisperer at once.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing is being held right now.</p>
      ) : (
        rows.map((row) => (
          <Card key={row.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{row.products?.title ?? 'Seed'}</CardTitle>
                <EscrowStatusBadge status={row.release_status} />
              </div>
              <CardDescription>
                {money(row.amount)} · sower {money(row.sower_amount)} · S2G {money(row.s2g_fee)}
                {Number(row.whisperer_amount) > 0 ? ` · whisperer ${money(row.whisperer_amount)}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                <span>Bought: {when(row.created_at)}</span>
                <span>Sent: {when(row.shipped_at)}</span>
                <span>Delivered: {when(row.delivered_at)}</span>
                <span>Auto-release: {when(row.auto_release_at)}</span>
              </div>
              {row.dispute_reason && (
                <p className="text-sm text-destructive">Issue: {row.dispute_reason}</p>
              )}
              <div className="flex gap-2">
                <Button size="sm" disabled={busy === row.id} onClick={() => resolve(row, 'release')}>
                  Release to sower
                </Button>
                <Button size="sm" variant="destructive" disabled={busy === row.id} onClick={() => resolve(row, 'refund')}>
                  Refund bestower
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
