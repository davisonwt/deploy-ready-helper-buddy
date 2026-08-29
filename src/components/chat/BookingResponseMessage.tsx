import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle } from 'lucide-react';

interface BookingResponseMetadata {
  booking_id: string;
  decision: 'accepted' | 'declined';
  product_title: string;
  total: number;
}

/**
 * The sower's Accept/Decline response, back in the grower's inbox.
 * Accept's Pay button is deliberately disabled — spec-service-seeds.md
 * §7 step 3 (PayPal order path) is a later step, not this one.
 */
export function BookingResponseMessage({ metadata }: { metadata: BookingResponseMetadata }) {
  const accepted = metadata.decision === 'accepted';
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
      {accepted && (
        <Button className="w-full" disabled title="Payment next">
          Pay ${Number(metadata.total || 0).toFixed(2)} — Payment next
        </Button>
      )}
    </Card>
  );
}
