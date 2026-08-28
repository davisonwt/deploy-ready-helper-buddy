import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Heart } from 'lucide-react';
import ProviderPicker from '@/components/payments/ProviderPicker';
import type { PayoutProviderId } from '@/lib/payments/providerFees';

interface ConfirmBestowModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** What's being bestowed on — a track title, product title, etc. */
  title: string;
  /** Total amount the bestower will be charged. */
  amount: number;
  onConfirm: (provider: PayoutProviderId) => void | Promise<void>;
  confirming?: boolean;
  /** Defaults to "Bestow". Pass "Gift" for the gift-flavored call sites. */
  actionLabel?: string;
}

/**
 * Shared confirm-and-pick-provider modal for bestow/gift actions that fire
 * from a list row or grid card with nowhere to put a picker inline — no
 * existing pause step, no existing dialog. Reused across every call site
 * that had that exact shape rather than building one modal per site.
 */
export function ConfirmBestowModal({
  isOpen,
  onClose,
  title,
  amount,
  onConfirm,
  confirming = false,
  actionLabel = 'Bestow',
}: ConfirmBestowModalProps) {
  const [provider, setProvider] = useState<PayoutProviderId>('nowpayments');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !confirming && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate">{actionLabel} on "{title}"</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Payment method
          </div>
          <ProviderPicker value={provider} onChange={setProvider} amount={amount} mode="buyer" disabled={confirming} />

          <Button
            className="w-full"
            disabled={confirming}
            onClick={() => onConfirm(provider)}
          >
            {confirming ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Heart className="w-4 h-4 mr-2" />
            )}
            {confirming ? 'Processing...' : `${actionLabel} $${amount.toFixed(2)}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
