import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const BUCKET_MAP = {
  doc: 'live-session-docs',
  art: 'live-session-art',
  music: 'live-session-music',
};

export function useMediaUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadMedia = async (
    file: File,
    sessionId: string,
    mediaType: 'doc' | 'art' | 'music',
    userId: string
  ) => {
    setUploading(true);
    setProgress(0);

    try {
      // Validate file size
      const maxSizes = {
        doc: 50 * 1024 * 1024, // 50MB
        art: 10 * 1024 * 1024, // 10MB
        music: 100 * 1024 * 1024, // 100MB
      };

      if (file.size > maxSizes[mediaType]) {
        throw new Error(`File too large. Max size: ${maxSizes[mediaType] / 1024 / 1024}MB`);
      }

      const bucket = BUCKET_MAP[mediaType];
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${sessionId}/${Date.now()}.${fileExt}`;

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      setProgress(95);

      // Get duration for audio files
      let durationSeconds: number | null = null;
      if (mediaType === 'music' && file.type.startsWith('audio/')) {
        durationSeconds = await getAudioDuration(file);
      }

      // Create database record
      const { error: dbError } = await supabase
        .from('live_session_media')
        .insert({
          session_id: sessionId,
          uploader_id: userId,
          media_type: mediaType,
          file_name: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          mime_type: file.type,
          duration_seconds: durationSeconds,
          price_cents: 0,
          watermarked: false,
        });

      if (dbError) throw dbError;

      setProgress(100);
      toast.success(`${file.name} uploaded successfully!`);

      // Reset after brief delay
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 500);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload file');
      setUploading(false);
      setProgress(0);
    }
  };

  return {
    uploadMedia,
    uploading,
    progress,
  };
}

// Helper to get audio duration
function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    
    audio.onloadedmetadata = () => {
      window.URL.revokeObjectURL(audio.src);
      resolve(Math.round(audio.duration));
    };

    audio.onerror = () => {
      resolve(0);
    };

    audio.src = window.URL.createObjectURL(file);
  });
}
