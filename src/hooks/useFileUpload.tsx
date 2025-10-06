import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UploadResult { 
  url?: string; 
  error?: string; 
}

interface UseFileUploadOptions {
  maxSizeMB?: number;
  allowedTypes?: string[];
  onProgress?: (progress: number) => void;
}

export const useFileUpload = (bucket: string, options: UseFileUploadOptions = {}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const {
    maxSizeMB = 100,
    allowedTypes = ['image/', 'video/', 'audio/'],
    onProgress
  } = options;

  const uploadFile = useCallback(async (file: File): Promise<UploadResult> => {
    // Validation
    const isValidType = allowedTypes.some(type => file.type.startsWith(type));
    if (!isValidType) {
      const error = `Invalid file type. Allowed: ${allowedTypes.join(', ')}`;
      toast({ variant: 'destructive', title: 'Upload Failed', description: error });
      return { error };
    }

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      const error = `File too large. Max size: ${maxSizeMB}MB`;
      toast({ variant: 'destructive', title: 'Upload Failed', description: error });
      return { error };
    }

    setUploading(true);
    setProgress(0);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${fileName}`;

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const next = Math.min(prev + 10, 90);
          onProgress?.(next);
          return next;
        });
      }, 200);

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
          cacheControl: '3600',
        });

      clearInterval(progressInterval);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      setProgress(100);
      onProgress?.(100);
      
      toast({ 
        title: 'Upload Complete!',
        description: `${file.name} uploaded successfully`
      });

      return { url: publicUrl };
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({ 
        variant: 'destructive', 
        title: 'Upload Failed',
        description: err.message || 'Failed to upload file'
      });
      return { error: err.message };
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  }, [bucket, maxSizeMB, allowedTypes, toast, onProgress]);

  const uploadMultiple = useCallback(async (files: File[]): Promise<UploadResult[]> => {
    const results: UploadResult[] = [];
    for (const file of files) {
      const result = await uploadFile(file);
      results.push(result);
    }
    return results;
  }, [uploadFile]);

  return { 
    uploadFile, 
    uploadMultiple,
    uploading, 
    progress 
  };
};
