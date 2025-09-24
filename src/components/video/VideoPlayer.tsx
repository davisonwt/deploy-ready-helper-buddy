import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, ThumbsUp, MessageCircle, Eye, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VideoPlayerProps {
  videoId: string;
  className?: string;
}

export default function VideoPlayer({ videoId, className = "" }: VideoPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: video, isLoading } = useQuery({
    queryKey: ['video', videoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_videos')
        .select('*')
        .eq('id', videoId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: userLiked } = useQuery({
    queryKey: ['user-liked', videoId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('video_likes')
        .select('id')
        .eq('video_id', videoId)
        .eq('user_id', user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!videoId,
  });

  const incrementViewMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('increment_video_views', {
        video_uuid: videoId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video', videoId] });
    },
  });

  const toggleLikeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      if (userLiked) {
        const { error } = await supabase
          .from('video_likes')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('video_likes')
          .insert({ video_id: videoId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-liked', videoId] });
      queryClient.invalidateQueries({ queryKey: ['video', videoId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const handlePlay = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (playing) {
      videoElement.pause();
    } else {
      videoElement.play();
      // Increment view count on first play
      if (currentTime < 5) {
        incrementViewMutation.mutate();
      }
    }
    setPlaying(!playing);
  };

  const handleTimeUpdate = () => {
    const videoElement = videoRef.current;
    if (videoElement) {
      setCurrentTime(videoElement.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const videoElement = videoRef.current;
    if (videoElement) {
      setDuration(videoElement.duration);
    }
  };

  const handleShare = async () => {
    if (navigator.share && video) {
      try {
        await navigator.share({
          title: video.title,
          text: video.description || '',
          url: window.location.href,
        });
      } catch (error) {
        // Fallback to copying URL
        navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copied!",
          description: "Video link copied to clipboard"
        });
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied!",
        description: "Video link copied to clipboard"
      });
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.addEventListener('timeupdate', handleTimeUpdate);
      videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.addEventListener('ended', () => setPlaying(false));

      return () => {
        videoElement.removeEventListener('timeupdate', handleTimeUpdate);
        videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.removeEventListener('ended', () => setPlaying(false));
      };
    }
  }, []);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-0">
          <div className="aspect-video bg-muted animate-pulse flex items-center justify-center">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!video) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">Video not found</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div className="relative aspect-video bg-black">
          {/* Thumbnail overlay when not playing */}
          {!playing && video.thumbnail_url && (
            <div className="absolute inset-0 flex items-center justify-center cursor-pointer" onClick={handlePlay}>
              <img
                src={video.thumbnail_url}
                alt={video.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <Button size="lg" variant="secondary" className="rounded-full">
                  <Play className="h-6 w-6 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Video element */}
          <video
            ref={videoRef}
            src={video.video_url}
            className={`w-full h-full object-contain ${playing ? 'block' : 'hidden'}`}
            controls={playing}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        </div>

        {/* Video info and controls */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-lg">{video.title}</h3>
            {video.description && (
              <p className="text-muted-foreground text-sm mt-1">{video.description}</p>
            )}
          </div>

          {/* Video stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {video.view_count || 0} views
            </div>
            <div className="flex items-center gap-1">
              <ThumbsUp className="h-4 w-4" />
              {video.like_count || 0} likes
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              {video.comment_count || 0} comments
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant={userLiked ? "default" : "outline"}
              size="sm"
              onClick={() => toggleLikeMutation.mutate()}
              disabled={!user || toggleLikeMutation.isPending}
            >
              <ThumbsUp className="h-4 w-4 mr-1" />
              {userLiked ? "Liked" : "Like"}
            </Button>

            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          </div>

          {/* Tags */}
          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {video.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-muted rounded-md text-xs text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}