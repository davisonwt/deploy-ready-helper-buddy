import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Music, Sprout, ExternalLink, Heart, ThumbsUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface NowPlayingSeedCardProps {
  seedId?: string;
  trackId?: string;
  trackTitle: string;
  artistName?: string;
  coverUrl?: string;
  durationSeconds?: number;
  sowerId?: string;
  sowerName?: string;
  sessionId?: string;
  scheduleId?: string;
  djId?: string;
}

export const NowPlayingSeedCard: React.FC<NowPlayingSeedCardProps> = ({
  seedId,
  trackId,
  trackTitle,
  artistName,
  coverUrl,
  durationSeconds,
  sowerId,
  sowerName,
  sessionId,
  scheduleId,
  djId,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [logged, setLogged] = React.useState(false);
  const [hasVoted, setHasVoted] = React.useState(false);
  const [voteCount, setVoteCount] = React.useState(0);
  const [votingInProgress, setVotingInProgress] = React.useState(false);
  const [showHeartBurst, setShowHeartBurst] = React.useState(false);

  // Get current week ID
  const getWeekId = () => {
    const now = new Date();
    const weekNum = Math.ceil((now.getDate() + new Date(now.getFullYear(), now.getMonth(), 1).getDay()) / 7);
    return `${now.getFullYear()}-W${weekNum}`;
  };

  // Check if user already voted for this track & get vote count
  React.useEffect(() => {
    const songId = trackId || seedId;
    if (!songId) return;

    const weekId = getWeekId();

    // Fetch vote count for this track this week
    supabase
      .from('song_votes')
      .select('id', { count: 'exact', head: true })
      .eq('song_id', songId)
      .eq('week_id', weekId)
      .then(({ count }) => setVoteCount(count || 0));

    // Check if current user voted
    if (user) {
      supabase
        .from('song_votes')
        .select('id')
        .eq('song_id', songId)
        .eq('user_id', user.id)
        .eq('week_id', weekId)
        .maybeSingle()
        .then(({ data }) => setHasVoted(!!data));
    }
  }, [trackId, seedId, user]);

  // Reset states when track changes
  React.useEffect(() => {
    setLogged(false);
    setHasVoted(false);
    setVoteCount(0);
  }, [seedId, trackId]);

  // Log play once per track
  React.useEffect(() => {
    if (logged || !user || (!seedId && !trackId)) return;
    setLogged(true);

    supabase
      .from('radio_seed_plays')
      .insert({
        session_id: sessionId || null,
        schedule_id: scheduleId || null,
        seed_id: seedId || null,
        track_id: trackId || null,
        sower_id: sowerId || null,
        dj_id: djId || null,
        duration_seconds: durationSeconds || null,
        source: 'playlist',
      })
      .then(({ error }) => {
        if (error) console.warn('Failed to log seed play:', error);
      });
  }, [seedId, trackId, logged]);

  const formatDuration = (s?: number) => {
    if (!s) return '';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const viewSeed = () => {
    if (seedId) navigate(`/products/${seedId}`);
  };

  const bestowSeed = () => {
    if (seedId) {
      navigate(`/products/${seedId}?action=bestow`);
    } else if (trackId && djId) {
      navigate(`/sower/${djId}?bestow=true&trackId=${trackId}&trackTitle=${encodeURIComponent(trackTitle)}`);
    } else {
      toast({ title: '🌱 Bestow', description: 'Bestow support to this artist through the radio station.' });
    }
  };

  const handleVote = async () => {
    if (!user) {
      toast({ title: 'Login Required', description: 'Please login to vote for songs.' });
      return;
    }

    const songId = trackId || seedId;
    if (!songId) {
      toast({ title: 'Cannot Vote', description: 'This track is not eligible for voting.' });
      return;
    }

    setVotingInProgress(true);
    const weekId = getWeekId();

    try {
      if (hasVoted) {
        // Remove vote
        const { error } = await supabase
          .from('song_votes')
          .delete()
          .eq('song_id', songId)
          .eq('user_id', user.id)
          .eq('week_id', weekId);

        if (error) throw error;
        setHasVoted(false);
        setVoteCount(prev => Math.max(0, prev - 1));
        toast({ title: '💔 Vote Removed', description: `Removed vote for "${trackTitle}"` });
      } else {
        // Add vote
        const { error } = await supabase
          .from('song_votes')
          .insert({ song_id: songId, user_id: user.id, week_id: weekId });

        if (error) {
          if (error.code === '23505') {
            toast({ title: 'Already Voted', description: 'You can only vote once per song per week.' });
            setHasVoted(true);
            return;
          }
          throw error;
        }
        setHasVoted(true);
        setVoteCount(prev => prev + 1);
        setShowHeartBurst(true);
        setTimeout(() => setShowHeartBurst(false), 800);
        toast({ title: '❤️ Voted!', description: `"${trackTitle}" — counts toward the 364 TTT list!` });
      }
    } catch (error: any) {
      console.error('Vote error:', error);
      toast({ title: 'Error', description: 'Failed to register vote. Please try again.' });
    } finally {
      setVotingInProgress(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={trackId || seedId || trackTitle}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-background overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              {/* Cover art / placeholder */}
              <div className="relative h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                {coverUrl ? (
                  <img src={coverUrl} alt={trackTitle} className="h-full w-full object-cover" />
                ) : (
                  <Music className="h-6 w-6 text-primary" />
                )}
                <div className="absolute inset-0 bg-black/10 animate-pulse rounded-lg" />
              </div>

              {/* Track info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/30 text-primary">
                    🔴 NOW PLAYING
                  </Badge>
                </div>
                <p className="text-sm font-semibold truncate">{trackTitle}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {(artistName || sowerName) && (
                    <span className="truncate flex items-center gap-1">
                      <Sprout className="h-3 w-3 text-primary" />
                      {sowerName || artistName}
                    </span>
                  )}
                  {durationSeconds && (
                    <span className="shrink-0">• {formatDuration(durationSeconds)}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Love / Vote Button */}
                <div className="relative">
                  <Button
                    variant={hasVoted ? "default" : "ghost"}
                    size="sm"
                    className={`h-8 text-xs gap-1 px-2 transition-all ${
                      hasVoted 
                        ? 'bg-rose-500 hover:bg-rose-600 text-white' 
                        : 'hover:text-rose-500 hover:bg-rose-500/10'
                    }`}
                    onClick={handleVote}
                    disabled={votingInProgress}
                    title={hasVoted ? 'Remove vote' : 'Vote for 364 TTT'}
                  >
                    <Heart className={`h-3.5 w-3.5 ${hasVoted ? 'fill-current' : ''}`} />
                    {voteCount > 0 && <span>{voteCount}</span>}
                  </Button>

                  {/* Heart burst animation */}
                  <AnimatePresence>
                    {showHeartBurst && (
                      <>
                        {[...Array(5)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 1, scale: 0.5, x: 0, y: 0 }}
                            animate={{
                              opacity: 0,
                              scale: 1.2,
                              x: (Math.random() - 0.5) * 40,
                              y: -20 - Math.random() * 30,
                            }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.6, delay: i * 0.05 }}
                            className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none text-rose-500"
                          >
                            ❤️
                          </motion.div>
                        ))}
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {seedId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={viewSeed}
                    title="View seed"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 text-xs gap-1 px-2.5"
                  onClick={bestowSeed}
                >
                  <Sprout className="h-3 w-3" />
                  Bestow
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
