import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useVideoProcessor } from '@/hooks/useVideoProcessor';

export default function VideoUpload() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { processVideoFile, processing, progress, progressMessage } = useVideoProcessor();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const generateThumbnail = (videoFile: File): Promise<{ blob: Blob; url: string }> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }

      video.onloadeddata = () => {
        video.currentTime = 1; // Capture at 1 second
      };

      video.onseeked = () => {
        canvas.width = video.videoWidth / 4; // Thumbnail size
        canvas.height = video.videoHeight / 4;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            resolve({ blob, url });
          } else {
            reject(new Error('Failed to generate thumbnail'));
          }
        }, 'image/jpeg', 0.8);
      };

      video.onerror = () => reject(new Error('Video loading failed'));
      video.src = URL.createObjectURL(videoFile);
    });
  };

  const handleUpload = async () => {
    if (!file || !user) {
      toast({
        title: "Error",
        description: "Please select a file and ensure you're logged in",
        variant: "destructive"
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // Validate file
      if (!file.type.startsWith('video/')) {
        throw new Error('Please select a video file');
      }
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        throw new Error('File size must be under 100MB');
      }

      // Process video if needed
      let processedFile = file;
      let thumbnails: any[] = [];
      
      if (file.size > 50 * 1024 * 1024) { // Process if > 50MB
        const result = await processVideoFile(file, {
          compress: true,
          generateThumbnails: true,
          compressionOptions: {
            maxSizeMB: 50,
            quality: 'medium'
          }
        });
        processedFile = result.compressedFile || file;
        thumbnails = result.thumbnails || [];
      }

      // Generate thumbnail if not already generated
      let thumbnailUrl = '';
      if (thumbnails.length === 0) {
        const { blob: thumbnailBlob } = await generateThumbnail(processedFile);
        const thumbnailFileName = `${user.id}-${Date.now()}-thumb.jpg`;
        const { data: thumbData, error: thumbError } = await supabase.storage
          .from('chat-files')
          .upload(`thumbnails/${thumbnailFileName}`, thumbnailBlob);

        if (thumbError) throw thumbError;
        
        const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
          .from('chat-files')
          .getPublicUrl(`thumbnails/${thumbnailFileName}`);
        
        thumbnailUrl = thumbPublicUrl;
      } else {
        // Upload first thumbnail
        const thumbnailFileName = `${user.id}-${Date.now()}-thumb.jpg`;
        const { data: thumbData, error: thumbError } = await supabase.storage
          .from('chat-files')
          .upload(`thumbnails/${thumbnailFileName}`, thumbnails[0]);

        if (thumbError) throw thumbError;
        
        const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
          .from('chat-files')
          .getPublicUrl(`thumbnails/${thumbnailFileName}`);
        
        thumbnailUrl = thumbPublicUrl;
      }

      // Upload video
      const fileExt = processedFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(`videos/${fileName}`, processedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl: videoUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(`videos/${fileName}`);

      // Insert to database
      const { error: dbError } = await supabase.from('community_videos').insert({
        uploader_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        tags: tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        file_size: processedFile.size,
        status: 'pending'
      });

      if (dbError) throw dbError;

      toast({
        title: "Video uploaded successfully!",
        description: "Your video is being processed and will be available soon."
      });

      // Reset form
      setTitle('');
      setDescription('');
      setTags('');
      setFile(null);
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Upload Video
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Title *</label>
          <Input
            placeholder="Enter video title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            placeholder="Describe your video"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Tags</label>
          <Input
            placeholder="Enter tags separated by commas"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Video File *</label>
          <Input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="cursor-pointer"
          />
          {file && (
            <div className="text-sm text-muted-foreground">
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}
        </div>

        {(processing || uploading) && (
          <Alert>
            <AlertDescription>
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {processing ? progressMessage : "Uploading..."}
                {processing && (
                  <span className="ml-auto">{progress}%</span>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleUpload}
          className="w-full"
          disabled={uploading || processing || !file || !title.trim()}
        >
          {uploading || processing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {processing ? "Processing..." : "Uploading..."}
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Video
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}