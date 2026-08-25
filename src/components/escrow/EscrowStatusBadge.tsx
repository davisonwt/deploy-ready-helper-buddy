import { Badge } from '@/components/ui/badge';
import { Lock, CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react';
import type { ReleaseStatus } from '@/api/escrow';

const MAP: Record<ReleaseStatus, { label: string; icon: typeof Lock; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  held: { label: 'Held in escrow', icon: Lock, variant: 'secondary' },
  released: { label: 'Released', icon: CheckCircle2, variant: 'default' },
  disputed: { label: 'Disputed', icon: AlertTriangle, variant: 'destructive' },
  refunded: { label: 'Refunded', icon: RotateCcw, variant: 'outline' },
};

export default function EscrowStatusBadge({ status }: { status: ReleaseStatus | string }) {
  const conf = MAP[(status as ReleaseStatus)] ?? MAP.released;
  const Icon = conf.icon;
  return (
    <Badge variant={conf.variant} className="gap-1">
      <Icon className="w-3 h-3" />
      {conf.label}
    </Badge>
  );
}
