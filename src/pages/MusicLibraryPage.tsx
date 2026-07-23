import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { ArrowLeft, Home, Music, Users, Radio, Disc, Podcast, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PlaylistBrowser } from '@/components/music/PlaylistBrowser';
import WanderingBadgeBar, { type WanderingRole } from '@/components/marketplace/WanderingBadgeBar';
import MarketplaceFilterBar from '@/components/marketplace/MarketplaceFilterBar';
import { Button } from '@/components/ui/button';

const displayProfileName = (profile: any) =>
  profile?.display_name ||
  `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
  profile?.username ||
  null;

export default function MusicLibraryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const albumBuilder = useAlbumBuilder();
  const livePlaylist = useLiveSessionPlaylist();
  const [searchParams] = useSearchParams();
  const selectedTrackId = searchParams.get('trackId');
  const selectedDjId = searchParams.get('djId');
  const selectedProductId = searchParams.get('productId');
  const selectedSowerUserId = searchParams.get('sowerUserId');
  const selectedSowerNameParam = searchParams.get('sowerName');
  const requestedTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(requestedTab === 'community' ? 'community' : 'my-music');
  const [activeRole, setActiveRole] = useState<WanderingRole | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tagIds, setTagIds] = useState<string[]>([]);

  useEffect(() => {
    if (requestedTab === 'community' || requestedTab === 'my-music') {
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);

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
        .select('username, avatar_url, display_name, first_name, last_name')
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
        sower_user_id: user.id,
        profiles: profile || { username: null, avatar_url: null }
      }));
    },
    enabled: !!user
  });

  // Fetch all public community music - ALL tracks from ALL users
  const { data: communityMusic = [], isLoading: loadingCommunity } = useQuery({
    queryKey: ['community-music', activeRole, categoryId, tagIds, selectedDjId, selectedSowerUserId],
    queryFn: async () => {
      console.log('🎵 Fetching community music...');
      
      // Get ALL DJ tracks and music products; Tribal Gardens music seeds can come from either source.
      const { data: tracks, error } = await supabase
        .from('dj_music_tracks')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching community tracks:', error);
        throw error;
      }

      const { data: productMusicRows, error: productMusicError } = await supabase
        .from('products')
        .select('id, title, description, type, cover_image_url, image_urls, file_url, price, sower_id, artist_name, music_genre, music_mood, duration, wandering_role, created_at')
        .eq('type', 'music')
        .neq('status', 'archived')
        .order('created_at', { ascending: false })
        .limit(300);

      if (productMusicError) {
        console.warn('⚠️ Product music fetch error, continuing with DJ tracks only:', productMusicError);
      }
      const productMusic = productMusicRows || [];
      
      console.log('✅ Raw tracks fetched:', tracks?.length || 0);
      console.log('📊 Sample track:', tracks?.[0]);
      
      // Get unique DJ IDs from tracks
      const djIds = [...new Set((tracks || []).map(t => t.dj_id).filter(Boolean))];
      console.log('🎤 Unique DJ IDs found:', djIds.length);

      let djProfilesList: Array<{ id: string; user_id: string | null }> = [];
      if (djIds.length > 0) {
        const { data: djProfiles, error: djError } = await supabase
          .from('radio_djs')
          .select('id, user_id')
          .in('id', djIds);
        if (djError) {
          console.warn('⚠️ DJ profiles fetch error, continuing without profiles:', djError);
        }
        djProfilesList = djProfiles || [];
      }

      const djToUserMap = new Map(djProfilesList.map((dj) => [dj.id, dj.user_id]));

      const sowerIds = [...new Set(productMusic.map((product: any) => product.sower_id).filter(Boolean))];
      const { data: sowerRows } = sowerIds.length
        ? await supabase.from('sowers').select('id, user_id, display_name, logo_url').in('id', sowerIds)
        : { data: [] };
      const sowerMap = new Map((sowerRows || []).map((sower: any) => [sower.id, sower]));

      // Fetch DJ profiles to get user IDs
      let filteredTracks = tracks || [];

      if (activeRole) {
        filteredTracks = filteredTracks.filter((track) => track.wandering_role === activeRole);
      }

      if (selectedDjId) {
        filteredTracks = filteredTracks.filter((track) => track.dj_id === selectedDjId);
      }

      if (selectedSowerUserId) {
        filteredTracks = filteredTracks.filter((track) => djToUserMap.get(track.dj_id) === selectedSowerUserId);
      }

      let filteredProducts = productMusic;

      if (activeRole) {
        filteredProducts = filteredProducts.filter((product: any) => product.wandering_role === activeRole);
      }

      if (selectedSowerUserId) {
        filteredProducts = filteredProducts.filter((product: any) => sowerMap.get(product.sower_id)?.user_id === selectedSowerUserId);
      }

      if (categoryId) {
        const { data: subcategoryRows, error: subcategoryError } = await supabase
          .from('marketplace_subcategories' as any)
          .select('id')
          .eq('category_id', categoryId);
        if (subcategoryError) throw subcategoryError;
        const subcategoryIds = (subcategoryRows || []).map((row: any) => row.id);
        if (!subcategoryIds.length) return [];

        const { data: listingRows, error: listingError } = await supabase
          .from('listing_subcategories' as any)
          .select('listing_id')
          .eq('listing_type', 'music')
          .in('subcategory_id', subcategoryIds);
        if (listingError) throw listingError;
        const listingIds = new Set((listingRows || []).map((row: any) => row.listing_id));
        filteredTracks = filteredTracks.filter((track) => listingIds.has(track.id));
        filteredProducts = filteredProducts.filter((product: any) => listingIds.has(product.id));
      }

      if (tagIds.length) {
        const { data: tagRows, error: tagError } = await supabase
          .from('listing_tags' as any)
          .select('listing_id, tag_id')
          .eq('listing_type', 'music')
          .in('tag_id', tagIds);
        if (tagError) throw tagError;
        const counts = new Map<string, Set<string>>();
        (tagRows || []).forEach((row: any) => {
          if (!counts.has(row.listing_id)) counts.set(row.listing_id, new Set());
          counts.get(row.listing_id)?.add(row.tag_id);
        });
        filteredTracks = filteredTracks.filter((track) => counts.get(track.id)?.size === tagIds.length);
        filteredProducts = filteredProducts.filter((product: any) => counts.get(product.id)?.size === tagIds.length);
      }

      const userIds = [
        ...djProfilesList.map(dj => dj.user_id).filter(Boolean),
        ...(sowerRows || []).map((sower: any) => sower.user_id).filter(Boolean),
      ] as string[];
      console.log('👥 Unique user IDs found:', userIds.length);
      
      // Fetch profiles for all users (guard empty to avoid IN error)
      let profileList: Array<{ id: string; username: string | null; avatar_url: string | null }> = [];
      if (userIds.length > 0) {
        const { data: profs, error: profErr } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, display_name, first_name, last_name')
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
      
      // Transform the data to include profile info
      const transformedTracks = filteredTracks.map(track => {
        const userId = djToUserMap.get(track.dj_id);
        const profile = userId ? profileMap.get(userId) : null;
        return {
          ...track,
          sower_user_id: userId || null,
          profiles: profile || { username: null, avatar_url: null }
        };
      });

      const transformedProducts = filteredProducts.map((product: any) => {
        const sower = sowerMap.get(product.sower_id);
        const profile = sower?.user_id ? profileMap.get(sower.user_id) : null;
        return {
          id: product.id,
          track_title: product.title,
          artist_name: product.artist_name || sower?.display_name || displayProfileName(profile),
          duration_seconds: product.duration || null,
          file_url: product.file_url,
          preview_url: null,
          price: product.price,
          genre: product.music_genre || product.music_mood || null,
          created_at: product.created_at,
          dj_id: `product-${product.sower_id}`,
          wallet_address: null,
          product_id: product.id,
          sower_user_id: sower?.user_id || null,
          cover_image_url: product.cover_image_url || product.image_urls?.[0] || null,
          profiles: profile || { username: null, avatar_url: sower?.logo_url || null, display_name: sower?.display_name || null },
          source_type: 'product',
        };
      });

      const combinedMusic = [...transformedProducts, ...transformedTracks]
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      console.log('🎼 Final transformed music rows:', combinedMusic.length);
      
      return combinedMusic;
    }
  });

  const filteredMyMusic = useMemo(() => {
    if (!activeRole) return myMusic;
    return myMusic.filter((track: any) => track.wandering_role === activeRole);
  }, [activeRole, myMusic]);

  const selectedSowerName = useMemo(() => {
    const selected = communityMusic.find((track: any) => track.id === selectedTrackId) || communityMusic[0];
    return selectedSowerNameParam || selected?.artist_name || displayProfileName(selected?.profiles) || null;
  }, [communityMusic, selectedTrackId, selectedSowerNameParam]);

  const heroTitle = useMemo(() => {
    if (selectedSowerUserId && selectedSowerName) return `${selectedSowerName}'s S2G Music Library`;
    if (activeTab === 'community') return 'S2G Community Music Library';
    return 'My S2G Music Library';
  }, [activeTab, selectedSowerName, selectedSowerUserId]);

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
        <div className='flex items-center gap-3'>
          <Button variant='outline' onClick={() => navigate(-1)} className='gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20'>
            <ArrowLeft className='h-4 w-4' />
            Return
          </Button>
          <Button variant='outline' onClick={() => navigate('/dashboard')} className='gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20'>
            <Home className='h-4 w-4' />
            Home
          </Button>
        </div>

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
                  {heroTitle}
                </h1>
              </div>
              <p className='text-white/90 text-xl backdrop-blur-sm bg-white/10 rounded-lg p-4 border border-white/20'>
                Browse and bestow on music tracks. Preview 40 seconds or download after bestowal. Build albums and create playlists.
              </p>
            </motion.div>
          </div>
        </div>

        <WanderingBadgeBar activeRole={activeRole} onRoleChange={setActiveRole} />
        <MarketplaceFilterBar
          categoryId={categoryId}
          tagIds={tagIds}
          onCategoryChange={setCategoryId}
          onTagsChange={setTagIds}
        />

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
                    tracks={filteredMyMusic} 
                    showBestowalButton={false}
                    showEditButton={true}
                    highlightedTrackId={selectedTrackId || undefined}
                    highlightedProductId={selectedProductId || undefined}
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
                      {selectedSowerName && (selectedDjId || selectedSowerUserId) ? `${selectedSowerName}'s S2G Music Library` : 'S2G Community Music Library'}
                    </CardTitle>
                    <p className='text-sm text-white/80'>
                      {selectedDjId || selectedSowerUserId ? 'The song opened from Tribal Gardens is highlighted below.' : 'Select 10 tracks to build your custom album for $20'}
                    </p>
                  </CardHeader>
                  <CardContent>
                    {loadingCommunity ? (
                      <div className='flex items-center justify-center py-12'>
                        <Loader2 className='w-8 h-8 animate-spin text-white' />
                      </div>
                    ) : (
                      <MusicLibraryTable 
                        tracks={communityMusic} 
                        showBestowalButton={true}
                        allowSelection={!selectedSowerUserId && !selectedDjId}
                        onTrackSelect={handleAlbumTrackSelect}
                        selectedTracks={albumBuilder.selectedTracks.map(t => t.id)}
                        highlightedTrackId={selectedTrackId || undefined}
                        highlightedProductId={selectedProductId || undefined}
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