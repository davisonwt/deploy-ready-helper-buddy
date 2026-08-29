import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProductBasket } from '@/contexts/ProductBasketContext';
import { launchConfetti, floatingScore, playSoundEffect } from '@/utils/confetti';
import { invokePaymentFunction } from '@/lib/payments/invokeFunction';
import { backOutFee, round2 } from '@/lib/pricing/platformFee';

type OrderKind = 'basket' | 'content' | 'gift' | 'topup' | 'booking';
type OrderStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired' | 'accepted' | 'paid';

interface ActiveOrder {
  kind: OrderKind;
  id: string;
  table: string;
  statusColumn: string;
  amountColumn: string;
  // Processor fee (PayPal/crypto's own cut) is stored separately from the
  // fee-inclusive subtotal on every one of these tables — needed so the
  // Distribution Overview can back S2G's 15% out of the subtotal alone
  // rather than out of the full buyer_total, and show the processor's cut
  // as its own line, matching BestowalReceiptMessage.tsx exactly.
  // null for booking — bookings has no processor_fee column (see
  // create-booking-paypal-order's own header for why); its total is
  // charged as-is, no processor cut layered on top yet.
  processorFeeColumn: string | null;
}

// The ?bestowal= param covers both gift AND orchard bestowals — both are
// rows in `bestowals` and finalize identically (see
// supabase/functions/_shared/paypal/capture.ts), so nothing here needs to
// tell them apart. 'gift' is just the kind label sent to capture-paypal-order;
// its table config is identical for either.
function resolveActiveOrder(searchParams: URLSearchParams): ActiveOrder | null {
  const basket = searchParams.get('basket');
  if (basket) return { kind: 'basket', id: basket, table: 'basket_orders', statusColumn: 'status', amountColumn: 'buyer_total', processorFeeColumn: 'processor_fee' };
  const purchase = searchParams.get('purchase');
  if (purchase) return { kind: 'content', id: purchase, table: 'content_purchases', statusColumn: 'payment_status', amountColumn: 'buyer_total_amount', processorFeeColumn: 'processor_fee_amount' };
  const bestowal = searchParams.get('bestowal');
  if (bestowal) return { kind: 'gift', id: bestowal, table: 'bestowals', statusColumn: 'payment_status', amountColumn: 'buyer_total_amount', processorFeeColumn: 'processor_fee_amount' };
  const topup = searchParams.get('topup');
  if (topup) return { kind: 'topup', id: topup, table: 'topups', statusColumn: 'status', amountColumn: 'amount', processorFeeColumn: 'fee_amount' };
  const booking = searchParams.get('booking');
  if (booking) return { kind: 'booking', id: booking, table: 'bookings', statusColumn: 'status', amountColumn: 'total', processorFeeColumn: null };
  return null;
}

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clearBasket } = useProductBasket();
  const active = useMemo(() => resolveActiveOrder(searchParams), [searchParams]);

  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [processorFee, setProcessorFee] = useState<number | null>(null);
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
      const cols = [active.statusColumn, active.amountColumn, active.processorFeeColumn]
        .filter((c): c is string => !!c)
        .join(', ');
      const { data, error } = await supabase
        .from(active.table)
        .select(cols)
        .eq('id', active.id)
        .maybeSingle();

      if (!cancelled && data) {
        const row = data as Record<string, unknown>;
        const rowStatus = row[active.statusColumn] as OrderStatus;
        setStatus(rowStatus);
        const rowAmount = row[active.amountColumn];
        if (rowAmount != null) setAmount(Number(rowAmount));
        const rowProcessorFee = active.processorFeeColumn ? row[active.processorFeeColumn] : null;
        setProcessorFee(rowProcessorFee != null ? Number(rowProcessorFee) : 0);
        // Every other kind's terminal success value is 'completed' —
        // bookings.status uses 'paid' instead (it also carries the
        // pre-payment request/accept/decline lifecycle, which none of the
        // other tables' status columns do).
        const isDone = rowStatus === 'completed' || (active.kind === 'booking' && rowStatus === 'paid');
        if (isDone && !celebratedRef.current) {
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

  const isOrderDone = !!active && (status === 'completed' || (active.kind === 'booking' && status === 'paid'));
  const showProcessing = !!active && !isOrderDone && status !== 'failed' && status !== 'expired';

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
              ? isOrderDone
                ? active.kind === 'booking' ? 'Booking Paid!' : 'Bestowal Complete!'
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
                {isOrderDone
                  ? active.kind === 'booking'
                    ? `Paid! Your booking${amount ? ` totalling $${amount.toFixed(2)}` : ''} is confirmed — check the chat for the details.`
                    : `Thank you! Your bestowal${amount ? ` totalling $${amount.toFixed(2)}` : ''} has been recorded and creators will be paid out automatically.`
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

          {active?.kind === 'topup' ? (
            amount != null && (
              <div className="bg-muted/50 p-4 rounded-lg text-sm text-left space-y-1">
                <p className="font-semibold">Distribution Overview</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>✓ ${amount.toFixed(2)} → credited to your Sow2Grow wallet balance (no platform fee on top-ups)</li>
                  {!!processorFee && (
                    <li>✓ ${processorFee.toFixed(2)} → Payment Processor Fee</li>
                  )}
                </ul>
              </div>
            )
          ) : (
            amount != null && processorFee != null && (() => {
              // `amount` is the buyer-paid gross including the processor's
              // own cut (PayPal/crypto) — that processor fee is charged on
              // top of the fee-inclusive subtotal, not folded into S2G's
              // 15%. Back the fee out of the subtotal alone (subtotal =
              // amount - processorFee), matching the receipt
              // (BestowalReceiptMessage.tsx) exactly rather than backing
              // 15% out of the processor-inclusive total.
              const subtotal = round2(amount - processorFee);
              const { base, s2gFee } = backOutFee(subtotal);
              return (
                <div className="bg-muted/50 p-4 rounded-lg text-sm text-left space-y-2">
                  <p className="font-semibold">Distribution Overview</p>
                  <ul className="space-y-1 text-muted-foreground">
                    {!!processorFee && (
                      <li>✓ ${processorFee.toFixed(2)} → Payment Processor Fee</li>
                    )}
                    <li>✓ ${s2gFee.toFixed(2)} → Platform Fee (Sow2Grow, 15%)</li>
                    <li>✓ up to ${base.toFixed(2)} → Sower (a Product Whisperer's share, if one applied, comes out of this — never on top)</li>
                  </ul>
                </div>
              );
            })()
          )}

          <div className="flex flex-col gap-3">
            {active?.kind === 'topup' ? (
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                <ArrowRight className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Button>
            ) : active?.kind === 'booking' ? (
              <Button onClick={() => navigate('/chatapp')} className="w-full">
                <ArrowRight className="mr-2 h-4 w-4" />
                See the confirmation in chat
              </Button>
            ) : (
              <Button onClick={() => navigate('/my-seeds')} className="w-full">
                <ArrowRight className="mr-2 h-4 w-4" />
                See what you bestowed to
              </Button>
            )}
            <Button onClick={() => navigate('/wandering-directory')} variant="outline" className="w-full">
              Browse More
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
