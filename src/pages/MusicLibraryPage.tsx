import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MusicLibraryTable } from '@/components/music/MusicLibraryTable';
import { AlbumBuilderCart } from '@/components/music/AlbumBuilderCart';
import { LiveSessionPlaylistCart } from '@/components/music/LiveSessionPlaylistCart';
import { useAlbumBuilder } from '@/contexts/AlbumBuilderContext';
import { useLiveSessionPlaylist } from '@/contexts/LiveSessionPlaylistContext';
import { Music, Users, Radio } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

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
  const { data: communityMusic = [], isLoading: loadingCommunity } = useQuery({
    queryKey: ['community-music'],
    queryFn: async () => {
      console.log('🎵 Fetching community music...');
      
      // Get ALL tracks regardless of user
      const { data: tracks, error } = await supabase
        .from('dj_music_tracks')
        .select('*, radio_djs(user_id)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching community tracks:', error);
        throw error;
      }
      
      console.log('✅ Raw tracks fetched:', tracks?.length || 0);
      console.log('📊 Sample track:', tracks?.[0]);
      
      // Get all unique user IDs from radio_djs
      const userIds = [...new Set(tracks?.map(t => t.radio_djs?.user_id).filter(Boolean))];
      console.log('👥 Unique user IDs found:', userIds.length);
      
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
      
      // Transform the data to include profile info
      const transformedTracks = (tracks || []).map(track => ({
        ...track,
        profiles: track.radio_djs?.user_id ? profileMap.get(track.radio_djs.user_id) || { username: null, avatar_url: null } : { username: null, avatar_url: null }
      }));
      
      console.log('🎼 Final transformed tracks:', transformedTracks.length);
      
      return transformedTracks;
    }
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-heading-primary">Music Library</h1>
          <p className="text-muted-foreground mt-1">
            Browse and bestow on music tracks. Preview 30 seconds or download after bestowal.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card">
          <TabsTrigger value="my-music" className="gap-2">
            <Music className="h-4 w-4" />
            My Music
          </TabsTrigger>
          <TabsTrigger value="community" className="gap-2">
            <Users className="h-4 w-4" />
            Build Album
          </TabsTrigger>
          <TabsTrigger value="live-sessions" className="gap-2">
            <Radio className="h-4 w-4" />
            Live Sessions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-music" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                My Music Uploads
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingMy ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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

        <TabsContent value="community" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    S2G Community Music Library
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Select 10 tracks to build your custom album for $20
                  </p>
                </CardHeader>
                <CardContent>
                  {loadingCommunity ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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

        <TabsContent value="live-sessions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Radio className="h-5 w-5" />
                    S2G Community Music for Live Sessions
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Select tracks to create playlists for your radio shows, rooms, and live streams
                  </p>
                </CardHeader>
                <CardContent>
                  {loadingCommunity ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
  );
}