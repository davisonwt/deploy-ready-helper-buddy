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

export default function BestowalCheckout() {
  const { basketItems, removeFromBasket, totalAmount } = useProductBasket();
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [provider, setProvider] = useState<PayoutProviderId>('nowpayments');

  useEffect(() => {
    console.log('🛒 BestowalCheckout: Basket items', basketItems);
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
      }));

      const { data, error } = await supabase.functions.invoke('create-basket-bestowal-order', {
        body: {
          items,
          provider,
          payCurrency: provider === 'nowpayments' ? 'usdcsol' : undefined,
        },
      });

      if (error) throw new Error(error.message || 'Failed to create order');
      if (!data || data.error) throw new Error(data?.error || 'unknown_error');

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
            <span className="text-purple-400">${(totalAmount * 0.1).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Admin Fee (5%)</span>
            <span>${(totalAmount * 0.05).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>To Creators (70%)</span>
            <span className="text-primary">${(totalAmount * 0.7).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>To Product Whispers (15%)</span>
            <span className="text-accent">${(totalAmount * 0.15).toFixed(2)}</span>
          </div>
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
