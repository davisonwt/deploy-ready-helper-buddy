import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Music,
  Search,
  Play,
  Pause,
  Download,
  ShoppingCart,
  Clock,
  Disc,
  Volume2,
  Tag,
  Check
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useMusicPurchase } from '@/hooks/useMusicPurchase';

export default function PublicMusicLibrary() {
  const { user } = useAuth();
  const { purchaseTrack, hasPurchased } = useMusicPurchase();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [sortBy, setSortBy] = useState('upload_date');
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['public-music-tracks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dj_music_tracks')
        .select(`
          *,
          radio_djs (
            dj_name,
            user_id
          )
        `)
        .eq('is_public', true)
        .order('upload_date', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const { data: userPurchases = [] } = useQuery({
    queryKey: ['user-music-purchases', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('music_purchases')
        .select('track_id')
        .eq('user_id', user.id);

      if (error) throw error;
      return data.map(p => p.track_id);
    },
    enabled: !!user
  });

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredTracks = tracks
    .filter(track => {
      const matchesSearch = 
        track.track_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        track.artist_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        track.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesGenre = !selectedGenre || track.genre === selectedGenre;
      const matchesType = !selectedType || track.track_type === selectedType;
      
      return matchesSearch && matchesGenre && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.track_title.localeCompare(b.track_title);
        case 'artist':
          return (a.artist_name || '').localeCompare(b.artist_name || '');
        case 'popular':
          return ((b as any).play_count || 0) - ((a as any).play_count || 0);
        case 'upload_date':
        default:
          return new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime();
      }
    });

  const uniqueGenres = [...new Set(tracks.map(t => t.genre).filter(Boolean))];
  const uniqueTypes = [...new Set(tracks.map(t => t.track_type))];

  const handlePlay = async (track: any) => {
    if (track.price && track.price > 0 && !userPurchases.includes(track.id)) {
      toast.error('This track requires purchase before playing');
      return;
    }

    let el = audioRef.current;
    if (!el) {
      el = new Audio();
      audioRef.current = el;
    }
    el.crossOrigin = 'anonymous';
    el.volume = 0.7;

    if (currentTrackId !== track.id) {
      try {
        el.pause();
        el.src = '';
        el.load();
        setIsPlaying(false);
      } catch (e) {
        console.warn('Error stopping audio:', e);
      }

      try {
        const { data } = await supabase.storage
          .from('music-tracks')
          .createSignedUrl(track.file_url, 3600);

        const playableUrl = data?.signedUrl || track.file_url;

        el.src = playableUrl;
        el.load();
        await el.play();
        setCurrentTrackId(track.id);
        setIsPlaying(true);
      } catch (error) {
        console.error('Audio play error:', error);
        toast.error('Failed to play track');
        setCurrentTrackId(null);
        setIsPlaying(false);
      }
    } else {
      if (isPlaying) {
        el.pause();
        setIsPlaying(false);
      } else {
        await el.play();
        setIsPlaying(true);
      }
    }
  };

  const handleDownload = async (track: any) => {
    if (!user) {
      toast.error('Please login to download tracks');
      return;
    }

    if (track.price && track.price > 0 && !userPurchases.includes(track.id)) {
      toast.error('Purchase this track to download');
      return;
    }

    try {
      // @ts-ignore - New table not yet in types
      await supabase.from('music_downloads').insert({
        user_id: user.id,
        track_id: track.id
      });

      const { data } = await supabase.storage
        .from('music-tracks')
        .createSignedUrl(track.file_url, 60);

      if (data?.signedUrl) {
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = `${track.track_title}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Download started');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download track');
    }
  };

  const handlePurchase = async (track: any) => {
    if (!user) {
      toast.error('Please login to purchase tracks');
      return;
    }

    try {
      await purchaseTrack(track.id, track.price);
      toast.success('Track purchased successfully!');
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to purchase track');
    }
  };

  const canAccess = (track: any) => {
    if (!track.price || track.price === 0) return true;
    if (!user) return false;
    return userPurchases.includes(track.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading music library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Music className="h-6 w-6" />
          Community Music Library
        </h2>
        <p className="text-muted-foreground">
          Browse and purchase music from our community of creators
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search tracks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedGenre} onValueChange={setSelectedGenre}>
              <SelectTrigger>
                <SelectValue placeholder="All Genres" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Genres</SelectItem>
                {uniqueGenres.map(genre => (
                  <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                {uniqueTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upload_date">Latest First</SelectItem>
                <SelectItem value="title">Title A-Z</SelectItem>
                <SelectItem value="artist">Artist A-Z</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredTracks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No tracks found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTracks.map((track) => {
            const hasAccess = canAccess(track);
            const isPurchased = userPurchases.includes(track.id);

            return (
              <Card key={track.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium truncate">{track.track_title}</h4>
                      {track.artist_name && (
                        <p className="text-sm text-muted-foreground truncate">{track.artist_name}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {track.duration_seconds && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(track.duration_seconds)}
                        </span>
                      )}
                      
                      {track.genre && (
                        <Badge variant="outline" className="text-xs">
                          <Disc className="h-2 w-2 mr-1" />
                          {track.genre}
                        </Badge>
                      )}
                      
                      {track.bpm && (
                        <span className="flex items-center gap-1">
                          <Volume2 className="h-3 w-3" />
                          {track.bpm} BPM
                        </span>
                      )}
                    </div>

                    {track.tags && track.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {track.tags.slice(0, 3).map((tag: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            <Tag className="h-2 w-2 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePlay(track)}
                          disabled={!hasAccess}
                        >
                          {currentTrackId === track.id && isPlaying ? (
                            <Pause className="h-3 w-3" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(track)}
                          disabled={!hasAccess}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>

                      {track.price && track.price > 0 ? (
                        isPurchased ? (
                          <Badge variant="default" className="bg-green-500">
                            <Check className="h-3 w-3 mr-1" />
                            Owned
                          </Badge>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handlePurchase(track)}
                          >
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            ${track.price}
                          </Button>
                        )
                      ) : (
                        <Badge variant="secondary">Free</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}