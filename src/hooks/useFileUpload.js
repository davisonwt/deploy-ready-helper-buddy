import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'

export function useFileUpload() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const { user } = useAuth()

  const uploadFile = async (file, bucket, folder = '') => {
    try {
      if (!user) throw new Error('User must be authenticated')

      setUploading(true)
      setError(null)

      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${folder}${Date.now()}.${fileExt}`

      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName)

      return {
        success: true,
        data: {
          path: data.path,
          url: urlData.publicUrl,
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