import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useParams, Link } from 'react-router-dom';

export default function EditForm() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'music',
    category: '',
    license_type: 'free',
    price: 0,
    tags: ''
  });

  useEffect(() => {
    const loadProduct = async () => {
      if (!id || !user) return;

      try {
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            sowers!inner(user_id)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;

        // Check ownership
        if (data.sowers.user_id !== user.id) {
          toast.error('You do not have permission to edit this product');
          navigate('/my-products');
          return;
        }

        setFormData({
          title: data.title || '',
          description: data.description || '',
          type: data.type || 'music',
          category: data.category || '',
          license_type: data.license_type || 'free',
          price: data.price || 0,
          tags: Array.isArray(data.tags) ? data.tags.join(', ') : ''
        });
      } catch (error) {
        console.error('Error loading product:', error);
        toast.error('Failed to load product');
        navigate('/my-products');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;

    setUpdating(true);

    try {
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      // Calculate total price with fees (10% tithing + 5% admin)
      const basePrice = parseFloat(String(formData.price)) || 0;
      const totalPrice = basePrice * 1.15; // Add 15% (10% + 5%)

      const { error } = await supabase
        .from('products')
        .update({
          title: formData.title,
          description: formData.description,
          type: formData.type,
          category: formData.category,
          license_type: formData.license_type,
          price: totalPrice, // Store total price
          tags: tagsArray,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Product updated successfully!');
      navigate('/my-products');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background/95 to-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background py-8">
      <div className="container max-w-2xl mx-auto px-4">
        <Link to="/my-products">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Products
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Edit Product</CardTitle>
            <CardDescription>Update your product details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="music">Music</SelectItem>
                      <SelectItem value="art">Art</SelectItem>
                      <SelectItem value="digital">Digital Content</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Hip Hop, Digital Art"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="license_type">License Type *</Label>
                  <Select 
                    value={formData.license_type} 
                    onValueChange={(value) => setFormData({ ...formData, license_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free Download</SelectItem>
                      <SelectItem value="bestowal">Bestowal (Paid)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.license_type === 'bestowal' && (
                  <div className="space-y-2">
                    <Label htmlFor="price">Base Price (USDC) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      required={formData.license_type === 'bestowal'}
                    />
                    <p className="text-xs text-muted-foreground">
                      Total charged: ${((formData.price || 0) * 1.15).toFixed(2)} USDC (includes 10% tithing + 5% admin fee)
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g., rap, instrumental, lofi"
                />
              </div>

              <Button type="submit" disabled={updating} className="w-full" size="lg">
                {updating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Update Product
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}