import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Music, Loader2, Play, Pause, Heart, Download, Users, Clock, TrendingUp, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/formatters';
import { toast } from 'sonner';

export default function S2GCommunityMusicPage() {
  const { user } = useAuth();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioRefs, setAudioRefs] = useState<Map<string, HTMLAudioElement>>(new Map());
  const [playbackPositions, setPlaybackPositions] = useState<Map<string, number>>(new Map());
  const PREVIEW_DURATION = 30; // 30 seconds preview

  // Fetch music from BOTH s2g_library_items AND dj_music_tracks
  const { data: allMusic, isLoading } = useQuery({
    queryKey: ['s2g-community-music-all'],
    queryFn: async () => {
      const allTracks: any[] = [];

      // 1. Fetch from s2g_library_items (type='music')
      const { data: libraryMusic, error: libraryError } = await supabase
        .from('s2g_library_items')
        .select('*')
        .eq('is_public', true)
        .eq('type', 'music')
        .order('created_at', { ascending: false });

      if (libraryError) {
        console.error('Error fetching library music:', libraryError);
      } else if (libraryMusic) {
        // Get profiles for library items
        const userIds = [...new Set(libraryMusic.map(item => item.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        libraryMusic.forEach(item => {
          allTracks.push({
            id: item.id,
            source: 'library',
            title: item.title,
            artist: item.description || 'Unknown Artist',
            duration_seconds: item.metadata?.duration_seconds || 0,
            file_url: item.file_url,
            preview_url: item.preview_url || item.file_url,
            cover_image_url: item.cover_image_url,
            price: item.price || 0,
            is_giveaway: item.is_giveaway || false,
            giveaway_limit: item.giveaway_limit,
            giveaway_count: item.giveaway_count || 0,
            bestowal_count: item.bestowal_count || 0,
            download_count: item.download_count || 0,
            profile: profileMap.get(item.user_id),
            user_id: item.user_id,
            created_at: item.created_at,
            tags: item.tags || []
          });
        });
      }

      // 2. Fetch from dj_music_tracks (all public tracks)
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
        // Get profiles for DJ tracks
        const djUserIds = [...new Set(djTracks.map(t => t.radio_djs?.user_id).filter(Boolean))];
        const { data: djProfiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', djUserIds);
        
        const djProfileMap = new Map(djProfiles?.map(p => [p.user_id, p]) || []);

        djTracks.forEach(track => {
          const dj = track.radio_djs;
          const profile = dj?.user_id ? djProfileMap.get(dj.user_id) : null;
          
          allTracks.push({
            id: track.id,
            source: 'dj',
            title: track.track_title,
            artist: track.artist_name || dj?.dj_name || 'Unknown Artist',
            duration_seconds: track.duration_seconds || 0,
            file_url: track.file_url,
            preview_url: track.file_url, // Use same URL for preview
            cover_image_url: null, // DJ tracks might not have cover images
            price: 0, // DJ tracks are typically free or need pricing added
            is_giveaway: false,
            giveaway_limit: null,
            giveaway_count: 0,
            bestowal_count: 0,
            download_count: 0,
            profile: profile || (dj ? { display_name: dj.dj_name, avatar_url: dj.avatar_url } : null),
            user_id: dj?.user_id,
            created_at: track.created_at,
            tags: track.tags || [],
            genre: track.genre,
            bpm: track.bpm
          });
        });
      }

      // Sort by created_at (newest first)
      return allTracks.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
  });

  // Fetch user access for library items
  const { data: userAccess } = useQuery({
    queryKey: ['library-access', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('s2g_library_item_access')
        .select('library_item_id')
        .eq('user_id', user.id);
      return (data || []).map(a => a.library_item_id);
    },
    enabled: !!user?.id
  });

  const hasAccess = (item: any) => {
    if (item.source === 'library') {
      return userAccess?.includes(item.id) || false;
    }
    // For DJ tracks, check if free or if user has access
    return item.price === 0 || item.is_giveaway;
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlay = (item: any) => {
    const hasFullAccess = hasAccess(item);
    
    if (!hasFullAccess) {
      // Play 30-second preview
      const audio = new Audio(item.preview_url || item.file_url);
      audio.currentTime = playbackPositions.get(item.id) || 0;
      
      audio.play();
      setPlayingId(item.id);
      audioRefs.set(item.id, audio);

      // Stop after 30 seconds if no access
      const stopTimer = setTimeout(() => {
        if (!hasFullAccess) {
          audio.pause();
          setPlayingId(null);
          toast.info('Preview ended. Bestow to access full track!');
        }
      }, PREVIEW_DURATION * 1000);

      audio.onended = () => {
        clearTimeout(stopTimer);
        setPlayingId(null);
        audioRefs.delete(item.id);
      };

      audio.ontimeupdate = () => {
        setPlaybackPositions(new Map(playbackPositions.set(item.id, audio.currentTime)));
      };
    } else {
      // Play full track
      if (playingId === item.id && audioRefs.has(item.id)) {
        const audio = audioRefs.get(item.id)!;
        audio.pause();
        setPlayingId(null);
        audioRefs.delete(item.id);
      } else {
        // Stop any currently playing track
        audioRefs.forEach(audio => audio.pause());
        audioRefs.clear();

        const audio = new Audio(item.file_url);
        audio.currentTime = playbackPositions.get(item.id) || 0;
        audio.play();
        setPlayingId(item.id);
        audioRefs.set(item.id, audio);

        audio.onended = () => {
          setPlayingId(null);
          audioRefs.delete(item.id);
        };

        audio.ontimeupdate = () => {
          setPlaybackPositions(new Map(playbackPositions.set(item.id, audio.currentTime)));
        };
      }
    }
  };

  const handleBestow = async (item: any) => {
    if (!user) {
      toast.error('Please login to bestow');
      return;
    }

    if (item.is_giveaway && item.giveaway_count < (item.giveaway_limit || Infinity)) {
      // Handle giveaway
      const result = await supabase.functions.invoke('complete-library-bestowal', {
        body: {
          libraryItemId: item.id,
          amount: 0,
          sowerId: item.user_id,
          isGiveaway: true
        }
      });
      if (result.data?.success) {
        toast.success('Giveaway access granted!');
        window.location.reload();
      }
      return;
    }

    if (!item.price || item.price <= 0) {
      toast.error('This item requires bestowal but has no price set');
      return;
    }

    // Initiate Binance Pay for bestowal
    try {
      const { data, error } = await supabase.functions.invoke('create-binance-pay-order', {
        body: {
          libraryItemId: item.id,
          amount: item.price,
          sowerId: item.user_id,
          type: 'library_item'
        }
      });

      if (error) {
        console.error('Binance Pay order creation error:', error);
        toast.error(error.message || 'Failed to initiate bestowal payment');
        return;
      }

      if (data?.paymentUrl) {
        window.open(data.paymentUrl, '_blank');
        toast.info('Redirecting to Binance Pay. Complete payment to finalize your bestowal.');
      } else {
        toast.error('Failed to get payment URL. Please try again.');
      }
    } catch (error: any) {
      console.error('Payment initiation error:', error);
      toast.error(`Payment initiation failed: ${error.message}`);
    }
  };

  const handleDownload = (item: any) => {
    if (!hasAccess(item)) {
      toast.error('Bestow to download this track');
      return;
    }
    // Download logic
    window.open(item.file_url, '_blank');
  };

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center' style={{
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #4facfe 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradient 15s ease infinite'
      }}>
        <Loader2 className='w-12 h-12 animate-spin text-white' />
      </div>
    );
  }

  return (
    <div className='min-h-screen relative overflow-hidden'>
      {/* Creative Animated Background */}
      <div className='fixed inset-0 z-0'>
        <div className='absolute inset-0' style={{
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 25%, #4facfe 50%, #00f2fe 75%, #43e97b 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradient 25s ease infinite'
        }} />
        <div className='absolute inset-0 bg-black/30' />
        {/* Music wave patterns */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className='absolute'
            style={{
              width: '4px',
              height: `${40 + Math.random() * 60}px`,
              background: `linear-gradient(to top, rgba(255,255,255,0.4), rgba(255,255,255,0.1))`,
              left: `${5 + i * 12}%`,
              bottom: '0',
              borderRadius: '2px',
            }}
            animate={{
              height: [`${40 + Math.random() * 60}px`, `${60 + Math.random() * 80}px`, `${40 + Math.random() * 60}px`],
            }}
            transition={{
              duration: 1 + Math.random(),
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.1
            }}
          />
        ))}
        {/* Floating music notes */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={`note-${i}`}
            className='absolute text-white/20 text-6xl'
            style={{
              left: `${20 + i * 15}%`,
              top: `${10 + i * 15}%`,
            }}
            animate={{
              y: [0, -30, 0],
              rotate: [0, 15, 0],
            }}
            transition={{
              duration: 3 + i,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          >
            ♪
          </motion.div>
        ))}
      </div>

      {/* Content */}
      <div className='relative z-10'>
        {/* Hero Header */}
        <div className='relative overflow-hidden border-b border-white/20 backdrop-blur-md bg-white/10'>
          <div className='relative container mx-auto px-4 py-16'>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className='text-center max-w-4xl mx-auto'
            >
              <div className='flex items-center justify-center gap-4 mb-6'>
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className='p-4 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30'
                >
                  <Music className='w-16 h-16 text-white' />
                </motion.div>
                <h1 className='text-6xl font-bold text-white drop-shadow-2xl'>
                  S2G Community Music
                </h1>
              </div>
              <p className='text-white/90 text-xl mb-4 backdrop-blur-sm bg-white/10 rounded-lg p-4 border border-white/20'>
                Discover and support amazing music from our community creators. Preview 30 seconds or bestow to download full tracks.
              </p>
              <div className='flex items-center justify-center gap-4 text-white/70'>
                <Users className='w-5 h-5' />
                <span>{allMusic?.length || 0} tracks available</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* YouTube-like Music List Layout */}
        <div className='container mx-auto px-4 py-8'>
          {allMusic && allMusic.length === 0 ? (
            <Card className='max-w-2xl mx-auto mt-12 backdrop-blur-md bg-white/20 border-white/30 shadow-2xl'>
              <CardContent className='p-12 text-center'>
                <Music className='w-20 h-20 mx-auto text-white/70 mb-4' />
                <h3 className='text-2xl font-bold mb-2 text-white'>No Music Available</h3>
                <p className='text-white/70 mb-6'>
                  Be the first to share your music with the community!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className='space-y-4'>
              {allMusic?.map((item) => {
                const accessGranted = hasAccess(item);
                const isPlaying = playingId === item.id;
                const isGiveaway = item.is_giveaway && item.giveaway_count < (item.giveaway_limit || Infinity);
                
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ scale: 1.01 }}
                    className='backdrop-blur-md bg-white/20 border border-white/30 rounded-xl overflow-hidden shadow-2xl p-4'
                  >
                    <div className='flex gap-4'>
                      {/* Thumbnail/Album Art */}
                      <div className='relative flex-shrink-0'>
                        {item.cover_image_url ? (
                          <img
                            src={item.cover_image_url}
                            alt={item.title}
                            className='w-40 h-40 object-cover rounded-lg'
                          />
                        ) : (
                          <div className='w-40 h-40 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center'>
                            <Music className='w-16 h-16 text-white' />
                          </div>
                        )}
                        {/* Play Button Overlay */}
                        <div className='absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg opacity-0 hover:opacity-100 transition-opacity'>
                          <Button
                            size='lg'
                            className='rounded-full w-16 h-16 bg-white/90 hover:bg-white text-black'
                            onClick={() => handlePlay(item)}
                          >
                            {isPlaying ? (
                              <Pause className='w-8 h-8' />
                            ) : (
                              <Play className='w-8 h-8 ml-1' />
                            )}
                          </Button>
                        </div>
                        {/* Preview Badge */}
                        {!accessGranted && (
                          <Badge className='absolute top-2 right-2 bg-yellow-500 text-white'>
                            30s Preview
                          </Badge>
                        )}
                      </div>

                      {/* Track Info - YouTube Style */}
                      <div className='flex-1 flex flex-col justify-between min-w-0'>
                        <div>
                          <div className='flex items-start justify-between gap-4 mb-2'>
                            <div className='flex-1 min-w-0'>
                              <h3 className='text-xl font-bold text-white line-clamp-1 mb-1'>
                                {item.title}
                              </h3>
                              <p className='text-white/80 text-sm mb-2'>
                                {item.artist}
                              </p>
                              <div className='flex items-center gap-4 text-sm text-white/70 mb-2'>
                                {item.duration_seconds > 0 && (
                                  <span className='flex items-center gap-1'>
                                    <Clock className='w-4 h-4' />
                                    {formatDuration(item.duration_seconds)}
                                  </span>
                                )}
                                <span className='flex items-center gap-1'>
                                  <Eye className='w-4 h-4' />
                                  {item.download_count || 0} plays
                                </span>
                                <span className='flex items-center gap-1'>
                                  <TrendingUp className='w-4 h-4' />
                                  {item.bestowal_count || 0} bestowals
                                </span>
                              </div>
                              {item.genre && (
                                <Badge variant='outline' className='bg-white/10 border-white/30 text-white text-xs'>
                                  {item.genre}
                                </Badge>
                              )}
                            </div>

                            {/* Bestowal Value - Prominently Displayed */}
                            <div className='text-right flex-shrink-0'>
                              {isGiveaway ? (
                                <div className='bg-green-500/20 border border-green-400 rounded-lg p-3'>
                                  <Badge className='bg-green-500 text-white mb-1'>FREE</Badge>
                                  <p className='text-white text-xs'>
                                    {item.giveaway_limit ? `${item.giveaway_limit - (item.giveaway_count || 0)} left` : 'Unlimited'}
                                  </p>
                                </div>
                              ) : item.price > 0 ? (
                                <div className='bg-purple-500/20 border border-purple-400 rounded-lg p-3'>
                                  <p className='text-2xl font-bold text-white mb-1'>
                                    {formatCurrency(item.price)}
                                  </p>
                                  <p className='text-white/70 text-xs'>to bestow</p>
                                  {item.whisperer_percentage > 0 && (
                                    <p className='text-white/60 text-xs mt-1'>
                                      {item.whisperer_percentage}% whisperer
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <Badge className='bg-blue-500 text-white'>Free</Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className='flex items-center gap-2 mt-4'>
                          <Button
                            size='sm'
                            className={`flex-1 ${isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
                            onClick={() => handlePlay(item)}
                          >
                            {isPlaying ? (
                              <>
                                <Pause className='w-4 h-4 mr-2' />
                                Pause
                              </>
                            ) : (
                              <>
                                <Play className='w-4 h-4 mr-2' />
                                {accessGranted ? 'Play Full' : 'Preview 30s'}
                              </>
                            )}
                          </Button>
                          
                          {accessGranted ? (
                            <Button
                              size='sm'
                              variant='outline'
                              className='border-white/30 text-white hover:bg-white/20'
                              onClick={() => handleDownload(item)}
                            >
                              <Download className='w-4 h-4 mr-2' />
                              Download
                            </Button>
                          ) : (
                            <Button
                              size='sm'
                              className='bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                              onClick={() => handleBestow(item)}
                            >
                              <Heart className='w-4 h-4 mr-2' />
                              {isGiveaway ? 'Claim Free' : 'Bestow'}
                            </Button>
                          )}
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