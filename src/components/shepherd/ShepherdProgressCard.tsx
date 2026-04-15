import { useState, useEffect } from 'react';
import { Leaf, Sparkles } from 'lucide-react';
import { useOrchardShepherd } from '@/hooks/useOrchardShepherd';

interface ShepherdProgressCardProps {
  orchardTitle: string;
  percentFilled: number;
  daysPlanted: number;
  bestowerCount: number;
  isHarvested?: boolean;
}

export function ShepherdProgressCard({
  orchardTitle,
  percentFilled,
  daysPlanted,
  bestowerCount,
  isHarvested = false,
}: ShepherdProgressCardProps) {
  const { generateText, isLoading } = useOrchardShepherd();
  const [narrative, setNarrative] = useState('');

  useEffect(() => {
    const context = isHarvested ? 'harvest-story' : 'progress-update';
    generateText(context, {
      title: orchardTitle,
      percentFilled,
      daysPlanted,
      bestowerCount,
    }).then((text) => {
      if (text) setNarrative(text);
    });
  }, [orchardTitle, percentFilled, isHarvested]);

  if (!narrative && !isLoading) return null;

  return (
    <div className="rounded-xl border-l-4 border-emerald-400 bg-gradient-to-r from-emerald-50/50 to-transparent p-4 space-y-2">
      <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
        <Sparkles className="h-3 w-3" />
        <span>From the Orchard Shepherd</span>
        <Leaf className="h-3 w-3 ml-auto opacity-40" />
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>The Shepherd is tending to this orchard…</span>
        </div>
      ) : (
        <p className="text-sm text-foreground/80 leading-relaxed italic">
          🌿 {narrative}
        </p>
      )}
    </div>
  );
}
