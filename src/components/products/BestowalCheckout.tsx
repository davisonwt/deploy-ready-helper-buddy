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
import { getWhispererFor } from '@/lib/whisperer/attribution';

export default function BestowalCheckout() {
  const { basketItems, removeFromBasket, totalAmount } = useProductBasket();
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [provider, setProvider] = useState<PayoutProviderId>('nowpayments');

  // WHO gets the whisper share on each line?
  // A seed can have MANY approved whisperers — the share goes to the ONE whose
  // share link brought this buyer here (see src/lib/whisperer/attribution.ts).
  // No credited whisperer => the share falls back to the sower (creator).
  const [credited, setCredited] = useState<Record<string, { whispererId: string; name: string }>>({});

  useEffect(() => {
    console.log('🛒 BestowalCheckout: Basket items', basketItems);
  }, [basketItems]);

  useEffect(() => {
    const ids = basketItems.map((it: any) => it.id).filter(Boolean);
    if (ids.length === 0) {
      setCredited({});
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('product_whisperer_assignments')
        .select('product_id, book_id, orchard_id, status, whisperer_id, whisperers:whisperer_id (id, display_name)')
        .eq('status', WHISPER_STATUS_ACTIVE) // only sower-approved links can be paid
        .or(
          `product_id.in.(${ids.join(',')}),book_id.in.(${ids.join(',')}),orchard_id.in.(${ids.join(',')})`,
        );
      if (cancelled) return;
      if (error) {
        console.warn('Whisperer lookup failed, assuming none:', error.message);
        setCredited({});
        return;
      }
      const next: Record<string, { whispererId: string; name: string }> = {};
      for (const itemId of ids) {
        const attributed = getWhispererFor(itemId);
        if (!attributed) continue; // nobody brought this sale -> sower keeps it
        const match = (data ?? []).find(
          (row: any) =>
            row.whisperer_id === attributed &&
            [row.product_id, row.book_id, row.orchard_id].includes(itemId),
        );
        if (match) {
          next[itemId] = {
            whispererId: attributed,
            name: (match as any).whisperers?.display_name || 'Whisperer',
          };
        }
      }
      setCredited(next);
    })();
    return () => { cancelled = true; };
  }, [basketItems]);



  const handleBestow = async () => {
    if (!user) {
      toast.error('Please login to complete bestowal');
      return;
    }
    if (basketItems.length === 0) return;

    setProcessing(true);
    try {
      const items = basketItems.map((it: any) => ({
        productId: it.id,
        qty: Math.max(1, Number(it.quantity ?? 1)),
        // Whisperer credited with THIS sale (server re-validates the link).
        whispererId: getWhispererFor(it.id),
      }));

      const data = await invokePaymentFunction<any>('create-basket-bestowal-order', {
        items,
        provider,
        payCurrency: provider === 'nowpayments' ? 'usdcsol' : undefined,
      });

      if (!data) throw new Error('The payment service returned an empty response.');

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

  const feeQuote = quoteFee(provider, totalAmount);

  // Only lines credited to an ACTIVE whisperer carry a whisper share; the rest
  // of the 15% stays with the sower.
  const whisperedSubtotal = basketItems.reduce(
    (sum: number, it: any) =>
      sum + (credited[it.id] ? Number(it.price || 0) * Math.max(1, Number(it.quantity ?? 1)) : 0),
    0,
  );
  const creditedNames = Array.from(
    new Set(basketItems.map((it: any) => credited[it.id]?.name).filter(Boolean)),
  ) as string[];
  const platformFee = totalAmount * 0.1;
  const adminFee = totalAmount * 0.05;
  const whisperFee = whisperedSubtotal * WHISPER_SHARE_RATE;
  const creatorShare = totalAmount - platformFee - adminFee - whisperFee;


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
                <p className="font-semibold">${item.price}</p>
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
            <span>${totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Platform Fee (10%)</span>
            <span className="text-purple-400">${platformFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Admin Fee (5%)</span>
            <span>${adminFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>To Creators ({totalAmount > 0 ? Math.round((creatorShare / totalAmount) * 100) : 0}%)</span>
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
            <span>Total</span>
            <span>${totalAmount.toFixed(2)} USD</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment method</div>
          <ProviderPicker value={provider} onChange={setProvider} amount={totalAmount} mode="buyer" disabled={processing} />
          <div className="text-xs text-muted-foreground text-right">
            Estimated processor fee on ${totalAmount.toFixed(2)}:{' '}
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
