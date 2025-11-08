import { useState } from 'react';
import { useProductBasket } from '@/contexts/ProductBasketContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function BestowalCheckout() {
  const { basketItems, removeFromBasket, clearBasket, totalAmount } = useProductBasket();
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);

  const handleBestow = async () => {
    if (!user) {
      toast.error('Please login to complete bestowal');
      return;
    }

    setProcessing(true);

    try {
      // Process each item in basket
      for (const item of basketItems) {
        const amount = Number(item.price);
        const s2gFee = amount * 0.10; // 10% platform fee
        const sowerAmount = amount * 0.70; // 70% to sower
        const growerAmount = amount * 0.20; // 20% to grower

        // Create bestowal record
        const { error: bestowError } = await supabase
          .from('product_bestowals')
          .insert([{
            bestower_id: user.id,
            product_id: item.id,
            sower_id: item.sower_id,
            amount,
            s2g_fee: s2gFee,
            sower_amount: sowerAmount,
            grower_amount: growerAmount,
            status: 'completed'
          }]);

        if (bestowError) throw bestowError;

        // Update product bestowal count
        const { error: updateError } = await supabase
          .from('products')
          .update({ 
            bestowal_count: item.bestowal_count + 1 
          })
          .eq('id', item.id);

        if (updateError) throw updateError;
      }

      toast.success('Bestowal completed successfully!', {
        description: 'Thank you for supporting our creators!'
      });
      clearBasket();
    } catch (error) {
      console.error('Bestowal error:', error);
      toast.error('Bestowal failed. Please try again.');
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
          <p className="text-sm text-muted-foreground mt-2">
            Add some products to get started!
          </p>
        </CardContent>
      </Card>
    );
  }

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
          {basketItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
            >
              <img
                src={item.cover_image_url || '/placeholder.svg'}
                alt={item.title}
                className="w-16 h-16 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold truncate">{item.title}</h4>
                <p className="text-sm text-muted-foreground">
                  by {item.sowers?.display_name}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">${item.price}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => removeFromBasket(item.id)}
                className="flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>

        <Separator />

        {/* Distribution Breakdown */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>${totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>To Creators (70%)</span>
            <span className="text-primary">${(totalAmount * 0.70).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>To Growers (20%)</span>
            <span className="text-accent">${(totalAmount * 0.20).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Platform Fee (10%)</span>
            <span>${(totalAmount * 0.10).toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>${totalAmount.toFixed(2)} USDC</span>
          </div>
        </div>

        <Button
          onClick={handleBestow}
          disabled={processing}
          className="w-full"
          size="lg"
        >
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
          By completing this bestowal, you support creators and help grow the community
        </p>
      </CardContent>
    </Card>
  );
}
