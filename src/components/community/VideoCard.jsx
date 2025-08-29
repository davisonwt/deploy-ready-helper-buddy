import React, { useState, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Heart, MessageCircle, Play, Pause, Volume2, VolumeX, Maximize, Trash2, MoreVertical, AlertCircle } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useCommunityVideos } from '@/hooks/useCommunityVideos.jsx'
import { useAuth } from '@/hooks/useAuth'
import { formatDistanceToNow } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import VideoCommentsModal from './VideoCommentsModal.jsx'

export default function VideoCard({ video, onVideoClick, showDeleteOption = false, onDelete }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [showComments, setShowComments] = useState(false)
  const [hasViewed, setHasViewed] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const videoRef = useRef(null)
  const { toggleLike, incrementViews, deleteVideo } = useCommunityVideos()
  const { user } = useAuth()
  const { toast } = useToast()

  const handleVideoError = (error) => {
    console.error('❌ Video playback error:', error, 'Video URL:', video.video_url)
    setVideoError(true)
    setIsLoading(false)
    toast({
      title: "Video Error",
      description: "This video format may not be supported on your device. Try uploading in MP4 format.",
      variant: "destructive"
    })
  }

  const handleVideoLoad = () => {
    console.log('✅ Video loaded successfully:', video.video_url)
    setIsLoading(false)
    setVideoError(false)
  }

  const handlePlayPause = async () => {
    if (!videoRef.current || videoError) return

    if (isPlaying) {
      videoRef.current.pause()
    } else {
      try {
        // Increment view count on first play
        if (!hasViewed) {
          await incrementViews(video.id)
          setHasViewed(true)
        }
        await videoRef.current.play()
      } catch (error) {
        console.error('Play error:', error)
        handleVideoError(error)
      }
    }
    setIsPlaying(!isPlaying)
  }

  const handleVideoClick = () => {
    if (onVideoClick) {
      onVideoClick(video)
    } else {
      handlePlayPause()
    }
  }

  const handleLike = async (e) => {
    e.stopPropagation()
    await toggleLike(video.id)
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      if (onDelete) {
        onDelete(video.id)
      } else {
        await deleteVideo(video.id)
      }
    }
  }

  const isOwner = user && video.uploader_id === user.id

  const getUploaderName = () => {
    const profile = video.profiles
    if (profile?.display_name) return profile.display_name
    if (profile?.first_name) {
      return profile.last_name 
        ? `${profile.first_name} ${profile.last_name}`
        : profile.first_name
    }
    return 'Unknown User'
  }

  const getUploaderInitials = () => {
    const name = getUploaderName()
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  return (
    <>
      <Card className="overflow-hidden bg-card">
        {/* Video Player */}
        <div 
          className="relative aspect-[9/16] bg-black cursor-pointer group"
          onClick={handleVideoClick}
        >
          {videoError ? (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
              <div className="text-center text-white/70">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Video format not supported</p>
                <p className="text-xs mt-1">Try uploading as MP4</p>
              </div>
            </div>
          ) : (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted={isMuted}
              loop
              playsInline
              preload="metadata"
              crossOrigin="anonymous"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={handleVideoError}
              onLoadedData={handleVideoLoad}
              onCanPlay={handleVideoLoad}
            >
              <source src={video.video_url} type="video/mp4" />
              <source src={video.video_url} type="video/webm" />
              <source src={video.video_url} type="video/quicktime" />
              <source src={video.video_url} type="video/mov" />
              <source src={video.video_url} type="video/3gpp" />
              <source src={video.video_url} type="video/avi" />
              Your browser does not support the video tag.
            </video>
          )}

          {isLoading && !videoError && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-white/70 text-center">
                <div className="animate-pulse text-sm">Loading video...</div>
              </div>
            </div>
          )}
          
          {/* Overlay Controls */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                size="lg"
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-0"
                onClick={handlePlayPause}
              >
                {isPlaying ? (
                  <Pause className="h-8 w-8" />
                ) : (
                  <Play className="h-8 w-8" />
                )}
              </Button>
            </div>
            
            {/* Top Controls */}
            <div className="absolute top-4 right-4 space-y-2">
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-0"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsMuted(!isMuted)
                }}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-0"
                onClick={(e) => {
                  e.stopPropagation()
                  if (videoRef.current) {
                    videoRef.current.requestFullscreen()
                  }
                }}
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Video Info */}
        <div className="p-4 space-y-3">
          {/* Title */}
          <h3 className="font-semibold text-sm leading-tight line-clamp-2">
            {video.title}
          </h3>

          {/* Uploader Info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={video.profiles?.avatar_url} />
              <AvatarFallback className="text-xs">
                {getUploaderInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {getUploaderName()}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>

          {/* Stats and Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{video.view_count || 0} views</span>
              <span>{video.like_count || 0} likes</span>
              <span>{video.comment_count || 0} comments</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleLike}
                className="h-8 px-2"
              >
                <Heart className="h-4 w-4" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowComments(true)
                }}
                className="h-8 px-2"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>

              {/* Delete menu for video owner or if showDeleteOption is true */}
              {(isOwner || showDeleteOption) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete()
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Video
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Description */}
          {video.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {video.description}
            </p>
          )}

          {/* Tags */}
          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {video.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-muted text-xs rounded-full"
                >
                  #{tag}
                </span>
              ))}
              {video.tags.length > 3 && (
                <span className="px-2 py-1 bg-muted text-xs rounded-full">
                  +{video.tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </Card>

      <VideoCommentsModal
        video={video}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
      />
    </>
  )
}