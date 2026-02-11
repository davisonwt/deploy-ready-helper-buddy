import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle2, ArrowLeft, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useParams, Link } from 'react-router-dom';

const MAX_IMAGES = 3;

export default function EditForm() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [sowerId, setSowerId] = useState<string | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
            sowers!inner(id, user_id)
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

        setSowerId(data.sowers.id);

        // Reverse-calculate base price from stored total (which includes 15% fees)
        const storedPrice = data.price || 0;
        const basePrice = storedPrice > 0 ? storedPrice / 1.15 : 0;

        setFormData({
          title: data.title || '',
          description: data.description || '',
          type: data.type || 'music',
          category: data.category || '',
          license_type: data.license_type || 'free',
          price: parseFloat(basePrice.toFixed(2)),
          tags: Array.isArray(data.tags) ? data.tags.join(', ') : ''
        });

        // Load existing images
        const imgs = Array.isArray(data.image_urls) ? data.image_urls : (data.cover_image_url ? [data.cover_image_url] : []);
        setExistingImages(imgs);
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
    if (!user || !id || !sowerId) return;

    setUpdating(true);

    try {
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      // Calculate total price with fees (10% tithing + 5% admin)
      const basePrice = parseFloat(String(formData.price)) || 0;
      const totalPrice = basePrice * 1.15;

      // Upload new images
      const uploadedUrls: string[] = [];
      for (const img of newImages) {
        const imgExt = img.name.split('.').pop();
        const imgPath = `covers/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${imgExt}`;
        const { error: imgErr } = await supabase.storage
          .from('premium-room')
          .upload(imgPath, img, { cacheControl: '3600', upsert: false });
        if (imgErr) { console.error('Image upload error:', imgErr); continue; }
        const { data: imgUrl } = supabase.storage.from('premium-room').getPublicUrl(imgPath);
        uploadedUrls.push(imgUrl.publicUrl);
      }

      const allImages = [...existingImages, ...uploadedUrls];

      const { error } = await supabase
        .from('products')
        .update({
          title: formData.title,
          description: formData.description,
          type: formData.type,
          category: formData.category,
          license_type: formData.license_type,
          price: totalPrice,
          tags: tagsArray,
          cover_image_url: allImages[0] || null,
          image_urls: allImages,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('sower_id', sowerId);

      if (error) throw error;

      toast.success('Seed updated successfully!');
      navigate('/my-products');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update seed');
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
            Back to My Seeds
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Edit Seed</CardTitle>
            <CardDescription>Update your seed details</CardDescription>
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
                      <SelectItem value="ebook">E-Book</SelectItem>
                      <SelectItem value="book">Book (Physical)</SelectItem>
                      <SelectItem value="art">Art</SelectItem>
                      <SelectItem value="produce">Produce</SelectItem>
                      <SelectItem value="product">Product</SelectItem>
                      <SelectItem value="file">File / Document</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="entertainment">Entertainment</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="health">Health</SelectItem>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="lifestyle">Lifestyle</SelectItem>
                      <SelectItem value="spiritual">Spiritual</SelectItem>
                      <SelectItem value="kitchenware">Kitchenware</SelectItem>
                      <SelectItem value="properties">Properties</SelectItem>
                      <SelectItem value="vehicles">Vehicles</SelectItem>
                      <SelectItem value="fashion">Fashion</SelectItem>
                      <SelectItem value="food">Food</SelectItem>
                    </SelectContent>
                  </Select>
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

              {/* Images Section */}
              <div className="space-y-2">
                <Label>Product Images ({existingImages.length + newImages.length}/{MAX_IMAGES})</Label>
                <div className="flex gap-2 flex-wrap">
                  {existingImages.map((url, i) => (
                    <div key={`existing-${i}`} className="relative">
                      <img src={url} alt="" className="w-20 h-20 object-cover rounded border" />
                      <button
                        type="button"
                        onClick={() => setExistingImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        <X size={12} />
                      </button>
                      {i === 0 && <span className="absolute bottom-0 left-0 bg-primary text-white text-[10px] px-1 rounded-tr">Cover</span>}
                    </div>
                  ))}
                  {newImages.map((file, i) => (
                    <div key={`new-${i}`} className="relative">
                      <img src={URL.createObjectURL(file)} alt="" className="w-20 h-20 object-cover rounded border border-dashed border-primary" />
                      <button
                        type="button"
                        onClick={() => setNewImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {existingImages.length + newImages.length < MAX_IMAGES && (
                    <label className="w-20 h-20 border-2 border-dashed border-border rounded flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && file.size > 0) {
                            setNewImages(prev => [...prev, file]);
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">First image is the cover. Click × to remove.</p>
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
                    Update Seed
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
