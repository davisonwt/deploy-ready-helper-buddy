import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Heart } from 'lucide-react';
import ProviderPicker from '@/components/payments/ProviderPicker';
import { CRYPTO_ROUNDING_NOTICE, computeBuyerFeeExact, type PayoutProviderId } from '@/lib/payments/providerFees';
import { priceBreakdown } from '@/lib/pricing/platformFee';
import { useBalanceProvider } from '@/hooks/useBalanceProvider';

interface ConfirmBestowModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** What's being bestowed on — a track title, product title, etc. */
  title: string;
  /**
   * The BASE amount -- what the sower/recipient receives (a product's
   * stored price, a gift's typed amount). The modal itself grosses this
   * up with the shared priceBreakdown (S2G's 15%) plus the selected
   * provider's exact processor fee, so the confirm button always reads
   * the amount the server will actually charge. This modal used to
   * display `amount` verbatim, which showed a $2.00 seed's button as
   * "Bestow $2.00" while the Solana intent was (correctly) $2.31.
   */
  amount: number;
  onConfirm: (provider: PayoutProviderId) => void | Promise<void>;
  confirming?: boolean;
  /** Defaults to "Bestow". Pass "Gift" for the gift-flavored call sites. */
  actionLabel?: string;
  /** Set after a create-*-order call returns sower_settlement_consent_pending -- disables the pay button and shows why, until the caller resets it (e.g. on retry or closing the modal). */
  blockedMessage?: string | null;
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
  blockedMessage = null,
}: ConfirmBestowModalProps) {
  // Base -> +15% S2G (shared rule) -> + the selected provider's exact
  // processor fee (client mirror of the server's computeBuyerFee).
  const pricing = priceBreakdown(amount);
  const { provider, setProvider, providers, balanceShortBy } = useBalanceProvider(pricing.total);
  const effectiveProvider = provider;
  const charge = computeBuyerFeeExact(effectiveProvider, pricing.total);

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
          <ProviderPicker
            value={effectiveProvider}
            onChange={setProvider}
            amount={pricing.total}
            mode="buyer"
            disabled={confirming}
            providers={providers}
          />
          {balanceShortBy > 0 && (
            <p className="text-xs text-muted-foreground">
              Not enough in your S2G Balance — top up ${balanceShortBy.toFixed(2)} to pay this way.
            </p>
          )}
          {effectiveProvider === 'solana' && (
            <p className="text-xs text-muted-foreground">{CRYPTO_ROUNDING_NOTICE}</p>
          )}
          {blockedMessage && (
            <p className="text-xs text-orange-600 dark:text-orange-400">{blockedMessage}</p>
          )}

          <Button
            className="w-full"
            disabled={confirming || !!blockedMessage}
            onClick={() => onConfirm(effectiveProvider)}
          >
            {confirming ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Heart className="w-4 h-4 mr-2" />
            )}
            {confirming ? 'Processing...' : `${actionLabel} $${charge.total.toFixed(2)}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
