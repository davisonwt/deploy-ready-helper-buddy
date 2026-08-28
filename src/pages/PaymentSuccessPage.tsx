import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProductBasket } from '@/contexts/ProductBasketContext';
import { launchConfetti, floatingScore, playSoundEffect } from '@/utils/confetti';
import { invokePaymentFunction } from '@/lib/payments/invokeFunction';

type OrderKind = 'basket' | 'content' | 'gift' | 'topup';
type OrderStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

interface ActiveOrder {
  kind: OrderKind;
  id: string;
  table: string;
  statusColumn: string;
  amountColumn: string;
}

// The ?bestowal= param covers both gift AND orchard bestowals — both are
// rows in `bestowals` and finalize identically (see
// supabase/functions/_shared/paypal/capture.ts), so nothing here needs to
// tell them apart. 'gift' is just the kind label sent to capture-paypal-order;
// its table config is identical for either.
function resolveActiveOrder(searchParams: URLSearchParams): ActiveOrder | null {
  const basket = searchParams.get('basket');
  if (basket) return { kind: 'basket', id: basket, table: 'basket_orders', statusColumn: 'status', amountColumn: 'buyer_total' };
  const purchase = searchParams.get('purchase');
  if (purchase) return { kind: 'content', id: purchase, table: 'content_purchases', statusColumn: 'payment_status', amountColumn: 'buyer_total_amount' };
  const bestowal = searchParams.get('bestowal');
  if (bestowal) return { kind: 'gift', id: bestowal, table: 'bestowals', statusColumn: 'payment_status', amountColumn: 'buyer_total_amount' };
  const topup = searchParams.get('topup');
  if (topup) return { kind: 'topup', id: topup, table: 'topups', statusColumn: 'status', amountColumn: 'amount' };
  return null;
}

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clearBasket } = useProductBasket();
  const active = useMemo(() => resolveActiveOrder(searchParams), [searchParams]);

  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const celebratedRef = useRef(false);
  const captureRequestedRef = useRef(false);

  // PayPal requires an explicit capture after the buyer approves the order.
  // paypal-webhook also captures server-side, for every kind — this
  // authenticated call recovers orders when PayPal delivers that webhook
  // late or not at all.
  useEffect(() => {
    if (!active || captureRequestedRef.current) return;
    captureRequestedRef.current = true;
    invokePaymentFunction('capture-paypal-order', { kind: active.kind, recordId: active.id }).catch((error) => {
      console.warn('PayPal capture recovery failed', error);
    });
  }, [active]);

  // Poll the order's status column until completed/failed/expired.
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 60; // ~3 minutes at 3s

    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      const { data, error } = await supabase
        .from(active.table)
        .select(`${active.statusColumn}, ${active.amountColumn}`)
        .eq('id', active.id)
        .maybeSingle();

      if (!cancelled && data) {
        const row = data as Record<string, unknown>;
        const rowStatus = row[active.statusColumn] as OrderStatus;
        setStatus(rowStatus);
        const rowAmount = row[active.amountColumn];
        if (rowAmount != null) setAmount(Number(rowAmount));
        if (rowStatus === 'completed' && !celebratedRef.current) {
          celebratedRef.current = true;
          if (active.kind === 'basket') {
            try { clearBasket(); } catch { /* ignore */ }
          }
          try { playSoundEffect('bestow', 0.7); } catch { /* ignore */ }
          try { floatingScore(Number(rowAmount ?? 0)); } catch { /* ignore */ }
          try { launchConfetti(); } catch { /* ignore */ }
          return; // stop polling
        }
        if (rowStatus === 'failed' || rowStatus === 'expired') {
          return; // stop polling
        }
      }
      if (!cancelled && error) console.warn('order status poll error', error);
      if (!cancelled && attempts < maxAttempts) {
        setTimeout(tick, 3000);
      }
    };
    tick();

    return () => { cancelled = true; };
  }, [active, clearBasket]);

  const showProcessing = !!active && status !== 'completed' && status !== 'failed' && status !== 'expired';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
            {showProcessing ? (
              <Loader2 className="h-10 w-10 text-green-600 animate-spin" />
            ) : (
              <CheckCircle className="h-10 w-10 text-green-600" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {active
              ? status === 'completed'
                ? 'Bestowal Complete!'
                : status === 'failed' || status === 'expired'
                ? 'Payment Not Completed'
                : 'Confirming Your Payment...'
              : 'Payment Initiated!'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          {active ? (
            <>
              <p className="text-muted-foreground">
                {status === 'completed'
                  ? `Thank you! Your bestowal${amount ? ` totalling $${amount.toFixed(2)}` : ''} has been recorded and creators will be paid out automatically.`
                  : status === 'failed' || status === 'expired'
                  ? 'We did not receive a confirmed payment from your provider. No bestowals were recorded. You can try again.'
                  : 'We are waiting for the payment processor to confirm your transaction. This page will update automatically — no need to refresh.'}
              </p>

              <div className="bg-muted/50 p-4 rounded-lg text-sm text-left space-y-1">
                <p className="font-semibold">Reference</p>
                <p className="text-muted-foreground break-words">
                  Order: <span className="font-mono text-xs">{active.id}</span>
                </p>
                {status && (
                  <p className="text-muted-foreground">Status: <span className="font-mono text-xs">{status}</span></p>
                )}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">
              Thank you for supporting this seed. The processor is confirming your transaction and we&apos;ll distribute your bestowal automatically according to the bestowal map.
            </p>
          )}

          <div className="bg-muted/50 p-4 rounded-lg text-sm text-left space-y-2">
            <p className="font-semibold">Distribution Overview</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>✓ 15% → Platform Fee (s2gbestow)</li>
              <li>✓ 70% → Sower (orchard owner)</li>
              <li>✓ 15% → Product Whisperer (falls back to the sower when none was involved)</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              <ArrowRight className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
            <Button onClick={() => navigate('/wandering-directory')} variant="outline" className="w-full">
              Browse More
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
