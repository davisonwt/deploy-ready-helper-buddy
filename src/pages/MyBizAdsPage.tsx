import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ArrowLeft, Upload, Trash2, Pause, Play, Loader2, Image, Video, Music, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';

const ACCEPTED_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'],
};

const ALL_ACCEPTED = Object.values(ACCEPTED_TYPES).flat().reduce((acc, t) => ({ ...acc, [t]: [] }), {});

export default function MyBizAdsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaType, setMediaType] = useState<string>('image');
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: myAds = [], isLoading } = useQuery({
    queryKey: ['my-biz-ads', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('biz_ads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const onDrop = useCallback((files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      // Auto-detect media type
      if (file.type.startsWith('image/')) setMediaType('image');
      else if (file.type.startsWith('video/')) setMediaType('video');
      else if (file.type.startsWith('audio/')) setMediaType('audio');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALL_ACCEPTED,
    multiple: false,
    disabled: uploading,
  });

  const handleSubmit = async () => {
    if (!user?.id || !selectedFile || !title.trim()) {
      toast.error('Please fill in the title and select a file');
      return;
    }

    setUploading(true);
    try {
      const ext = selectedFile.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('biz-ads')
        .upload(path, selectedFile, { cacheControl: '3600', upsert: false });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from('biz-ads').getPublicUrl(path);

      // Get duration for audio/video
      let duration: number | null = null;
      if (selectedFile.type.startsWith('audio/') || selectedFile.type.startsWith('video/')) {
        duration = await getMediaDuration(selectedFile);
      }

      const { error: dbErr } = await supabase.from('biz_ads').insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        media_url: publicUrl,
        media_type: mediaType,
        duration_seconds: duration,
        file_size: selectedFile.size,
        mime_type: selectedFile.type,
        status: 'approved', // auto-approve for now
      });
      if (dbErr) throw dbErr;

      toast.success('Ad uploaded successfully!');
      queryClient.invalidateQueries({ queryKey: ['my-biz-ads'] });
      queryClient.invalidateQueries({ queryKey: ['community-biz-ads'] });
      resetForm();
      setDialogOpen(false);
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message || 'Failed to upload ad');
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase.from('biz_ads').update({ is_active: !currentActive }).eq('id', id);
    if (error) { toast.error('Failed to update'); return; }
    toast.success(currentActive ? 'Ad paused' : 'Ad activated');
    queryClient.invalidateQueries({ queryKey: ['my-biz-ads'] });
  };

  const deleteAd = async (id: string) => {
    if (!confirm('Delete this ad?')) return;
    const { error } = await supabase.from('biz_ads').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Ad deleted');
    queryClient.invalidateQueries({ queryKey: ['my-biz-ads'] });
  };

  const resetForm = () => {
    setTitle(''); setDescription(''); setMediaType('image'); setSelectedFile(null);
  };

  const getMediaIcon = (type: string) => {
    if (type === 'video') return <Video className="w-4 h-4" />;
    if (type === 'audio') return <Music className="w-4 h-4" />;
    return <Image className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Megaphone className="w-8 h-8 text-primary" />
              My S2G Biz Ads
            </h1>
            <p className="text-muted-foreground mt-1">
              Upload ads to play on radio slots & show in the community gallery
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Upload className="w-4 h-4" /> Upload Ad
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Upload Business Ad</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Title *</label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Grand Opening Sale" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of your ad" rows={3} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Media Type</label>
                  <Select value={mediaType} onValueChange={setMediaType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">🖼️ Image</SelectItem>
                      <SelectItem value="video">🎬 Video</SelectItem>
                      <SelectItem value="audio">🎙️ Audio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div
                  {...getRootProps()}
                  className={cn(
                    'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
                    isDragActive && 'border-primary bg-primary/5 scale-[1.02]',
                    uploading && 'opacity-50 cursor-not-allowed',
                    !isDragActive && !uploading && 'hover:border-primary/50 hover:bg-accent/50'
                  )}
                >
                  <input {...getInputProps()} />
                  {selectedFile ? (
                    <div className="space-y-1">
                      <p className="font-medium text-primary">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                      <p className="font-medium">Drop your ad file here</p>
                      <p className="text-xs text-muted-foreground">Images, Videos, or Audio files</p>
                    </div>
                  )}
                </div>
                <Button onClick={handleSubmit} disabled={uploading || !selectedFile || !title.trim()} className="w-full gap-2">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Uploading...' : 'Submit Ad'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : myAds.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Megaphone className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Ads Yet</h3>
              <p className="text-muted-foreground mb-4">Upload your first business ad to promote on radio slots!</p>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Upload className="w-4 h-4" /> Upload Your First Ad
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myAds.map((ad: any) => (
              <Card key={ad.id} className="overflow-hidden group">
                <div className="aspect-video bg-muted relative">
                  {ad.media_type === 'image' ? (
                    <img src={ad.media_url} alt={ad.title} className="w-full h-full object-cover" />
                  ) : ad.media_type === 'video' ? (
                    <video src={ad.media_url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Badge variant={ad.is_active ? 'default' : 'secondary'}>
                      {ad.is_active ? 'Active' : 'Paused'}
                    </Badge>
                    <Badge variant="outline" className="bg-background/80">
                      {getMediaIcon(ad.media_type)}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-3 space-y-2">
                  <h3 className="font-semibold truncate">{ad.title}</h3>
                  {ad.description && <p className="text-sm text-muted-foreground line-clamp-2">{ad.description}</p>}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => toggleActive(ad.id, ad.is_active)} className="flex-1 gap-1">
                      {ad.is_active ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      {ad.is_active ? 'Pause' : 'Activate'}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteAd(ad.id)} className="gap-1">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getMediaDuration(file: File): Promise<number> {
  return new Promise(resolve => {
    const el = file.type.startsWith('video/')
      ? document.createElement('video')
      : document.createElement('audio');
    el.preload = 'metadata';
    el.onloadedmetadata = () => { URL.revokeObjectURL(el.src); resolve(Math.round(el.duration)); };
    el.onerror = () => resolve(0);
    el.src = URL.createObjectURL(file);
  });
}
