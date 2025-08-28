import React, { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useFileUpload } from './useFileUpload.jsx'
import { useToast } from '@/hooks/use-toast'

export function useCommunityVideos() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { user } = useAuth()
  const { uploadFile } = useFileUpload()
  const { toast } = useToast()

  // Fetch videos
  const fetchVideos = async (options = {}) => {
    try {
      setLoading(true)
      let query = supabase
        .from('community_videos')
        .select(`
          *,
          uploader_profile_id,
          profiles!community_videos_uploader_profile_id_fkey (
            display_name,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('status', 'approved')

      // Apply sorting
      switch (options.sortBy) {
        case 'views':
          query = query.order('view_count', { ascending: false })
          break
        case 'likes':
          query = query.order('like_count', { ascending: false })
          break
        case 'trending':
          // Trending: high views/likes in last 48 hours
          query = query
            .gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
            .order('view_count', { ascending: false })
          break
        default:
          query = query.order('created_at', { ascending: false })
      }

      // Apply search filter
      if (options.search) {
        query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%,tags.cs.{${options.search}}`)
      }

      const { data, error } = await query.limit(20)

      if (error) throw error
      setVideos(data || [])
    } catch (error) {
      console.error('Error fetching videos:', error)
      toast({
        title: "Error",
        description: "Failed to load videos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Upload video
  const uploadVideo = async (file, metadata) => {
    try {
      if (!user) throw new Error('Must be logged in to upload')

      setUploading(true)

      // Validate file
      if (!file.type.startsWith('video/')) {
        throw new Error('Please select a video file')
      }

      if (file.size > 100 * 1024 * 1024) { // 100MB
        throw new Error('Video file must be less than 100MB')
      }

      // Get video duration
      const duration = await getVideoDuration(file)
      if (duration < 30 || duration > 60) {
        throw new Error('Video must be between 30 seconds and 1 minute long')
      }

      // Upload to storage
      const uploadResult = await uploadFile(file, 'videos', 'community/')
      if (!uploadResult.success) {
        throw new Error(uploadResult.error)
      }

      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      // Create video record
      const { data, error } = await supabase
        .from('community_videos')
        .insert({
          uploader_id: user.id,
          uploader_profile_id: profile?.id,
          title: metadata.title,
          description: metadata.description || null,
          tags: metadata.tags || [],
          video_url: uploadResult.data.url,
          duration_seconds: Math.round(duration),
          file_size: file.size,
          orchard_id: metadata.orchard_id || null,
          status: 'approved'
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Success",
        description: "Video uploaded successfully! It will be reviewed before going live.",
        variant: "default"
      })

      return { success: true, data }
    } catch (error) {
      console.error('Error uploading video:', error)
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive"
      })
      return { success: false, error: error.message }
    } finally {
      setUploading(false)
    }
  }

  // Like/unlike video
  const toggleLike = async (videoId) => {
    try {
      if (!user) throw new Error('Must be logged in to like videos')

      // Check if already liked
      const { data: existingLike } = await supabase
        .from('video_likes')
        .select('id')
        .eq('video_id', videoId)
        .eq('user_id', user.id)
        .single()

      if (existingLike) {
        // Unlike
        await supabase
          .from('video_likes')
          .delete()
          .eq('id', existingLike.id)
      } else {
        // Like
        await supabase
          .from('video_likes')
          .insert({
            video_id: videoId,
            user_id: user.id
          })
      }

      // Refresh videos to update counts
      fetchVideos()
    } catch (error) {
      console.error('Error toggling like:', error)
      toast({
        title: "Error",
        description: "Failed to update like",
        variant: "destructive"
      })
    }
  }

  // Add comment
  const addComment = async (videoId, content) => {
    try {
      if (!user) throw new Error('Must be logged in to comment')

      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      const { data, error } = await supabase
        .from('video_comments')
        .insert({
          video_id: videoId,
          commenter_id: user.id,
          commenter_profile_id: profile?.id,
          content: content.trim()
        })
        .select(`
          *,
          profiles!video_comments_commenter_profile_id_fkey (
            display_name,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .single()

      if (error) throw error

      toast({
        title: "Comment added",
        description: "Your comment has been posted",
        variant: "default"
      })

      return { success: true, data }
    } catch (error) {
      console.error('Error adding comment:', error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
      return { success: false, error: error.message }
    }
  }

  // Increment view count
  const incrementViews = async (videoId) => {
    try {
      await supabase.rpc('increment_video_views', { video_uuid: videoId })
    } catch (error) {
      console.error('Error incrementing views:', error)
    }
  }

  // Delete video
  const deleteVideo = async (videoId) => {
    try {
      if (!user) throw new Error('Must be logged in to delete videos')

      const { error } = await supabase
        .from('community_videos')
        .delete()
        .eq('id', videoId)
        .eq('uploader_id', user.id) // Ensure only owner can delete

      if (error) throw error

      // Remove from local state
      setVideos(videos.filter(v => v.id !== videoId))

      toast({
        title: "Video deleted",
        description: "Your video has been removed",
        variant: "default"
      })

      return { success: true }
    } catch (error) {
      console.error('Error deleting video:', error)
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive"
      })
      return { success: false, error: error.message }
    }
  }

  // Get video duration
  const getVideoDuration = (file) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src)
        resolve(video.duration)
      }
      video.onerror = () => {
        URL.revokeObjectURL(video.src)
        reject(new Error('Failed to load video metadata'))
      }
      video.src = URL.createObjectURL(file)
    })
  }

  // Load videos on mount
  useEffect(() => {
    fetchVideos()
  }, [])

  return {
    videos,
    loading,
    uploading,
    fetchVideos,
    uploadVideo,
    toggleLike,
    addComment,
    incrementViews,
    deleteVideo
  }
}