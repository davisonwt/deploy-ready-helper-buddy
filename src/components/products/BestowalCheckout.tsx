import { useState, useEffect } from 'react';
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
import { PayoutProviderId, quoteFee } from '@/lib/payments/providerFees';
import { WHISPER_SHARE_RATE, WHISPER_SHARE_PERCENT, WHISPER_FALLBACK_NOTE, WHISPER_STATUS_ACTIVE } from '@/lib/whisperer/policy';
import { getWhispererCredit } from '@/lib/whisperer/attribution';

import { invokePaymentFunction } from '@/lib/payments/invokeFunction';
import { musicSingleBreakdown } from '@/lib/pricing/music';

export default function BestowalCheckout() {
  const { basketItems, removeFromBasket, totalAmount } = useProductBasket();
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [provider, setProvider] = useState<PayoutProviderId>('nowpayments');

  // WHO gets the whisper share on each line?
  // A seed can have MANY approved whisperers — the share goes to the ONE whose
  // ref code brought this buyer here (see src/lib/whisperer/attribution.ts).
  // This is an ESTIMATE for display only: the server re-validates the code
  // against an ACTIVE assignment before a cent moves, and falls the share back
  // to the sower when nobody is credited.
  const [credited, setCredited] = useState<Record<string, { refCode: string }>>({});

  useEffect(() => {
    console.log('🛒 BestowalCheckout: Basket items', basketItems);
  }, [basketItems]);

  useEffect(() => {
    const next: Record<string, { refCode: string }> = {};
    for (const it of basketItems as any[]) {
      const credit = getWhispererCredit(it.id);
      if (credit?.refCode) next[it.id] = { refCode: credit.refCode };
    }
    setCredited(next);
  }, [basketItems]);



  const handleBestow = async () => {
    if (!user) {
      toast.error('Please login to complete bestowal');
      return;
    }
    if (basketItems.length === 0) return;

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


      const data = await invokePaymentFunction<any>('create-basket-bestowal-order', {
        items,
        provider,
        payCurrency: provider === 'nowpayments' ? 'usdcsol' : undefined,
        redirectBaseUrl: window.location.origin,
      });

      if (provider === 'nowpayments') {
        if (data.invoiceUrl) {
          window.open(data.invoiceUrl, '_blank');
        }
        toast.success('Invoice opened in a new tab', {
          description: 'Complete the crypto payment. Your bestowals will appear once the payment is confirmed.',
        });
        // Do NOT clear basket — items stay until webhook-confirmed completion
        // (visible on the success page) so the buyer can retry if they close
        // the invoice tab without paying.
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
      toast.error(err?.message || 'Bestowal failed. Please try again.');
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

  const isMusicItem = (item: any) => {
    const classification = String(item.type || item.category || '').toLowerCase();
    return classification === 'music'
      || classification === 'audio'
      || String(item.music_genre || '').trim().length > 0
      || /\.(mp3|m4a|wav|flac|aac|ogg)(\?|$)/i.test(String(item.file_url || ''));
  };
  const baseSubtotal = basketItems.reduce(
    (sum: number, item: any) => sum + (isMusicItem(item)
      ? musicSingleBreakdown().base
      : Number(item.price || 0)) * Math.max(1, Number(item.quantity ?? 1)),
    0,
  );
  const s2gMusicFee = basketItems.reduce(
    (sum: number, item: any) => sum + (isMusicItem(item)
      ? musicSingleBreakdown().s2gFee * Math.max(1, Number(item.quantity ?? 1))
      : 0),
    0,
  );
  const checkoutTotal = baseSubtotal + s2gMusicFee;
  const feeQuote = quoteFee(provider, checkoutTotal);

  // Only lines credited to an ACTIVE whisperer carry a whisper share; the rest
  // of the 15% stays with the sower.
  const whisperedSubtotal = basketItems.reduce(
    (sum: number, it: any) =>
      sum + (credited[it.id]
        ? (isMusicItem(it) ? musicSingleBreakdown().base : Number(it.price || 0)) * Math.max(1, Number(it.quantity ?? 1))
        : 0),
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
                  ${(isMusicItem(item) ? musicSingleBreakdown().base : Number(item.price || 0)).toFixed(2)}
                </p>
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
          {s2gMusicFee > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Sow2Grow Fee (15% added on top)</span>
              <span className="text-accent">${s2gMusicFee.toFixed(2)}</span>
            </div>
          )}
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
          <ProviderPicker value={provider} onChange={setProvider} amount={checkoutTotal} mode="buyer" disabled={processing} />
          <div className="text-xs text-muted-foreground text-right">
            Estimated processor fee on ${checkoutTotal.toFixed(2)}:{' '}
            <span className="font-medium text-foreground">{feeQuote.display}</span>
          </div>
        </div>

        <Button onClick={handleBestow} disabled={processing} className="w-full" size="lg">
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
          No bestowals are recorded until your payment is confirmed by {provider === 'nowpayments' ? 'NOWPayments' : 'PayPal'}.
        </p>
      </CardContent>
    </Card>
  );
}
