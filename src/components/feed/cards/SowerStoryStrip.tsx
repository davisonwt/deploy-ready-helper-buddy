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

  // Show a subtle loading state while fetching
  if (loading) {
    return (
      <div
        className="mx-3 my-1"
        style={{
          borderLeft: '2px solid #1D9E75',
          padding: '12px',
          background: 'hsl(var(--card) / 0.6)',
          borderRadius: '0 8px 8px 0',
        }}
      >
        <div className="flex items-center gap-1 mb-1.5">
          <Sprout className="w-3 h-3" style={{ color: '#1D9E75' }} />
          <span className="font-semibold uppercase tracking-wider" style={{ color: '#1D9E75', fontSize: '10px' }}>
            Sower's story
          </span>
        </div>
        <div className="space-y-1.5 animate-pulse">
          <div className="h-3 bg-muted/30 rounded w-full" />
          <div className="h-3 bg-muted/30 rounded w-4/5" />
        </div>
      </div>
    );
  }

  // If no story or empty, render nothing
  if (!story) return null;

  const isLong = story.length > 200;
  const displayText = !expanded && isLong ? story.slice(0, 200).trimEnd() + '…' : story;

  return (
    <div
      className="mx-3 my-1"
      style={{
        borderLeft: '2px solid #1D9E75',
        padding: '12px',
        background: 'hsl(var(--card) / 0.6)',
        borderRadius: '0 8px 8px 0',
      }}
    >
      <div className="flex items-center gap-1 mb-1.5">
        <Sprout className="w-3 h-3" style={{ color: '#1D9E75' }} />
        <span className="font-semibold uppercase tracking-wider" style={{ color: '#1D9E75', fontSize: '10px' }}>
          Sower's story
        </span>
      </div>
      <p className="text-muted-foreground leading-[1.6]" style={{ fontSize: '13px' }}>
        {displayText}
        {isLong && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="ml-1 font-semibold hover:underline"
            style={{ color: '#1D9E75', fontSize: '13px' }}
          >
            read more
          </button>
        )}
      </p>
    </div>
  );
};
