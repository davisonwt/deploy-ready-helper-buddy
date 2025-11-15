import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MusicLibraryTable } from '@/components/music/MusicLibraryTable';
import { Music, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function MusicLibraryPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('my-music');

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
      const { data: djProfile } = await supabase
        .from('radio_djs')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!djProfile) {
        // No DJ profile yet - return empty for now
        // User should create DJ profile first
        return [];
      }
      
      // Fetch all tracks for this DJ
      const { data: tracks, error } = await supabase
        .from('dj_music_tracks')
        .select('*')
        .eq('dj_id', djProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (tracks || []).map(track => ({
        ...track,
        profiles: profile || { username: null, avatar_url: null }
      }));
    },
    enabled: !!user
  });

  // Fetch all public community music - ALL tracks
  const { data: communityMusic = [], isLoading: loadingCommunity } = useQuery({
    queryKey: ['community-music'],
    queryFn: async () => {
      const { data: tracks, error } = await supabase
        .from('dj_music_tracks')
        .select('*, radio_djs(user_id)')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Get all unique user IDs from radio_djs
      const userIds = [...new Set(tracks?.map(t => t.radio_djs?.user_id).filter(Boolean))];
      
      // Fetch profiles for all users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      // Transform the data to include profile info
      return (tracks || []).map(track => ({
        ...track,
        profiles: track.radio_djs?.user_id ? profileMap.get(track.radio_djs.user_id) || { username: null, avatar_url: null } : { username: null, avatar_url: null }
      }));
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
            My Products
          </TabsTrigger>
          <TabsTrigger value="community" className="gap-2">
            <Users className="h-4 w-4" />
            S2G Community Products
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Community Music Library
              </CardTitle>
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
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}