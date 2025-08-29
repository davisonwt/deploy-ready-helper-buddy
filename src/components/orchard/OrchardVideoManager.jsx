import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Upload, Video, Plus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useCommunityVideos } from '@/hooks/useCommunityVideos'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import VideoCard from '@/components/community/VideoCard.jsx'

export default function OrchardVideoManager({ orchard }) {
  const { user } = useAuth()
  const { uploadVideo, deleteVideo, loading } = useCommunityVideos()
  const { toast } = useToast()
  const [orchardVideos, setOrchardVideos] = useState([])
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [videoData, setVideoData] = useState({
    title: '',
    description: '',
    tags: '',
    file: null
  })
  const [uploading, setUploading] = useState(false)

  const isOwner = user && orchard && user.id === orchard.user_id

  // Fetch orchard videos
  useEffect(() => {
    if (orchard?.id) {
      fetchOrchardVideos()
    }
  }, [orchard?.id])

  const fetchOrchardVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('community_videos')
        .select(`
          *,
          profiles (
            display_name,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('orchard_id', orchard.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrchardVideos(data || [])
    } catch (error) {
      console.error('Error fetching orchard videos:', error)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    console.log('🔍 DEBUG: File selected:', {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      filePath: e.target.value
    })
    
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        console.error('❌ Invalid file type:', file.type)
        toast({
          title: "Invalid File Type",
          description: "Please select a video file (.mp4, .mov, .avi, .webm, etc.)",
          variant: "destructive"
        })
        return
      }
      
      // Check file size (max 100MB)
      const maxSize = 100 * 1024 * 1024
      if (file.size > maxSize) {
        console.error('❌ File too large:', file.size, 'bytes')
        toast({
          title: "File Too Large",
          description: `File size is ${(file.size / (1024 * 1024)).toFixed(1)}MB. Maximum allowed is 100MB.`,
          variant: "destructive"
        })
        return
      }
      
      console.log('✅ File validation passed')
      setVideoData(prev => ({ ...prev, file }))
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    console.log('🚀 DEBUG: Upload started with data:', {
      hasFile: !!videoData.file,
      fileName: videoData.file?.name,
      fileSize: videoData.file?.size,
      title: videoData.title,
      description: videoData.description,
      orchardId: orchard?.id,
      userId: user?.id
    })

    if (!videoData.file || !videoData.title) {
      console.error('❌ Missing required data:', { hasFile: !!videoData.file, hasTitle: !!videoData.title })
      toast({
        title: "Missing Information",
        description: "Please provide a title and select a video file",
        variant: "destructive"
      })
      return
    }

    if (!orchard?.id) {
      console.error('❌ No orchard ID available')
      toast({
        title: "Error",
        description: "Orchard information is missing",
        variant: "destructive"
      })
      return
    }

    setUploading(true)
    try {
      const metadata = {
        title: videoData.title,
        description: videoData.description,
        tags: videoData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        orchard_id: orchard.id
      }

      console.log('📤 Calling uploadVideo with metadata:', metadata)
      const result = await uploadVideo(videoData.file, metadata)
      console.log('📥 Upload result:', result)

      if (result.success) {
        console.log('✅ Upload successful')
        toast({
          title: "Video Uploaded",
          description: "Your marketing video has been uploaded successfully!"
        })
        setVideoData({ title: '', description: '', tags: '', file: null })
        setShowUploadForm(false)
        fetchOrchardVideos()
      } else {
        console.error('❌ Upload failed:', result.error)
        toast({
          title: "Upload Failed",
          description: result.error || "Failed to upload video. Please try again.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('💥 Upload exception:', error)
      toast({
        title: "Upload Failed",
        description: "Failed to upload video. Please try again.",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (videoId) => {
    if (confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      const result = await deleteVideo(videoId)
      if (result.success) {
        toast({
          title: "Video Deleted",
          description: "Video has been deleted successfully"
        })
        fetchOrchardVideos()
      }
    }
  }

  if (!isOwner) {
    return null
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Marketing Videos ({orchardVideos.length})
          </CardTitle>
          {!showUploadForm && (
            <Button 
              onClick={() => setShowUploadForm(true)}
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Video
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Form */}
        {showUploadForm && (
          <Card className="border-dashed">
            <CardContent className="p-4">
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <Label htmlFor="video-file">Video File</Label>
                  <Input
                    id="video-file"
                    type="file"
                    accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,video/3gpp,video/3gp2,video/mpeg,video/ogg"
                    capture="environment"
                    onChange={handleFileChange}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports MP4, MOV, AVI, WebM, 3GP, and other common video formats including WhatsApp videos
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="video-title">Title</Label>
                  <Input
                    id="video-title"
                    value={videoData.title}
                    onChange={(e) => setVideoData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter video title"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="video-description">Description</Label>
                  <Textarea
                    id="video-description"
                    value={videoData.description}
                    onChange={(e) => setVideoData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your video"
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="video-tags">Tags (comma separated)</Label>
                  <Input
                    id="video-tags"
                    value={videoData.tags}
                    onChange={(e) => setVideoData(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="marketing, orchard, farming"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={uploading}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload Video'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      setShowUploadForm(false)
                      setVideoData({ title: '', description: '', tags: '', file: null })
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Existing Videos */}
        {orchardVideos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orchardVideos.map((video) => (
              <VideoCard 
                key={video.id} 
                video={video}
                showDeleteOption={isOwner}
                onDelete={() => handleDelete(video.id)}
              />
            ))}
          </div>
        ) : (
          !showUploadForm && (
            <div className="text-center py-8 text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No marketing videos yet</p>
              <p className="text-sm">Add videos to promote your orchard</p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  )
}
