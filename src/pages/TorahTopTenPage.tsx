import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { use364ttt, getTimeUntilWeekEnd } from '@/hooks/use364ttt';
import { useAuth } from '@/hooks/useAuth';
import { Play, Pause, Music, Trophy, Clock, ChevronRight, Heart, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TorahTopTenPage() {
  const { user } = useAuth();
  const { weekId, leaderboard, leaderboardLoading, previousPlaylists, remainingVotes, hasVotedFor, vote, isVoting } = use364ttt();
  const [timeLeft, setTimeLeft] = useState(getTimeUntilWeekEnd());
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Update countdown every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeUntilWeekEnd());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handlePlay = (songId: string, url: string) => {
    if (playingId === songId) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      }
      setPlayingId(songId);
    }
  };

  const getRoleBadge = (rank: number) => {
    if (rank === 1) return <span title="Bestower">✨</span>;
    if (rank <= 3) return <span title="Grower">🌿</span>;
    return <span title="Sower">🌱</span>;
  };

  return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
        {/* Hero Section */}
        <section className="relative py-16 px-4 text-center overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Music className="w-10 h-10 text-primary" />
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
                364 Torah Top Ten
              </h1>
            </div>
            <p className="text-xl text-muted-foreground mb-8">
              Vote for the weekly Torah soundtrack – Shape what the community hears!
            </p>

            {/* Countdown Timer */}
            <Card className="max-w-md mx-auto mb-8 border-primary/20 bg-card/50 backdrop-blur">
              <CardContent className="py-6">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">Week ends in</span>
                </div>
                <div className="flex justify-center gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">{timeLeft.days}</div>
                    <div className="text-xs text-muted-foreground">Days</div>
                  </div>
                  <div className="text-2xl font-bold text-muted-foreground">:</div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">{timeLeft.hours}</div>
                    <div className="text-xs text-muted-foreground">Hours</div>
                  </div>
                  <div className="text-2xl font-bold text-muted-foreground">:</div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">{timeLeft.minutes}</div>
                    <div className="text-xs text-muted-foreground">Minutes</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {user ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/364ttt/vote">
                  <Button size="lg" className="gap-2">
                    <Heart className="w-5 h-5" />
                    Vote Now ({remainingVotes}/10 remaining)
                  </Button>
                </Link>
              </div>
            ) : (
              <p className="text-muted-foreground">
                <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to vote for your favorite songs
              </p>
            )}
          </motion.div>
        </section>

        {/* Live Leaderboard */}
        <section className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <Trophy className="w-6 h-6 text-amber-500" />
              <h2 className="text-2xl font-bold">Current Week's Top 10</h2>
              <Badge variant="secondary" className="ml-auto">Week {weekId.split('_')[1]}</Badge>
            </div>

            {leaderboardLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="h-20" />
                  </Card>
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Music className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No votes yet this week. Be the first to vote!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {leaderboard.map((song, index) => (
                    <motion.div
                      key={song.song_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className={`hover:border-primary/50 transition-colors ${index < 3 ? 'border-primary/30 bg-primary/5' : ''}`}>
                        <CardContent className="py-4 px-4 flex items-center gap-4">
                          {/* Rank */}
                          <motion.div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                              index === 0 ? 'bg-amber-500 text-amber-950' :
                              index === 1 ? 'bg-gray-300 text-gray-800' :
                              index === 2 ? 'bg-amber-600 text-amber-100' :
                              'bg-muted text-muted-foreground'
                            }`}
                            animate={index < 3 ? { scale: [1, 1.1, 1] } : {}}
                            transition={{ repeat: Infinity, duration: 2 }}
                          >
                            {song.rank}
                          </motion.div>

                          {/* Song Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{song.track_title}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              {song.artist_name || 'Unknown Artist'} {getRoleBadge(song.rank)}
                            </p>
                          </div>

                          {/* Vote Count */}
                          <div className="flex items-center gap-1 text-primary">
                            <Star className="w-4 h-4 fill-primary" />
                            <span className="font-semibold">{song.vote_count}</span>
                          </div>

                          {/* Play Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePlay(song.song_id, song.file_url)}
                            className="shrink-0"
                          >
                            {playingId === song.song_id ? (
                              <Pause className="w-5 h-5" />
                            ) : (
                              <Play className="w-5 h-5" />
                            )}
                          </Button>

                          {/* Vote Button */}
                          {user && (
                            <Button
                              variant={hasVotedFor(song.song_id) ? "secondary" : "outline"}
                              size="sm"
                              onClick={() => vote(song.song_id)}
                              disabled={isVoting || (hasVotedFor(song.song_id)) || remainingVotes === 0}
                              className="shrink-0"
                            >
                              {hasVotedFor(song.song_id) ? '✓ Voted' : 'Vote'}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </section>

        {/* Previous Albums */}
        <section className="py-12 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Previous 364ttt Albums</h2>

            {previousPlaylists.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Music className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No albums generated yet. The first album will be available after the first week ends!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {previousPlaylists.map((playlist) => (
                  <Link key={playlist.id} to={`/364ttt/album/${playlist.week_id}`}>
                    <Card className="hover:border-primary/50 transition-all hover:shadow-lg group cursor-pointer h-full">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center justify-between">
                          <span className="truncate">{playlist.title}</span>
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4" />
                            {playlist.total_votes} votes
                          </div>
                          <div className="flex items-center gap-1">
                            <Music className="w-4 h-4" />
                            {playlist.song_ids.length} songs
                          </div>
                        </div>
                        {playlist.theme && (
                          <Badge variant="secondary" className="mt-2">{playlist.theme}</Badge>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="hidden" />
      </div>
  );
}
