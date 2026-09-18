import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { invokePaymentFunction } from '@/lib/payments/invokeFunction';
import { formatNativeAmount } from '@/lib/sleeping/currency';
import { railsForCurrency, noRailMessage, type RailId } from '@/lib/payments/railAvailability';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';

/** The booking edge function's own provider union -- Solana has no booking branch. */
type BookingProvider = Extract<RailId, 'paypal' | 'paystack'>;
const BOOKING_RAILS: readonly RailId[] = ['paypal', 'paystack'];

interface BookingResponseMetadata {
  booking_id: string;
  decision: 'accepted' | 'declined';
  product_title: string;
  total: number;
}

/**
 * The sower's Accept/Decline response, back in the grower's inbox.
 *
 * The amount is shown in the BOOKING's own currency, which the database
 * sets from the listing and the browser cannot choose. This button used to
 * read `Pay ${total}` with a hardcoded dollar sign, so an R1,650 booking
 * offered "Pay $1650.00" and PayPal then charged 1650 US dollars. A rail
 * that cannot charge the listing's currency is no longer offered at all --
 * blocked with a reason, not relabelled.
 */
export function BookingResponseMessage({ metadata }: { metadata: BookingResponseMetadata }) {
  const { user } = useAuth();
  const accepted = metadata.decision === 'accepted';

  const [status, setStatus] = useState<string | null>(null);
  const [growerId, setGrowerId] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(accepted);
  const [payingNow, setPayingNow] = useState(false);
  const [provider, setProvider] = useState<BookingProvider | null>(null);

  useEffect(() => {
    if (!accepted) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from('bookings')
        .select('status, grower_user_id, currency')
        .eq('id', metadata.booking_id)
        .maybeSingle();
      if (!alive) return;
      setStatus((data as any)?.status ?? null);
      setGrowerId((data as any)?.grower_user_id ?? null);
      setCurrency((data as any)?.currency ?? null);
      setLoadingStatus(false);
    })();
    return () => { alive = false; };
  }, [accepted, metadata.booking_id]);

  const rails = railsForCurrency(currency, BOOKING_RAILS);
  const selected = provider ?? (rails.available[0]?.id as BookingProvider | undefined) ?? null;
  const priceLabel = currency
    ? formatNativeAmount(Number(metadata.total || 0), currency)
    : `${Number(metadata.total || 0).toFixed(2)}`;

  const handlePay = async () => {
    if (!user) { toast.error('Please log in to pay for this booking.'); return; }
    if (!selected) return;
    setPayingNow(true);
    try {
      const data = await invokePaymentFunction<{ approveUrl?: string }>('create-booking-paypal-order', {
        bookingId: metadata.booking_id,
        provider: selected,
        redirectBaseUrl: window.location.origin,
      });
      if (!data?.approveUrl) throw new Error('No approval link returned.');
      window.location.href = data.approveUrl;
    } catch (err) {
      console.error('Booking payment start failed:', err);
      toast.error(err instanceof Error ? err.message : 'Could not start payment. Please try again.');
      setPayingNow(false);
    }
  };

  const isGrower = !!user && user.id === growerId;
  const isPaid = status === 'paid';

  return (
    <Card
      className={`p-4 max-w-md ${
        accepted
          ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20'
          : 'bg-muted/40 border-border'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        {accepted ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <XCircle className="h-5 w-5 text-muted-foreground" />
        )}
        <span className="text-sm font-semibold">{accepted ? 'Booking accepted' : 'Booking declined'}</span>
      </div>
      <p className="text-sm text-muted-foreground mb-3">{metadata.product_title}</p>

      {accepted && !loadingStatus && isPaid && (
        <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
          <CheckCircle2 className="h-4 w-4" /> Paid
        </div>
      )}

      {accepted && !loadingStatus && !isPaid && isGrower && rails.none && (
        <div className="space-y-2">
          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/50 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{noRailMessage(currency)}</p>
          </div>
          <p className="text-sm font-semibold">{priceLabel}</p>
        </div>
      )}

      {accepted && !loadingStatus && !isPaid && isGrower && !rails.none && (
        <div className="space-y-2">
          {rails.available.length > 1 && (
            <div className="flex gap-2">
              {rails.available.map((rail) => (
                <Button
                  key={rail.id}
                  type="button"
                  size="sm"
                  variant={selected === rail.id ? 'default' : 'outline'}
                  disabled={payingNow}
                  onClick={() => setProvider(rail.id as BookingProvider)}
                  className="flex-1"
                >
                  {rail.label}
                </Button>
              ))}
            </div>
          )}
          <Button className="w-full" disabled={payingNow} onClick={handlePay}>
            {payingNow ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Pay {priceLabel}
          </Button>
          {rails.blocked.map((rail) => (
            <p key={rail.id} className="text-xs text-muted-foreground">{rail.reason}</p>
          ))}
        </div>
      )}

      {accepted && !loadingStatus && !isPaid && !isGrower && !rails.none && (
        <Button className="w-full" disabled title="Waiting for the grower to pay">
          Pay {priceLabel} — Payment next
        </Button>
      )}

      {/* The sower is told the same truth as the buyer. "Payment next" on a
          booking nothing can charge is a promise the app cannot keep. */}
      {accepted && !loadingStatus && !isPaid && !isGrower && rails.none && (
        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/50 p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {priceLabel} — no payment method can charge {rails.currency || 'this currency'} yet, so this booking cannot be paid for online.
          </p>
        </div>
      )}
    </Card>
  );
}
