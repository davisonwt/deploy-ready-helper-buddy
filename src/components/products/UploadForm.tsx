import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload, Loader2, CheckCircle2, Disc, Music } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';

export default function UploadForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'music',
    category: '',
    license_type: 'free',
    price: 0,
    tags: ''
  });
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [releaseType, setReleaseType] = useState<'single' | 'album'>('single');
  const [albumFiles, setAlbumFiles] = useState<File[]>([]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to upload');
      return;
    }

    if (!coverImage || (releaseType === 'single' ? !mainFile : albumFiles.length === 0)) {
      toast.error(releaseType === 'single' ? 'Please select both cover image and main file' : 'Please select a cover and at least one audio file for the album');
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

      // Upload cover image
      const coverExt = coverImage.name.split('.').pop();
      const coverPath = `covers/${user.id}/${Date.now()}.${coverExt}`;
      const { error: coverUploadError } = await supabase.storage
        .from('premium-room')
        .upload(coverPath, coverImage);

      if (coverUploadError) throw coverUploadError;

      const { data: coverUrl } = supabase.storage
        .from('premium-room')
        .getPublicUrl(coverPath);

      // Prepare main upload (single file or zipped album)
      let uploadBlob: Blob | File;
      let uploadExt = 'bin';

      if (releaseType === 'album') {
        const zip = new JSZip();
        albumFiles.forEach((f) => zip.file(f.name, f));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        uploadBlob = zipBlob;
        uploadExt = 'zip';
      } else {
        uploadBlob = mainFile as File;
        uploadExt = (mainFile as File).name.split('.').pop() || 'bin';
      }

      const filePath = `products/${user.id}/${Date.now()}.${uploadExt}`;
      const { error: fileUploadError } = await supabase.storage
        .from('premium-room')
        .upload(filePath, uploadBlob);

      if (fileUploadError) throw fileUploadError;

      const { data: fileUrl } = supabase.storage
        .from('premium-room')
        .getPublicUrl(filePath);

      // Calculate total price with fees (10% tithing + 5% admin)
      const basePrice = parseFloat(String(formData.price)) || 0;
      const totalPrice = basePrice * 1.15; // Add 15% (10% + 5%)

      // Create product
      const { error: productError } = await supabase
        .from('products')
        .insert({
          sower_id: sowerId,
          title: formData.title,
          description: formData.description,
          type: formData.type,
          category: formData.category,
          license_type: formData.license_type,
          price: totalPrice, // Store total price
          cover_image_url: coverUrl.publicUrl,
          file_url: fileUrl.publicUrl,
          tags: [...formData.tags.split(',').map(t => t.trim()).filter(Boolean), releaseType]
        });

      if (productError) throw productError;

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
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Upload Your Creation</CardTitle>
          <CardDescription>Share your music, art, or files with the S2G community</CardDescription>
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
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="music">Music</SelectItem>
                      <SelectItem value="art">Art</SelectItem>
                      <SelectItem value="file">File</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="releaseType">Release Type *</Label>
                  <Select value={releaseType} onValueChange={(value) => {
                    setReleaseType(value as 'single' | 'album');
                    setMainFile(null);
                    setAlbumFiles([]);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Single or Album" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Track</SelectItem>
                      <SelectItem value="album">Album (Multiple Tracks)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    placeholder="e.g., education, entertainment"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
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
                      Total charged: ${((formData.price || 0) * 1.15).toFixed(2)} USDC (includes 10% tithing + 5% admin fee)
                    </p>
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
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="file">{releaseType === 'album' ? 'Main Files *' : 'Main File *'}</Label>
                  <div className="mt-2">
                    <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                      <div className="text-center">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        {releaseType === 'album' ? (
                          <p className="text-sm text-muted-foreground">
                            {albumFiles.length > 0 ? `${albumFiles.length} files selected` : 'Click to upload multiple files'}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {mainFile ? mainFile.name : 'Click to upload file'}
                          </p>
                        )}
                      </div>
                      <input
                        id="file"
                        type="file"
                        className="hidden"
                        accept={formData.type === 'music' ? 'audio/*' : undefined}
                        multiple={releaseType === 'album'}
                        onChange={(e) => {
                          if (releaseType === 'album') {
                            setAlbumFiles(Array.from(e.target.files || []));
                            setMainFile(null);
                          } else {
                            setMainFile(e.target.files?.[0] || null);
                            setAlbumFiles([]);
                          }
                        }}
                      />
                    </label>
                    {releaseType === 'album' && albumFiles.length > 0 && (
                      <ul className="mt-2 max-h-28 overflow-y-auto text-sm text-muted-foreground">
                        {albumFiles.map((f, i) => (
                          <li key={i}>{f.name}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    placeholder="music, relaxing, ambient"
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
