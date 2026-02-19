import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Flame } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const ListenerStreakBadge: React.FC = () => {
  const { user } = useAuth();
  const [streak, setStreak] = useState<{ current_streak: number; longest_streak: number; total_listen_days: number } | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      const { data } = await supabase
        .from('radio_listener_streaks')
        .select('current_streak, longest_streak, total_listen_days')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) setStreak(data);
    };

    fetch();
  }, [user]);

  if (!streak || streak.current_streak < 2) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1 border-orange-400 text-orange-500">
            <Flame className="h-3 w-3" />
            {streak.current_streak} day streak
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            🔥 {streak.current_streak} day listening streak!<br />
            Best: {streak.longest_streak} days • Total: {streak.total_listen_days} days
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
