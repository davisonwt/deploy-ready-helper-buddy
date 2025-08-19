import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Video, 
  Share2, 
  Download, 
  Copy, 
  Calendar, 
  Eye, 
  Heart,
  MessageCircle,
  MoreVertical,
  Play,
  Trash2,
  Edit3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const VideoMarketingDashboard = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadVideos();
  }, [user]);

  const loadVideos = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('video_content')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Failed to load videos:', error);
      toast({
        title: "Failed to load videos",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const deleteVideo = async (videoId) => {
    try {
      const { error } = await supabase
        .from('video_content')
        .delete()
        .eq('id', videoId);

      if (error) throw error;
      
      setVideos(videos.filter(v => v.id !== videoId));
      toast({
        title: "Video deleted",
        description: "Video has been removed from your library"
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const generatePlatformContent = (video, platform) => {
    const aiContent = video.ai_generated_description;
    if (!aiContent) return 'AI content not available';

    // This could be enhanced to parse platform-specific content from AI response
    return aiContent;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Video className="w-8 h-8 animate-pulse mx-auto mb-2" />
          <p>Loading your videos...</p>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Video className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">No videos uploaded yet</h3>
          <p className="text-gray-600 mb-4">
            Upload your first marketing video to start creating platform-optimized content
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => (
          <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative">
              <video
                src={video.video_url}
                className="w-full h-48 object-cover bg-gray-100"
                poster={video.thumbnail_url}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setSelectedVideo(video)}
                >
                  <Play className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              </div>
            </div>
            
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium line-clamp-2 flex-1">{video.title}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteVideo(video.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              
              <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                {video.description || 'No description'}
              </p>
              
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>{formatDate(video.created_at)}</span>
                <span>{formatFileSize(video.file_size)}</span>
              </div>
              
              {video.tags && video.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {video.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {video.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{video.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setSelectedVideo(video)}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Marketing Tools
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Video Detail Modal/Expanded View */}
      {selectedVideo && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                {selectedVideo.title}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedVideo(null)}
              >
                ×
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="preview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="social">Social Media</TabsTrigger>
                <TabsTrigger value="sow2grow">Sow2Grow</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>
              
              <TabsContent value="preview" className="space-y-4">
                <video
                  src={selectedVideo.video_url}
                  controls
                  className="w-full max-w-2xl mx-auto rounded-lg"
                />
                
                <div className="space-y-2">
                  <h4 className="font-medium">Description</h4>
                  <p className="text-gray-600">
                    {selectedVideo.description || 'No description provided'}
                  </p>
                </div>
                
                {selectedVideo.tags && selectedVideo.tags.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedVideo.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="social" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['Instagram', 'TikTok', 'YouTube', 'Twitter'].map((platform) => (
                    <Card key={platform}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{platform}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="bg-gray-50 p-3 rounded text-sm">
                          {generatePlatformContent(selectedVideo, platform)}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(
                              generatePlatformContent(selectedVideo, platform),
                              `${platform} content`
                            )}
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            Copy
                          </Button>
                          <Button size="sm" variant="outline">
                            <Calendar className="w-4 h-4 mr-1" />
                            Schedule
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="sow2grow" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Sow2Grow Optimization</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-medium text-green-800 mb-2">
                        Optimized for Bestower Attraction
                      </h4>
                      <p className="text-green-700 text-sm">
                        {selectedVideo.ai_generated_description || 
                         'Use this video to showcase your orchard and attract bestowers. Highlight the value proposition and community impact.'}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => copyToClipboard(
                          selectedVideo.video_url,
                          'Video URL'
                        )}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Video URL
                      </Button>
                      <Button variant="outline">
                        <Share2 className="w-4 h-4 mr-2" />
                        Add to Orchard
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="analytics" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Eye className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                      <div className="text-2xl font-bold">0</div>
                      <div className="text-sm text-gray-600">Views</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Heart className="w-6 h-6 mx-auto mb-2 text-red-500" />
                      <div className="text-2xl font-bold">0</div>
                      <div className="text-sm text-gray-600">Likes</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <MessageCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
                      <div className="text-2xl font-bold">0</div>
                      <div className="text-sm text-gray-600">Comments</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Share2 className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                      <div className="text-2xl font-bold">0</div>
                      <div className="text-sm text-gray-600">Shares</div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">
                      Analytics data will be available once you start sharing your video across platforms.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};