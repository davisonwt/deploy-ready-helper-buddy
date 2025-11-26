import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Music, Loader2, Play, Pause, Heart, Download, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/formatters';
import { toast } from 'sonner';

export default function S2GCommunityMusicPage() {
  const { user } = useAuth();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const { data: musicItems, isLoading } = useQuery({
    queryKey: ['s2g-community-music'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('s2g_library_items')
        .select('*, profiles:user_id(display_name, avatar_url)')
        .eq('is_public', true)
        .eq('type', 'music')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

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

  const hasAccess = (itemId: string) => {
    return userAccess?.includes(itemId) || false;
  };

  const handlePlay = (item: any) => {
    if (!hasAccess(item.id)) {
      toast.error('Bestow to access full track');
      return;
    }

    if (playingId === item.id && audioElement) {
      audioElement.pause();
      setPlayingId(null);
      setAudioElement(null);
    } else {
      if (audioElement) {
        audioElement.pause();
      }
      const audio = new Audio(item.file_url);
      audio.play();
      setAudioElement(audio);
      setPlayingId(item.id);
      audio.onended = () => {
        setPlayingId(null);
        setAudioElement(null);
      };
    }
  };

  const handleBestow = async (item: any) => {
    if (!user) {
      toast.error('Please login to bestow');
      return;
    }

    // Create bestowal via edge function after payment
    const result = await supabase.functions.invoke('complete-library-bestowal', {
      body: {
        libraryItemId: item.id,
        amount: item.price,
        sowerId: item.user_id
      }
    });

    if (result.data?.paymentUrl) {
      window.open(result.data.paymentUrl, '_blank');
    }
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
              height: ${40 + Math.random() * 60}px,
              background: linear-gradient(to top, rgba(255,255,255,0.4), rgba(255,255,255,0.1)),
              left: ${5 + i * 12}%,
              bottom: '0',
              borderRadius: '2px',
            }}
            animate={{
              height: [${40 + Math.random() * 60}px, ${60 + Math.random() * 80}px, ${40 + Math.random() * 60}px],
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
            key={
ote-}
            className='absolute text-white/20 text-6xl'
            style={{
              left: ${20 + i * 15}%,
              top: ${10 + i * 15}%,
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
                Discover and support amazing music from our community creators. Preview tracks and bestow to download.
              </p>
              <div className='flex items-center justify-center gap-4 text-white/70'>
                <Users className='w-5 h-5' />
                <span>{musicItems?.length || 0} tracks available</span>
              </div>
            </motion.div>
          </div>
        </div>

        <div className='container mx-auto px-4 py-8'>
          {/* Music Grid */}
          {musicItems && musicItems.length === 0 ? (
            <Card className='max-w-2xl mx-auto mt-12 backdrop-blur-md bg-white/20 border-white/30'>
              <CardContent className='p-12 text-center'>
                <Music className='w-20 h-20 mx-auto text-white/70 mb-4' />
                <h3 className='text-2xl font-bold mb-2 text-white'>No Music Available</h3>
                <p className='text-white/70 mb-6'>
                  Be the first to share your music with the community!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
              {musicItems?.map((item) => {
                const accessGranted = hasAccess(item.id);
                const isPlaying = playingId === item.id;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    className='backdrop-blur-md bg-white/20 border border-white/30 rounded-xl overflow-hidden shadow-2xl'
                  >
                    <CardHeader className='p-4'>
                      <div className='flex items-start justify-between mb-2'>
                        <Badge variant='secondary' className='bg-white/30 text-white border-white/40'>
                          Music
                        </Badge>
                        {item.price > 0 && (
                          <span className='text-xl font-bold text-white'>
                            {formatCurrency(item.price)}
                          </span>
                        )}
                      </div>
                      <CardTitle className='text-white line-clamp-2'>{item.title}</CardTitle>
                      {item.profiles && (
                        <p className='text-white/70 text-sm mt-1'>
                          by {item.profiles.display_name || 'Anonymous'}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className='p-4 pt-0'>
                      {item.cover_image_url && (
                        <div className='relative mb-4 rounded-lg overflow-hidden'>
                          <img
                            src={item.cover_image_url}
                            alt={item.title}
                            className='w-full h-48 object-cover'
                          />
                          {!accessGranted && (
                            <div className='absolute inset-0 bg-black/60 flex items-center justify-center'>
                              <div className='text-center'>
                                <Music className='w-12 h-12 text-white mx-auto mb-2' />
                                <p className='text-white text-sm'>Preview Only</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <p className='text-white/80 text-sm line-clamp-2 mb-4'>
                        {item.description}
                      </p>
                      <div className='flex items-center justify-between text-sm text-white/70 mb-4'>
                        <span>{item.bestowal_count || 0} bestowals</span>
                        <span>{item.download_count || 0} plays</span>
                      </div>
                      <div className='flex gap-2'>
                        {accessGranted ? (
                          <>
                            <Button
                              className='flex-1 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white'
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
                                  Play
                                </>
                              )}
                            </Button>
                            <Button
                              variant='outline'
                              className='border-white/30 text-white hover:bg-white/20'
                              asChild
                            >
                              <a href={item.file_url} download target='_blank' rel='noopener noreferrer'>
                                <Download className='w-4 h-4' />
                              </a>
                            </Button>
                          </>
                        ) : (
                          <Button
                            className='w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                            onClick={() => handleBestow(item)}
                          >
                            <Heart className='w-4 h-4 mr-2' />
                            Bestow to Access
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      }</style>
    </div>
  );
}
