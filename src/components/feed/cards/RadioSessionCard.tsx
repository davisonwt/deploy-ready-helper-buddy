import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Radio, Users, RotateCcw, Headphones } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';

interface RadioSessionData {
  id: string;
  showSubject: string;
  showNotes: string | null;
  status: string;
  broadcastMode: string;
  djName: string;
  djAvatar: string | null;
  listenerCount: number;
}

/** Animated audio sync bar — continuously animating equalizer */
const SyncBar: React.FC = () => {
  const bars = Array.from({ length: 28 });
  return (
    <div className="flex items-end gap-[2px] h-8 w-full justify-center">
      {bars.map((_, i) => {
        const baseHeight = 3 + Math.random() * 4;
        const peakHeight = 10 + Math.random() * 20;
        const midHeight = 5 + Math.random() * 8;
        return (
          <motion.div
            key={i}
            className="w-[2.5px] rounded-full"
            style={{
              background: `linear-gradient(180deg, hsl(0 84% 60%) 0%, hsl(20 95% 53%) 40%, hsl(45 93% 47%) 100%)`,
            }}
            animate={{
              height: [
                `${baseHeight}px`,
                `${peakHeight}px`,
                `${midHeight}px`,
                `${peakHeight * 0.7}px`,
                `${baseHeight}px`,
              ],
            }}
            transition={{
              duration: 1.0 + Math.random() * 0.6,
              repeat: Infinity,
              delay: i * 0.03,
              ease: 'easeInOut',
            }}
          />
        );
      })}
    </div>
  );
};

export const RadioSessionCard: React.FC<{ data: RadioSessionData }> = ({ data }) => {
  const isLive = data.status === 'live';
  const isPreRecorded = data.broadcastMode === 'pre_recorded';
  const navigate = useNavigate();

  const handleListenFromStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/grove-station?schedule=${data.id}&fromStart=true`);
  };

  return (
    <Link to={`/grove-station?schedule=${data.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl overflow-hidden shadow-md group border border-border/30"
      >
        {/* ── Image zone with dark radio gradient ── */}
        <div className="relative w-full" style={{ height: 200 }}>
          <div className="absolute inset-0">
            <img
              src="/images/radio/radio-studio.jpg"
              alt="Radio studio background"
              className="w-full h-full object-cover"
              loading="lazy"
              width={960}
              height={512}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-background/70 via-background/55 to-background/70" />
          </div>
          <div className="relative w-full h-full flex flex-col items-center justify-center gap-3">
            <Radio className="w-10 h-10 text-destructive/60" />
            <SyncBar />
          </div>

          {/* Top-left: LIVE / ON AIR badge */}
          <div className="absolute top-3 left-3 z-10">
            <span className="relative flex items-center gap-1 px-2.5 py-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold uppercase tracking-wider shadow-lg">
              <span className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-20" />
              <span className="relative w-1.5 h-1.5 rounded-full bg-destructive-foreground animate-pulse" />
              <span className="relative">{isLive ? 'LIVE' : 'ON AIR'}</span>
            </span>
          </div>

          {/* Top-right: listener count */}
          {data.listenerCount > 0 && (
            <div className="absolute top-3 right-3 z-10 bg-black/60 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm flex items-center gap-1">
              <Users className="w-3 h-3" /> {data.listenerCount}
            </div>
          )}

          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

          {/* Sower row at bottom of image */}
          <div className="absolute bottom-0 left-0 right-0 z-10 px-3 pb-3">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="relative">
                <Avatar className="w-9 h-9 border-2 border-destructive/50 shadow">
                  <AvatarImage src={data.djAvatar || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-red-500 to-orange-500 text-white text-xs">
                    {data.djName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {isLive && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-destructive border-2 border-background animate-pulse" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate">{data.djName}</p>
                <div className="flex items-center gap-1 text-[10px] text-white/50">
                  <Radio className="w-3 h-3" />
                  <span>Radio 364YHVH fm</span>
                </div>
              </div>
            </div>
            <p className="text-white font-semibold text-[16px] leading-tight line-clamp-2 drop-shadow">
              {data.showSubject || data.showNotes || 'Radio Session'}
            </p>
          </div>
        </div>

        {/* ── Actions row ── */}
        <div className="px-3 py-2.5 bg-card flex items-center gap-3">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Headphones className="w-[18px] h-[18px]" />
            <span className="text-xs font-medium">Tune In</span>
          </div>
          {data.listenerCount > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="w-[18px] h-[18px]" />
              <span className="text-xs font-medium">{data.listenerCount}</span>
            </div>
          )}
        </div>

        {/* ── Hairline divider ── */}
        <div className="h-px bg-border/50" />

        {/* ── Bottom bar ── */}
        <button
          onClick={isPreRecorded ? handleListenFromStart : undefined}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 transition-colors text-white font-bold text-sm rounded-b-2xl"
        >
          {isPreRecorded ? (
            <>
              <RotateCcw className="w-4 h-4" />
              Listen from Start
            </>
          ) : (
            <>
              <Radio className="w-4 h-4" />
              Listen Live
            </>
          )}
        </button>
      </motion.div>
    </Link>
  );
};
