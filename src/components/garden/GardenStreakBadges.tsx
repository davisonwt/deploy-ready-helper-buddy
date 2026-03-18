import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Award, Sprout, Star, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';

interface GardenStreakBadgesProps {
  compact?: boolean;
}

const INSPIRED_BY = [
  { name: 'Seedtime', emoji: '🌱', desc: 'Biblical planting calendar' },
  { name: 'Gardenize', emoji: '📱', desc: 'Digital garden journal' },
  { name: 'Margaret Roberts', emoji: '🌿', desc: 'Companion planting pioneer' },
  { name: 'Diary of an Organic Grower', emoji: '📓', desc: 'Organic growing wisdom' },
];

export function GardenStreakBadges({ compact = false }: GardenStreakBadgesProps) {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [totalActivities, setTotalActivities] = useState(0);
  const [totalNotes, setTotalNotes] = useState(0);

  useEffect(() => {
    if (user) loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    try {
      // Get all activity dates
      const { data: activities } = await supabase
        .from('garden_activities')
        .select('gregorian_date, activity_type')
        .eq('user_id', user.id)
        .order('gregorian_date', { ascending: false });

      if (!activities || activities.length === 0) return;

      setTotalActivities(activities.filter(a => a.activity_type !== 'note').length);
      setTotalNotes(activities.filter(a => a.activity_type === 'note').length);

      // Calculate streak — consecutive days with activity
      const uniqueDates = [...new Set(activities.map(a => a.gregorian_date))].sort().reverse();
      let currentStreak = 0;
      const today = new Date().toISOString().split('T')[0];
      
      for (let i = 0; i < uniqueDates.length; i++) {
        const expected = new Date();
        expected.setDate(expected.getDate() - i);
        const expectedStr = expected.toISOString().split('T')[0];
        
        if (uniqueDates[i] === expectedStr) {
          currentStreak++;
        } else if (i === 0 && uniqueDates[0] !== today) {
          // Allow 1 day grace (yesterday still counts as starting point)
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          if (uniqueDates[0] === yesterday.toISOString().split('T')[0]) {
            currentStreak = 1;
          } else {
            break;
          }
        } else {
          break;
        }
      }
      setStreak(currentStreak);
    } catch (err) {
      console.error('Error loading garden stats:', err);
    }
  };

  const badges = useMemo(() => {
    const earned: { name: string; emoji: string; desc: string }[] = [];
    if (streak >= 3) earned.push({ name: 'Seedling', emoji: '🌱', desc: '3-day streak' });
    if (streak >= 7) earned.push({ name: 'Sapling', emoji: '🌿', desc: '7-day streak' });
    if (streak >= 14) earned.push({ name: 'Grower', emoji: '🌳', desc: '14-day streak' });
    if (streak >= 30) earned.push({ name: 'Master Gardener', emoji: '👨‍🌾', desc: '30-day streak' });
    if (totalNotes >= 5) earned.push({ name: 'Garden Scribe', emoji: '📝', desc: '5+ notes' });
    if (totalNotes >= 20) earned.push({ name: 'Wisdom Keeper', emoji: '📚', desc: '20+ notes' });
    if (totalActivities >= 10) earned.push({ name: 'Active Hands', emoji: '🤲', desc: '10+ activities' });
    if (totalActivities >= 50) earned.push({ name: 'Green Thumb', emoji: '💚', desc: '50+ activities' });
    return earned;
  }, [streak, totalNotes, totalActivities]);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {streak > 0 && (
          <div className="flex items-center gap-1 text-xs text-orange-400">
            <Flame className="w-3 h-3" />
            <span>{streak}d</span>
          </div>
        )}
        {badges.slice(0, 2).map(b => (
          <span key={b.name} title={`${b.name} — ${b.desc}`} className="text-sm">{b.emoji}</span>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Streak counter */}
      <div className="flex items-center gap-3 bg-emerald-900/20 rounded-lg p-3 border border-emerald-800/30">
        <div className="flex items-center gap-1.5">
          <Flame className={`w-5 h-5 ${streak > 0 ? 'text-orange-400' : 'text-emerald-700'}`} />
          <span className="text-lg font-bold text-emerald-300">{streak}</span>
        </div>
        <div>
          <p className="text-xs font-medium text-emerald-300">Day Streak</p>
          <p className="text-[10px] text-emerald-600">
            {streak === 0 ? 'Log garden activity to start!' : `${totalActivities} activities · ${totalNotes} notes`}
          </p>
        </div>
      </div>

      {/* Earned badges */}
      {badges.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-emerald-400/60 mb-1.5">
            <Award className="w-3 h-3 inline mr-1" />
            EARNED BADGES
          </p>
          <div className="flex flex-wrap gap-1.5">
            {badges.map(b => (
              <motion.span
                key={b.name}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-800/30 border border-emerald-700/30 text-xs text-emerald-300"
                title={b.desc}
              >
                <span>{b.emoji}</span> {b.name}
              </motion.span>
            ))}
          </div>
        </div>
      )}

      {/* Inspired-by badges */}
      <div>
        <p className="text-[10px] font-medium text-emerald-400/60 mb-1.5">
          <BookOpen className="w-3 h-3 inline mr-1" />
          INSPIRED BY
        </p>
        <div className="flex flex-wrap gap-1.5">
          {INSPIRED_BY.map(b => (
            <span
              key={b.name}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-900/20 border border-emerald-800/20 text-[10px] text-emerald-500"
              title={b.desc}
            >
              {b.emoji} {b.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
