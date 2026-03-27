import React, { useState } from 'react';
import { Sprout } from 'lucide-react';
import { useSeedStory } from '@/hooks/useSeedStory';

interface SowerStoryStripProps {
  seedId: string;
  sowerName: string;
  seedTitle: string;
  daysSincePlanted: number;
  bestowalsCount: number;
  engagements: number;
  seedCategory: string;
}

export const SowerStoryStrip: React.FC<SowerStoryStripProps> = (props) => {
  const { story, loading } = useSeedStory(props);
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div
        className="mx-3 my-1 rounded-r-lg"
        style={{
          borderLeft: '2px solid #1D9E75',
          padding: '10px 12px',
          background: 'hsl(210 50% 14% / 0.7)',
        }}
      >
        <div className="flex items-center gap-1 mb-1.5">
          <Sprout className="w-3 h-3 text-emerald-400" />
          <span className="font-semibold uppercase tracking-wider text-emerald-400" style={{ fontSize: '10px' }}>
            Sower's story
          </span>
        </div>
        <div className="space-y-1.5 animate-pulse">
          <div className="h-3 rounded w-full" style={{ background: 'hsl(210 30% 25%)' }} />
          <div className="h-3 rounded w-4/5" style={{ background: 'hsl(210 30% 25%)' }} />
        </div>
      </div>
    );
  }

  if (!story) return null;

  const isLong = story.length > 200;
  const displayText = !expanded && isLong ? story.slice(0, 200).trimEnd() + '…' : story;

  return (
    <div
      className="mx-3 my-1 rounded-r-lg"
      style={{
        borderLeft: '2px solid #1D9E75',
        padding: '10px 12px',
        background: 'hsl(210 50% 14% / 0.7)',
      }}
    >
      <div className="flex items-center gap-1 mb-1">
        <Sprout className="w-3 h-3 text-emerald-400" />
        <span className="font-semibold uppercase tracking-wider text-emerald-400" style={{ fontSize: '10px' }}>
          Sower's story
        </span>
      </div>
      <p className="text-white/75 leading-[1.6]" style={{ fontSize: '13px' }}>
        {displayText}
        {isLong && !expanded && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(true); }}
            className="inline ml-1 font-semibold text-emerald-400 hover:text-emerald-300 hover:underline"
            style={{ fontSize: '12px', background: 'none', border: 'none', padding: 0 }}
          >
            read more
          </button>
        )}
      </p>
    </div>
  );
};
