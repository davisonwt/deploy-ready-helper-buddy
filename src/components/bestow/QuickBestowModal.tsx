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
import { useEffect, useState, type ChangeEvent } from 'react';
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
import { useExchangeRates, formatConvertedWithUsd } from '@/lib/currency/rates';
import { checkoutErrorMessage, isBlockingCheckoutError } from '@/lib/payments/checkoutErrors';
import { supabase } from '@/integrations/supabase/client';
import { deliveryAddressRequired, validateDeliveryAddress, type DeliveryAddress, type PocketType } from '@/lib/orchards/pocketRules';

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
   * P0-5 Phase A. The orchard's product_type, if the caller already knows
   * it; otherwise the modal looks it up when opened. A 'bestowal' pocket on
   * a physical orchard must carry a delivery address (collected here); a
   * 'gift' pocket funds a unit that goes to the sower as stock and needs
   * none.
   */
  orchardProductType?: string | null;
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
  orchardProductType,
  onSuccess,
}: QuickBestowModalProps) {
  const { user } = useAuth();
  const { rates } = useExchangeRates();
  const displayCurrency = (user?.preferred_currency || 'USD').toUpperCase();
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [sellerBlocked, setSellerBlocked] = useState(false);

  // Pocket kind + delivery address (P0-5 Phase A)
  const [productType, setProductType] = useState<string | null>(orchardProductType ?? null);
  const [pocketType, setPocketType] = useState<PocketType>('bestowal');
  const [address, setAddress] = useState<DeliveryAddress>({ name: '', line1: '', line2: '', city: '', region: '', postal_code: '', country: '', phone: '' });
  const needsAddress = deliveryAddressRequired(pocketType, productType);
  const addressProblem = needsAddress ? validateDeliveryAddress(address) : null;
  const setAddr = (k: keyof DeliveryAddress) => (e: ChangeEvent<HTMLInputElement>) =>
    setAddress((a) => ({ ...a, [k]: e.target.value }));

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
      setSellerBlocked(false);
      setPocketType('bestowal');
      setProductType(orchardProductType ?? null);
      if (orchardProductType == null && orchardId) {
        // The address rule depends on whether the orchard ships something.
        supabase.from('orchards').select('product_type').eq('id', orchardId).maybeSingle()
          .then(({ data }) => setProductType((data as any)?.product_type ?? 'physical'));
      }
    }
  }, [open, defaultAmount, orchardId, orchardProductType]);

  const handleBestow = async () => {
    if (!user) { toast.error('Please sign in to bestow.'); return; }
    if (!orchardId) { toast.error('No seed selected.'); return; }
    if (amount <= 0) { toast.error('Enter an amount greater than zero.'); return; }
    if (addressProblem) { toast.error(addressProblem); return; }

    setProcessing(true);
    try {
      const data = await invokePaymentFunction<{
        solanaPayment?: SolanaPaymentResponse;
        approveUrl?: string;
        balance?: { debited: true };
      }>(
        'create-orchard-bestowal-order',
        {
          orchardId, pocketsCount, provider: effectiveProvider, message: note || undefined, redirectBaseUrl: window.location.origin,
          pocketType,
          deliveryAddress: needsAddress ? address : undefined,
        },
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
      } else if (isBlockingCheckoutError(err)) {
        setSellerBlocked(true);
        toast.error(checkoutErrorMessage(err));
      } else {
        toast.error(checkoutErrorMessage(err) ?? 'Could not start the bestowal. Please try again.');
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

          <div data-testid="pocket-kind">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Pocket kind
            </label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="pocket-kind-bestowal"
                onClick={() => setPocketType('bestowal')}
                className={`rounded-md border px-3 py-2 text-left text-sm ${pocketType === 'bestowal' ? 'border-emerald-500 bg-emerald-500/10' : 'border-border hover:bg-muted'}`}
              >
                <div className="font-medium">Claim a unit</div>
                <div className="text-xs text-muted-foreground">You receive what this pocket funds.</div>
              </button>
              <button
                type="button"
                data-testid="pocket-kind-gift"
                onClick={() => setPocketType('gift')}
                className={`rounded-md border px-3 py-2 text-left text-sm ${pocketType === 'gift' ? 'border-emerald-500 bg-emerald-500/10' : 'border-border hover:bg-muted'}`}
              >
                <div className="font-medium">Gift a unit</div>
                <div className="text-xs text-muted-foreground">The sower keeps it as stock to sow.</div>
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Held for the orchard until every pocket is filled. No deadline; a cancelled orchard refunds you in full.
            </p>
          </div>

          {needsAddress && (
            <div data-testid="delivery-address" className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Delivery address (where your unit ships)
              </label>
              <Input placeholder="Full name" value={address.name} onChange={setAddr('name')} data-testid="addr-name" />
              <Input placeholder="Street address" value={address.line1} onChange={setAddr('line1')} data-testid="addr-line1" />
              <Input placeholder="Apartment, suite (optional)" value={address.line2 ?? ''} onChange={setAddr('line2')} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="City" value={address.city} onChange={setAddr('city')} data-testid="addr-city" />
                <Input placeholder="Region / province (optional)" value={address.region ?? ''} onChange={setAddr('region')} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Postal code" value={address.postal_code} onChange={setAddr('postal_code')} data-testid="addr-postal" />
                <Input placeholder="Country" value={address.country} onChange={setAddr('country')} data-testid="addr-country" />
              </div>
              <Input placeholder="Phone (optional)" value={address.phone ?? ''} onChange={setAddr('phone')} />
              {addressProblem && <p className="text-xs text-orange-600" data-testid="addr-problem">{addressProblem}</p>}
            </div>
          )}

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
          {sellerBlocked && (
            <p className="text-xs text-orange-600 dark:text-orange-400 text-right">
              {checkoutErrorMessage(new Error('sower_settlement_consent_pending'))}
            </p>
          )}
          <div className="text-xs text-muted-foreground text-right">
            Estimated processor fee: <span className="font-medium text-foreground">{feePreview.display}</span>
          </div>
          {displayCurrency !== 'USD' && (
            <div className="text-xs text-muted-foreground text-right">
              You'll pay <span className="font-medium text-foreground">{formatConvertedWithUsd(pricing.total, displayCurrency, rates)}</span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={processing}>Cancel</Button>
            <Button onClick={handleBestow} disabled={processing || sellerBlocked || amount <= 0 || !!addressProblem} className="gap-2" data-testid="bestow-submit">
              {processing && <Loader2 className="h-4 w-4 animate-spin" />}
              Bestow ${pricing.total.toFixed(2)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
