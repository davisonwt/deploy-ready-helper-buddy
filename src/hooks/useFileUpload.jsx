// Fixed React import - force refresh
import React, { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export function useFileUpload() {
  console.log('useFileUpload hook initializing - React:', React, 'useState:', useState)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const { user } = useAuth()

  const uploadFile = async (file, bucket, folder = '') => {
    try {
      if (!user) throw new Error('User must be authenticated')

      console.log('Starting file upload:', { 
        fileName: file.name, 
        fileSize: file.size, 
        fileType: file.type, 
        bucket, 
        folder, 
        userId: user.id 
      });

      setUploading(true)
      setError(null)

      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${folder}${Date.now()}.${fileExt}`
      
      console.log('Generated file path:', fileName);

      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      console.log('Storage upload response:', { data, error: uploadError });

      if (uploadError) {
        console.error('Storage upload error details:', uploadError);
        throw uploadError;
      }

      // Get signed URL for private bucket
      const { data: urlData, error: urlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(fileName, 3600) // 1 hour expiry

      console.log('Signed URL response:', { urlData, error: urlError });

      if (urlError) {
        console.error('Failed to create signed URL:', urlError);
        throw urlError;
      }

      return {
        success: true,
        data: {
          path: data.path,
          url: urlData.signedUrl,
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