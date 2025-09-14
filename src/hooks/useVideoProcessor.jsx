import { useState, useCallback } from 'react';
import { processVideo, validateVideoFile, extractVideoMetadata } from '@/utils/videoProcessor';
import { useToast } from '@/hooks/use-toast';

export function useVideoProcessor() {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const processVideoFile = useCallback(async (file, options = {}) => {
    try {
      setProcessing(true);
      setProgress(0);
      setProgressMessage('Validating file...');
      setError(null);

      // Validate file first
      const validation = validateVideoFile(file);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      // Default options
      const defaultOptions = {
        compress: true,
        generateThumbnails: true,
        compressionOptions: {
          maxSizeMB: 50,
          quality: 'medium',
          maxDuration: 300
        },
        thumbnailOptions: {
          interval: 10,
          maxThumbnails: 6,
          width: 320,
          height: 180,
          format: 'jpeg',
          quality: 0.8
        },
        onProgress: (progress, message) => {
          setProgress(Math.round(progress));
          setProgressMessage(message);
        }
      };

      const mergedOptions = {
        ...defaultOptions,
        ...options,
        compressionOptions: {
          ...defaultOptions.compressionOptions,
          ...options.compressionOptions
        },
        thumbnailOptions: {
          ...defaultOptions.thumbnailOptions,
          ...options.thumbnailOptions
        }
      };

      // Process the video
      const result = await processVideo(file, mergedOptions);

      toast({
        title: "Video processed successfully!",
        description: `Compressed ${(result.compressionRatio).toFixed(1)}x, generated ${result.thumbnails.length} thumbnails`
      });

      return result;

    } catch (err) {
      console.error('Video processing error:', err);
      setError(err.message);
      
      toast({
        title: "Video processing failed",
        description: err.message,
        variant: "destructive"
      });
      
      throw err;
    } finally {
      setProcessing(false);
    }
  }, [toast]);

  const getVideoMetadata = useCallback(async (file) => {
    try {
      setError(null);
      const validation = validateVideoFile(file);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      return await extractVideoMetadata(file);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setProcessing(false);
    setProgress(0);
    setProgressMessage('');
    setError(null);
  }, []);

  return {
    processing,
    progress,
    progressMessage,
    error,
    processVideoFile,
    getVideoMetadata,
    reset
  };
}