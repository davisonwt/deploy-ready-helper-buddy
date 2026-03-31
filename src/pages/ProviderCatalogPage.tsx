import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { MapPin, ShoppingBag, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const SUBTYPE_ICONS: Record<string, string> = { farmer: '🌾', homesteader: '🏡', manufacturer: '🏭' };
const COMMISSION_RATE = 0.15;
const INTERNATIONAL_COURIER_BASE = 15;

export default function ProviderCatalogPage() {
  const { providerId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orderDialog, setOrderDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [deliveryCountry, setDeliveryCountry] = useState('');

  const { data: provider } = useQuery({
    queryKey: ['provider-catalog', providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('id', providerId!)
        .eq('status', 'approved')
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!providerId,
  });

  const { data: products } = useQuery({
    queryKey: ['provider-catalog-products', providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_products')
        .select('*')
        .eq('provider_id', providerId!)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!providerId,
  });

  const placeOrder = useMutation({
    mutationFn: async () => {
      if (!user || !selectedProduct || !provider) throw new Error('Missing data');

      const isInternational = deliveryCountry.trim().toLowerCase() !== (provider.country || '').toLowerCase();
      const courierFee = isInternational ? INTERNATIONAL_COURIER_BASE : 0;
      const subtotal = selectedProduct.price * quantity;
      const commission = subtotal * COMMISSION_RATE;
      const total = subtotal + courierFee;

      const { error } = await supabase.from('provider_orders').insert({
        provider_id: provider.id,
        product_id: selectedProduct.id,
        buyer_id: user.id,
        quantity,
        unit_price: selectedProduct.price,
        total_amount: total,
        courier_fee: courierFee,
        platform_commission: commission,
        delivery_type: isInternational ? 'international' : 'local',
        delivery_address: deliveryAddress.trim(),
        delivery_city: deliveryCity.trim(),
        delivery_country: deliveryCountry.trim(),
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: '🎉 Order Placed!', description: 'The provider will confirm your order soon.' });
      setOrderDialog(false);
      setSelectedProduct(null);
      setQuantity(1);
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  if (!provider) {
    return <Layout><div className="container mx-auto p-6 text-center text-muted-foreground">Loading provider...</div></Layout>;
  }

  const isInternational = deliveryCountry.trim().toLowerCase() !== (provider.country || '').toLowerCase();
  const courierFee = isInternational ? INTERNATIONAL_COURIER_BASE : 0;
  const subtotal = selectedProduct ? selectedProduct.price * quantity : 0;

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6 max-w-4xl">
        {/* Back */}
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        {/* Provider header */}
        <div className="flex items-start gap-4">
          {provider.logo_url && (
            <img src={provider.logo_url} alt="" className="w-20 h-20 rounded-2xl object-cover border border-border" />
          )}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="capitalize">{SUBTYPE_ICONS[provider.subtype]} {provider.subtype}</Badge>
            </div>
            <h1 className="text-2xl font-bold text-foreground">{provider.business_name}</h1>
            {provider.bio && <p className="text-muted-foreground mt-1">{provider.bio}</p>}
            {(provider.city || provider.country) && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" /> {[provider.city, provider.country].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Products grid */}
        <h2 className="text-xl font-bold text-foreground">Products</h2>
        {(!products || products.length === 0) && (
          <p className="text-muted-foreground text-center py-8">No products available yet.</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products?.map((prod: any) => (
            <Card key={prod.id}>
              {prod.photos?.[0] && (
                <img src={prod.photos[0]} alt={prod.title} className="w-full aspect-square object-cover rounded-t-2xl" />
              )}
              <CardContent className="p-4 space-y-2">
                <h3 className="font-bold text-foreground">{prod.title}</h3>
                {prod.description && <p className="text-sm text-muted-foreground line-clamp-2">{prod.description}</p>}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-primary">${prod.price}</span>
                  <Badge variant={prod.stock > 0 ? 'outline' : 'destructive'}>
                    {prod.stock > 0 ? `${prod.stock} available` : 'Out of stock'}
                  </Badge>
                </div>
                <Button
                  className="w-full h-11"
                  disabled={prod.stock <= 0 || !user}
                  onClick={() => {
                    setSelectedProduct(prod);
                    setQuantity(1);
                    setOrderDialog(true);
                  }}
                >
                  <ShoppingBag className="w-4 h-4 mr-1" /> Order Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Dialog */}
        <Dialog open={orderDialog} onOpenChange={setOrderDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Place Order</DialogTitle>
            </DialogHeader>
            {selectedProduct && (
              <div className="space-y-4">
                <div>
                  <p className="font-bold text-foreground">{selectedProduct.title}</p>
                  <p className="text-primary font-semibold">${selectedProduct.price} each</p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Quantity</label>
                  <Input
                    type="number"
                    min={1}
                    max={selectedProduct.stock}
                    value={quantity}
                    onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Delivery Address</label>
                  <Input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="123 Main St" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">City</label>
                    <Input value={deliveryCity} onChange={e => setDeliveryCity(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Country</label>
                    <Input value={deliveryCountry} onChange={e => setDeliveryCountry(e.target.value)} />
                  </div>
                </div>

                <div className="bg-muted rounded-xl p-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                  {isInternational && (
                    <div className="flex justify-between text-amber-600"><span>International Courier</span><span>${courierFee.toFixed(2)}</span></div>
                  )}
                  <div className="flex justify-between font-bold text-foreground border-t pt-1 mt-1">
                    <span>Total</span>
                    <span>${(subtotal + courierFee).toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  className="w-full h-12"
                  onClick={() => placeOrder.mutate()}
                  disabled={placeOrder.isPending || !deliveryCity.trim() || !deliveryCountry.trim()}
                >
                  {placeOrder.isPending ? 'Placing Order...' : `Place Order — $${(subtotal + courierFee).toFixed(2)}`}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
