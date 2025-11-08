import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Wallet, Download, Lock, Clock, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface PurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaItem: any;
  onPurchaseComplete: () => void;
}

export function PurchaseModal({ open, onOpenChange, mediaItem, onPurchaseComplete }: PurchaseModalProps) {
  const { user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'crypto'>('stripe');
  const [processing, setProcessing] = useState(false);

  const priceUSD = (mediaItem?.price_cents || 0) / 100;

  const handlePurchase = async () => {
    if (!user) {
      toast.error('Please log in to purchase');
      return;
    }

    setProcessing(true);

    try {
      // Call edge function to process purchase
      const { data, error } = await supabase.functions.invoke('purchase-media', {
        body: {
          mediaId: mediaItem.id,
          paymentMethod,
          buyerId: user.id,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Purchase successful! File delivered to your chat.');
        onPurchaseComplete();
        onOpenChange(false);

        // Open chat room if provided
        if (data.chatRoomId) {
          setTimeout(() => {
            window.location.href = `/chatapp?room=${data.chatRoomId}`;
          }, 1500);
        }
      } else {
        throw new Error(data.error || 'Purchase failed');
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.message || 'Failed to process purchase');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Purchase {mediaItem?.file_name}
          </DialogTitle>
          <DialogDescription>
            Secure payment - file delivered instantly to your private chat
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Price Summary */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">File Price:</span>
              <span className="text-2xl font-bold text-primary">${priceUSD.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Download className="h-3 w-3" />
              <span>Instant download via private chat</span>
            </div>
          </div>

          {/* What You Get */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">What's included:</p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 mt-0.5 text-blue-500" />
                <span>File delivered to your 1-on-1 chat with the s2g admin</span>
              </div>
              <div className="flex items-start gap-2">
                <Download className="h-4 w-4 mt-0.5 text-emerald-500" />
                <span>Unlimited downloads for 30 days</span>
              </div>
              <div className="flex items-start gap-2">
                <Lock className="h-4 w-4 mt-0.5 text-amber-500" />
                <span>Secure, encrypted file storage</span>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 text-purple-500" />
                <span>Access expires after 30 days (download before then!)</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Method */}
          <Tabs value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stripe" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Card
              </TabsTrigger>
              <TabsTrigger value="crypto" className="gap-2">
                <Wallet className="h-4 w-4" />
                Crypto
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stripe" className="mt-4">
              <div className="p-4 rounded-lg border bg-muted/50 text-center">
                <CreditCard className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Pay securely with credit card via Stripe
                </p>
              </div>
            </TabsContent>

            <TabsContent value="crypto" className="mt-4">
              <div className="p-4 rounded-lg border bg-muted/50 text-center">
                <Wallet className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Pay with USDC on Cronos chain
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Security Badge */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>Secure payment • 30-day money-back guarantee</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Cancel
          </Button>
          <Button onClick={handlePurchase} disabled={processing} size="lg" className="gap-2">
            {processing ? (
              'Processing...'
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Pay ${priceUSD.toFixed(2)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
