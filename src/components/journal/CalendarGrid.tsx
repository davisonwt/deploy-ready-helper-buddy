import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, BookOpen, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { JournalEntry } from './Journal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BirthdayManager } from './BirthdayManager';
import { DateOptionsMenu } from './DateOptionsMenu';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useSeasonalArt } from '@/hooks/useSeasonalArt';
import { getOmerCount, type DayInfo } from '@/utils/sacredCalendar';
import { useSacredNow } from '@/hooks/useSacredNow';
import { buildScripturalYear } from '@/utils/calendarYearBuild';

interface CalendarGridProps {
  entries?: JournalEntry[]; // Optional - will load from Supabase if not provided
  onDateSelect?: (date: Date) => void; // Made optional since we'll use panel
}

const WEEKDAYS = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Shabbat'];

const YHWH_MONTHS = [
  'Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6',
  'Month 7', 'Month 8', 'Month 9', 'Month 10', 'Month 11', 'Month 12'
];

const DAYS_PER_MONTH = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];

interface GridYhwhDate {
  year: number;
  month: number;
  day: number;
  weekDay: number;
  dayOfYear: number;
}

export default function CalendarGrid({ entries: propEntries, onDateSelect }: CalendarGridProps) {
  const { user } = useAuth();
  const { location } = useUserLocation();
  const sacred = useSacredNow();
  const [entries, setEntries] = useState<JournalEntry[]>(propEntries || []);
  const [selectedDay, setSelectedDay] = useState<{ date: Date; yhwhDate: GridYhwhDate } | null>(null);
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const [birthdays, setBirthdays] = useState<Array<{ yhwh_month: number; yhwh_day: number; person_name: string }>>([]);
  const [showBirthdayManager, setShowBirthdayManager] = useState(false);
  
  // Get current YHWH date from the shared sunrise-aware source of truth.
  const [currentYhwhMonth, setCurrentYhwhMonth] = React.useState(sacred.date.month);
  const [currentYhwhYear, setCurrentYhwhYear] = React.useState(sacred.date.year);

  useEffect(() => {
    if (!sacred.loading) {
      setCurrentYhwhMonth(sacred.date.month);
      setCurrentYhwhYear(sacred.date.year);
    }
  }, [sacred.loading, sacred.date.month, sacred.date.year]);

  const yearBuild = useMemo(() => buildScripturalYear(currentYhwhYear), [currentYhwhYear]);
  const monthBuild = yearBuild.months[currentYhwhMonth - 1];

  // Load entries from Supabase if not provided via props
  useEffect(() => {
    if (propEntries) {
      setEntries(propEntries);
      return;
    }

    if (!user) return;

    const loadEntries = async () => {
      const { data } = await supabase
        .from('journal_entries' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        const formattedEntries: JournalEntry[] = data.map((entry: any) => ({
          id: entry.id,
          yhwhDate: {
            year: entry.yhwh_year,
            month: entry.yhwh_month,
            day: entry.yhwh_day,
            weekDay: entry.yhwh_weekday,
          },
          gregorianDate: new Date(entry.gregorian_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          content: entry.content,
          mood: entry.mood,
          tags: entry.tags || [],
          images: entry.images || [],
          createdAt: entry.created_at,
          updatedAt: entry.updated_at,
          partOfYowm: entry.part_of_yowm,
          watch: entry.watch,
          isShabbat: entry.is_shabbat,
          isTequvah: entry.is_tequvah,
          feast: entry.feast,
        }));
        setEntries(formattedEntries);
      }
    };

    loadEntries();

    // Listen for journal entry updates
    const handleUpdate = (event: CustomEvent) => {
      setEntries(event.detail);
    };

    window.addEventListener('journalEntriesUpdated', handleUpdate as EventListener);
    return () => {
      window.removeEventListener('journalEntriesUpdated', handleUpdate as EventListener);
    };
  }, [user, propEntries]);

  // Load birthdays
  useEffect(() => {
    if (!user) return

    const loadBirthdays = async () => {
      const { data, error } = await supabase
        .from('birthdays' as any)
        .select('yhwh_month, yhwh_day, person_name')
        .eq('user_id', user.id)

      if (error) {
        console.error('Error loading birthdays:', error)
        return
      }

      setBirthdays(((data || []) as unknown) as { yhwh_month: number; yhwh_day: number; person_name: string; }[])
    }

    loadBirthdays()

    // Listen for changes
    const channel = supabase
      .channel('birthdays_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'birthdays', filter: `user_id=eq.${user.id}` },
        () => loadBirthdays()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // Calculate calendar days for the YHWH month
  const calendarDays = useMemo(() => {
    const days: Array<{
      gregorianDate: Date;
      yhwhDate: GridYhwhDate;
      info: DayInfo;
      hasEntry: boolean;
      entry?: JournalEntry;
      birthdays: Array<{ yhwh_month: number; yhwh_day: number; person_name: string }>;
    }> = [];

    for (const scripturalDay of monthBuild.days) {
      const day = scripturalDay.dayOfMonth;
      const yhwhDate: GridYhwhDate = {
        year: currentYhwhYear,
        month: currentYhwhMonth,
        day,
        weekDay: scripturalDay.weekDay,
        dayOfYear: scripturalDay.info.creatorDay,
      };

      // Find entry for this date (match by YHWH date for accurate syncing)
      const entry = entries.find(e => 
        e.yhwhDate.year === currentYhwhYear &&
        e.yhwhDate.month === currentYhwhMonth &&
        e.yhwhDate.day === day
      );

      // Find birthdays for this date (matches month and day, repeats every year)
      const dayBirthdays = birthdays.filter(
        b => b.yhwh_month === currentYhwhMonth && b.yhwh_day === day
      )

      days.push({
        gregorianDate: scripturalDay.gregorian,
        yhwhDate,
        info: scripturalDay.info,
        hasEntry: !!entry,
        entry,
        birthdays: dayBirthdays,
      });
    }

    return days;
  }, [currentYhwhMonth, currentYhwhYear, entries, birthdays, monthBuild]);

  // Get first day of month for grid positioning using YHWH calendar
  // Calculate weekday using fixed pattern based on day of year
  // Each year has 364 days (52 weeks), so the weekday pattern repeats exactly every year
  // Year 6028 Month 1 Day 1 starts on Day 4
  const firstDayWeekday = monthBuild.days[0]?.weekDay ?? 1;
  // Convert YHWH weekday (1-7, where 7 is Shabbat) to grid position (0-6)
  // YHWH Day 1 = grid position 0, Day 2 = 1, ..., Shabbat (7) = 6
  const firstDayOfMonth = (firstDayWeekday - 1) % 7;

  // Navigate YHWH months
  const goToPreviousMonth = () => {
    if (currentYhwhMonth === 1) {
      setCurrentYhwhMonth(12);
      setCurrentYhwhYear(currentYhwhYear - 1);
    } else {
      setCurrentYhwhMonth(currentYhwhMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentYhwhMonth === 12) {
      setCurrentYhwhMonth(1);
      setCurrentYhwhYear(currentYhwhYear + 1);
    } else {
      setCurrentYhwhMonth(currentYhwhMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentYhwhMonth(sacred.date.month);
    setCurrentYhwhYear(sacred.date.year);
  };

  // Check if day is Shabbat (weekday 7)
  const isShabbat = (yhwhDate: GridYhwhDate) => {
    return yhwhDate.weekDay === 7;
  };

  // Check if day is Tequvah (alignment day - simplified check)
  const isTequvah = (yhwhDate: GridYhwhDate) => {
    return yhwhDate.day === 1 || yhwhDate.day === 15 || yhwhDate.day === 30;
  };

  // Seasonal hero image for the displayed scriptural month + region
  const { imageUrl: seasonalImage, loading: seasonalLoading } = useSeasonalArt(
    currentYhwhMonth,
    location?.lat ?? 0,
    location?.lon ?? 0,
  );

  return (
    <Card className="overflow-hidden">
      {/* Seasonal hero — same artwork that appears on the printable wall calendar */}
      <div className="relative w-full h-48 sm:h-64 bg-gradient-to-br from-amber-50 to-emerald-50 dark:from-stone-900 dark:to-stone-800">
        {seasonalImage ? (
          <img
            src={seasonalImage}
            alt={`Seasonal artwork for ${YHWH_MONTHS[currentYhwhMonth - 1]}`}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm gap-2">
            <Sparkles className="h-4 w-4 animate-pulse" />
            {seasonalLoading ? 'Preparing seasonal artwork for your region…' : 'Seasonal artwork unavailable'}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 text-white">
          <div className="text-xs uppercase tracking-widest opacity-80">Scriptural Year {currentYhwhYear}</div>
          <div className="text-2xl sm:text-3xl font-bold drop-shadow">
            {YHWH_MONTHS[currentYhwhMonth - 1]}
          </div>
        </div>
      </div>

      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              onClick={goToPreviousMonth}
              variant="outline"
              size="sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-foreground">
                {YHWH_MONTHS[currentYhwhMonth - 1]} {currentYhwhYear}
              </h3>
              <p className="text-sm text-muted-foreground">
                YHWH Calendar View
              </p>
            </div>
            <Button
              onClick={goToNextMonth}
              variant="outline"
              size="sm"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button onClick={goToToday} variant="outline" size="sm">
              Today
            </Button>
            <Button 
              onClick={() => setShowBirthdayManager(!showBirthdayManager)} 
              variant="outline" 
              size="sm"
            >
              {showBirthdayManager ? 'Hide' : 'Manage'} Birthdays
            </Button>
          </div>
        </div>

        {/* Birthday Manager */}
        {showBirthdayManager && (
          <div className="mb-6">
            <BirthdayManager 
              selectedYhwhMonth={currentYhwhMonth}
              selectedYhwhDay={undefined}
            />
          </div>
        )}

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Weekday headers */}
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-center font-semibold text-muted-foreground py-2 text-sm"
            >
              {day}
            </div>
          ))}

          {/* Empty cells for days before month starts */}
          {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
            <div key={`empty-${idx}`} className="aspect-square" />
          ))}

          {/* Calendar days */}
          {calendarDays.map((day, idx) => {
            const isToday = day.yhwhDate.year === sacred.date.year &&
              day.yhwhDate.month === sacred.date.month &&
              day.yhwhDate.day === sacred.date.day;
            const isShabbatDay = isShabbat(day.yhwhDate);
            const isTequvahDay = isTequvah(day.yhwhDate);

            // Scriptural feast + Omer info for this day
            const sacredInfo = day.info;
            const omer = getOmerCount(currentYhwhMonth, day.yhwhDate.day);

            return (
              <motion.button
                key={idx}
                onClick={() => {
                  setSelectedDay({ date: day.gregorianDate, yhwhDate: day.yhwhDate });
                  setIsOptionsMenuOpen(true);
                  if (onDateSelect) {
                    onDateSelect(day.gregorianDate);
                  }
                }}
                className={`
                  min-h-[92px] p-2 rounded-lg border-2 transition-all text-left
                  ${isToday ? 'border-primary bg-primary/10' : 'border-border'}
                  ${day.hasEntry ? 'bg-success/10 hover:bg-success/20' : 'hover:bg-muted/50'}
                  ${day.birthdays && day.birthdays.length > 0 ? 'bg-pink-500/10 ring-1 ring-pink-500/30' : ''}
                  ${isShabbatDay ? 'bg-yellow-500/20' : ''}
                  ${sacredInfo.isHighSabbath ? 'bg-amber-500/30 ring-2 ring-amber-600' : ''}
                  ${isTequvahDay ? 'ring-2 ring-amber-500/50' : ''}
                `}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                title={sacredInfo.feastName || ''}
              >
                <div className="flex flex-col h-full">
                  <div className="flex items-baseline justify-between">
                    <div className={`text-lg font-bold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                      {day.yhwhDate.day}
                    </div>
                    <div className="text-[9px] text-muted-foreground font-semibold">
                      {day.gregorianDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                    </div>
                  </div>

                  {sacredInfo.feastName && (
                    <div className="text-[8px] leading-tight font-bold text-orange-700 dark:text-orange-300 mt-1 line-clamp-2">
                      {sacredInfo.feastName}
                    </div>
                  )}
                  {omer && (
                    <div className="text-[8px] leading-tight text-emerald-700 dark:text-emerald-400 mt-0.5 italic">
                      {omer.label}
                    </div>
                  )}

                  {/* Indicators */}
                  <div className="flex gap-1 mt-auto flex-wrap">
                    {day.hasEntry && <BookOpen className="h-3 w-3 text-success" />}
                    {day.birthdays && day.birthdays.length > 0 && (
                      <Badge className="bg-pink-500/20 text-pink-700 text-[8px] px-1 py-0" title={day.birthdays.map(b => b.person_name).join(', ')}>
                        🎂 {day.birthdays.length}
                      </Badge>
                    )}
                    {isShabbatDay && (
                      <Badge className="bg-yellow-500/20 text-yellow-700 text-[8px] px-1 py-0">S</Badge>
                    )}
                    {sacredInfo.isHighSabbath && (
                      <Badge className="bg-amber-600/30 text-amber-900 text-[8px] px-1 py-0">High</Badge>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>



        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-success bg-success/10" />
            <span className="text-muted-foreground">Has Entry</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-yellow-500 bg-yellow-500/20" />
            <span className="text-muted-foreground">Shabbat</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-amber-500 ring-2 ring-amber-500/50" />
            <span className="text-muted-foreground">Tequvah</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-primary bg-primary/10" />
            <span className="text-muted-foreground">Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-pink-500 bg-pink-500/10 ring-1 ring-pink-500/30" />
            <span className="text-muted-foreground">Birthday</span>
          </div>
        </div>
      </CardContent>
      
      {/* Date Options Menu */}
      {selectedDay && (
        <DateOptionsMenu
          isOpen={isOptionsMenuOpen}
          onClose={() => {
            setIsOptionsMenuOpen(false);
            setSelectedDay(null);
          }}
          selectedDate={selectedDay.date}
          yhwhDate={selectedDay.yhwhDate}
        />
      )}
    </Card>
  );
}
