// Fixed React import - force refresh
import React, { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { compressVideoAdvanced } from '@/utils/videoProcessor'

export function useFileUpload() {
  console.log('useFileUpload hook initializing - React:', React, 'useState:', useState)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const { user } = useAuth()

  const uploadFile = async (file, bucket, folder = '') => {
    try {
      if (!user) {
        console.error('❌ Upload failed: User not authenticated');
        throw new Error('User must be authenticated');
      }

      console.log('📤 UPLOAD DEBUG: Starting file upload:', { 
        fileName: file.name, 
        fileSize: file.size, 
        fileType: file.type, 
        bucket, 
        folder, 
        userId: user.id,
        timestamp: new Date().toISOString()
      });

      setUploading(true)
      setError(null)

      // Compress video files if they're too large
      let fileToUpload = file;
      if (file.type.startsWith('video/')) {
        const fileSizeMB = file.size / (1024 * 1024);
        console.log(`📹 Video file size: ${fileSizeMB.toFixed(2)}MB`);
        
        if (fileSizeMB > 50) { // 50MB threshold
          console.log('📹 Video is large, compressing...');
          try {
            fileToUpload = await compressVideoAdvanced(file, {
              maxSizeMB: 50,
              quality: 'medium',
              onProgress: (progress, message) => {
                console.log(`📹 Compression: ${progress}% - ${message}`);
              }
            });
            const newSizeMB = fileToUpload.size / (1024 * 1024);
            console.log(`✅ Video compressed from ${fileSizeMB.toFixed(2)}MB to ${newSizeMB.toFixed(2)}MB`);
          } catch (compressionError) {
            console.warn('⚠️ Video compression failed, uploading original:', compressionError);
            // Continue with original file if compression fails
          }
        }
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${folder}${Date.now()}.${fileExt}`
      
      console.log('Generated file path:', fileName);

      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, fileToUpload, {
          cacheControl: '3600',
          upsert: false
        })

      console.log('Storage upload response:', { data, error: uploadError });

      if (uploadError) {
        console.error('Storage upload error details:', uploadError);
        throw uploadError;
      }

      // For public buckets, get public URL. For private buckets, get signed URL
      let fileUrl;
      
      if (bucket === 'chat-files' || bucket === 'orchard-images' || bucket === 'orchard-videos' || bucket === 'orchard-audio') {
        // Public bucket - get public URL
        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);
        
        fileUrl = publicUrlData?.publicUrl;
        console.log('Public URL generated:', fileUrl);
      } else {
        // Private bucket - get signed URL
        const { data: urlData, error: urlError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(fileName, 3600); // 1 hour expiry

        console.log('Signed URL response:', { urlData, error: urlError });

        if (urlError) {
          console.error('Failed to create signed URL:', urlError);
          throw urlError;
        }
        
        fileUrl = urlData.signedUrl;
      }

      return {
        success: true,
        data: {
          path: data.path,
          url: fileUrl,
          fileName
        }
      }
    } catch (err) {
      console.error('Error uploading file:', err)
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setUploading(false)
    }
  }

  const uploadMultipleFiles = async (files, bucket, folder = '') => {
    try {
      setUploading(true)
      setError(null)

      const uploadPromises = files.map(file => uploadFile(file, bucket, folder))
      const results = await Promise.all(uploadPromises)

      const successful = results.filter(r => r.success)
      const failed = results.filter(r => !r.success)

      if (failed.length > 0) {
        console.warn('Some uploads failed:', failed)
      }

      return {
        success: true,
        data: successful.map(r => r.data),
        failures: failed
      }
    } catch (err) {
      console.error('Error uploading multiple files:', err)
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setUploading(false)
    }
  }

  const deleteFile = async (fileName, bucket) => {
    try {
      const { error: deleteError } = await supabase.storage
        .from(bucket)
        .remove([fileName])

      if (deleteError) throw deleteError

      return { success: true }
    } catch (err) {
      console.error('Error deleting file:', err)
      return { success: false, error: err.message }
    }
  }

  return {
    uploading,
    error,
    uploadFile,
    uploadMultipleFiles,
    deleteFile
  }
}