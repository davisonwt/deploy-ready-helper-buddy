import React from 'react';
import { Camera } from 'lucide-react';
import MemryPage from '@/pages/MemryPage';

/**
 * Embeds the full S2G Memry feed (TikTok-style) inline within the HomeFeed.
 * Renders the complete MemryPage in a constrained container so users
 * get the real experience — music previews, side actions, bestow buttons,
 * horizontal scroll, and vertical creator browsing — without navigating away.
 */
export const InlineMemryFeed: React.FC = () => {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2.5">
        <Camera className="w-4 h-4 text-orange-500" />
        <h2 className="text-sm font-bold text-foreground">S2G Memry</h2>
      </div>

      {/* Full Memry feed embedded in a fixed-height scroll container */}
      <div className="rounded-2xl overflow-hidden border border-border/20 bg-black" style={{ height: '70vh', minHeight: '420px', maxHeight: '680px' }}>
        <div className="h-full overflow-hidden relative">
          <MemryPage embedded />
        </div>
      </div>
    </section>
  );
};
