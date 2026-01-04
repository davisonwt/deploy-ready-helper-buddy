import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MusicLibraryTable } from '@/components/music/MusicLibraryTable';
import { AlbumBuilderCart } from '@/components/music/AlbumBuilderCart';
import { LiveSessionPlaylistCart } from '@/components/music/LiveSessionPlaylistCart';
import { useAlbumBuilder } from '@/contexts/AlbumBuilderContext';
import { useLiveSessionPlaylist } from '@/contexts/LiveSessionPlaylistContext';
import { Music, Users, Radio, Disc, Podcast, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PlaylistBrowser } from '@/components/music/PlaylistBrowser';

export default function MusicLibraryPage() {
  const { user } = useAuth();
  const albumBuilder = useAlbumBuilder();
  const livePlaylist = useLiveSessionPlaylist();
  const [activeTab, setActiveTab] = useState('my-music');

  const handleAlbumTrackSelect = (track: any) => {
    if (albumBuilder.isTrackSelected(track.id)) {
      albumBuilder.removeTrack(track.id);
    } else {
      albumBuilder.addTrack(track);
    }
  };

  const handleLiveTrackSelect = (track: any) => {
    if (livePlaylist.isTrackSelected(track.id)) {
      livePlaylist.removeTrack(track.id);
    } else {
      livePlaylist.addTrack(track);
    }
  };

  // Fetch user's own music - get ALL tracks regardless of DJ profile status
  const { data: myMusic = [], isLoading: loadingMy } = useQuery({
    queryKey: ['my-music', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Get user's profile first
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();
      
      // Try to get DJ profile
      const { data: djProfiles } = await supabase
        .from('radio_djs')
        .select('id')
        .eq('user_id', user.id);
      
      if (!djProfiles || djProfiles.length === 0) {
        // No DJ profile yet - return empty
        console.log('No DJ profile found for user:', user.id);
        return [];
      }
      
      // Get all DJ IDs for this user
      const djIds = djProfiles.map(dj => dj.id);
      
      // Fetch all tracks for these DJ profiles
      const { data: tracks, error } = await supabase
        .from('dj_music_tracks')
        .select('*')
        .in('dj_id', djIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tracks:', error);
        throw error;
      }
      
      console.log(`Found ${tracks?.length || 0} tracks for user ${user.id}`);
      
      return (tracks || []).map(track => ({
        ...track,
        profiles: profile || { username: null, avatar_url: null }
      }));
    },
    enabled: !!user
  });

  // Fetch all public community music - ALL tracks from ALL users
  const { data: communityMusic = [], isLoading: loadingCommunity, error: communityError } = useQuery({
    queryKey: ['community-music'],
    queryFn: async () => {
      console.log('🎵 Fetching community music...');
      
      // Get ALL public tracks - using explicit policy-compatible query
      const { data: tracks, error } = await supabase
        .from('dj_music_tracks')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching community tracks:', error);
        // Don't throw - return empty array to prevent UI crash
        return [];
      }
      
      if (!tracks || tracks.length === 0) {
        console.log('ℹ️ No public tracks found');
        return [];
      }
      
      console.log('✅ Raw tracks fetched:', tracks?.length || 0);
      console.log('📊 Sample track:', tracks?.[0]);
      
      // Get unique DJ IDs from tracks
      const djIds = [...new Set((tracks || []).map(t => t.dj_id).filter(Boolean))];
      console.log('🎤 Unique DJ IDs found:', djIds.length);
      
      // Fetch DJ profiles to get user IDs
      let userIds: string[] = [];
      if (djIds.length > 0) {
        const { data: djProfiles, error: djError } = await supabase
          .from('radio_djs')
          .select('id, user_id')
          .in('id', djIds);
        
        if (djError) {
          console.warn('⚠️ DJ profiles fetch error, continuing without profiles:', djError);
        } else {
          userIds = (djProfiles || []).map(dj => dj.user_id).filter(Boolean);
          console.log('👥 Unique user IDs found:', userIds.length);
        }
      }
      
      // Fetch profiles for all users (guard empty to avoid IN error)
      let profileList: Array<{ id: string; username: string | null; avatar_url: string | null }> = [];
      if (userIds.length > 0) {
        const { data: profs, error: profErr } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);
        if (profErr) {
          console.warn('⚠️ Profiles fetch error, continuing without profiles:', profErr);
        }
        profileList = profs || [];
      } else {
        console.log('ℹ️ No user IDs found from radio_djs; proceeding without profiles.');
      }
      
      console.log('👤 Profiles fetched:', profileList.length);
      
      const profileMap = new Map(profileList.map(p => [p.id, p]));
      
      // Create a DJ to user mapping
      let djToUserMap = new Map<string, string>();
      if (djIds.length > 0) {
        const { data: djProfiles } = await supabase
          .from('radio_djs')
          .select('id, user_id')
          .in('id', djIds);
        if (djProfiles) {
          djToUserMap = new Map(djProfiles.map(dj => [dj.id, dj.user_id]));
        }
      }
      
      // Transform the data to include profile info
      const transformedTracks = (tracks || []).map(track => {
        const userId = djToUserMap.get(track.dj_id);
        const profile = userId ? profileMap.get(userId) : null;
        return {
          ...track,
          profiles: profile || { username: null, avatar_url: null }
        };
      });
      
      console.log('🎼 Final transformed tracks:', transformedTracks.length);
      
      return transformedTracks;
    }
  });

  return (
    <div className='min-h-screen relative overflow-hidden'>
      {/* Creative Animated Background */}
      <div className='fixed inset-0 z-0'>
        <div className='absolute inset-0' style={{
          background: 'linear-gradient(135deg, #ec4899 0%, #db2777 25%, #be185d 50%, #9f1239 75%, #831843 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradient 20s ease infinite'
        }} />
        <div className='absolute inset-0 bg-black/20' />
        {/* Floating orbs */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className='absolute rounded-full blur-3xl opacity-30'
            style={{
              width: `${200 + i * 100}px`,
              height: `${200 + i * 100}px`,
              background: `radial-gradient(circle, rgba(${236 - i * 3}, ${72 - i * 2}, ${153 - i * 1}, 0.6), transparent)`,
              left: `${10 + i * 15}%`,
              top: `${10 + i * 12}%`,
            }}
            animate={{
              x: [0, 100, 0],
              y: [0, 50, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className='relative z-10 container mx-auto py-6 space-y-6'>
        {/* Hero Header */}
        <div className='relative overflow-hidden border-b border-white/20 backdrop-blur-md bg-white/10 rounded-2xl mb-8'>
          <div className='relative container mx-auto px-4 py-12'>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className='text-center max-w-4xl mx-auto'
            >
              <div className='flex items-center justify-center gap-4 mb-6'>
                <div className='p-4 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30'>
                  <Music className='w-16 h-16 text-white' />
                </div>
                <h1 className='text-6xl font-bold text-white drop-shadow-2xl'>
                  My S2G Music Library
                </h1>
              </div>
              <p className='text-white/90 text-xl backdrop-blur-sm bg-white/10 rounded-lg p-4 border border-white/20'>
                Browse and bestow on music tracks. Preview 30 seconds or download after bestowal. Build albums and create playlists.
              </p>
            </motion.div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-6'>
          <TabsList className='backdrop-blur-md bg-white/20 border-white/30'>
            <TabsTrigger value='my-music' className='gap-2 text-white data-[state=active]:bg-white/30'>
              <Music className='h-4 w-4' />
              My Music
            </TabsTrigger>
            <TabsTrigger value='community' className='gap-2 text-white data-[state=active]:bg-white/30'>
              <Users className='h-4 w-4' />
              Build Album
            </TabsTrigger>
            <TabsTrigger value='albums' className='gap-2 text-white data-[state=active]:bg-white/30'>
              <Disc className='h-4 w-4' />
              Albums
            </TabsTrigger>
            <TabsTrigger value='chatcast' className='gap-2 text-white data-[state=active]:bg-white/30'>
              <Podcast className='h-4 w-4' />
              Chatcast
            </TabsTrigger>
            <TabsTrigger value='live-sessions' className='gap-2 text-white data-[state=active]:bg-white/30'>
              <Radio className='h-4 w-4' />
              Live Sessions
            </TabsTrigger>
          </TabsList>

          <TabsContent value='my-music' className='space-y-4'>
            <Card className='backdrop-blur-md bg-white/20 border-white/30 shadow-2xl'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-white'>
                  <Music className='h-5 w-5' />
                  My Music Uploads
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingMy ? (
                  <div className='flex items-center justify-center py-12'>
                    <Loader2 className='w-8 h-8 animate-spin text-white' />
                  </div>
                ) : (
                  <MusicLibraryTable 
                    tracks={myMusic} 
                    showBestowalButton={false}
                    showEditButton={true}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='community' className='space-y-4'>
            <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
              <div className='lg:col-span-2'>
                <Card className='backdrop-blur-md bg-white/20 border-white/30 shadow-2xl'>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-2 text-white'>
                      <Users className='h-5 w-5' />
                      S2G Community Music Library
                    </CardTitle>
                    <p className='text-sm text-white/80'>
                      Select 10 tracks to build your custom album for $20
                    </p>
                  </CardHeader>
                  <CardContent>
                    {loadingCommunity ? (
                      <div className='flex items-center justify-center py-12'>
                        <Loader2 className='w-8 h-8 animate-spin text-white' />
                      </div>
                    ) : communityError ? (
                      <div className='text-center py-8 text-white/70'>
                        <p>Unable to load community music. Please try again later.</p>
                      </div>
                    ) : (
                      <MusicLibraryTable 
                        tracks={communityMusic} 
                        showBestowalButton={true}
                        allowSelection={true}
                        onTrackSelect={handleAlbumTrackSelect}
                        selectedTracks={albumBuilder.selectedTracks.map(t => t.id)}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
              <div>
                <AlbumBuilderCart />
              </div>
            </div>
          </TabsContent>

          <TabsContent value='albums' className='space-y-4'>
            <Card className='backdrop-blur-md bg-white/20 border-white/30 shadow-2xl'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-white'>
                  <Disc className='h-5 w-5' />
                  S2G Community Albums
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PlaylistBrowser playlistType='album' emptyMessage='No albums available yet.' />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='chatcast' className='space-y-4'>
            <Card className='backdrop-blur-md bg-white/20 border-white/30 shadow-2xl'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-white'>
                  <Podcast className='h-5 w-5' />
                  Chatcast
                </CardTitle>
                <p className='text-sm text-white/80 mt-1'>
                  Listen to community podcasts and audio content
                </p>
              </CardHeader>
              <CardContent>
                <PlaylistBrowser playlistType='podcast' emptyMessage='No chatcasts available yet.' />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='live-sessions' className='space-y-4'>
            <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
              <div className='lg:col-span-2'>
                <Card className='backdrop-blur-md bg-white/20 border-white/30 shadow-2xl'>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-2 text-white'>
                      <Radio className='h-5 w-5' />
                      S2G Community Music for Live Sessions
                    </CardTitle>
                    <p className='text-sm text-white/80'>
                      Select tracks to create playlists for your radio shows, rooms, and live streams
                    </p>
                  </CardHeader>
                  <CardContent>
                    {loadingCommunity ? (
                      <div className='flex items-center justify-center py-12'>
                        <Loader2 className='w-8 h-8 animate-spin text-white' />
                      </div>
                    ) : communityError ? (
                      <div className='text-center py-8 text-white/70'>
                        <p>Unable to load community music. Please try again later.</p>
                      </div>
                    ) : (
                      <MusicLibraryTable 
                        tracks={communityMusic} 
                        showBestowalButton={false}
                        allowSelection={true}
                        onTrackSelect={handleLiveTrackSelect}
                        selectedTracks={livePlaylist.selectedTracks.map(t => t.id)}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
              <div>
                <LiveSessionPlaylistCart />
              </div>
            </div>
          </TabsContent>
        </Tabs>
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