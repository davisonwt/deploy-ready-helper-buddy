import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PartyPopper, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface BookingConfirmedMetadata {
  booking_id: string;
  product_title: string;
  quantity: number;
  rate_unit: string;
  starts_at: string;
  total: number;
}

const RATE_UNIT_LABEL: Record<string, string> = {
  per_hour: 'hour(s)',
  per_job: 'job(s)',
  callout_quote: 'call-out',
};

/**
 * A paid booking's confirmation card — spec-service-seeds.md §7 step 4.
 * No download link (unlike BestowalReceiptMessage): a service has
 * nothing to download.
 */
export function BookingConfirmedMessage({ metadata }: { metadata: BookingConfirmedMetadata }) {
  const unitLabel = RATE_UNIT_LABEL[metadata.rate_unit] ?? metadata.rate_unit;
  const startLabel = metadata.starts_at ? format(new Date(metadata.starts_at), 'PP p') : '';

  return (
    <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-emerald-500/10 border-amber-500/20 max-w-md">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-amber-500/20">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-600 text-white shadow-lg">
          <PartyPopper className="h-4 w-4" />
          <span className="text-xs font-semibold">Booking confirmed</span>
        </div>
      </div>

      <p className="text-sm font-semibold mb-2">{metadata.product_title}</p>
      <div className="space-y-1 text-sm text-muted-foreground mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>{startLabel}</span>
        </div>
        <div className="flex justify-between">
          <span>Quantity</span>
          <span>{metadata.quantity} {unitLabel}</span>
        </div>
        <div className="flex justify-between font-semibold text-foreground">
          <span>Paid</span>
          <span>${Number(metadata.total || 0).toFixed(2)}</span>
        </div>
      </div>

      <Button asChild variant="outline" className="w-full">
        <Link to="/chatapp">Chat</Link>
      </Button>
    </Card>
  );
}
