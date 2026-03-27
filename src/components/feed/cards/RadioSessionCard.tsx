import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Radio, Users, RotateCcw } from 'lucide-react';
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
  const bars = Array.from({ length: 32 });
  return (
    <div className="flex items-end gap-[2px] h-10 w-full justify-center">
      {bars.map((_, i) => {
        const baseHeight = 4 + Math.random() * 6;
        const peakHeight = 14 + Math.random() * 26;
        const midHeight = 6 + Math.random() * 12;
        return (
          <motion.div
            key={i}
            className="w-[3px] rounded-full"
            style={{
              background: `linear-gradient(180deg, hsl(0 84% 60%) 0%, hsl(25 95% 53%) 50%, hsl(45 93% 47%) 100%)`,
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
        className="rounded-xl border border-border/30 overflow-hidden hover:border-destructive/40 transition-all group"
        style={{ backgroundColor: 'hsl(210 67% 12% / 0.85)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative">
              <Avatar className="w-8 h-8 border-2 border-destructive/30">
                <AvatarImage src={data.djAvatar || undefined} />
                <AvatarFallback className="bg-destructive/20 text-foreground text-[10px]">
                  {data.djName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {isLive && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-destructive border-2 border-background animate-pulse" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{data.djName}</p>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Radio className="w-3 h-3" />
                <span>Radio 364YHVH fm</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="relative flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold uppercase tracking-wider">
              <span className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-30" />
              <span className="relative w-1.5 h-1.5 rounded-full bg-destructive-foreground animate-pulse" />
              <span className="relative">{isLive ? 'LIVE' : 'ON AIR'}</span>
            </span>
            {data.listenerCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Users className="w-3 h-3" /> {data.listenerCount}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="px-3 pt-2 pb-1">
          <h3 className="text-sm font-bold text-foreground truncate group-hover:text-destructive transition-colors">
            {data.showSubject || data.showNotes || 'Radio Session'}
          </h3>
        </div>

        {/* Animated Sync Bar */}
        <div className="px-3 pb-3 space-y-2">
          <div className="rounded-lg p-2" style={{ backgroundColor: 'hsl(210 67% 8% / 0.6)' }}>
            <SyncBar />
          </div>
          {isPreRecorded && (
            <button
              onClick={handleListenFromStart}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-destructive-foreground bg-destructive/80 hover:bg-destructive transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Listen from Start
            </button>
          )}
        </div>
      </motion.div>
    </Link>
  );
};
