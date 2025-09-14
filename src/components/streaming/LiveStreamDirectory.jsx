import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Users, 
  Clock,
  Search,
  Filter,
  Sparkles,
  Eye,
  Radio,
  Calendar,
  Tag
} from 'lucide-react';
import { useLiveStreaming } from '@/hooks/useLiveStreaming';
import { LiveStreamViewer } from './LiveStreamViewer';

export const LiveStreamDirectory = ({ 
  onStreamSelect,
  className = "" 
}) => {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStream, setSelectedStream] = useState(null);

  const { getAvailableStreams } = useLiveStreaming();

  // Fetch available streams
  useEffect(() => {
    fetchStreams();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchStreams, 30000);
    return () => clearInterval(interval);
  }, [searchQuery, selectedCategory]);

  const fetchStreams = async () => {
    try {
      setLoading(true);
      const filters = {};
      
      if (searchQuery) {
        filters.search = searchQuery;
      }
      
      if (selectedCategory !== 'all') {
        filters.tags = [selectedCategory];
      }

      const availableStreams = await getAvailableStreams(filters);
      setStreams(availableStreams);
    } catch (error) {
      console.error('Failed to fetch streams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStreamSelect = (stream) => {
    setSelectedStream(stream);
    onStreamSelect?.(stream);
  };

  const formatDuration = (startTime) => {
    const now = new Date();
    const start = new Date(startTime);
    const diff = Math.floor((now - start) / 60000); // minutes
    
    if (diff < 60) return `${diff}m`;
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return `${hours}h ${minutes}m`;
  };

  const categories = [
    { value: 'all', label: 'All Streams', icon: Radio },
    { value: 'gaming', label: 'Gaming', icon: Play },
    { value: 'music', label: 'Music', icon: Radio },
    { value: 'tutorial', label: 'Tutorial', icon: Sparkles },
    { value: 'talk', label: 'Talk Show', icon: Users },
    { value: 'art', label: 'Art & Creative', icon: Eye }
  ];

  if (selectedStream) {
    return (
      <div className={className}>
        <div className="mb-4">
          <Button 
            variant="outline" 
            onClick={() => setSelectedStream(null)}
            className="mb-4"
          >
            ← Back to Directory
          </Button>
        </div>
        <LiveStreamViewer 
          streamId={selectedStream.id}
          onStreamEnded={() => setSelectedStream(null)}
        />
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="w-5 h-5" />
          Live Streams Directory
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search live streams..."
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          {/* Category Tabs */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <TabsTrigger 
                    key={category.value} 
                    value={category.value}
                    className="flex items-center gap-1 text-xs"
                  >
                    <Icon className="w-3 h-3" />
                    <span className="hidden sm:inline">{category.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        {/* Stream Grid */}
        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="aspect-video bg-gray-200 rounded mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : streams.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Radio className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No live streams</h3>
                <p className="text-gray-600">
                  {searchQuery 
                    ? `No streams found for "${searchQuery}"` 
                    : 'No live streams are currently active'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {streams.map((stream) => (
                <Card 
                  key={stream.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleStreamSelect(stream)}
                >
                  <CardContent className="p-4">
                    {/* Stream Thumbnail */}
                    <div className="relative aspect-video bg-gray-900 rounded mb-3 overflow-hidden">
                      {stream.thumbnail_url ? (
                        <img 
                          src={stream.thumbnail_url} 
                          alt={stream.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-blue-500">
                          <Radio className="w-8 h-8 text-white" />
                        </div>
                      )}
                      
                      {/* Live Badge */}
                      <Badge 
                        variant="destructive" 
                        className="absolute top-2 left-2"
                      >
                        🔴 LIVE
                      </Badge>
                      
                      {/* Viewer Count */}
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {stream.viewer_count || 0}
                      </div>
                    </div>

                    {/* Stream Info */}
                    <div className="space-y-2">
                      <h3 className="font-medium line-clamp-2">{stream.title}</h3>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={stream.profiles?.avatar_url} />
                          <AvatarFallback>
                            {stream.profiles?.display_name?.[0] || 'S'}
                          </AvatarFallback>
                        </Avatar>
                        <span>{stream.profiles?.display_name || 'Anonymous'}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(stream.started_at)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {stream.total_views || 0} views
                        </div>
                      </div>

                      {/* Tags */}
                      {stream.tags && stream.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {stream.tags.slice(0, 3).map((tag, index) => (
                            <Badge 
                              key={index} 
                              variant="outline" 
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {stream.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{stream.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Stats Footer */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">
                {streams.length}
              </div>
              <div className="text-sm text-gray-600">Live Streams</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {streams.reduce((sum, stream) => sum + (stream.viewer_count || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Total Viewers</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {categories.length - 1}
              </div>
              <div className="text-sm text-gray-600">Categories</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};