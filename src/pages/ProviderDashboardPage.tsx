import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Package, ShoppingCart, DollarSign, Plus, Pencil, Trash2, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OrderTimeline } from '@/components/provider/OrderTimeline';
import { EscrowBadge } from '@/components/provider/EscrowBadge';

export default function ProviderDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('products');
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productForm, setProductForm] = useState({
    title: '', description: '', price: '', stock: '', category: '',
  });

  // Fetch provider profile
  const { data: provider } = useQuery({
    queryKey: ['my-provider', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch products
  const { data: products } = useQuery({
    queryKey: ['my-provider-products', provider?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_products')
        .select('*')
        .eq('provider_id', provider!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!provider?.id,
  });

  // Fetch orders
  const { data: orders } = useQuery({
    queryKey: ['my-provider-orders', provider?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_orders')
        .select('*')
        .eq('provider_id', provider!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!provider?.id,
  });

  const uploadProductPhotos = async (files: FileList): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop();
      const path = `${user!.id}/products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('provider-assets').upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from('provider-assets').getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  const saveProduct = useMutation({
    mutationFn: async () => {
      const payload: any = {
        provider_id: provider!.id,
        title: productForm.title.trim(),
        description: productForm.description.trim() || null,
        price: parseFloat(productForm.price) || 0,
        stock: parseInt(productForm.stock) || 0,
        category: productForm.category.trim() || null,
      };

      if (editingProduct) {
        const { error } = await supabase.from('provider_products').update(payload).eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('provider_products').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editingProduct ? 'Product updated' : 'Product added' });
      queryClient.invalidateQueries({ queryKey: ['my-provider-products'] });
      setProductDialogOpen(false);
      setEditingProduct(null);
      setProductForm({ title: '', description: '', price: '', stock: '', category: '' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('provider_products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Product deleted' });
      queryClient.invalidateQueries({ queryKey: ['my-provider-products'] });
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: string; newStatus: string }) => {
      const { error } = await supabase.from('provider_orders').update({ status: newStatus }).eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Order updated' });
      queryClient.invalidateQueries({ queryKey: ['my-provider-orders'] });
    },
  });

  const nextStatus: Record<string, string> = {
    pending: 'confirmed',
    confirmed: 'picked_up',
    picked_up: 'delivered',
    delivered: 'completed',
  };

  if (!provider) {
    return (
      <Layout>
        <div className="container mx-auto p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Provider Dashboard</h1>
          <p className="text-muted-foreground">You don't have a provider profile yet.</p>
          <Button onClick={() => window.location.href = '/register-provider'} className="mt-4">
            Register as Provider
          </Button>
        </div>
      </Layout>
    );
  }

  if (provider.status !== 'approved') {
    return (
      <Layout>
        <div className="container mx-auto p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Provider Dashboard</h1>
          <Badge variant="secondary" className="text-lg px-4 py-2 capitalize">{provider.status}</Badge>
          <p className="text-muted-foreground mt-4">Your application is {provider.status}. Please wait for admin approval.</p>
        </div>
      </Layout>
    );
  }

  const totalEarnings = (orders || [])
    .filter((o: any) => o.status === 'completed')
    .reduce((sum: number, o: any) => sum + (o.total_amount - o.platform_commission - o.courier_fee), 0);

  const totalCommission = (orders || [])
    .filter((o: any) => o.status === 'completed')
    .reduce((sum: number, o: any) => sum + o.platform_commission, 0);

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          {provider.logo_url && (
            <img src={provider.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover border border-border" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">{provider.business_name}</h1>
            <p className="text-sm text-muted-foreground capitalize">{provider.subtype} Provider</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="products"><Package className="w-4 h-4 mr-1" /> Products</TabsTrigger>
            <TabsTrigger value="orders"><ShoppingCart className="w-4 h-4 mr-1" /> Orders</TabsTrigger>
            <TabsTrigger value="earnings"><DollarSign className="w-4 h-4 mr-1" /> Earnings</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-4 space-y-4">
            <Button onClick={() => { setEditingProduct(null); setProductForm({ title: '', description: '', price: '', stock: '', category: '' }); setProductDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Add Product
            </Button>
            {(!products || products.length === 0) && <p className="text-muted-foreground text-center py-8">No products yet.</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products?.map((prod: any) => (
                <Card key={prod.id}>
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-bold text-foreground">{prod.title}</h3>
                    {prod.description && <p className="text-sm text-muted-foreground line-clamp-2">{prod.description}</p>}
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-primary">${prod.price}</span>
                      <Badge variant="outline">{prod.stock} in stock</Badge>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => {
                        setEditingProduct(prod);
                        setProductForm({ title: prod.title, description: prod.description || '', price: String(prod.price), stock: String(prod.stock), category: prod.category || '' });
                        setProductDialogOpen(true);
                      }}>
                        <Pencil className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteProduct.mutate(prod.id)}>
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="orders" className="mt-4 space-y-4">
            {(!orders || orders.length === 0) && <p className="text-muted-foreground text-center py-8">No orders yet.</p>}
            {orders?.map((order: any) => (
              <Card key={order.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-foreground">Order #{order.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">Qty: {order.quantity} × ${order.unit_price}</p>
                      <p className="text-sm text-muted-foreground">Total: ${order.total_amount}</p>
                      {order.delivery_city && <p className="text-sm text-muted-foreground">📍 {order.delivery_city}, {order.delivery_country}</p>}
                    </div>
                    <Badge variant={order.status === 'completed' ? 'default' : 'secondary'} className="capitalize">
                      {order.status}
                    </Badge>
                  </div>
                  {nextStatus[order.status] && (
                    <Button
                      size="sm"
                      onClick={() => updateOrderStatus.mutate({ orderId: order.id, newStatus: nextStatus[order.status] })}
                    >
                      Mark as {nextStatus[order.status].replace('_', ' ')}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="earnings" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">Total Earnings</p>
                  <p className="text-3xl font-bold text-primary">${totalEarnings.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">Platform Commission (15%)</p>
                  <p className="text-3xl font-bold text-muted-foreground">${totalCommission.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-3xl font-bold text-foreground">{(orders || []).length}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Product Add/Edit Dialog */}
        <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Title *</label>
                <Input value={productForm.title} onChange={e => setProductForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <textarea
                  className="w-full rounded-xl border border-input bg-input p-3 text-foreground min-h-[80px]"
                  value={productForm.description}
                  onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Price ($) *</label>
                  <Input type="number" value={productForm.price} onChange={e => setProductForm(p => ({ ...p, price: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Stock *</label>
                  <Input type="number" value={productForm.stock} onChange={e => setProductForm(p => ({ ...p, stock: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <Input value={productForm.category} onChange={e => setProductForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Vegetables, Crafts" />
              </div>
              <Button
                onClick={() => saveProduct.mutate()}
                disabled={!productForm.title.trim() || !productForm.price || saveProduct.isPending}
                className="w-full"
              >
                {saveProduct.isPending ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
