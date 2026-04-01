import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { OrderTimeline } from '@/components/provider/OrderTimeline';
import { EscrowBadge } from '@/components/provider/EscrowBadge';
import { Shield, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export default function BuyerOrdersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [disputeDialog, setDisputeDialog] = useState(false);
  const [disputeOrderId, setDisputeOrderId] = useState('');
  const [disputeReason, setDisputeReason] = useState('');

  const { data: orders, isLoading } = useQuery({
    queryKey: ['buyer-orders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_orders')
        .select('*, provider_products(title, photos), providers(business_name, logo_url)')
        .eq('buyer_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const confirmPickup = useMutation({
    mutationFn: async (orderId: string) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('provider_orders')
        .update({
          buyer_confirmed_at: now,
          escrow_status: 'released',
          escrow_released_at: now,
          status: 'completed',
        } as any)
        .eq('id', orderId)
        .eq('buyer_id', user!.id);
      if (error) throw error;

      // Log escrow release
      await supabase.from('provider_escrow_transactions' as any).insert({
        order_id: orderId,
        action: 'released',
        amount: 0,
        performed_by: user!.id,
        notes: 'Buyer confirmed pickup/receipt',
      });
    },
    onSuccess: () => {
      toast({ title: '✅ Pickup Confirmed!', description: 'Payment released to provider.' });
      queryClient.invalidateQueries({ queryKey: ['buyer-orders'] });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const openDispute = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('provider_orders')
        .update({
          escrow_status: 'disputed',
          dispute_opened_at: now,
          dispute_reason: disputeReason.trim(),
        } as any)
        .eq('id', disputeOrderId)
        .eq('buyer_id', user!.id);
      if (error) throw error;

      await supabase.from('provider_escrow_transactions' as any).insert({
        order_id: disputeOrderId,
        action: 'dispute_opened',
        amount: 0,
        performed_by: user!.id,
        notes: disputeReason.trim(),
      });
    },
    onSuccess: () => {
      toast({ title: '⚠️ Dispute Opened', description: 'Admin will review your case.' });
      setDisputeDialog(false);
      setDisputeReason('');
      queryClient.invalidateQueries({ queryKey: ['buyer-orders'] });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const canConfirm = (order: any) =>
    ['confirmed', 'picked_up', 'delivered'].includes(order.status) &&
    order.escrow_status !== 'released' &&
    order.escrow_status !== 'disputed' &&
    !order.buyer_confirmed_at;

  const canDispute = (order: any) => {
    if (order.escrow_status === 'disputed' || order.escrow_status === 'pending') return false;
    if (order.buyer_confirmed_at) {
      const confirmed = new Date(order.buyer_confirmed_at);
      const hoursAgo = (Date.now() - confirmed.getTime()) / (1000 * 60 * 60);
      return hoursAgo <= 48;
    }
    return order.escrow_status === 'held';
  };

  if (isLoading) {
    return <Layout><div className="container mx-auto p-6 text-center text-muted-foreground">Loading orders...</div></Layout>;
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground">My Orders</h1>
        <EscrowBadge size="md" />

        {(!orders || orders.length === 0) && (
          <p className="text-muted-foreground text-center py-8">No orders yet.</p>
        )}

        {orders?.map((order: any) => (
          <Card key={order.id}>
            <CardContent className="p-4 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {order.providers?.logo_url && (
                    <img src={order.providers.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover border border-border" />
                  )}
                  <div>
                    <p className="font-bold text-foreground text-sm">{order.provider_products?.title || 'Product'}</p>
                    <p className="text-xs text-muted-foreground">{order.providers?.business_name}</p>
                  </div>
                </div>
                <Badge variant={order.status === 'completed' ? 'default' : 'secondary'} className="capitalize text-xs">
                  {order.status?.replace('_', ' ')}
                </Badge>
              </div>

              {/* Order details */}
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Qty × Price</span>
                  <span>{order.quantity} × ${order.unit_price}</span>
                </div>
                {order.courier_fee > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Courier</span>
                    <span>${order.courier_fee}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t pt-1">
                  <span>Total</span>
                  <span>${order.total_amount}</span>
                </div>
              </div>

              {/* Escrow status */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-foreground capitalize">
                  Escrow: {order.escrow_status || 'pending'}
                </span>
              </div>

              {/* Timeline */}
              <OrderTimeline status={order.status} />

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-1">
                {canConfirm(order) && (
                  <Button
                    size="lg"
                    className="w-full h-14 text-base font-bold bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => confirmPickup.mutate(order.id)}
                    disabled={confirmPickup.isPending}
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    {confirmPickup.isPending ? 'Confirming...' : 'I Have Received / Picked Up'}
                  </Button>
                )}
                {canDispute(order) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-amber-600 border-amber-300"
                    onClick={() => { setDisputeOrderId(order.id); setDisputeDialog(true); }}
                  >
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Open Dispute
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Dispute Dialog */}
        <Dialog open={disputeDialog} onOpenChange={setDisputeDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Open a Dispute</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Describe the issue. Funds will remain in escrow until an admin resolves it.
              </p>
              <Input
                placeholder="What went wrong?"
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
              />
              <Button
                className="w-full"
                disabled={!disputeReason.trim() || openDispute.isPending}
                onClick={() => openDispute.mutate()}
              >
                {openDispute.isPending ? 'Submitting...' : 'Submit Dispute'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
