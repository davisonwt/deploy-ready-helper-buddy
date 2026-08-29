import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { invokePaymentFunction } from '@/lib/payments/invokeFunction';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BookingResponseMetadata {
  booking_id: string;
  decision: 'accepted' | 'declined';
  product_title: string;
  total: number;
}

/**
 * The sower's Accept/Decline response, back in the grower's inbox.
 * Accept's Pay button — spec-service-seeds.md §7 step 3 — is enabled for
 * the grower once the live booking status still reads 'accepted';
 * clicking it invokes create-booking-paypal-order and redirects to
 * PayPal's approval page. Shows a "Paid" state once status flips to
 * 'paid' (set server-side by finalizeBooking on capture).
 */
export function BookingResponseMessage({ metadata }: { metadata: BookingResponseMetadata }) {
  const { user } = useAuth();
  const accepted = metadata.decision === 'accepted';

  const [status, setStatus] = useState<string | null>(null);
  const [growerId, setGrowerId] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(accepted);
  const [payingNow, setPayingNow] = useState(false);

  useEffect(() => {
    if (!accepted) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from('bookings')
        .select('status, grower_user_id')
        .eq('id', metadata.booking_id)
        .maybeSingle();
      if (!alive) return;
      setStatus((data as any)?.status ?? null);
      setGrowerId((data as any)?.grower_user_id ?? null);
      setLoadingStatus(false);
    })();
    return () => { alive = false; };
  }, [accepted, metadata.booking_id]);

  const handlePay = async () => {
    if (!user) { toast.error('Please log in to pay for this booking.'); return; }
    setPayingNow(true);
    try {
      const data = await invokePaymentFunction<{ approveUrl?: string }>('create-booking-paypal-order', {
        bookingId: metadata.booking_id,
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

      {accepted && !loadingStatus && !isPaid && isGrower && (
        <Button className="w-full" disabled={payingNow} onClick={handlePay}>
          {payingNow ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Pay ${Number(metadata.total || 0).toFixed(2)}
        </Button>
      )}

      {accepted && !loadingStatus && !isPaid && !isGrower && (
        <Button className="w-full" disabled title="Waiting for the grower to pay">
          Pay ${Number(metadata.total || 0).toFixed(2)} — Payment next
        </Button>
      )}
    </Card>
  );
}
