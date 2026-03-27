import React from 'react';
import { Calendar, Sprout, Users, Radio, Leaf } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RightContextPanelProps {
  calendarData?: {
    year: number;
    month: number;
    dayOfMonth: number;
    weekday: number;
    season: string;
    dayOfYear: number;
  } | null;
  communityCount?: number;
  radioLive?: boolean;
  radioListeners?: number;
}

export const RightContextPanel: React.FC<RightContextPanelProps> = ({
  calendarData,
  communityCount = 0,
  radioLive = false,
  radioListeners = 0,
}) => {
  // Fetch total tribe members (all profiles)
  const { data: totalMembers } = useQuery({
    queryKey: ['total-tribe-members'],
    queryFn: async () => {
      const { count } = await supabase
        .from('profiles')
        .select('user_id', { count: 'exact', head: true });
      return count || 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch active sowers (users who have sowed — created active orchards)
  const { data: activeSowers } = useQuery({
    queryKey: ['active-sowers-count'],
    queryFn: async () => {
      const { data } = await supabase
        .from('orchards')
        .select('user_id')
        .eq('status', 'active');
      // Count distinct user_ids
      const uniqueUsers = new Set((data || []).map((r: any) => r.user_id));
      return uniqueUsers.size;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch active orchards count
  const { data: activeOrchards } = useQuery({
    queryKey: ['active-orchards-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('orchards')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      return count || 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch active seeds (products) count
  const { data: activeSeeds } = useQuery({
    queryKey: ['active-seeds-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  const weekDayNames = ['', 'Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Sabbath'];

  return (
    <div className="flex flex-col gap-4 p-3 text-sm">
      {/* Sacred Calendar */}
      <div className="rounded-xl bg-card/80 border border-border/20 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            Today
          </span>
        </div>
        {calendarData ? (
          <div className="space-y-1">
            <p className="text-[13px] font-bold text-foreground">
              Year {calendarData.year}
            </p>
            <p className="text-xs text-muted-foreground">
              Month {calendarData.month} • Day {calendarData.dayOfMonth}
            </p>
            <p className="text-xs text-muted-foreground">
              {weekDayNames[calendarData.weekday] || `Day ${calendarData.weekday}`}
            </p>
            {calendarData.season && (
              <p className="text-[11px] text-primary/80 font-medium mt-1">
                {calendarData.season}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Loading calendar…</p>
        )}
      </div>

      {/* Garden Tip */}
      <div className="rounded-xl bg-card/80 border border-border/20 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Sprout className="w-4 h-4 text-s2g-green" />
          <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            Garden Tip
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          🌿 Check your soil moisture before the next rain. Faith, like a garden, grows through patient tending.
        </p>
      </div>

      {/* Tribes Stats */}
      <div className="rounded-xl bg-card/80 border border-border/20 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-s2g-blue" />
          <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            Tribes
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Total Tribe Members</span>
            <span className="font-semibold text-foreground">{totalMembers || 0}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Active Sowers</span>
            <span className="font-semibold text-foreground">{activeSowers || 0}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Active Orchards</span>
            <span className="font-semibold text-foreground">{activeOrchards || 0}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Leaf className="w-3 h-3 text-primary" />
              Active Seeds
            </span>
            <span className="font-semibold text-foreground">{activeSeeds || 0}</span>
          </div>
          {radioLive && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Radio className="w-3 h-3 text-red-400" />
                Listeners
              </span>
              <span className="font-semibold text-red-400">{radioListeners}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
