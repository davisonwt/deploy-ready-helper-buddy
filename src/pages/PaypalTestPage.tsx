// Dev-only test page for the PayPal inbound rail.
// Route: /dev/paypal-test (gated to admin/gosat via AppRoutes).
// Lets you create a real PayPal order against any active orchard whose owner
// has a paypal_email user_wallets row, and watch the bestowals row update via
// Realtime as webhooks arrive.

import { useState } from 'react';
import { usePaypal } from '@/hooks/usePaypal';
import { useBestowalStatus } from '@/hooks/useNowPayments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PaypalTestPage() {
  const { createOrder, redirectToApprove } = usePaypal();
  const [orchardId, setOrchardId] = useState('');
  const [pockets, setPockets] = useState(1);
  const [bestowalId, setBestowalId] = useState<string | null>(null);
  const [approveUrl, setApproveUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { status } = useBestowalStatus(bestowalId);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const order = await createOrder({
        orchardId,
        pocketsCount: pockets,
        redirectBaseUrl: window.location.origin,
      });
      setBestowalId(order.bestowalId);
      setOrderId(order.orderId);
      setApproveUrl(order.approveUrl);
      setBreakdown(order.breakdown as unknown as Record<string, number>);
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
          <CardTitle>PayPal Test (dev)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="orch">Orchard ID</Label>
            <Input
              id="orch"
              value={orchardId}
              onChange={(e) => setOrchardId(e.target.value)}
              placeholder="uuid of an active orchard (owner needs paypal_email wallet)"
            />
          </div>
          <div>
            <Label htmlFor="pockets">Pockets</Label>
            <Input
              id="pockets"
              type="number"
              min={1}
              value={pockets}
              onChange={(e) => setPockets(Number(e.target.value))}
            />
          </div>
          <Button onClick={submit} disabled={loading || !orchardId}>
            {loading ? 'Creating…' : 'Create PayPal order'}
          </Button>
          {error && <p className="text-destructive text-sm">{error}</p>}
        </CardContent>
      </Card>

      {breakdown && (
        <Card>
          <CardHeader><CardTitle>Fee breakdown</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div>Base: ${breakdown.baseAmount}</div>
            <div>
              Processor fee ({((breakdown.processorFeePct ?? 0) * 100).toFixed(2)}%): ${breakdown.processorFee}
            </div>
            <div className="font-semibold">
              Buyer pays: ${breakdown.buyerTotal} {breakdown.currency}
            </div>
          </CardContent>
        </Card>
      )}

      {approveUrl && (
        <Card>
          <CardHeader><CardTitle>Approve order</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm break-all">
            <Button onClick={() => redirectToApprove(approveUrl)}>
              Go to PayPal to approve
            </Button>
            <a
              className="text-primary underline block"
              href={approveUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open in new tab
            </a>
            <div>Order ID: <code>{orderId}</code></div>
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
