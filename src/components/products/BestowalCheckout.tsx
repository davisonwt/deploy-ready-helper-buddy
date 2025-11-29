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
import { launchConfetti } from '@/utils/confetti';

export default function BestowalCheckout() {
  const { basketItems, removeFromBasket, clearBasket, totalAmount } = useProductBasket();
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  
  // Debug: Log basket items
  useEffect(() => {
    console.log('🛒 BestowalCheckout: Basket items', basketItems);
    console.log('🛒 BestowalCheckout: localStorage productBasket', localStorage.getItem('productBasket'));
  }, [basketItems]);

  const handleBestow = async () => {
    if (!user) {
      toast.error('Please login to complete bestowal');
      return;
    }

    setProcessing(true);

    try {
      // Process each item in basket using secure edge function
      for (const item of basketItems) {
        const amount = Number(item.price);

        // Call edge function to handle bestowal completion, messaging, and accounting
        const { data, error } = await supabase.functions.invoke('complete-product-bestowal', {
          body: {
            productId: item.id,
            amount: amount,
            sowerId: item.sower_id,
          },
        });

        if (error) {
          console.error('Product bestowal error:', error);
          throw new Error(error.message || 'Failed to complete bestowal');
        }

        if (!data?.success) {
          throw new Error(data?.message || 'Bestowal completion failed');
        }
      }

      toast.success('Bestowal completed successfully!', {
        description: 'Thank you for supporting our sowers! Check your chat for invoice and messages.'
      });
      clearBasket();
    } catch (error) {
      console.error('Bestowal error:', error);
      toast.error(error instanceof Error ? error.message : 'Bestowal failed. Please try again.');
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
              {item.cover_image_url ? (
                <img
                  src={item.cover_image_url}
                  alt={item.title}
                  className="w-16 h-16 object-cover rounded"
                />
              ) : (
                <GradientPlaceholder 
                  type={'product' as any} 
                  title={item.title}
                  className="w-16 h-16 rounded"
                  size="sm"
                />
              )}
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
            <span>Tithing (10%)</span>
            <span className="text-purple-400">${(totalAmount * 0.10).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Admin Fee (5%)</span>
            <span>${(totalAmount * 0.05).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>To Creators (70%)</span>
            <span className="text-primary">${(totalAmount * 0.70).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>To Product Whispers (15%)</span>
            <span className="text-accent">${(totalAmount * 0.15).toFixed(2)}</span>
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
