import React from 'react';
import { Link } from 'react-router-dom';
import { CloudRain, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface AIStoryData {
  orchardId: string;
  sowerName: string;
  sowerAvatar?: string;
  title: string;
  daysSincePlanted: number;
  bestowalsCount: number;
  totalPockets: number;
  stage: number;
  pocketPrice?: number;
}

function generateStory(data: AIStoryData): string {
  const { sowerName, daysSincePlanted, bestowalsCount, stage, totalPockets } = data;
  const remaining = totalPockets - bestowalsCount;

  if (stage <= 1) {
    return `${sowerName} planted a seed of faith ${daysSincePlanted} days ago. It's just beginning to take root. Be the first to water this orchard and watch it grow.`;
  }
  if (stage <= 3) {
    return `${sowerName}'s orchard has been growing for ${daysSincePlanted} days. ${bestowalsCount} bestowers have watered it so far. ${remaining > 0 ? `${remaining} more rains until the next growth tier.` : 'Almost there!'}`;
  }
  return `${sowerName}'s orchard is flourishing after ${daysSincePlanted} days of faithful growth. ${bestowalsCount} bestowers have come together to water this garden. A beautiful harvest is near.`;
}

export const AIStoryCard: React.FC<{ data: AIStoryData }> = ({ data }) => {
  const story = generateStory(data);

  // Orchard progress dots
  const dots = Array.from({ length: 5 }, (_, i) => i < data.stage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-card border border-border/30 overflow-hidden"
    >
      {/* Green left border for AI narration */}
      <div className="flex">
        <div className="w-1 bg-s2g-green flex-shrink-0" />
        
        <div className="flex-1 p-4">
          {/* AI label */}
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3 h-3 text-s2g-amber" />
            <span className="text-[10px] font-semibold text-s2g-amber uppercase tracking-wider">
              AI Story
            </span>
          </div>

          {/* Sower info */}
          <div className="flex items-center gap-2 mb-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={data.sowerAvatar || undefined} />
              <AvatarFallback className="text-xs bg-s2g-green/20 text-s2g-green">
                {data.sowerName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-foreground">{data.sowerName}</p>
              <p className="text-[11px] text-muted-foreground">{data.title}</p>
            </div>
          </div>

          {/* AI-generated story */}
          <p className="text-[13px] text-foreground/85 leading-relaxed mb-3">
            {story}
          </p>

          {/* Growth dots */}
          <div className="flex items-center gap-1.5 mb-3">
            {dots.map((filled, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-colors ${
                  filled
                    ? 'bg-s2g-green shadow-[0_0_6px_hsl(142,76%,36%,0.4)]'
                    : 'bg-muted/30 border border-border/40'
                }`}
              />
            ))}
            <span className="text-[10px] text-muted-foreground ml-1">
              Stage {data.stage}/5
            </span>
          </div>

          {/* Let It Rain button */}
          <Link to={`/orchards/${data.orchardId}`}>
            <Button
              size="sm"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-8 rounded-lg"
            >
              <CloudRain className="w-3.5 h-3.5 mr-1.5" />
              Let It Rain
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};
