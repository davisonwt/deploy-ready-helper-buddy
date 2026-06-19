// Dev-only test page for the NOWPayments inbound rail.
// Route: /dev/nowpay-test (gated to admin/gosat via AppRoutes).
// Lets you create a real invoice against any active orchard and watch the
// bestowals row update via Realtime as IPNs arrive.

import { useState } from 'react';
import { useNowPayments, useBestowalStatus } from '@/hooks/useNowPayments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NowPaymentsTestPage() {
  const { createInvoice } = useNowPayments();
  const [orchardId, setOrchardId] = useState('');
  const [pockets, setPockets] = useState(1);
  const [payCurrency, setPayCurrency] = useState('usdttrc20');
  const [bestowalId, setBestowalId] = useState<string | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { status } = useBestowalStatus(bestowalId);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const inv = await createInvoice({
        orchardId,
        pocketsCount: pockets,
        payCurrency,
        redirectBaseUrl: window.location.origin,
      });
      setBestowalId(inv.bestowalId);
      setInvoiceUrl(inv.invoiceUrl ?? null);
      setBreakdown(inv.breakdown as unknown as Record<string, number>);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>NOWPayments Test (dev)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="orch">Orchard ID</Label>
            <Input
              id="orch"
              value={orchardId}
              onChange={(e) => setOrchardId(e.target.value)}
              placeholder="uuid of an active orchard"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="pockets">Pockets</Label>
              <Input
                id="pockets"
                type="number"
                min={1}
                value={pockets}
                onChange={(e) => setPockets(Number(e.target.value))}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="pay">Pay currency</Label>
              <Input
                id="pay"
                value={payCurrency}
                onChange={(e) => setPayCurrency(e.target.value)}
                placeholder="usdttrc20 / btc / eth / ..."
              />
            </div>
          </div>
          <Button onClick={submit} disabled={loading || !orchardId}>
            {loading ? 'Creating…' : 'Create invoice'}
          </Button>
          {error && <p className="text-destructive text-sm">{error}</p>}
        </CardContent>
      </Card>

      {breakdown && (
        <Card>
          <CardHeader><CardTitle>Fee breakdown</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div>Base: ${breakdown.baseAmount}</div>
            <div>Processor fee ({((breakdown.processorFeePct ?? 0) * 100).toFixed(2)}%): ${breakdown.processorFee}</div>
            <div className="font-semibold">Buyer pays: ${breakdown.buyerTotal} {breakdown.currency}</div>
          </CardContent>
        </Card>
      )}

      {invoiceUrl && (
        <Card>
          <CardHeader><CardTitle>Invoice</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm break-all">
            <a className="text-primary underline" href={invoiceUrl} target="_blank" rel="noreferrer">
              Open NOWPayments invoice
            </a>
            <div>Bestowal ID: <code>{bestowalId}</code></div>
          </CardContent>
        </Card>
      )}

      {status && (
        <Card>
          <CardHeader><CardTitle>Live status (Realtime)</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div>payment_status: <b>{status.payment_status}</b></div>
            <div>payout_status: <b>{status.payout_status}</b></div>
            <div>payout_reference: <code>{status.payout_reference ?? '—'}</code></div>
            {status.payout_error && (
              <div className="text-destructive">payout_error: {status.payout_error}</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
