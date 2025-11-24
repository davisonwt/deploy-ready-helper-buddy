import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface Circle {
  id: string;
  name: string;
  emoji: string;
  color: string;
  unreadCount?: number;
  isLive?: boolean;
  memberCount?: number;
}

interface CirclesBubbleRailProps {
  circles: Circle[];
  activeCircleId?: string;
  onCircleSelect: (circleId: string) => void;
  onCircleReorder?: (circles: Circle[]) => void;
  onCircleHide?: (circleId: string) => void;
}

const DEFAULT_CIRCLES: Circle[] = [
  { id: 'sowers', name: 'S2G-Sowers', emoji: '🔴', color: 'bg-red-500', unreadCount: 0 },
  { id: 'whisperers', name: 'S2G-Whisperers', emoji: '🟡', color: 'bg-yellow-500', unreadCount: 0 },
  { id: 'family-364', name: '364yhvh-Family', emoji: '🟢', color: 'bg-green-500', unreadCount: 0 },
  { id: 'family', name: 'Family', emoji: '🔵', color: 'bg-blue-500', unreadCount: 0 },
  { id: 'friends', name: 'Friends', emoji: '🟣', color: 'bg-purple-500', unreadCount: 0 },
];

export function CirclesBubbleRail({
  circles = DEFAULT_CIRCLES,
  activeCircleId,
  onCircleSelect,
  onCircleReorder,
  onCircleHide,
}: CirclesBubbleRailProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [reorderedCircles, setReorderedCircles] = useState(circles);

  useEffect(() => {
    setReorderedCircles(circles);
  }, [circles]);

  const handleLongPress = (index: number) => {
    setIsDragging(true);
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    if (dragIndex !== null && onCircleReorder) {
      onCircleReorder(reorderedCircles);
    }
    setIsDragging(false);
    setDragIndex(null);
  };

  const handleHide = (circleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onCircleHide?.(circleId);
  };

  return (
    <div className="relative w-full">
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <AnimatePresence mode="popLayout">
          {reorderedCircles.map((circle, index) => {
            const isActive = activeCircleId === circle.id;
            const hasUnread = (circle.unreadCount ?? 0) > 0;
            const isPulsing = circle.isLive;

            return (
              <motion.div
                key={circle.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onLongPress={() => handleLongPress(index)}
                onTouchEnd={handleDragEnd}
                className="relative flex-shrink-0"
              >
                <Button
                  onClick={() => onCircleSelect(circle.id)}
                  className={`
                    relative h-14 px-4 rounded-full
                    ${isActive ? circle.color : 'bg-muted'}
                    ${isActive ? 'text-white' : 'text-foreground'}
                    transition-all duration-200
                    hover:shadow-lg
                  `}
                  variant={isActive ? 'default' : 'outline'}
                >
                  {/* Emoji */}
                  <span className="text-xl mr-2">{circle.emoji}</span>
                  
                  {/* Circle Name */}
                  <span className="font-medium text-sm">{circle.name}</span>

                  {/* Unread Badge */}
                  {hasUnread && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1"
                    >
                      <Badge
                        className={`${circle.color} text-white text-xs h-5 w-5 p-0 flex items-center justify-center`}
                      >
                        {circle.unreadCount}
                      </Badge>
                    </motion.div>
                  )}

                  {/* Live Pulsing Dot */}
                  {isPulsing && (
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [1, 0.7, 1],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white"
                    />
                  )}

                  {/* Member Count */}
                  {circle.memberCount !== undefined && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {circle.memberCount}
                    </Badge>
                  )}
                </Button>

                {/* Long-press menu */}
                {isDragging && dragIndex === index && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full bg-background border"
                      >
                        <GripVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleHide(circle.id, {} as React.MouseEvent)}>
                        <X className="h-4 w-4 mr-2" />
                        Hide Circle
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Scroll hint gradient */}
      <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  );
}

