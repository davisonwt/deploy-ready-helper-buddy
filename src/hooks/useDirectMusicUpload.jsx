import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export const useDirectMusicUpload = () => {
  const [uploading, setUploading] = useState(false)
  
  const directUpload = async (file, trackData, djProfile) => {
    console.log('🔥 DIRECT UPLOAD - NEW APPROACH')
    console.log('🔥 DJ Profile:', djProfile)
    console.log('🔥 File:', file)
    
    if (!djProfile) {
      toast.error('DJ profile required')
      return null
    }

    // Check file size (25MB limit for better upload reliability)
    const maxFileSize = 25 * 1024 * 1024 // 25MB in bytes
    if (file.size > maxFileSize) {
      toast.error(`File size too large. Maximum allowed size is 25MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`)
      return null
    }

    try {
      setUploading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      
      const fileName = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      
      console.log('🔥 UPLOADING TO: music-tracks')
      console.log('🔥 File name:', fileName)
      
      // Direct upload to music-tracks bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('music-tracks')
        .upload(fileName, file)

      if (uploadError) {
        console.error('🔥 Upload failed:', uploadError)
        throw uploadError
      }

      console.log('🔥 Upload successful:', uploadData)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('music-tracks')
        .getPublicUrl(fileName)

      let coverImageUrl = null
      if (trackData.coverImageFile) {
        const coverExt = trackData.coverImageFile.name.split('.').pop() || 'jpg'
        const coverName = `${user.id}/covers/${Date.now()}-${crypto.randomUUID()}.${coverExt}`
        const { error: coverError } = await supabase.storage
          .from('music-tracks')
          .upload(coverName, trackData.coverImageFile, { contentType: trackData.coverImageFile.type, upsert: false })
        if (coverError) throw coverError
        const { data: coverPublic } = supabase.storage.from('music-tracks').getPublicUrl(coverName)
        coverImageUrl = coverPublic?.publicUrl || null
      }

      // Insert track record
      const { data: trackRecord, error: insertError } = await supabase
        .from('dj_music_tracks')
        .insert({
          dj_id: djProfile.id,
          track_title: trackData.title,
          artist_name: trackData.artist,
          duration_seconds: trackData.duration || 0,
          file_url: publicUrl,
          file_size: file.size,
          track_type: trackData.type || 'music',
          tags: trackData.tags || [],
          bpm: trackData.bpm || null,
          genre: trackData.genre || null,
          is_explicit: trackData.explicit || false,
          wandering_role: trackData.wandering_role || null,
          cover_image_url: coverImageUrl,
          radio_eligible: !!trackData.radioEligible,
          radio_opted_in_at: trackData.radioEligible ? new Date().toISOString() : null
        })
        .select()
        .single()

      if (insertError) {
        console.error('🔥 Database insert failed:', insertError)
        throw insertError
      }

      console.log('🔥 Track created:', trackRecord)

      // Persist marketplace taxonomy junctions for this music listing
      try {
        const subIds = trackData.subcategoryIds || []
        const tagIds = trackData.tagIds || []
        if (trackRecord?.id && subIds.length) {
          await supabase.from('listing_subcategories').insert(
            subIds.map((sid) => ({
              listing_type: 'music',
              listing_id: trackRecord.id,
              subcategory_id: sid,
              owner_user_id: user.id,
            }))
          )
        }
        if (trackRecord?.id && tagIds.length) {
          const { error: tagErr } = await supabase.from('listing_tags').insert(
            tagIds.map((tid) => ({
              listing_type: 'music',
              listing_id: trackRecord.id,
              tag_id: tid,
              owner_user_id: user.id,
            }))
          )
          if (tagErr) console.warn('Some music tags blocked:', tagErr.message)
        }
      } catch (junctionErr) {
        console.warn('Music marketplace taxonomy save failed:', junctionErr)
      }

      // Award XP for uploading music (100 XP)
      await supabase.rpc('add_xp_to_current_user', { amount: 100 }).catch((err) => {
        console.error('Failed to award XP:', err);
        // Don't fail the upload if XP award fails
      });

      toast.success('Track uploaded successfully!')

      return trackRecord
      
    } catch (error) {
      console.error('🔥 Upload error:', error)
      toast.error(`Upload failed: ${error.message}`)
      return null
    } finally {
      setUploading(false)
    }
  }

  return { directUpload, uploading }
}