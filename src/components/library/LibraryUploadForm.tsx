import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Loader2, Book, FileText, GraduationCap, Image, Music } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';

export default function LibraryUploadForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'ebook',
    category: '',
    price: 0,
    tags: '',
    is_giveaway: false,
    giveaway_limit: null as number | null,
    whisperer_percentage: 0,
    preview_duration_seconds: 30
  });
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to upload');
      return;
    }

    if (!mainFile) {
      toast.error('Please select a file to upload');
      return;
    }

    // Validate: Must have either price OR giveaway
    if (!formData.is_giveaway && (!formData.price || formData.price <= 0)) {
      toast.error('Please set a bestowal price OR enable giveaway option');
      return;
    }

    // Validate: If giveaway, must have limit
    if (formData.is_giveaway && (!formData.giveaway_limit || formData.giveaway_limit <= 0)) {
      toast.error('Please set giveaway limit (number of free downloads)');
      return;
    }

    // Validate: Preview file required for music/courses (30sec preview)
    if ((formData.type === 'music' || formData.type === 'training_course') && !previewFile) {
      toast.error('Preview file is required for music and training courses (30-second preview)');
      return;
    }

    // Validate: Preview file required for e-books (preview only)
    if (formData.type === 'ebook' && !previewFile) {
      toast.error('Preview file is required for e-books (preview pages)');
      return;
    }

    // Validate whisperer percentage
    if (formData.whisperer_percentage < 0 || formData.whisperer_percentage > 30) {
      toast.error('Whisperer percentage must be between 0% and 30%');
      return;
    }

    if (mainFile.size > 100 * 1024 * 1024) {
      toast.error('File size must be under 100MB');
      return;
    }

    setUploading(true);

    try {
      // Upload main file
      const fileExt = mainFile.name.split('.').pop();
      const filePath = `library/${user.id}/${Date.now()}.${fileExt}`;
      const { error: fileError } = await supabase.storage
        .from('premium-room')
        .upload(filePath, mainFile);

      if (fileError) throw fileError;

      const { data: fileUrl } = supabase.storage
        .from('premium-room')
        .getPublicUrl(filePath);

      // Upload preview if provided
      let previewUrl = null;
      if (previewFile) {
        const previewExt = previewFile.name.split('.').pop();
        const previewPath = `library/${user.id}/preview-${Date.now()}.${previewExt}`;
        const { error: previewError } = await supabase.storage
          .from('premium-room')
          .upload(previewPath, previewFile);
        if (!previewError) {
          const { data: previewUrlData } = supabase.storage
            .from('premium-room')
            .getPublicUrl(previewPath);
          previewUrl = previewUrlData.publicUrl;
        }
      }

      // Upload cover image
      let coverUrl = null;
      if (coverImage) {
        const coverExt = coverImage.name.split('.').pop();
        const coverPath = `library/${user.id}/cover-${Date.now()}.${coverExt}`;
        const { error: coverError } = await supabase.storage
          .from('premium-room')
          .upload(coverPath, coverImage);
        if (!coverError) {
          const { data: coverUrlData } = supabase.storage
            .from('premium-room')
            .getPublicUrl(coverPath);
          coverUrl = coverUrlData.publicUrl;
        }
      }

      // Create library item
      const { error: insertError } = await supabase
        .from('s2g_library_items')
        .insert({
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          type: formData.type,
          category: formData.category,
          price: formData.is_giveaway ? 0 : formData.price,
          file_url: fileUrl.publicUrl,
          preview_url: previewUrl,
          cover_image_url: coverUrl,
          file_size: mainFile.size,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
          is_public: true,
          is_giveaway: formData.is_giveaway,
          giveaway_limit: formData.is_giveaway ? formData.giveaway_limit : null,
          giveaway_count: 0,
          whisperer_percentage: formData.whisperer_percentage,
          preview_duration_seconds: (formData.type === 'music' || formData.type === 'training_course') ? 30 : null
        });

      if (insertError) throw insertError;

      toast.success('Library item uploaded successfully!');
      navigate('/my-s2g-library');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ebook': return <Book className='w-5 h-5' />;
      case 'document': return <FileText className='w-5 h-5' />;
      case 'training_course': return <GraduationCap className='w-5 h-5' />;
      case 'art_asset': return <Image className='w-5 h-5' />;
      case 'music': return <Music className='w-5 h-5' />;
      default: return <FileText className='w-5 h-5' />;
    }
  };

  return (
    <div className='min-h-screen relative overflow-hidden'>
      <div className='fixed inset-0 z-0'>
        <div className='absolute inset-0' style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradient 20s ease infinite'
        }} />
        <div className='absolute inset-0 bg-black/20' />
      </div>

      <div className='relative z-10 container max-w-3xl mx-auto px-4 py-8'>
        <Card className='backdrop-blur-md bg-white/20 border-white/30'>
          <CardHeader>
            <CardTitle className='text-3xl text-white flex items-center gap-3'>
              {getTypeIcon(formData.type)}
              Upload Library Item
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className='space-y-6'>
              <div>
                <Label htmlFor='title' className='text-white'>Title *</Label>
                <Input
                  id='title'
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className='bg-white/20 border-white/30 text-white'
                />
              </div>

              <div>
                <Label htmlFor='description' className='text-white'>Description</Label>
                <Textarea
                  id='description'
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className='bg-white/20 border-white/30 text-white'
                />
              </div>

              <div>
                <Label htmlFor='type' className='text-white'>Type *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger className='bg-white/20 border-white/30 text-white'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='ebook'>E-Book</SelectItem>
                    <SelectItem value='document'>Document</SelectItem>
                    <SelectItem value='training_course'>Training Course</SelectItem>
                    <SelectItem value='art_asset'>Art Asset</SelectItem>
                    <SelectItem value='music'>Music</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Bestowal or Giveaway Section */}
              <div className='space-y-4 p-4 bg-white/10 rounded-lg border border-white/20'>
                <div className='flex items-center gap-2'>
                  <Checkbox
                    id='is_giveaway'
                    checked={formData.is_giveaway}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_giveaway: !!checked, price: checked ? 0 : formData.price })}
                    className='border-white/30'
                  />
                  <Label htmlFor='is_giveaway' className='text-white cursor-pointer'>
                    Enable Giveaway (Free Downloads)
                  </Label>
                </div>

                {formData.is_giveaway ? (
                  <div>
                    <Label htmlFor='giveaway_limit' className='text-white'>Giveaway Limit (Number of Free Downloads) *</Label>
                    <Input
                      id='giveaway_limit'
                      type='number'
                      min='1'
                      required={formData.is_giveaway}
                      value={formData.giveaway_limit || ''}
                      onChange={(e) => setFormData({ ...formData, giveaway_limit: parseInt(e.target.value) || null })}
                      className='bg-white/20 border-white/30 text-white'
                      placeholder='e.g., 100'
                    />
                    <p className='text-white/70 text-xs mt-1'>
                      Set how many free downloads are available for this giveaway
                    </p>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor='price' className='text-white'>Bestowal Price (USDC) *</Label>
                    <Input
                      id='price'
                      type='number'
                      step='0.01'
                      min='0.01'
                      required={!formData.is_giveaway}
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className='bg-white/20 border-white/30 text-white'
                      placeholder='0.00'
                    />
                    <p className='text-white/70 text-xs mt-1'>
                      Amount growers must bestow to access this item. Minimum $0.01 USDC required.
                    </p>
                  </div>
                )}
              </div>

              {/* S2G Whisperer Option */}
              <div className='space-y-2 p-4 bg-white/10 rounded-lg border border-white/20'>
                <Label htmlFor='whisperer_percentage' className='text-white'>
                  S2G Whisperer Percentage (Content Marketers) - Optional
                </Label>
                <Input
                  id='whisperer_percentage'
                  type='number'
                  step='0.1'
                  min='0'
                  max='30'
                  value={formData.whisperer_percentage}
                  onChange={(e) => setFormData({ ...formData, whisperer_percentage: parseFloat(e.target.value) || 0 })}
                  className='bg-white/20 border-white/30 text-white'
                  placeholder='0'
                />
                <p className='text-white/70 text-xs'>
                  Allocate 2.5% to 30% of bestowals to S2G whisperers (content marketers) who promote your item. Set to 0 to disable.
                </p>
              </div>

              <div>
                <Label htmlFor='mainFile' className='text-white'>Main File (Full Content) *</Label>
                <Input
                  id='mainFile'
                  type='file'
                  required
                  onChange={(e) => setMainFile(e.target.files?.[0] || null)}
                  className='bg-white/20 border-white/30 text-white'
                />
                <p className='text-white/70 text-xs mt-1'>
                  Full content file. Only accessible after bestowal or giveaway claim.
                </p>
              </div>

              <div>
                <Label htmlFor='previewFile' className='text-white'>
                  Preview File *
                  {(formData.type === 'music' || formData.type === 'training_course') && ' (30-second preview required)'}
                  {formData.type === 'ebook' && ' (Preview pages required)'}
                </Label>
                <Input
                  id='previewFile'
                  type='file'
                  required={formData.type === 'music' || formData.type === 'training_course' || formData.type === 'ebook'}
                  onChange={(e) => setPreviewFile(e.target.files?.[0] || null)}
                  className='bg-white/20 border-white/30 text-white'
                />
                <p className='text-white/70 text-xs mt-1'>
                  {formData.type === 'music' || formData.type === 'training_course' 
                    ? '30-second preview clip (required for music and courses)'
                    : formData.type === 'ebook'
                    ? 'Preview pages/chapters (required for e-books)'
                    : 'Preview file shown before bestowal (optional for other types)'}
                </p>
              </div>

              <div>
                <Label htmlFor='coverImage' className='text-white'>Cover Image (Optional)</Label>
                <Input
                  id='coverImage'
                  type='file'
                  accept='image/*'
                  onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
                  className='bg-white/20 border-white/30 text-white'
                />
              </div>

              <Button
                type='submit'
                disabled={uploading}
                className='w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
              >
                {uploading ? (
                  <>
                    <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className='w-4 h-4 mr-2' />
                    Upload Item
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
