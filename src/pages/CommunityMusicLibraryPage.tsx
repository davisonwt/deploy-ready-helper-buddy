import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAlbumBuilder } from '@/contexts/AlbumBuilderContext';
import { Music, Loader2, Play, Pause, Plus, Check, Users, Clock, ShoppingCart, X, Download, Disc, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { GradientPlaceholder } from '@/components/ui/GradientPlaceholder';
import { launchConfetti } from '@/utils/confetti';
import { resolveAudioUrl } from '@/utils/resolveAudioUrl';
import { useCurrency } from '@/hooks/useCurrency';

const SINGLE_PRICE = 2.00; // Base price per single
const TITHING_RATE = 0.10; // 10%
const ADMIN_FEE_RATE = 0.05; // 5%
const PREVIEW_DURATION = 30; // 30 seconds preview

export default function CommunityMusicLibraryPage() {
  const { user } = useAuth();
  const { selectedTracks, addTrack, removeTrack, clearAlbum, isTrackSelected, canAddMore } = useAlbumBuilder();
  const { formatAmount } = useCurrency();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const [processing, setProcessing] = useState(false);

  // Calculate album price based on selected tracks
  const calculateAlbumPrice = () => {
    const basePrice = selectedTracks.length * SINGLE_PRICE;
    const tithing = basePrice * TITHING_RATE;
    const adminFee = basePrice * ADMIN_FEE_RATE;
    return {
      base: basePrice,
      tithing,
      adminFee,
      total: basePrice + tithing + adminFee,
      artistAmount: basePrice * 0.85
    };
  };

  const albumPricing = calculateAlbumPrice();

  // Fetch all community music tracks
  const { data: musicData = { singles: [], albums: [] }, isLoading } = useQuery({
    queryKey: ['community-music-library'],
    queryFn: async () => {
      const tracks: any[] = [];

      // 1. Fetch from dj_music_tracks (main source)
      const { data: djTracks, error: djError } = await supabase
        .from('dj_music_tracks')
        .select(`
          *,
          radio_djs (
            user_id,
            dj_name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (djError) {
        console.error('Error fetching DJ tracks:', djError);
      } else if (djTracks) {
        const djUserIds = [...new Set(djTracks.map(t => t.radio_djs?.user_id).filter(Boolean))];
        const { data: djProfiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url, username')
          .in('user_id', djUserIds);
        
        const djProfileMap = new Map(djProfiles?.map(p => [p.user_id, p]) || []);

        djTracks.forEach(track => {
          const dj = track.radio_djs;
          const profile = dj?.user_id ? djProfileMap.get(dj.user_id) : null;
          
          // Check if album
          const isAlbum = track.tags?.some((tag: string) => 
            tag.toLowerCase().includes('album') || 
            tag.toLowerCase().includes('lp') || 
            tag.toLowerCase().includes('ep')
          ) || false;
          
          // Singles are always 2 USDC minimum
          const trackPrice = isAlbum 
            ? (track.price || 0) 
            : Math.max(track.price || 0, SINGLE_PRICE);
          
          tracks.push({
            id: track.id,
            track_title: track.track_title,
            artist_name: track.artist_name || dj?.dj_name || profile?.display_name || 'Unknown Artist',
            duration_seconds: track.duration_seconds || 0,
            file_url: track.file_url,
            preview_url: track.preview_url || track.file_url,
            price: trackPrice,
            isAlbum,
            profiles: profile || (dj ? { username: dj.dj_name, avatar_url: dj.avatar_url } : null),
            user_id: dj?.user_id,
            created_at: track.created_at,
            genre: track.genre,
            bpm: track.bpm,
            tags: track.tags,
            cover_image_url: (track as any).cover_image_url || dj?.avatar_url || null
          });
        });
      }

      // 2. Fetch from s2g_library_items (secondary source)
      const { data: libraryMusic, error: libraryError } = await supabase
        .from('s2g_library_items')
        .select('*')
        .eq('is_public', true)
        .eq('type', 'music')
        .order('created_at', { ascending: false });

      if (libraryError) {
        console.error('Error fetching library music:', libraryError);
      } else if (libraryMusic) {
        const userIds = [...new Set(libraryMusic.map(item => item.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url, username')
          .in('user_id', userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        libraryMusic.forEach(item => {
          const profile = profileMap.get(item.user_id);
          const metadata = (item as any).metadata;
          
          // Check if album
          const isAlbum = item.tags?.some((tag: string) => 
            tag.toLowerCase().includes('album') || 
            tag.toLowerCase().includes('lp') || 
            tag.toLowerCase().includes('ep')
          ) || false;
          
          // Singles are always 2 USDC minimum
          const itemPrice = isAlbum 
            ? (item.price || 0) 
            : Math.max(item.price || 0, SINGLE_PRICE);
          
          tracks.push({
            id: item.id,
            track_title: item.title,
            artist_name: item.description || profile?.display_name || 'Unknown Artist',
            duration_seconds: metadata?.duration_seconds || 0,
            file_url: item.file_url,
            preview_url: item.preview_url || item.file_url,
            price: itemPrice,
            isAlbum,
            profiles: profile,
            user_id: item.user_id,
            created_at: item.created_at,
            tags: item.tags,
            cover_image_url: item.cover_image_url
          });
        });
      }

      // 3. Fetch from products table (Community Creations music)
      const { data: productMusic, error: productError } = await supabase
        .from('products')
        .select(`
          *,
          sowers (
            user_id,
            display_name,
            logo_url
          )
        `)
        .eq('type', 'music')
        .order('created_at', { ascending: false });

      if (productError) {
        console.error('Error fetching product music:', productError);
      } else if (productMusic) {
        const sowerUserIds = [...new Set(productMusic.map(p => p.sowers?.user_id).filter(Boolean))];
        const { data: sowerProfiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url, username')
          .in('user_id', sowerUserIds);
        
        const sowerProfileMap = new Map(sowerProfiles?.map(p => [p.user_id, p]) || []);

        productMusic.forEach(product => {
          const sower = product.sowers;
          const profile = sower?.user_id ? sowerProfileMap.get(sower.user_id) : null;
          
          // Check if album based on title or category
          const titleLower = (product.title || '').toLowerCase();
          const categoryLower = (product.category || '').toLowerCase();
          const isAlbum = titleLower.includes('album') || 
                          titleLower.includes('vol') ||
                          titleLower.includes('project') ||
                          categoryLower.includes('album');
          
          // Singles are always 2 USDC minimum
          const productPrice = isAlbum 
            ? (product.price || 0) 
            : Math.max(product.price || 0, SINGLE_PRICE);
          
          // Skip if already added from other sources (check by title to avoid duplicates)
          const alreadyExists = tracks.some(t => 
            t.track_title.toLowerCase() === product.title?.toLowerCase()
          );
          
          if (!alreadyExists) {
            tracks.push({
              id: product.id,
              track_title: product.title,
              artist_name: sower?.display_name || profile?.display_name || 'Unknown Artist',
              duration_seconds: product.duration || 0,
              file_url: product.file_url,
              preview_url: product.file_url, // Products use file_url for preview
              price: productPrice,
              isAlbum,
              profiles: profile || (sower ? { username: sower.display_name, avatar_url: sower.logo_url } : null),
              user_id: sower?.user_id,
              created_at: product.created_at,
              category: product.category,
              cover_image_url: product.cover_image_url
            });
          }
        });
      }

      // Sort by created_at (newest first) and separate albums from singles
      const sortedTracks = tracks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      return {
        singles: sortedTracks.filter(t => !t.isAlbum),
        albums: sortedTracks.filter(t => t.isAlbum)
      };
    }
  });

  const allTracks = musicData?.singles ?? [];
  const availableAlbums = musicData?.albums ?? [];

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const stopPreview = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (stopTimerRef.current) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    setPlayingId(null);
  }, []);

  useEffect(() => {
    return () => stopPreview();
  }, [stopPreview]);

  const handlePlay = useCallback(async (track: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (playingId === track.id) {
      stopPreview();
      return;
    }

    stopPreview();
    setLoadingId(track.id);

    try {
      const resolvedUrl = await resolveAudioUrl(track.preview_url || track.file_url);

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      const audio = audioRef.current;
      audio.src = resolvedUrl;
      audio.currentTime = 0;
      audio.volume = 0.85;

      await audio.play();
      setPlayingId(track.id);

      stopTimerRef.current = window.setTimeout(() => {
        stopPreview();
        toast.info('Preview ended. Add to your album!');
      }, PREVIEW_DURATION * 1000);

      audio.onended = () => stopPreview();
    } catch (err) {
      console.error('Preview playback error:', err);
      toast.error('Failed to play preview');
      stopPreview();
    } finally {
      setLoadingId(null);
    }
  }, [playingId, stopPreview]);

  const handleAddToAlbum = (track: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isTrackSelected(track.id)) {
      removeTrack(track.id);
      toast.info('Removed from album');
    } else if (canAddMore) {
      addTrack(track);
      launchConfetti();
      toast.success(`Added "${track.track_title}" to your album!`);
    } else {
      toast.warning('Album is full (max 10 tracks)');
    }
  };

  const handleBestowAlbum = async (album: any) => {
    if (!user) {
      toast.error('Please sign in to bestow');
      return;
    }

    if (!album.price || album.price <= 0) {
      toast.error('This album has no bestowal price set');
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-nowpayments-order', {
        body: {
          amount: album.price,
          paymentType: 'product',
          productItems: [{
            id: album.id,
            title: album.track_title,
            price: album.price,
            sower_id: album.user_id
          }]
        }
      });

      if (error) {
        console.error('Payment order creation error:', error);
        toast.error(error.message || 'Failed to create payment order');
        return;
      }

      if (data?.invoiceUrl) {
        toast.info('Redirecting to payment...');
        window.location.href = data.invoiceUrl;
      } else {
        toast.error('Failed to get payment URL');
      }
    } catch (error: any) {
      console.error('Album bestowal error:', error);
      toast.error('Bestowal failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Please sign in to purchase');
      return;
    }

    if (selectedTracks.length === 0) {
      toast.error('Please select at least one track for your album');
      return;
    }

    setProcessing(true);
    try {
      // Create NOWPayments order for album
      const { data, error } = await supabase.functions.invoke('create-nowpayments-order', {
        body: {
          amount: albumPricing.total,
          paymentType: 'album',
          productItems: selectedTracks.map(track => ({
            id: track.id,
            title: track.track_title,
            price: SINGLE_PRICE,
            sower_id: (track as any).user_id // user_id stored on track
          })),
          metadata: {
            albumTrackCount: selectedTracks.length,
            trackIds: selectedTracks.map(t => t.id)
          }
        }
      });

      if (error) {
        console.error('Payment order creation error:', error);
        toast.error(error.message || 'Failed to create payment order');
        return;
      }

      if (data?.invoiceUrl) {
        toast.info('Redirecting to payment...');
        window.location.href = data.invoiceUrl;
      } else {
        toast.error('Failed to get payment URL');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error('Checkout failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)'
      }}>
        <Loader2 className="w-12 h-12 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradient 20s ease infinite'
        }} />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Hero Header */}
        <div className="relative overflow-hidden border-b border-white/20 backdrop-blur-md bg-white/10">
          <div className="container mx-auto px-4 py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-4xl mx-auto"
            >
              <div className="flex items-center justify-center gap-4 mb-6">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="p-4 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30"
                >
                  <Music className="w-12 h-12 text-white" />
                </motion.div>
                <h1 className="text-5xl font-bold text-white drop-shadow-2xl">
                  {user?.first_name || 'Friend'}, Welcome to the Community Music Library
                </h1>
              </div>
              <p className="text-white/90 text-xl mb-4 backdrop-blur-sm bg-white/10 rounded-lg p-4 border border-white/20">
                Build your custom album from sower tracks. Each single is {formatAmount(SINGLE_PRICE)} (includes 10% tithing + 5% admin fee).
              </p>
              <div className="flex items-center justify-center gap-6 text-white/80">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>{allTracks.length} tracks available</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  <span>{selectedTracks.length}/10 in your album</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Track List */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-2xl font-bold text-white mb-4">Available Singles</h2>
              {allTracks.length === 0 ? (
                <Card className="backdrop-blur-md bg-white/20 border-white/30">
                  <CardContent className="p-12 text-center">
                    <Music className="w-16 h-16 mx-auto text-white/60 mb-4" />
                    <h3 className="text-xl font-bold text-white">No Tracks Available</h3>
                    <p className="text-white/70">Be the first to share your music!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {allTracks.map((track) => {
                    const isSelected = isTrackSelected(track.id);
                    const isPlaying = playingId === track.id;
                    const isLoadingTrack = loadingId === track.id;
                    
                    return (
                      <motion.div
                        key={track.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ scale: 1.01 }}
                        className={`backdrop-blur-md border rounded-xl overflow-hidden p-4 transition-all ${
                          isSelected 
                            ? 'bg-green-500/30 border-green-400/50' 
                            : 'bg-white/15 border-white/20 hover:bg-white/25'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Play Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handlePlay(track, e)}
                            disabled={isLoadingTrack}
                            className="h-12 w-12 rounded-full bg-white/20 hover:bg-white/30 text-white"
                          >
                            {isLoadingTrack ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : isPlaying ? (
                              <Pause className="w-5 h-5" />
                            ) : (
                              <Play className="w-5 h-5" />
                            )}
                          </Button>

                          {/* Track Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white truncate">{track.track_title}</h3>
                            <p className="text-white/70 text-sm truncate">
                              {track.artist_name || track.profiles?.username || 'Unknown Artist'}
                            </p>
                            {track.genre && (
                              <Badge variant="secondary" className="mt-1 bg-white/10 text-white/80">
                                {track.genre}
                              </Badge>
                            )}
                          </div>

                          {/* Duration */}
                          <div className="flex items-center gap-1 text-white/60 text-sm">
                            <Clock className="w-4 h-4" />
                            {formatDuration(track.duration_seconds)}
                          </div>

                          {/* Price */}
                          <div className="text-right">
                            <span className="text-lg font-bold text-yellow-300">
                              {formatAmount(track.price)}
                            </span>
                          </div>

                          {/* Add/Remove Button */}
                          <Button
                            onClick={(e) => handleAddToAlbum(track, e)}
                            variant={isSelected ? "destructive" : "default"}
                            size="sm"
                            className={isSelected 
                              ? "bg-red-500 hover:bg-red-600" 
                              : "bg-green-500 hover:bg-green-600"
                            }
                            disabled={!isSelected && !canAddMore}
                          >
                            {isSelected ? (
                              <>
                                <X className="w-4 h-4 mr-1" />
                                Remove
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4 mr-1" />
                                Add
                              </>
                            )}
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Available Albums Section */}
              <div className="mt-12">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Disc className="w-6 h-6" />
                  Available Albums
                </h2>
                {availableAlbums.length === 0 ? (
                  <Card className="backdrop-blur-md bg-white/20 border-white/30">
                    <CardContent className="p-8 text-center">
                      <Disc className="w-12 h-12 mx-auto text-white/60 mb-4" />
                      <h3 className="text-lg font-bold text-white">No Albums Available Yet</h3>
                      <p className="text-white/70">Albums from sowers will appear here</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableAlbums.map((album) => {
                      const isPlaying = playingId === album.id;
                      const isLoadingTrack = loadingId === album.id;
                      
                      return (
                        <motion.div
                          key={album.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{ scale: 1.02 }}
                          className="backdrop-blur-md bg-white/15 border border-white/20 rounded-xl overflow-hidden hover:bg-white/25 transition-all"
                        >
                          <div className="flex">
                            {/* Album Cover */}
                            <div className="w-32 h-32 flex-shrink-0 bg-gradient-to-br from-purple-500/50 to-pink-500/50 flex items-center justify-center">
                              {album.cover_image_url ? (
                                <img 
                                  src={album.cover_image_url} 
                                  alt={album.track_title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Disc className="w-12 h-12 text-white/60" />
                              )}
                            </div>
                            
                            {/* Album Info */}
                            <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                              <div className="min-w-0">
                                <h3 className="font-bold text-white truncate">{album.track_title}</h3>
                                <p className="text-white/70 text-sm truncate">
                                  {album.artist_name || album.profiles?.username || 'Unknown Artist'}
                                </p>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  {album.genre && (
                                    <Badge variant="secondary" className="bg-white/10 text-white/80 text-xs">
                                      {album.genre}
                                    </Badge>
                                  )}
                                  {album.tags?.slice(0, 2).map((tag: string, i: number) => (
                                    <Badge key={i} variant="outline" className="border-white/30 text-white/70 text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
                                <span className="text-lg font-bold text-yellow-300">
                                  {formatAmount(album.price)}
                                </span>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => handlePlay(album, e)}
                                    disabled={isLoadingTrack}
                                    className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex-shrink-0"
                                  >
                                    {isLoadingTrack ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : isPlaying ? (
                                      <Pause className="w-4 h-4" />
                                    ) : (
                                      <Play className="w-4 h-4" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white flex-shrink-0"
                                    onClick={() => handleBestowAlbum(album)}
                                  >
                                    <Download className="w-4 h-4 mr-1" />
                                    Bestow
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Album Cart Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4 backdrop-blur-md bg-white/20 border-white/30">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-white">
                    <span className="flex items-center gap-2">
                      <Music className="h-5 w-5" />
                      Your Album
                    </span>
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      {selectedTracks.length}/10 tracks
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedTracks.length === 0 ? (
                    <div className="text-center py-8 text-white/70">
                      <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select tracks from the library to build your custom album</p>
                      <p className="text-sm mt-2">{formatAmount(SINGLE_PRICE)} per track</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {selectedTracks.map((track, index) => (
                          <div
                            key={track.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-xs text-white/60 w-5">{index + 1}.</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-white truncate">{track.track_title}</p>
                                <p className="text-xs text-white/60 truncate">
                                  {track.artist_name || track.profiles?.username || 'Unknown'}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTrack(track.id)}
                              className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-red-500/20"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 border-t border-white/20 space-y-3">
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between text-white/70">
                            <span>Tracks ({selectedTracks.length}x {formatAmount(SINGLE_PRICE)})</span>
                            <span>{formatAmount(albumPricing.base)}</span>
                          </div>
                          <div className="flex justify-between text-white/70">
                            <span>Tithing (10%)</span>
                            <span>{formatAmount(albumPricing.tithing)}</span>
                          </div>
                          <div className="flex justify-between text-white/70">
                            <span>Admin Fee (5%)</span>
                            <span>{formatAmount(albumPricing.adminFee)}</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center pt-2 border-t border-white/20">
                          <span className="font-semibold text-white">Total</span>
                          <span className="text-xl font-bold text-yellow-300">{formatAmount(albumPricing.total)}</span>
                        </div>

                        <div className="text-xs text-white/60 space-y-1">
                          <p>• 85% goes to artists</p>
                          <p>• 10% tithing</p>
                          <p>• 5% platform fee</p>
                        </div>

                        <Button
                          onClick={handleCheckout}
                          disabled={processing || selectedTracks.length === 0}
                          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                          size="lg"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {processing ? 'Processing...' : `Bestow ${formatAmount(albumPricing.total)}`}
                        </Button>

                        {selectedTracks.length > 0 && (
                          <Button
                            variant="outline"
                            onClick={clearAlbum}
                            className="w-full border-white/30 text-white hover:bg-white/10"
                            size="sm"
                          >
                            Clear Album
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
