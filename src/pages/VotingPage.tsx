import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { use364ttt } from '@/hooks/use364ttt';
import { useAuth } from '@/hooks/useAuth';
import { Play, Pause, Search, Heart, HeartOff, ArrowLeft, Music, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VotingPage() {
  const { user } = useAuth();
  const { allSongs, songsLoading, remainingVotes, hasVotedFor, vote, unvote, isVoting } = use364ttt();
  const [searchQuery, setSearchQuery] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const filteredSongs = allSongs.filter(song => 
    song.track_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (song.artist_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleVoteToggle = (songId: string) => {
    if (hasVotedFor(songId)) {
      unvote(songId);
    } else {
      vote(songId);
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center px-4">
          <Card className="max-w-md w-full">
            <CardContent className="py-12 text-center">
              <Music className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold mb-2">Sign in to Vote</h2>
              <p className="text-muted-foreground mb-6">
                You need to be logged in to vote for your favorite Torah songs.
              </p>
              <Link to="/auth">
                <Button>Sign In</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <Link to="/364ttt" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </Link>
              <Badge variant={remainingVotes > 0 ? "default" : "secondary"} className="text-base px-4 py-1">
                <Heart className={`w-4 h-4 mr-2 ${remainingVotes > 0 ? 'text-primary-foreground' : ''}`} />
                {remainingVotes}/10 votes remaining
              </Badge>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search songs or artists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Song Grid */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold mb-6">Vote for Your Favorites</h1>

          {songsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="h-24" />
                </Card>
              ))}
            </div>
          ) : filteredSongs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Music className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No songs match your search' : 'No songs available for voting'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredSongs.map((song) => {
                  const isVoted = hasVotedFor(song.id);
                  return (
                    <motion.div
                      key={song.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <Card className={`transition-all ${isVoted ? 'border-primary bg-primary/5 shadow-md' : 'hover:border-primary/30'}`}>
                        <CardContent className="py-4 px-4 flex items-center gap-4">
                          {/* Play Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={() => handlePlay(song.id, song.file_url)}
                          >
                            {playingId === song.id ? (
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

                          {/* Vote Button */}
                          <motion.div whileTap={{ scale: 0.9 }}>
                            <Button
                              variant={isVoted ? "default" : "outline"}
                              size="icon"
                              onClick={() => handleVoteToggle(song.id)}
                              disabled={isVoting || (!isVoted && remainingVotes === 0)}
                              className={`shrink-0 transition-all ${isVoted ? 'bg-primary hover:bg-primary/90' : ''}`}
                            >
                              {isVoted ? (
                                <Check className="w-5 h-5" />
                              ) : (
                                <Heart className="w-5 h-5" />
                              )}
                            </Button>
                          </motion.div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="hidden" />
      </div>
    </Layout>
  );
}
