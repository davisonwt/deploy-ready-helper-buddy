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
    tags: ''
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
          price: formData.price,
          file_url: fileUrl.publicUrl,
          preview_url: previewUrl,
          cover_image_url: coverUrl,
          file_size: mainFile.size,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
          is_public: true
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

              <div>
                <Label htmlFor='price' className='text-white'>Price (USDC)</Label>
                <Input
                  id='price'
                  type='number'
                  step='0.01'
                  min='0'
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className='bg-white/20 border-white/30 text-white'
                />
              </div>

              <div>
                <Label htmlFor='mainFile' className='text-white'>Main File *</Label>
                <Input
                  id='mainFile'
                  type='file'
                  required
                  onChange={(e) => setMainFile(e.target.files?.[0] || null)}
                  className='bg-white/20 border-white/30 text-white'
                />
              </div>

              <div>
                <Label htmlFor='previewFile' className='text-white'>Preview File (Optional)</Label>
                <Input
                  id='previewFile'
                  type='file'
                  onChange={(e) => setPreviewFile(e.target.files?.[0] || null)}
                  className='bg-white/20 border-white/30 text-white'
                />
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
