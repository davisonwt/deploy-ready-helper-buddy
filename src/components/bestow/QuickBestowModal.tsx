/**
 * QuickBestowModal — universal in-place bestow modal.
 *
 * Used from:
 *   • LivingSeedCard live-stage Bestow button (guest)
 *   • LiveStage now-playing Bestow button (radio guest)
 *   • Tribe / grove feed Bestow button on every seed
 *
 * Provider selection: buyer picks S2G Balance, direct Solana USDC, or
 * PayPal before confirming, with fee estimate shown per choice. All three
 * go through the single create-orchard-bestowal-order function (provider
 * switch, same pattern as create-basket-bestowal-order):
 *   • balance → debited + finalized synchronously, no wallet, no redirect
 *   • solana  → QR/deep-link shown inline, no redirect
 *   • paypal  → full-page redirect to approval
 * In every case the bestowal row is created server-side with the buyer-side
 * processor fee broken out, and post-payment chat notes are pre-staged.
 */
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { invokePaymentFunction } from '@/lib/payments/invokeFunction';
import { presentSolanaPayment, type SolanaPaymentResponse } from '@/lib/payments/solanaPaymentGate';
import ProviderPicker from '@/components/payments/ProviderPicker';
import { MIN_CRYPTO_BESTOWAL_USD, quoteFee, type PayoutProviderId } from '@/lib/payments/providerFees';
import { priceBreakdown, round2 } from '@/lib/pricing/platformFee';
import { useBalanceProvider, isBalanceSuccess } from '@/hooks/useBalanceProvider';

export interface QuickBestowModalProps {
  open: boolean;
  onClose: () => void;
  orchardId: string;
  seedTitle: string;
  sowerUserId?: string;
  hostUserId?: string | null;
  whispererSharePct?: number;
  defaultAmount?: number;
  /**
   * Exact pocket count being purchased (defaults to 1, the "quick bestow"
   * case). Basket checkout passes pockets-selected × quantity so the
   * invoice/order actually charges for what was chosen, not just one pocket.
   */
  pocketsCount?: number;
  /**
   * Basket checkout: locks the amount field to defaultAmount (no free typing,
   * no quick-amount buttons) and displays defaultAmount directly rather than
   * priceBreakdown(amount) — orchard pocket_price is already the full charge
   * (see create-solana-bestowal-order/create-paypal-order, no separate
   * gross-up applied), so grossing it up again here would show a total buyers aren't
   * actually charged.
   */
  lockAmount?: boolean;
  /**
   * Fires once invoice/order creation actually succeeds (payment initiated),
   * before the tab opens (crypto) or the redirect happens (PayPal). Never
   * call basket-item removal from onClose — that also fires on Cancel.
   */
  onSuccess?: () => void;
}

export default function QuickBestowModal({
  open, onClose,
  orchardId, seedTitle,
  hostUserId, whispererSharePct = 10,
  defaultAmount = 5,
  pocketsCount = 1,
  lockAmount = false,
  onSuccess,
}: QuickBestowModalProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);

  // The server grosses base up by S2G's 15% before charging (see
  // create-orchard-bestowal-order) — the processor fee estimate and the
  // amount shown here must be computed on that S2G-inclusive total, not the
  // raw base, or both numbers understate what's charged. Computed above the
  // useBalanceProvider call (a hook) so it stays unconditional per the
  // Rules of Hooks.
  const pricing = lockAmount
    ? { base: defaultAmount, s2gFee: 0, total: round2(defaultAmount) }
    : priceBreakdown(amount);
  const belowCryptoMin = pricing.total < MIN_CRYPTO_BESTOWAL_USD;
  const { provider, setProvider, providers, balanceShortBy, refetchBalance } = useBalanceProvider(pricing.total);
  const effectiveProvider: PayoutProviderId = belowCryptoMin ? 'paypal' : provider;
  const effectiveProviders = belowCryptoMin ? ['paypal'] : providers;
  const feePreview = quoteFee(effectiveProvider, pricing.total);

  useEffect(() => {
    if (open) {
      setAmount(defaultAmount);
      setNote('');
      setProvider('solana');
    }
  }, [open, defaultAmount]);

  const handleBestow = async () => {
    if (!user) { toast.error('Please sign in to bestow.'); return; }
    if (!orchardId) { toast.error('No seed selected.'); return; }
    if (amount <= 0) { toast.error('Enter an amount greater than zero.'); return; }

    setProcessing(true);
    try {
      const data = await invokePaymentFunction<{
        solanaPayment?: SolanaPaymentResponse;
        approveUrl?: string;
        balance?: { debited: true };
      }>(
        'create-orchard-bestowal-order',
        { orchardId, pocketsCount, provider: effectiveProvider, message: note || undefined, redirectBaseUrl: window.location.origin },
      );

      if (effectiveProvider === 'balance') {
        if (isBalanceSuccess(data)) {
          onSuccess?.();
          toast.success('Bestowal complete!');
          refetchBalance();
        } else {
          throw new Error('Balance payment did not complete.');
        }
      } else if (effectiveProvider === 'solana') {
        if (data.solanaPayment) {
          onSuccess?.();
          const resolution = await presentSolanaPayment(data.solanaPayment);
          if (resolution === 'paid') {
            toast.success('Bestowal complete!');
          }
        }
      } else {
        if (data.approveUrl) {
          // Post-bestowal chat notes (thank-yous + receipt) are posted
          // server-side once the order actually finalizes — see
          // supabase/functions/_shared/postFinalize/messaging.ts.
          onSuccess?.();
          window.location.href = data.approveUrl;
          return;
        }
      }

      onClose();
    } catch (err: any) {
      console.error('Bestowal initiation failed:', err);
      if (err?.message === 'insufficient_balance') {
        toast.error(`Your S2G Balance is short — top up $${balanceShortBy.toFixed(2)} to pay this way.`);
      } else {
        toast.error(err?.message ?? 'Could not start the bestowal. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-500" /> Bestow on “{seedTitle}”
          </DialogTitle>
          <DialogDescription>
            Sower receives the majority; a 15% platform fee supports Sow2Grow operations
            {hostUserId ? `; ${whispererSharePct}% goes to the live host.` : '.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount (USD)</label>
            <Input
              type="number"
              min={1}
              step={0.5}
              value={amount}
              disabled={lockAmount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            />
            {lockAmount ? (
              <p className="text-xs text-muted-foreground mt-1">
                Set by your basket selection — {pocketsCount} pocket{pocketsCount === 1 ? '' : 's'}.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {[5, 10, 25, 50, 100].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(v)}
                    className={`rounded-full border px-2.5 py-0.5 text-xs ${
                      amount === v ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600' : 'border-border hover:bg-muted'
                    }`}
                  >${v}</button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Payment method
            </label>
            {belowCryptoMin && (
              <p className="text-xs text-muted-foreground mt-1">
                Crypto has a ${MIN_CRYPTO_BESTOWAL_USD} minimum — pay with PayPal for smaller amounts.
              </p>
            )}
            <div className="mt-1">
              <ProviderPicker
                value={effectiveProvider}
                onChange={setProvider}
                amount={pricing.total}
                mode="buyer"
                disabled={processing}
                providers={effectiveProviders}
              />
            </div>
            {!belowCryptoMin && balanceShortBy > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Not enough in your S2G Balance — top up ${balanceShortBy.toFixed(2)} to pay this way.
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Bestowal note (optional — sent in 1-on-1 chat)
            </label>
            <Input
              placeholder="Thank you for sowing this seed…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-xs text-muted-foreground text-right">
            Estimated processor fee: <span className="font-medium text-foreground">{feePreview.display}</span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={processing}>Cancel</Button>
            <Button onClick={handleBestow} disabled={processing || amount <= 0} className="gap-2">
              {processing && <Loader2 className="h-4 w-4 animate-spin" />}
              Bestow ${pricing.total.toFixed(2)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
