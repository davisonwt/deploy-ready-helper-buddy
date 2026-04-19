import React from 'react';
import { useTribalScore, TIER_META, BADGE_META, type TribalTier } from '@/hooks/useTribalScore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TribalScoreBadgeProps {
  userId?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showBadges?: boolean;
}

const SIZE_CLASSES = {
  xs: { wrap: 'text-[10px] px-1.5 py-0.5 gap-1', emoji: 'text-xs',  score: 'text-[10px]' },
  sm: { wrap: 'text-xs px-2 py-1 gap-1.5',       emoji: 'text-sm',  score: 'text-xs' },
  md: { wrap: 'text-sm px-3 py-1.5 gap-2',       emoji: 'text-base',score: 'text-sm font-bold' },
  lg: { wrap: 'text-base px-4 py-2 gap-2',       emoji: 'text-xl',  score: 'text-lg font-bold' },
};

export const TribalScoreBadge: React.FC<TribalScoreBadgeProps> = ({
  userId, size = 'sm', showLabel = true, showBadges = false,
}) => {
  const { score, loading } = useTribalScore(userId);
  const sz = SIZE_CLASSES[size];

  if (loading) {
    return <div className={`inline-flex rounded-full bg-muted/50 animate-pulse ${sz.wrap}`} style={{ minWidth: 60 }} />;
  }
  if (!score) return null;

  const tier = (score.tier as TribalTier) ?? 'seedling';
  const meta = TIER_META[tier];

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`inline-flex items-center rounded-full bg-gradient-to-r ${meta.gradient} text-white shadow-sm ring-1 ring-white/20 ${sz.wrap}`}
          >
            <span className={sz.emoji}>{meta.emoji}</span>
            {showLabel && <span className="font-semibold">{meta.label}</span>}
            <span className={sz.score}>{score.score}</span>
            {showBadges && score.badges.length > 0 && (
              <span className="flex gap-0.5 ml-1">
                {score.badges.slice(0, 3).map(b => (
                  <span key={b} title={BADGE_META[b]?.label ?? b} className={sz.emoji}>
                    {BADGE_META[b]?.emoji ?? '✨'}
                  </span>
                ))}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1.5 text-xs">
            <p className="font-bold text-sm">{meta.emoji} {meta.label} · {score.score} points</p>
            <p className="text-muted-foreground">Ubuntu reputation in the Sow2Grow tribe</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
              <span>🎁 Given: <b>{score.bestowals_given_count}</b></span>
              <span>🌱 Orchards: <b>{score.orchards_count}</b></span>
              <span>🤝 Tribe: <b>{score.tribe_size}</b></span>
              <span>💬 Helpful: <b>{score.helpful_votes}</b></span>
            </div>
            {score.badges.length > 0 && (
              <div className="pt-1 border-t mt-1">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Badges</p>
                <div className="flex flex-wrap gap-1">
                  {score.badges.map(b => (
                    <span key={b} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
                      {BADGE_META[b]?.emoji} {BADGE_META[b]?.label ?? b}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
