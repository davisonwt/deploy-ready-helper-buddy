import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { insertProduct } from '@/api/products';
import { getDefaultCompanyId } from '@/lib/products/getDefaultCompanyId';
import { moderateStorageUpload, moderationRejectionMessage } from '@/lib/moderation/moderateUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import CategoryTagPicker from '@/components/marketplace/CategoryTagPicker';
import { WANDERING_BADGES, type WanderingRole } from '@/components/marketplace/WanderingBadgeBar';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const IMAGE_ACCEPT = 'image/*';
const IMAGE_ALLOWED_LABEL = 'JPG, PNG, GIF, or WEBP';

function fileExtension(file: File): string {
  return file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
}

function isAllowedImageFile(file: File): boolean {
  if (!IMAGE_EXTENSIONS.includes(fileExtension(file))) return false;
  if (file.type && !file.type.startsWith('image/')) return false;
  return true;
}

export default function UploadForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'art',
    category: '',
    license_type: 'free',
    price: 0,
    tags: ''
  });
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [taxonomy, setTaxonomy] = useState<{ categoryId: string | null; subcategoryIds: string[]; tagIds: string[] }>({
    categoryId: null, subcategoryIds: [], tagIds: [],
  });
  const [wanderingRole, setWanderingRole] = useState<WanderingRole | null>(null);
  const [deliveryType, setDeliveryType] = useState<'digital' | 'physical'>('digital');
  const [shippingMethod, setShippingMethod] = useState<string>('self');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to upload');
      return;
    }

    if (!coverImage || !mainFile) {
      toast.error('Please select both cover image and main file');
      return;
    }

    // Check file size limits (Supabase object limit ~50MB per file)
    const perFileLimit = 50 * 1024 * 1024; // 50MB

    if (mainFile.size > perFileLimit) {
      toast.error(`File size (${(mainFile.size / 1024 / 1024).toFixed(2)}MB) exceeds the 50MB limit.`);
      return;
    }

    if (coverImage.size > 10 * 1024 * 1024) {
      toast.error('Cover image must be under 10MB');
      return;
    }

    // Format validation — authoritative check, independent of the file
    // picker's `accept` attribute (a hint the browser/user can bypass).
    if (!isAllowedImageFile(coverImage)) {
      toast.error(`Cover image must be a ${IMAGE_ALLOWED_LABEL} file.`);
      return;
    }

    setUploading(true);

    try {
      // Get or create sower profile
      const { data: sowerData, error: sowerError } = await supabase
        .from('sowers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let sowerId = sowerData?.id;

      if (!sowerId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .single();

        const { data: newSower, error: createError } = await supabase
          .from('sowers')
          .insert({
            user_id: user.id,
            display_name: profile?.display_name || user.email?.split('@')[0] || 'Anonymous'
          })
          .select()
          .single();

        if (createError) throw createError;
        sowerId = newSower.id;
      }

      const companyId = await getDefaultCompanyId(sowerId);

      // Upload cover image - ensure file is valid before upload
      if (!coverImage || coverImage.size === 0) {
        throw new Error('Cover image is empty or invalid');
      }

      console.log('📤 Uploading cover image:', { name: coverImage.name, size: coverImage.size, type: coverImage.type });
      const coverExt = coverImage.name.split('.').pop();
      const coverPath = `covers/${user.id}/${Date.now()}.${coverExt}`;
      const { error: coverUploadError } = await supabase.storage
        .from('premium-room')
        .upload(coverPath, coverImage, {
          cacheControl: '3600',
          upsert: false
        });

      if (coverUploadError) {
        console.error('Cover upload error:', coverUploadError);
        throw coverUploadError;
      }

      const coverMod = await moderateStorageUpload('premium-room', coverPath, 'image');
      if (coverMod.verdict !== 'allow') throw new Error(moderationRejectionMessage(coverMod.reason));

      const { data: coverUrl } = supabase.storage
        .from('premium-room')
        .getPublicUrl(coverPath);

      // Upload main file - validate file before upload
      if (!mainFile || mainFile.size === 0) {
        throw new Error('Main file is empty or invalid');
      }

      console.log('📤 Uploading main file:', { name: mainFile.name, size: mainFile.size, type: mainFile.type });
      const uploadExt = mainFile.name.split('.').pop() || 'bin';
      const filePath = `products/${user.id}/${Date.now()}.${uploadExt}`;
      const { error: fileUploadError } = await supabase.storage
        .from('premium-room')
        .upload(filePath, mainFile, {
          cacheControl: '3600',
          upsert: false
        });
      if (fileUploadError) {
        console.error('File upload error:', fileUploadError);
        throw fileUploadError;
      }
      const mainKind = mainFile.type.startsWith('video/') ? 'video' : 'image';
      const mainMod = await moderateStorageUpload('premium-room', filePath, mainKind);
      if (mainMod.verdict !== 'allow') throw new Error(moderationRejectionMessage(mainMod.reason));
      const { data: fileUrl } = supabase.storage
        .from('premium-room')
        .getPublicUrl(filePath);
      const fileUrlPublic = fileUrl.publicUrl;

      // Calculate total price with fees (10% tithing + 5% admin)
      const basePrice = parseFloat(String(formData.price)) || 0;
      const totalPrice = basePrice * 1.15; // Add 15% (10% + 5%)

      // Create product
      const insertedProduct = await insertProduct({
        sower_id: sowerId,
        company_id: companyId,
        title: formData.title,
        description: formData.description,
        type: formData.type,
        category: formData.category,
        wandering_role: wanderingRole,
        license_type: formData.license_type,
        price: totalPrice, // Store total price
        cover_image_url: coverUrl.publicUrl,
        file_url: fileUrlPublic,
        delivery_type: deliveryType,
        shipping_method: deliveryType === 'physical' ? shippingMethod : null,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
      });


      // Persist marketplace taxonomy (subcategories + tags) into junction tables
      if (insertedProduct?.id && user) {
        if (taxonomy.subcategoryIds.length) {
          await (supabase.from('listing_subcategories' as any) as any).insert(
            taxonomy.subcategoryIds.map((sid) => ({
              listing_type: 'product',
              listing_id: insertedProduct.id,
              subcategory_id: sid,
              owner_user_id: user.id,
            }))
          );
        }
        if (taxonomy.tagIds.length) {
          const { error: tagErr } = await (supabase.from('listing_tags' as any) as any).insert(
            taxonomy.tagIds.map((tid) => ({
              listing_type: 'product',
              listing_id: insertedProduct.id,
              tag_id: tid,
              owner_user_id: user.id,
            }))
          );
          if (tagErr) {
            // Trigger blocks unverified trust tags — surface the message but keep the product live
            toast.warning(`Some tags could not be applied: ${tagErr.message}`);
          }
        }
      }

      // Award XP for uploading product (100 XP) - use type assertion for RPC
      if (user) {
        try {
          await (supabase.rpc as any)('add_xp_to_current_user', { amount: 100 });
        } catch (err) {
          console.warn('XP award not available:', err);
        }
      }

      toast.success('Product uploaded successfully!');
      navigate('/my-products');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/sow')}>
          🌱 Try the new sowing form
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Upload Your Creation</CardTitle>
          <CardDescription>Share your art or files with the S2G community</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="type">Type *</Label>
                  <Select value={formData.type} onValueChange={(value) => {
                    setFormData({ ...formData, type: value });
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="art">Art</SelectItem>
                      <SelectItem value="file">File</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sowing music?{' '}
                    <button type="button" onClick={() => navigate('/sow')} className="underline underline-offset-2 hover:text-foreground">
                      It's moved — sow a seed →
                    </button>
                  </p>
                </div>

                <div>
                  <Label>Your Wandering identity (optional)</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Pick the badge that represents who you are as a tribe member. This is separate from what you sell — it helps buyers find their kind of sower.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {WANDERING_BADGES.filter((b) => !b.routeOverride).map((b) => {
                      const active = wanderingRole === b.key;
                      return (
                        <button
                          key={b.key}
                          type="button"
                          onClick={() => setWanderingRole(active ? null : b.key)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold tracking-wider border transition flex items-center gap-2 ${
                            active ? 'border-2' : 'border-border hover:bg-muted'
                          }`}
                          style={{
                            background: active ? `${b.color}22` : undefined,
                            borderColor: active ? b.color : undefined,
                            color: active ? b.color : undefined,
                          }}
                          title={b.description}
                        >
                          <span className="text-lg">{b.emoji}</span> {b.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label htmlFor="category">Category, subcategories & tags *</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Pick a category, then add subcategories and tags so buyers can find you. Trust tags are locked until you upload verified credentials.
                  </p>
                  <CategoryTagPicker
                    categoryId={taxonomy.categoryId}
                    subcategoryIds={taxonomy.subcategoryIds}
                    tagIds={taxonomy.tagIds}
                    onChange={(next) => {
                      setTaxonomy(next);
                      // Mirror selection into legacy free-text column for backward-compat queries
                      if (next.categoryId !== taxonomy.categoryId) {
                        setFormData((fd) => ({ ...fd, category: next.categoryId || '' }));
                      }
                    }}
                  />
                  {/* Hidden free-text category kept for backward-compat: derived from selected category label */}
                  <Input type="hidden" value={formData.category} readOnly />
                </div>

                <div>
                  <Label htmlFor="license">License Type *</Label>
                  <Select value={formData.license_type} onValueChange={(value) => setFormData({ ...formData, license_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="bestowal">Bestowal Required</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.license_type === 'bestowal' && (
                  <div>
                    <Label htmlFor="price">Base Price (USDC) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Total charged: ${((formData.price || 0) * 1.15).toFixed(2)} USDC (includes 10% platform fee + 5% admin fee)
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="delivery">Delivery *</Label>
                  <Select
                    value={deliveryType}
                    onValueChange={(value) => setDeliveryType(value as 'digital' | 'physical')}
                  >
                    <SelectTrigger id="delivery">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="digital">Digital — delivered in ChatApp</SelectItem>
                      <SelectItem value="physical">Physical — needs transport</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {deliveryType === 'physical'
                      ? 'Bestowals are held safely by S2G until the bestower confirms delivery.'
                      : 'Bestowals are released to you as soon as payment confirms.'}
                  </p>
                </div>

                {deliveryType === 'physical' && (
                  <div>
                    <Label htmlFor="shipping">How is it delivered?</Label>
                    <Select value={shippingMethod} onValueChange={setShippingMethod}>
                      <SelectTrigger id="shipping">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="self">I deliver it myself</SelectItem>
                        <SelectItem value="courier">Tribe courier</SelectItem>
                        <SelectItem value="collect">Bestower collects</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>


              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cover">Cover Image *</Label>
                  <div className="mt-2">
                    <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                      <div className="text-center">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {coverImage ? coverImage.name : 'Click to upload cover'}
                        </p>
                      </div>
                      <input
                        id="cover"
                        type="file"
                        accept={IMAGE_ACCEPT}
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (!files || files.length === 0) {
                            console.error('No cover image selected');
                            return;
                          }

                          const file = files[0];
                          if (!file) {
                            console.error('No file in files array');
                            return;
                          }

                          if (file.size === 0) {
                            console.error('Empty cover image detected:', file.name);
                            toast.error(`Cover image "${file.name}" is empty. Please select a valid image file.`);
                            // Reset input
                            e.target.value = '';
                            return;
                          }

                          console.log('Cover image selected:', { name: file.name, size: file.size, type: file.type });
                          // Store file immediately
                          setCoverImage(file);
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="file">Main File *</Label>
                  <div className="mt-2 space-y-2">
                    <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                      <div className="text-center">
                        <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {mainFile ? mainFile.name : 'Click to upload file'}
                        </p>
                      </div>
                      <input
                        id="file"
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (!files || files.length === 0) {
                            console.error('No files selected');
                            return;
                          }

                          const file = files[0];
                          if (!file) {
                            console.error('No file selected');
                            return;
                          }

                          if (file.size === 0) {
                            console.error('Empty file detected:', file.name);
                            toast.error(`File "${file.name}" is empty. Please select a valid file.`);
                            // Reset input
                            e.target.value = '';
                            return;
                          }

                          console.log('File selected:', { name: file.name, size: file.size, type: file.type });
                          // Store file immediately
                          setMainFile(file);
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    placeholder="art, handmade, limited"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <Button type="submit" disabled={uploading} className="w-full" size="lg">
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Upload Product
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
