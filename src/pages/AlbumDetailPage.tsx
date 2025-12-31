import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWeeklyPlaylist, useAlbumSongs } from '@/hooks/use364ttt';
import { Play, Pause, ArrowLeft, Music, Users, Star, Share2, Download, SkipForward, SkipBack } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';

export default function AlbumDetailPage() {
  const { weekId } = useParams<{ weekId: string }>();
  const { data: playlist, isLoading: playlistLoading, error } = useWeeklyPlaylist(weekId || '');
  const { data: songs = [], isLoading: songsLoading } = useAlbumSongs(playlist?.song_ids || []);
  
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = (index: number) => {
    if (playingIndex === index && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      const song = songs[index];
      if (audioRef.current && song) {
        audioRef.current.src = song.file_url;
        audioRef.current.play();
        setPlayingIndex(index);
        setIsPlaying(true);
      }
    }
  };

  const handlePlayAll = () => {
    if (songs.length > 0) {
      handlePlay(0);
    }
  };

  const handleNext = () => {
    if (playingIndex !== null && playingIndex < songs.length - 1) {
      handlePlay(playingIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (playingIndex !== null && playingIndex > 0) {
      handlePlay(playingIndex - 1);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: playlist?.title || '364ttt Album',
          text: `Check out this week's Torah Top 10!`,
          url,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied!', description: 'Album link copied to clipboard.' });
    }
  };

  const getRankData = (songId: string) => {
    return playlist?.rank_data.find(r => r.song_id === songId);
  };

  if (playlistLoading || songsLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  if (error || !playlist) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center px-4">
          <Card className="max-w-md w-full">
            <CardContent className="py-12 text-center">
              <Music className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold mb-2">Album Not Found</h2>
              <p className="text-muted-foreground mb-6">
                This weekly album doesn't exist or hasn't been generated yet.
              </p>
              <Link to="/364ttt">
                <Button>Back to 364ttt</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-primary/10 via-background to-background">
        {/* Header */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link to="/364ttt" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to 364ttt</span>
          </Link>

          {/* Album Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-primary to-amber-500 rounded-2xl flex items-center justify-center shadow-xl">
              <Music className="w-16 h-16 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold mb-2">{playlist.title}</h1>
            {playlist.theme && (
              <Badge variant="secondary" className="mb-4">{playlist.theme}</Badge>
            )}
            <div className="flex items-center justify-center gap-6 text-muted-foreground mb-6">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-500" />
                <span>{playlist.total_votes} votes</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{playlist.total_voters} voters</span>
              </div>
              <div className="flex items-center gap-1">
                <Music className="w-4 h-4" />
                <span>{songs.length} songs</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" onClick={handlePlayAll} className="gap-2">
                <Play className="w-5 h-5" />
                Play All
              </Button>
              <Button variant="outline" size="lg" onClick={handleShare} className="gap-2">
                <Share2 className="w-5 h-5" />
                Share
              </Button>
            </div>
          </motion.div>

          {/* Song List */}
          <div className="space-y-3">
            {songs.map((song, index) => {
              if (!song) return null;
              const rankData = getRankData(song.id);
              const isCurrentlyPlaying = playingIndex === index;

              return (
                <motion.div
                  key={song.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={`transition-all ${isCurrentlyPlaying ? 'border-primary bg-primary/5 shadow-md' : 'hover:border-primary/30'}`}>
                    <CardContent className="py-4 px-4 flex items-center gap-4">
                      {/* Rank */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${
                        index === 0 ? 'bg-amber-500 text-amber-950' :
                        index === 1 ? 'bg-gray-300 text-gray-800' :
                        index === 2 ? 'bg-amber-600 text-amber-100' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>

                      {/* Play Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => handlePlay(index)}
                      >
                        {isCurrentlyPlaying && isPlaying ? (
                          <Pause className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5" />
                        )}
                      </Button>

                      {/* Song Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{song.track_title}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {song.artist_name || 'Unknown Artist'}
                        </p>
                      </div>

                      {/* Vote Count */}
                      {rankData && (
                        <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                          <Star className="w-4 h-4 text-amber-500" />
                          <span className="text-sm">{rankData.vote_count}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Audio Player Bar */}
        {playingIndex !== null && songs[playingIndex] && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 shadow-lg"
          >
            <div className="max-w-4xl mx-auto flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
                <Music className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{songs[playingIndex]?.track_title}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {songs[playingIndex]?.artist_name || 'Unknown Artist'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handlePrevious} disabled={playingIndex === 0}>
                  <SkipBack className="w-5 h-5" />
                </Button>
                <Button size="icon" onClick={() => handlePlay(playingIndex)}>
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={handleNext} disabled={playingIndex === songs.length - 1}>
                  <SkipForward className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        <audio
          ref={audioRef}
          onEnded={handleNext}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          className="hidden"
        />
      </div>
    </Layout>
  );
}
