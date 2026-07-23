import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronDown, Disc3, Home, Loader2, Music, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import { AlbumBuilderCart } from '@/components/music/AlbumBuilderCart';
import { MusicLibraryTable } from '@/components/music/MusicLibraryTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAlbumBuilder } from '@/contexts/AlbumBuilderContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type MusicRow = {
  id: string;
  track_title: string;
  artist_name: string | null;
  duration_seconds: number | null;
  file_url: string;
  preview_url: string | null;
  price: number | null;
  genre: string | null;
  created_at: string;
  dj_id: string;
  wallet_address: string | null;
  product_id?: string | null;
  sower_id?: string | null;
  sower_user_id?: string | null;
  source_type?: string;
  cover_image_url?: string | null;
  profiles?: {
    username: string | null;
    avatar_url: string | null;
    display_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  };
};

type SowerOption = {
  userId: string;
  name: string;
  trackCount: number;
};

const displayProfileName = (profile: any) =>
  profile?.display_name ||
  `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
  profile?.username ||
  null;

const cleanName = (name: string | null | undefined) => name?.trim() || 'Sower';

export default function MusicLibraryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const albumBuilder = useAlbumBuilder();
  const [searchParams] = useSearchParams();
  const selectedTrackId = searchParams.get('trackId');
  const selectedDjId = searchParams.get('djId');
  const selectedProductId = searchParams.get('productId');
  const selectedSowerUserId = searchParams.get('sowerUserId');
  const selectedSowerNameParam = searchParams.get('sowerName');
  const requestedTab = searchParams.get('tab');
  const editMode = searchParams.has('edit');

  const initialMode = selectedSowerUserId || requestedTab === 'community' ? 'community' : 'my-music';
  const [activeMode, setActiveMode] = useState<'my-music' | 'community'>(initialMode);

  useEffect(() => {
    setActiveMode(selectedSowerUserId || requestedTab === 'community' ? 'community' : 'my-music');
  }, [requestedTab, selectedSowerUserId]);

  const { data: myMusic = [], isLoading: loadingMy } = useQuery({
    queryKey: ['my-music', user?.id],
    queryFn: async (): Promise<MusicRow[]> => {
      if (!user) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url, display_name, first_name, last_name')
        .eq('id', user.id)
        .maybeSingle();

      const { data: djProfiles } = await supabase
        .from('radio_djs')
        .select('id')
        .eq('user_id', user.id);

      const djIds = (djProfiles || []).map((dj: any) => dj.id).filter(Boolean);
      if (!djIds.length) return [];

      const { data: tracks, error } = await supabase
        .from('dj_music_tracks')
        .select('*')
        .in('dj_id', djIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (tracks || []).map((track: any) => ({
        ...track,
        sower_user_id: user.id,
        profiles: profile || { username: null, avatar_url: null },
      }));
    },
    enabled: !!user,
  });

  const { data: communityMusic = [], isLoading: loadingCommunity } = useQuery({
    queryKey: ['music-library-community'],
    queryFn: async (): Promise<MusicRow[]> => {
      const { data: tracks, error } = await supabase
        .from('dj_music_tracks')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: productMusicRows, error: productMusicError } = await supabase
        .from('products')
        .select('id, title, type, cover_image_url, image_urls, file_url, price, sower_id, artist_name, music_genre, music_mood, duration, created_at')
        .eq('type', 'music')
        .neq('status', 'archived')
        .order('created_at', { ascending: false })
        .limit(500);

      if (productMusicError) {
        console.warn('Product music fetch failed:', productMusicError);
      }

      const productMusic = productMusicRows || [];
      const djIds = [...new Set((tracks || []).map((track: any) => track.dj_id).filter(Boolean))];
      const sowerIds = [...new Set(productMusic.map((product: any) => product.sower_id).filter(Boolean))];

      const { data: djProfiles } = djIds.length
        ? await supabase.from('radio_djs').select('id, user_id').in('id', djIds)
        : { data: [] };

      const { data: sowerRows } = sowerIds.length
        ? await supabase.from('sowers').select('id, user_id, display_name, logo_url').in('id', sowerIds)
        : { data: [] };

      const djToUserMap = new Map((djProfiles || []).map((dj: any) => [dj.id, dj.user_id]));
      const sowerMap = new Map((sowerRows || []).map((sower: any) => [sower.id, sower]));
      const userIds = [
        ...(djProfiles || []).map((dj: any) => dj.user_id).filter(Boolean),
        ...(sowerRows || []).map((sower: any) => sower.user_id).filter(Boolean),
      ];
      const uniqueUserIds = [...new Set(userIds)];

      const { data: profileRows } = uniqueUserIds.length
        ? await supabase
            .from('profiles')
            .select('id, username, avatar_url, display_name, first_name, last_name')
            .in('id', uniqueUserIds)
        : { data: [] };

      const profileMap = new Map((profileRows || []).map((profile: any) => [profile.id, profile]));

      const transformedTracks = (tracks || []).map((track: any) => {
        const userId = djToUserMap.get(track.dj_id) as string | undefined;
        const profile = userId ? profileMap.get(userId) : null;
        return {
          ...track,
          sower_user_id: userId || null,
          profiles: profile || { username: null, avatar_url: null },
        };
      });

      const transformedProducts = productMusic.map((product: any) => {
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
          created_at: product.created_at || new Date().toISOString(),
          dj_id: `product-${product.sower_id}`,
          wallet_address: null,
          product_id: product.id,
          sower_id: product.sower_id,
          sower_user_id: sower?.user_id || null,
          cover_image_url: product.cover_image_url || product.image_urls?.[0] || null,
          profiles: profile || { username: null, avatar_url: sower?.logo_url || null, display_name: sower?.display_name || null },
          source_type: 'product',
        };
      });

      return [...transformedProducts, ...transformedTracks].sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    },
  });

  const sowerOptions = useMemo<SowerOption[]>(() => {
    const byUserId = new Map<string, SowerOption>();
    communityMusic.forEach((track) => {
      if (!track.sower_user_id) return;
      const name = cleanName(track.artist_name || displayProfileName(track.profiles));
      const current = byUserId.get(track.sower_user_id);
      if (current) {
        current.trackCount += 1;
      } else {
        byUserId.set(track.sower_user_id, { userId: track.sower_user_id, name, trackCount: 1 });
      }
    });
    return [...byUserId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [communityMusic]);

  const selectedSowerName = useMemo(() => {
    const selected = selectedSowerUserId
      ? sowerOptions.find((sower) => sower.userId === selectedSowerUserId)
      : null;
    return selectedSowerNameParam || selected?.name || null;
  }, [selectedSowerNameParam, selectedSowerUserId, sowerOptions]);

  const displayedCommunityMusic = useMemo(() => {
    let rows = communityMusic;
    if (selectedSowerUserId) {
      rows = rows.filter((track) => track.sower_user_id === selectedSowerUserId);
    }
    if (selectedDjId) {
      rows = rows.filter((track) => track.dj_id === selectedDjId || track.sower_user_id === selectedSowerUserId);
    }
    return rows;
  }, [communityMusic, selectedDjId, selectedSowerUserId]);

  const heroTitle = selectedSowerUserId && selectedSowerName
    ? `${selectedSowerName}'s S2G Music Library`
    : activeMode === 'community'
      ? 'All Sowers Music Library'
      : 'My S2G Music Library';

  const listTitle = selectedSowerUserId && selectedSowerName
    ? `${selectedSowerName}'s songs`
    : 'All sowers songs';

  const activeTracks = activeMode === 'community' ? displayedCommunityMusic : myMusic;
  const loading = activeMode === 'community' ? loadingCommunity : loadingMy;
  const selectedTrackIds = albumBuilder.selectedTracks.map((track) => track.id);

  const handleAlbumTrackSelect = (track: MusicRow) => {
    if (albumBuilder.isTrackSelected(track.id)) {
      albumBuilder.removeTrack(track.id);
      return;
    }

    if (selectedSowerUserId && track.sower_user_id !== selectedSowerUserId) {
      toast.error('This album can only use songs from this sower.');
      return;
    }

    if (!albumBuilder.canAddMore) {
      toast.error('An album must be exactly 10 songs. Remove a song before adding another.');
      return;
    }

    albumBuilder.addTrack(track);
  };

  const goToAllSowersMusic = () => {
    setActiveMode('community');
    navigate('/music-library?tab=community');
  };

  const goToSower = (sower: SowerOption) => {
    setActiveMode('community');
    navigate(`/music-library?tab=community&sowerUserId=${encodeURIComponent(sower.userId)}&sowerName=${encodeURIComponent(sower.name)}`);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-rose-950 via-pink-900 to-rose-900" />
      <div className="fixed inset-0 z-0 bg-background/10" />

      <div className="relative z-10 container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2 bg-card/20 border-border/40 text-primary-foreground hover:bg-card/30">
            <ArrowLeft className="h-4 w-4" />
            Return
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="gap-2 bg-card/20 border-border/40 text-primary-foreground hover:bg-card/30">
            <Home className="h-4 w-4" />
            Home
          </Button>
          <Button variant="outline" onClick={goToAllSowersMusic} className="gap-2 bg-card/20 border-border/40 text-primary-foreground hover:bg-card/30">
            <Users className="h-4 w-4" />
            All Sowers Music
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 bg-card/20 border-border/40 text-primary-foreground hover:bg-card/30">
                <Music className="h-4 w-4" />
                Sowers
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              <DropdownMenuLabel>Choose a sower library</DropdownMenuLabel>
              <DropdownMenuItem onClick={goToAllSowersMusic}>
                All Sowers Music
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <ScrollArea className="h-72">
                {sowerOptions.length === 0 ? (
                  <DropdownMenuItem disabled>No sower music yet</DropdownMenuItem>
                ) : (
                  sowerOptions.map((sower) => (
                    <DropdownMenuItem key={sower.userId} onClick={() => goToSower(sower)} className="flex items-center justify-between gap-3">
                      <span className="truncate">{sower.name}</span>
                      <span className="text-xs text-muted-foreground">{sower.trackCount}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>

          {user && (
            <Button variant="outline" onClick={() => { setActiveMode('my-music'); navigate('/music-library'); }} className="gap-2 bg-card/20 border-border/40 text-primary-foreground hover:bg-card/30">
              <Disc3 className="h-4 w-4" />
              My Music Uploads
            </Button>
          )}
        </div>

        <div className="relative overflow-hidden border border-border/30 backdrop-blur-md bg-card/15 rounded-2xl">
          <div className="px-4 py-10 md:py-12">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-5xl mx-auto">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                <div className="p-4 rounded-2xl bg-card/20 backdrop-blur-md border border-border/40">
                  <Music className="w-14 h-14 text-primary-foreground" />
                </div>
                <h1 className="text-4xl md:text-6xl font-bold text-primary-foreground">
                  {heroTitle}
                </h1>
              </div>
              <p className="text-primary-foreground/90 text-lg md:text-xl backdrop-blur-sm bg-card/15 rounded-lg p-4 border border-border/30">
                Preview songs, bestow on a single song, or choose exactly 10 songs for a custom album.
              </p>
            </motion.div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="backdrop-blur-md bg-card/20 border-border/30 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary-foreground">
                  <Music className="h-5 w-5" />
                  {activeMode === 'my-music' ? 'My music uploads' : listTitle}
                </CardTitle>
                <p className="text-sm text-primary-foreground/80">
                  {selectedSowerUserId
                    ? 'This page only shows this sower’s music. The opened song is highlighted when available.'
                    : activeMode === 'community'
                      ? 'Choose songs from any sower to build a 10-song album, or bestow on a single song.'
                      : editMode
                        ? 'Manage your uploaded songs.'
                        : 'Your uploaded music appears here.'}
                </p>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-foreground" />
                  </div>
                ) : (
                  <MusicLibraryTable
                    tracks={activeTracks}
                    showBestowalButton={activeMode === 'community'}
                    showEditButton={activeMode === 'my-music'}
                    allowSelection={activeMode === 'community'}
                    onTrackSelect={handleAlbumTrackSelect}
                    selectedTracks={selectedTrackIds}
                    highlightedTrackId={selectedTrackId || undefined}
                    highlightedProductId={selectedProductId || undefined}
                  />
                )}
              </CardContent>
            </Card>
          </div>
          <div>
            <AlbumBuilderCart scopeName={selectedSowerUserId && selectedSowerName ? selectedSowerName : 'All Sowers'} />
          </div>
        </div>
      </div>
    </div>
  );
}