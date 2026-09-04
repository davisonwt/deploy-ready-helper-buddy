import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useProductBasket } from '@/contexts/ProductBasketContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { GradientPlaceholder } from '@/components/ui/GradientPlaceholder';
import ProviderPicker from '@/components/payments/ProviderPicker';
import { quoteFee } from '@/lib/payments/providerFees';
import { WHISPER_SHARE_RATE, WHISPER_SHARE_PERCENT, WHISPER_FALLBACK_NOTE, WHISPER_STATUS_ACTIVE } from '@/lib/whisperer/policy';
import { getWhispererCredit } from '@/lib/whisperer/attribution';

import { invokePaymentFunction } from '@/lib/payments/invokeFunction';
import { presentSolanaPayment, type SolanaPaymentResponse } from '@/lib/payments/solanaPaymentGate';
import { s2gFeeOn, round2, buyerTotal as buyerTotalOf } from '@/lib/pricing/platformFee';
import { useBalanceProvider, isBalanceSuccess } from '@/hooks/useBalanceProvider';
import { checkoutErrorMessage, isBlockingCheckoutError } from '@/lib/payments/checkoutErrors';

export default function BestowalCheckout() {
  const { basketItems, removeFromBasket, totalAmount } = useProductBasket();
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [sellerBlocked, setSellerBlocked] = useState(false);

  // WHO gets the whisper share on each line?
  // A seed can have MANY approved whisperers — the share goes to the ONE whose
  // ref code brought this buyer here (see src/lib/whisperer/attribution.ts).
  // This is an ESTIMATE for display only: the server re-validates the code
  // against an ACTIVE assignment before a cent moves, and falls the share back
  // to the sower when nobody is credited.
  const [credited, setCredited] = useState<Record<string, { refCode: string }>>({});

  useEffect(() => {
    console.log('🛒 BestowalCheckout: Basket items', basketItems);
    setSellerBlocked(false);
  }, [basketItems]);

  useEffect(() => {
    const next: Record<string, { refCode: string }> = {};
    for (const it of basketItems as any[]) {
      const credit = getWhispererCredit(it.id);
      if (credit?.refCode) next[it.id] = { refCode: credit.refCode };
    }
    setCredited(next);
  }, [basketItems]);

  // Platform fee applies to every line, regardless of product type — the
  // sower sets the price (item.price), Sow2Grow's 15% is added on top.
  // Computed above the empty-basket early return below so useBalanceProvider
  // (a hook) is always called unconditionally, per the Rules of Hooks.
  const baseSubtotal = basketItems.reduce(
    (sum: number, item: any) => sum + Number(item.price || 0) * Math.max(1, Number(item.quantity ?? 1)),
    0,
  );
  const s2gFee = basketItems.reduce(
    (sum: number, item: any) => sum + s2gFeeOn(Number(item.price || 0)) * Math.max(1, Number(item.quantity ?? 1)),
    0,
  );
  const checkoutTotal = round2(baseSubtotal + s2gFee);
  const {
    provider, setProvider, providers, balanceShortBy, refetchBalance,
  } = useBalanceProvider(checkoutTotal);
  const effectiveProvider = provider;
  const feeQuote = quoteFee(effectiveProvider, checkoutTotal);

  const handleBestow = async () => {
    if (!user) {
      toast.error('Please login to complete bestowal');
      return;
    }
    if (basketItems.length === 0) return;

    setSellerBlocked(false);
    setProcessing(true);
    try {
      const items = basketItems.map((it: any) => {
        const credit = getWhispererCredit(it.id);
        return {
          productId: it.id,
          qty: Math.max(1, Number(it.quantity ?? 1)),
          // Whisperer credited with THIS sale (server re-validates the code).
          refCode: credit?.refCode ?? null,
          liveSessionId: credit?.liveSessionId ?? null,
          attributionSource: credit?.source ?? null,
        };
      });


      const data = await invokePaymentFunction<{ solanaPayment?: SolanaPaymentResponse; approveUrl?: string; balance?: { debited: true } }>(
        'create-basket-bestowal-order',
        {
          items,
          provider: effectiveProvider,
          redirectBaseUrl: window.location.origin,
        },
      );

      if (effectiveProvider === 'balance') {
        // Debited and finalized synchronously — no wallet popup, no redirect.
        if (isBalanceSuccess(data)) {
          toast.success('Bestowal complete!');
          refetchBalance();
        } else {
          throw new Error('Balance payment did not complete.');
        }
      } else if (effectiveProvider === 'solana') {
        if (!data.solanaPayment) throw new Error('No Solana payment details returned');
        // Do NOT clear basket while the payment screen is open — items stay
        // until it resolves 'paid' (or the buyer cancels/it expires) so a
        // cancelled or expired attempt can simply be retried.
        const resolution = await presentSolanaPayment(data.solanaPayment);
        if (resolution === 'paid') {
          toast.success('Bestowal complete!');
        }
      } else {
        // PayPal: full-page redirect to hosted approval.
        if (data.approveUrl) {
          window.location.href = data.approveUrl;
          return;
        }
        throw new Error('No PayPal approve URL returned');
      }
    } catch (err: any) {
      console.error('Basket bestowal error:', err);
      if (err?.message === 'insufficient_balance') {
        toast.error(`Your S2G Balance is short — top up $${balanceShortBy.toFixed(2)} to pay this way.`);
      } else if (isBlockingCheckoutError(err)) {
        setSellerBlocked(true);
        toast.error(checkoutErrorMessage(err));
      } else {
        toast.error(checkoutErrorMessage(err) || 'Bestowal failed. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  };

  if (basketItems.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShoppingCart className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg">Your basket is empty</p>
          <p className="text-sm text-muted-foreground mt-2">Add some products to get started!</p>
        </CardContent>
      </Card>
    );
  }

  // Only lines credited to an ACTIVE whisperer carry a whisper share; the rest
  // of the 15% stays with the sower.
  const whisperedSubtotal = basketItems.reduce(
    (sum: number, it: any) =>
      sum + (credited[it.id] ? Number(it.price || 0) * Math.max(1, Number(it.quantity ?? 1)) : 0),
    0,
  );
  const creditedNames = Array.from(
    new Set(basketItems.map((it: any) => credited[it.id]?.refCode).filter(Boolean)),
  ) as string[];

  const whisperFee = whisperedSubtotal * WHISPER_SHARE_RATE;
  const creatorShare = baseSubtotal - whisperFee;


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          Bestowal Basket
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AnimatePresence>
          {basketItems.map((item: any) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
            >
              {item.cover_image_url ? (
                <img src={item.cover_image_url} alt={item.title} className="w-16 h-16 object-cover rounded" />
              ) : (
                <GradientPlaceholder type={'product' as any} title={item.title} className="w-16 h-16 rounded" size="sm" />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold truncate">{item.title}</h4>
                <p className="text-sm text-muted-foreground">by {item.sowers?.display_name}</p>
                {Number(item.quantity ?? 1) > 1 && (
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  ${(buyerTotalOf(Number(item.price || 0)) * Math.max(1, Number(item.quantity ?? 1))).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">incl. 15% fee</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => removeFromBasket(item.id)} className="flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>

        <Separator />

        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>${baseSubtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Sow2Grow Fee (15% added on top)</span>
            <span className="text-accent">${s2gFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>To Sowers</span>
            <span className="text-primary">${creatorShare.toFixed(2)}</span>
          </div>
          {whisperFee > 0 ? (
            <div className="flex justify-between text-muted-foreground">
              <span>
                To {creditedNames.length === 1 ? creditedNames[0] : 'the whisperers who brought this sale'} ({WHISPER_SHARE_PERCENT}%)
              </span>
              <span className="text-accent">${whisperFee.toFixed(2)}</span>
            </div>
          ) : (
            <div className="flex justify-between text-xs text-muted-foreground/70">
              <span>{WHISPER_FALLBACK_NOTE}</span>
              <span>$0.00</span>
            </div>
          )}

          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total before processor fee</span>
            <span>${checkoutTotal.toFixed(2)} USD</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment method</div>
          <ProviderPicker
            value={effectiveProvider}
            onChange={setProvider}
            amount={checkoutTotal}
            mode="buyer"
            disabled={processing}
            providers={providers}
          />
          {balanceShortBy > 0 && (
            <p className="text-xs text-muted-foreground">
              Not enough in your S2G Balance to cover this —{' '}
              <Link to="/wallet" className="underline text-foreground">top up ${balanceShortBy.toFixed(2)} to pay this way</Link>.
            </p>
          )}
          <div className="text-xs text-muted-foreground text-right">
            Estimated processor fee on ${checkoutTotal.toFixed(2)}:{' '}
            <span className="font-medium text-foreground">{feeQuote.display}</span>
          </div>
          {sellerBlocked && (
            <p className="text-xs text-orange-600 dark:text-orange-400">
              {checkoutErrorMessage(new Error('sower_settlement_consent_pending'))}
            </p>
          )}
        </div>

        <Button onClick={handleBestow} disabled={processing || sellerBlocked} className="w-full" size="lg">
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Complete Bestowal
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          {effectiveProvider === 'balance'
            ? 'Debited instantly from your S2G Balance — no wallet, no redirect.'
            : `No bestowals are recorded until your payment is confirmed${effectiveProvider === 'paypal' ? ' by PayPal' : ' on-chain'}.`}
        </p>
      </CardContent>
    </Card>
  );
}
