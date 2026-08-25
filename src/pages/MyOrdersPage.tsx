import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchMyPurchases,
  fetchMySales,
  confirmDelivery,
  raiseDeliveryIssue,
  markDeliveryProgress,
  summariseEarnings,
  type EscrowBestowal,
} from '@/api/escrow';
import EscrowStatusBadge from '@/components/escrow/EscrowStatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { ArrowLeft, LayoutDashboard, Loader2, Package, Truck } from 'lucide-react';
import { toast } from 'sonner';

const money = (n: number | null | undefined) => `$${Number(n || 0).toFixed(2)}`;
const when = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : null);

function Line({ row, children }: { row: EscrowBestowal; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{row.products?.title ?? 'Seed'}</p>
          <EscrowStatusBadge status={row.release_status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {money(row.amount)} · {row.delivery_type === 'physical' ? 'Physical delivery' : 'Digital delivery'}
          {when(row.created_at) ? ` · ${when(row.created_at)}` : ''}
        </p>
        {row.release_status === 'held' && (
          <p className="text-xs text-muted-foreground">
            {row.delivered_at
              ? `Marked delivered — auto-releases ${when(row.auto_release_at) ?? 'shortly'}`
              : row.shipped_at
                ? 'On its way to you'
                : 'Waiting for the sower to send it'}
          </p>
        )}
        {row.release_status === 'disputed' && row.dispute_reason && (
          <p className="text-xs text-destructive">Issue: {row.dispute_reason}</p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">{children}</div>
    </div>
  );
}

export default function MyOrdersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<EscrowBestowal[]>([]);
  const [sales, setSales] = useState<EscrowBestowal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [issueFor, setIssueFor] = useState<EscrowBestowal | null>(null);
  const [issueText, setIssueText] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [p, s] = await Promise.all([fetchMyPurchases(user.id), fetchMySales(user.id)]);
      setPurchases(p);
      setSales(s);
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not load your orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  const totals = useMemo(() => summariseEarnings(sales), [sales]);

  const act = async (id: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(id);
    try {
      await fn();
      toast.success(ok);
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  const submitIssue = async () => {
    if (!issueFor) return;
    if (issueText.trim().length < 5) {
      toast.error('Please describe the problem');
      return;
    }
    const target = issueFor;
    setIssueFor(null);
    await act(target.id, () => raiseDeliveryIssue(target.id, issueText.trim()), 'Issue raised — a GoSat will review it');
    setIssueText('');
  };

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
        <h1 className="text-2xl font-bold">My Orders &amp; Earnings</h1>
        <p className="text-sm text-muted-foreground">
          S2G holds every bestowal for a physical seed until you confirm it arrived. Digital seeds release straight away.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <Tabs defaultValue="purchases">
          <TabsList>
            <TabsTrigger value="purchases">I bestowed ({purchases.length})</TabsTrigger>
            <TabsTrigger value="sales">I sowed ({sales.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="purchases" className="space-y-3 pt-4">
            {purchases.length === 0 && (
              <p className="text-sm text-muted-foreground">No bestowals yet.</p>
            )}
            {purchases.map((row) => (
              <Line key={row.id} row={row}>
                {row.release_status === 'held' && (
                  <>
                    <Button
                      size="sm"
                      disabled={busy === row.id}
                      onClick={() => act(row.id, () => confirmDelivery(row.id), 'Delivery confirmed — the sower has been paid')}
                    >
                      <Package className="mr-2 h-4 w-4" /> Confirm delivery
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === row.id}
                      onClick={() => { setIssueFor(row); setIssueText(''); }}
                    >
                      Raise an issue
                    </Button>
                  </>
                )}
              </Line>
            ))}
          </TabsContent>

          <TabsContent value="sales" className="space-y-3 pt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">My bestowal balance</CardTitle>
                <CardDescription>
                  After the 15% S2G share and any whisperer commission.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Held in escrow</p>
                  <p className="text-lg font-semibold">{money(totals.held)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Available</p>
                  <p className="text-lg font-semibold">{money(totals.available)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Paid out</p>
                  <p className="text-lg font-semibold">{money(totals.paid)}</p>
                </div>
              </CardContent>
            </Card>

            {sales.length === 0 && (
              <p className="text-sm text-muted-foreground">No bestowals received yet.</p>
            )}
            {sales.map((row) => (
              <Line key={row.id} row={row}>
                {row.release_status === 'held' && !row.shipped_at && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === row.id}
                    onClick={() => act(row.id, () => markDeliveryProgress(row.id, 'shipped'), 'Marked as sent')}
                  >
                    <Truck className="mr-2 h-4 w-4" /> Mark sent
                  </Button>
                )}
                {row.release_status === 'held' && !row.delivered_at && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === row.id}
                    onClick={() => act(row.id, () => markDeliveryProgress(row.id, 'delivered'), 'Marked delivered — releases in 3 days')}
                  >
                    Mark delivered
                  </Button>
                )}
                <span className="self-center text-sm text-muted-foreground">
                  You: {money(row.sower_amount)}
                </span>
              </Line>
            ))}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={!!issueFor} onOpenChange={(o) => !o && setIssueFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise an issue</DialogTitle>
            <DialogDescription>
              The bestowal stays held by S2G until a GoSat reviews it. Nothing is paid out in the meantime.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={issueText}
            onChange={(e) => setIssueText(e.target.value)}
            placeholder="What went wrong with this delivery?"
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueFor(null)}>Cancel</Button>
            <Button onClick={submitIssue}>Submit issue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
