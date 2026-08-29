import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { CalendarClock, Loader2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface BookingRequestMetadata {
  booking_id: string;
  product_title: string;
  quantity: number;
  rate_unit: string;
  starts_at: string;
  ends_at?: string | null;
  note?: string | null;
  amount: number;
  s2g_fee: number;
  total: number;
}

const RATE_UNIT_LABEL: Record<string, string> = {
  per_hour: 'hour(s)',
  per_job: 'job(s)',
  callout_quote: 'call-out',
};

const usd = (n: number) => `$${Number(n || 0).toFixed(2)}`;

/**
 * Booking request card, spec-service-seeds.md §7 steps 1-2. Same visual
 * pattern as BestowalReceiptMessage (a Card keyed off a distinct
 * chat_messages.message_type), plus the Accept/Decline action-button
 * pattern VerificationButton established — except the action here writes
 * to `bookings` + posts the response message directly (RLS already lets
 * the sower do both as themselves; no edge function needed for this
 * part, only for the 15-min cron expiry, which runs server-side either
 * way).
 */
export function BookingRequestMessage({
  metadata,
  roomId,
  isOwnMessage,
}: {
  metadata: BookingRequestMetadata;
  roomId: string;
  isOwnMessage: boolean;
}) {
  const { user } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [responding, setResponding] = useState<'accepted' | 'declined' | null>(null);

  // The live status, not what's frozen in this message's own metadata —
  // another device, or the 15-min expiry cron, may have already resolved
  // it since this message was posted.
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from('bookings')
        .select('status')
        .eq('id', metadata.booking_id)
        .maybeSingle();
      if (!alive) return;
      setStatus((data as any)?.status ?? null);
      setLoadingStatus(false);
    })();
    return () => { alive = false; };
  }, [metadata.booking_id]);

  const respond = async (decision: 'accepted' | 'declined') => {
    if (!user) return;
    setResponding(decision);
    try {
      // Only succeeds if still 'requested' — guards against a race with
      // the expiry cron resolving it a moment earlier.
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: decision })
        .eq('id', metadata.booking_id)
        .eq('status', 'requested')
        .select()
        .maybeSingle();
      if (error || !data) {
        toast.error('This booking request is no longer open.');
        setStatus((prev) => prev ?? 'expired');
        return;
      }
      setStatus(decision);

      await supabase.from('chat_messages').insert({
        room_id: roomId,
        sender_id: user.id,
        content: decision === 'accepted'
          ? `✅ Booking accepted for "${metadata.product_title}"`
          : `❌ Booking declined for "${metadata.product_title}"`,
        message_type: 'booking_response',
        system_metadata: {
          is_system: false,
          type: 'booking_response',
          booking_id: metadata.booking_id,
          decision,
          product_title: metadata.product_title,
          total: metadata.total,
        },
      });
    } catch (err) {
      console.error('Booking response failed:', err);
      toast.error('Could not respond to this booking. Please try again.');
    } finally {
      setResponding(null);
    }
  };

  const unitLabel = RATE_UNIT_LABEL[metadata.rate_unit] ?? metadata.rate_unit;
  const startLabel = metadata.starts_at ? format(new Date(metadata.starts_at), 'PP p') : '';

  return (
    <Card className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20 max-w-md">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-green-500/20">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-600 text-white shadow-lg">
          <CalendarClock className="h-4 w-4" />
          <span className="text-xs font-semibold">Booking request</span>
        </div>
      </div>

      <p className="text-sm font-semibold mb-1">{metadata.product_title}</p>
      <div className="space-y-1 text-xs text-muted-foreground mb-3">
        <div className="flex justify-between"><span>When</span><span>{startLabel}</span></div>
        <div className="flex justify-between"><span>Quantity</span><span>{metadata.quantity} {unitLabel}</span></div>
        {metadata.note && <p className="pt-1 italic">"{metadata.note}"</p>}
      </div>

      <Separator className="my-2" />

      <div className="flex justify-between text-sm font-bold">
        <span>Total</span>
        <span>{usd(metadata.total)}</span>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Rate × quantity</span>
        <span>{usd(metadata.amount)}</span>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Sow2Grow fee (15%)</span>
        <span>{usd(metadata.s2g_fee)}</span>
      </div>

      {!loadingStatus && status === 'requested' && !isOwnMessage && (
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            disabled={!!responding}
            onClick={() => respond('accepted')}
          >
            {responding === 'accepted' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            disabled={!!responding}
            onClick={() => respond('declined')}
          >
            {responding === 'declined' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
            Decline
          </Button>
        </div>
      )}
      {!loadingStatus && status && status !== 'requested' && (
        <p className="mt-3 text-xs font-medium text-muted-foreground capitalize">Status: {status}</p>
      )}
    </Card>
  );
}
