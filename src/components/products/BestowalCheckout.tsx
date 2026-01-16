import { useState, useEffect } from 'react';
import { useProductBasket } from '@/contexts/ProductBasketContext';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Trash2, LogIn, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GradientPlaceholder } from '@/components/ui/GradientPlaceholder';
import { launchConfetti, floatingScore, playSoundEffect } from '@/utils/confetti';
import { NowPaymentsButton } from '@/components/payment/NowPaymentsButton';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function BestowalCheckout() {
  const { basketItems, removeFromBasket, clearBasket, totalAmount } = useProductBasket();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Debug: Log basket items
  useEffect(() => {
    console.log('🛒 BestowalCheckout: Basket items', basketItems);
    console.log('🛒 BestowalCheckout: localStorage productBasket', localStorage.getItem('productBasket'));
  }, [basketItems]);

  // Calculate distribution breakdown
  const tithingAmount = totalAmount * 0.10;
  const adminFee = totalAmount * 0.05;
  const creatorsAmount = totalAmount * 0.70;
  const whispersAmount = totalAmount * 0.15;

  // Prepare product items for payment
  const productItems = basketItems.map(item => ({
    id: item.id,
    title: item.title,
    price: Number(item.price),
    sower_id: item.sower_id,
  }));

  const handlePaymentSuccess = (bestowalId: string, invoiceUrl: string) => {
    console.log('✅ Payment initiated:', { bestowalId, invoiceUrl });
    playSoundEffect('bestow', 0.7);
    floatingScore(totalAmount);
    launchConfetti();
    // Basket will be cleared after successful payment via webhook
    // or user can clear manually after returning
  };

  const handlePaymentError = (error: Error) => {
    console.error('❌ Payment error:', error);
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
            <span className="text-purple-400">${tithingAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Admin Fee (5%)</span>
            <span>${adminFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>To Creators (70%)</span>
            <span className="text-primary">${creatorsAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>To Product Whispers (15%)</span>
            <span className="text-accent">${whispersAmount.toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>${totalAmount.toFixed(2)} USD</span>
          </div>
        </div>

        {/* Payment Info */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Payment via NOWPayments - pay with crypto, card, bank transfer, or PayPal. 
            All fees are included in the total.
          </AlertDescription>
        </Alert>

        {!user ? (
          <Button
            onClick={() => navigate('/auth')}
            className="w-full"
            size="lg"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Login to Complete Bestowal
          </Button>
        ) : (
          <NowPaymentsButton
            amount={totalAmount}
            paymentType="product"
            productItems={productItems}
            disabled={basketItems.length === 0}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            className="w-full"
            buttonText="Complete Bestowal"
            variant="default"
            size="lg"
          />
        )}

        <p className="text-xs text-center text-muted-foreground">
          By completing this bestowal, you support creators and help grow the community.
          Funds are held securely until delivery is confirmed.
        </p>
      </CardContent>
    </Card>
  );
}
