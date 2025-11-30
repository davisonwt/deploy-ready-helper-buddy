import { useState, useEffect } from 'react';
import { getCreatorDate } from '@/utils/customCalendar';
import { getCreatorTime } from '@/utils/customTime';
import { useUserLocation } from './useUserLocation';

export interface CreatorCalendarData {
  year: number;
  month: number;
  dayOfMonth: number;
  dayOfYear: number;
  weekday: number;
  part: number;
  minute: number;
  dayPart: string;
  eighteenPart: number;
  season: string;
}

/**
 * Hook to get Creator's calendar date synchronized with dashboard
 * Uses sunrise-based day start if useSunrise is true
 */
export function useCreatorCalendar(useSunrise: boolean = true) {
  const { location, loading: locationLoading } = useUserLocation();
  const [calendarData, setCalendarData] = useState<CreatorCalendarData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateCalendar = async () => {
      if (locationLoading) return;

      try {
        const now = new Date();
        
        // Get Creator date with sunrise support
        const creatorDate = await getCreatorDate(now, useSunrise, location.lat, location.lon);
        
        // Get Creator time (parts)
        const creatorTime = getCreatorTime(now, location.lat, location.lon);
        
        // Calculate day of year
        const monthDays = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
        let dayOfYear = 0;
        for (let i = 0; i < creatorDate.month - 1; i++) {
          dayOfYear += monthDays[i];
        }
        dayOfYear += creatorDate.day;
        
        // Get day part name (simplified - you may want to import from sacredCalendar)
        const dayParts = [
          'Boker', 'Boker', 'Boker', 'Tzohorayim', 'Tzohorayim', 'Tzohorayim',
          'Tzohorayim', 'Tzohorayim', 'Tzohorayim', 'Erev', 'Erev', 'Erev',
          'Laylah', 'Laylah', 'Laylah', 'Laylah', 'Laylah', 'Laylah'
        ];
        const dayPart = dayParts[creatorTime.part - 1] || 'Boker';
        
        // Determine season
        const season = creatorDate.month <= 3 ? 'Spring' :
                      creatorDate.month <= 6 ? 'Summer' :
                      creatorDate.month <= 9 ? 'Fall' : 'Winter';
        
        setCalendarData({
          year: creatorDate.year,
          month: creatorDate.month,
          dayOfMonth: creatorDate.day,
          dayOfYear,
          weekday: creatorDate.weekDay,
          part: creatorTime.part,
          minute: creatorTime.minute,
          dayPart,
          eighteenPart: creatorTime.part,
          season,
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error calculating Creator calendar:', error);
        setLoading(false);
      }
    };

    updateCalendar();
    
    // Update every minute
    const interval = setInterval(updateCalendar, 60000);
    return () => clearInterval(interval);
  }, [location, locationLoading, useSunrise]);

  return { calendarData, loading, location };
}

