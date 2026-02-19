import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Music, Sprout, ExternalLink, Heart } from 'lucide-react';
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

  // Reset logged state when track changes
  React.useEffect(() => {
    setLogged(false);
  }, [seedId, trackId]);

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
    if (seedId) navigate(`/products/${seedId}?action=bestow`);
    else toast({ title: '🌱 Bestow', description: 'This track is not yet listed as a community seed.' });
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
              <div className="flex items-center gap-1.5 shrink-0">
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
                  <Heart className="h-3 w-3" />
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
