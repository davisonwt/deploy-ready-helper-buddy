import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { calculateCreatorDate } from '@/utils/dashboardCalendar';
import { getDaysOutOfTimeCount } from '@/utils/customCalendar';
import { getFeastInfo } from '@/utils/gardenRestDays';
import {
  calculateYhwhDateFromCivilDate,
  parseLocalDateKey,
  hasMeaningfulJournalEntry,
} from '@/utils/journalDateMapping';
import { JournalEntry } from './Journal';

/**
 * Calculate the 50-day count number for Omer→Shavuot, →New Wine, →New Oil
 * Returns { count, label } or null if day is not in any count period.
 * 
 * Omer to Shavuot:   M1 D26 (day 1) → M3 D15 (day 50)
 * Count to New Wine:  M3 D15 (day 1) → M5 D3  (day 50)  ← day 50 of Omer = day 1 of Wine
 * Count to New Oil:   M5 D3  (day 1) → M6 D22 (day 50)  ← day 50 of Wine = day 1 of Oil
 */
function getOmerCount(month: number, day: number): { count: number; label: string; color: string }[] {
  const MONTH_DAYS = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
  
  let dayOfYear = 0;
  for (let m = 0; m < month - 1; m++) dayOfYear += MONTH_DAYS[m];
  dayOfYear += day;
  
  // Omer start: M1 D26 = day 26
  const omerStart = 26;
  // New Wine start: M3 D15 = 30+30+15 = 75 (= omer day 50)
  const newWineStart = 75;
  // New Oil start: M5 D3 = 30+30+31+30+3 = 124 (= wine day 50)
  const newOilStart = 124;
  
  const results: { count: number; label: string; color: string }[] = [];
  
  if (dayOfYear >= omerStart && dayOfYear < omerStart + 50) {
    results.push({ count: dayOfYear - omerStart + 1, label: 'Omer', color: 'text-amber-400' });
  }
  if (dayOfYear >= newWineStart && dayOfYear < newWineStart + 50) {
    results.push({ count: dayOfYear - newWineStart + 1, label: 'Wine', color: 'text-rose-400' });
  }
  if (dayOfYear >= newOilStart && dayOfYear < newOilStart + 50) {
    results.push({ count: dayOfYear - newOilStart + 1, label: 'Oil', color: 'text-emerald-400' });
  }
  return results;
}
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BirthdayManager } from './BirthdayManager';
import { DateOptionsMenu } from './DateOptionsMenu';

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

// Epoch: March 20, 2025 = Year 6028, Month 1, Day 1
const EPOCH_DATE = new Date(2025, 2, 20); // March 20, 2025 (month is 0-indexed)

// Calculate Gregorian date for a given YHWH date
function getGregorianDateForYhwh(yhwhYear: number, yhwhMonth: number, yhwhDay: number, isDot?: boolean, dotDay?: number): Date {
  // Calculate days from epoch
  const monthDays = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
  
  // Days from epoch year start — account for DOT days in prior years
  let daysFromEpoch = 0;
  for (let y = 6028; y < yhwhYear; y++) {
    daysFromEpoch += 364 + getDaysOutOfTimeCount(y);
  }
  
  // Add days from months before current month
  for (let i = 0; i < yhwhMonth - 1; i++) {
    daysFromEpoch += monthDays[i];
  }

  if (isDot && dotDay) {
    // DOT days are inserted after Month 12 Day 28
    // So DOT day N = day 28 + N absolute days into the year
    daysFromEpoch += 28 + dotDay - 1;
  } else {
    // For Month 12 days 29+, DOT days are inserted between day 28 and day 29
    if (yhwhMonth === 12 && yhwhDay >= 29) {
      daysFromEpoch += yhwhDay - 1 + getDaysOutOfTimeCount(yhwhYear);
    } else {
      daysFromEpoch += yhwhDay - 1;
    }
  }
  
  const gregorianDate = new Date(EPOCH_DATE);
  gregorianDate.setDate(gregorianDate.getDate() + daysFromEpoch);
  gregorianDate.setHours(12, 0, 0, 0);

  return gregorianDate;
}

export default function CalendarGrid({ entries: propEntries, onDateSelect }: CalendarGridProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>(propEntries || []);
  const [selectedDay, setSelectedDay] = useState<{ date: Date; yhwhDate: ReturnType<typeof calculateCreatorDate> } | null>(null);
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const [birthdays, setBirthdays] = useState<Array<{ yhwh_month: number; yhwh_day: number; person_name: string }>>([]);
  const [showBirthdayManager, setShowBirthdayManager] = useState(false);
  
  // Get current YHWH date to determine which month to show
  const currentYhwhDate = useMemo(() => calculateCreatorDate(new Date()), []);
  const [currentYhwhMonth, setCurrentYhwhMonth] = React.useState(currentYhwhDate.month);
  const [currentYhwhYear, setCurrentYhwhYear] = React.useState(currentYhwhDate.year);

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
        const formattedEntries: JournalEntry[] = data.map((entry: any) => {
          const parsedGregorianDate = parseLocalDateKey(entry.gregorian_date);
          const gregorianDate = parsedGregorianDate || getGregorianDateForYhwh(entry.yhwh_year, entry.yhwh_month, entry.yhwh_day);
          const canonicalYhwhDate = calculateYhwhDateFromCivilDate(gregorianDate);

          const hasStoredYhwhDate =
            Number.isFinite(Number(entry.yhwh_year)) &&
            Number.isFinite(Number(entry.yhwh_month)) &&
            Number.isFinite(Number(entry.yhwh_day));

          const resolvedYhwhDate = parsedGregorianDate
            ? {
                year: canonicalYhwhDate.year,
                month: canonicalYhwhDate.month,
                day: canonicalYhwhDate.day,
                weekDay: canonicalYhwhDate.weekDay,
              }
            : hasStoredYhwhDate
              ? {
                  year: Number(entry.yhwh_year),
                  month: Number(entry.yhwh_month),
                  day: Number(entry.yhwh_day),
                  weekDay: Number(entry.yhwh_weekday) || canonicalYhwhDate.weekDay,
                }
              : {
                  year: canonicalYhwhDate.year,
                  month: canonicalYhwhDate.month,
                  day: canonicalYhwhDate.day,
                  weekDay: canonicalYhwhDate.weekDay,
                };

          return {
            id: entry.id,
            yhwhDate: resolvedYhwhDate,
            gregorianDate: gregorianDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            content: entry.content,
            mood: entry.mood,
            tags: entry.tags || [],
            images: entry.images || [],
            createdAt: entry.gregorian_date || entry.created_at,
            updatedAt: entry.updated_at,
            partOfYowm: entry.part_of_yowm,
            watch: entry.watch,
            isShabbat: entry.is_shabbat,
            isTequvah: entry.is_tequvah,
            feast: entry.feast,
          };
        });
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
      yhwhDate: ReturnType<typeof calculateCreatorDate> & { isDayOutOfTime?: boolean; dotDay?: number };
      hasEntry: boolean;
      entry?: JournalEntry;
      birthdays: Array<{ yhwh_month: number; yhwh_day: number; person_name: string }>;
      isDot?: boolean;
      dotDay?: number;
      displayLabel?: string;
    }> = [];

    const daysInMonth = DAYS_PER_MONTH[currentYhwhMonth - 1];
    const dotCount = currentYhwhMonth === 12 ? getDaysOutOfTimeCount(currentYhwhYear) : 0;
    
    const monthDays = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];

    for (let day = 1; day <= daysInMonth; day++) {
      // After day 28 in Month 12, insert DOT days
      if (currentYhwhMonth === 12 && day === 29 && dotCount > 0) {
        for (let dot = 1; dot <= dotCount; dot++) {
          const gregorianDate = getGregorianDateForYhwh(currentYhwhYear, 12, 28, true, dot);
          const gregorianAtNoon = new Date(gregorianDate);
          gregorianAtNoon.setHours(12, 0, 0, 0);
          const yhwhDate = calculateCreatorDate(gregorianAtNoon);
          
          // DOT days don't advance weekday — use day 28's weekday (Sabbath = 7)
          const yhwhDateDot = { ...yhwhDate, weekDay: 7, isDayOutOfTime: true, dotDay: dot };

          days.push({
            gregorianDate,
            yhwhDate: yhwhDateDot,
            hasEntry: false,
            birthdays: [],
            isDot: true,
            dotDay: dot,
            displayLabel: `DOT ${dot}`,
          });
        }
      }

      const gregorianDate = getGregorianDateForYhwh(currentYhwhYear, currentYhwhMonth, day);
      const gregorianAtNoon = new Date(gregorianDate);
      gregorianAtNoon.setHours(12, 0, 0, 0);
      const yhwhDate = calculateCreatorDate(gregorianAtNoon);
      
      let dayOfYear = 0;
      for (let i = 0; i < currentYhwhMonth - 1; i++) {
        dayOfYear += monthDays[i];
      }
      dayOfYear += day;
      
      const STARTING_WEEKDAY_YEAR_6028 = 4;
      const fixedWeekday = ((dayOfYear - 1 + STARTING_WEEKDAY_YEAR_6028 - 1) % 7) + 1;
      const yhwhDateWithFixedWeekday = { ...yhwhDate, weekDay: fixedWeekday };
      
      const entry = entries.find((e) =>
        e.yhwhDate.year === currentYhwhYear &&
        e.yhwhDate.month === currentYhwhMonth &&
        e.yhwhDate.day === day &&
        hasMeaningfulJournalEntry({
          content: e.content,
          tags: e.tags,
          images: e.images,
        })
      );

      const dayBirthdays = birthdays.filter(
        b => b.yhwh_month === currentYhwhMonth && b.yhwh_day === day
      );

      days.push({
        gregorianDate,
        yhwhDate: yhwhDateWithFixedWeekday,
        hasEntry: !!entry,
        entry,
        birthdays: dayBirthdays,
      });
    }

    return days;
  }, [currentYhwhMonth, currentYhwhYear, entries, birthdays]);

  // Get first day of month for grid positioning using YHWH calendar
  // Calculate weekday using fixed pattern based on day of year
  // Each year has 364 days (52 weeks), so the weekday pattern repeats exactly every year
  // Year 6028 Month 1 Day 1 starts on Day 4
  const monthDays = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
  let dayOfYearForFirstDay = 0;
  for (let i = 0; i < currentYhwhMonth - 1; i++) {
    dayOfYearForFirstDay += monthDays[i];
  }
  dayOfYearForFirstDay += 1; // Day 1 of the month
  
  // Fixed weekday calculation: same pattern every year
  const STARTING_WEEKDAY_YEAR_6028 = 4; // Year 6028 Month 1 Day 1 = Day 4
  const firstDayWeekday = ((dayOfYearForFirstDay - 1 + STARTING_WEEKDAY_YEAR_6028 - 1) % 7) + 1;
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
    const today = calculateCreatorDate(new Date());
    setCurrentYhwhMonth(today.month);
    setCurrentYhwhYear(today.year);
  };

  // Check if day is Shabbat (weekday 7)
  const isShabbat = (yhwhDate: ReturnType<typeof calculateCreatorDate>) => {
    return yhwhDate.weekDay === 7;
  };

  // Check if day is Tequvah (spring equinox alignment - Month 12 Day 31 and Month 1 Day 1)
  const isTequvah = (yhwhDate: ReturnType<typeof calculateCreatorDate>) => {
    return (yhwhDate.month === 12 && yhwhDate.day === 31) || (yhwhDate.month === 1 && yhwhDate.day === 1);
  };

  return (
    <Card>
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
                YHVH Calendar View
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
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Weekday headers */}
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-center font-semibold text-muted-foreground py-1 sm:py-2 text-[10px] sm:text-sm truncate"
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
            const isToday = day.gregorianDate.toDateString() === new Date().toDateString();
            const isShabbatDay = isShabbat(day.yhwhDate);
            const isTequvahDay = !day.isDot && isTequvah(day.yhwhDate);
            const isDotDay = !!day.isDot;
            const feastInfo = !isDotDay ? getFeastInfo(day.yhwhDate.month, day.yhwhDate.day) : null;
            const omerCount = !isDotDay ? getOmerCount(day.yhwhDate.month, day.yhwhDate.day) : null;

            return (
              <motion.button
                key={idx}
                onClick={() => {
                  if (!isDotDay) {
                    setSelectedDay({ date: day.gregorianDate, yhwhDate: day.yhwhDate });
                    setIsOptionsMenuOpen(true);
                    if (onDateSelect) {
                      onDateSelect(day.gregorianDate);
                    }
                  }
                }}
                className={`
                  min-h-[70px] sm:min-h-[90px] p-1 sm:p-2 rounded-lg border-2 transition-all w-full
                  ${isDotDay ? 'border-purple-500/60 bg-purple-900/30 hover:bg-purple-900/50' : ''}
                  ${!isDotDay && isToday ? 'border-primary bg-primary/10' : !isDotDay ? 'border-border' : ''}
                  ${!isDotDay && day.hasEntry ? 'bg-success/10 hover:bg-success/20' : !isDotDay ? 'hover:bg-muted/50' : ''}
                  ${!isDotDay && day.birthdays && day.birthdays.length > 0 ? 'bg-pink-500/10 ring-1 ring-pink-500/30' : ''}
                  ${!isDotDay && isShabbatDay ? 'bg-yellow-500/20' : ''}
                  ${!isDotDay && feastInfo ? 'ring-1 ring-cyan-400/60' : ''}
                  ${!isDotDay && isTequvahDay ? 'ring-2 ring-amber-500/50' : ''}
                `}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <div className="flex flex-col items-center justify-start h-full gap-0.5">
                  {/* Day number */}
                  <div className={`
                    text-sm sm:text-lg font-bold
                    ${isDotDay ? 'text-purple-300' : isToday ? 'text-primary' : 'text-foreground'}
                  `}>
                    {day.displayLabel || day.yhwhDate.day}
                  </div>

                  {/* Gregorian date */}
                  <div className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight">
                    {day.gregorianDate.getFullYear()}/{String(day.gregorianDate.getMonth() + 1).padStart(2, '0')}/{String(day.gregorianDate.getDate()).padStart(2, '0')}
                  </div>

                  {/* Compact indicators */}
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center items-center">
                    {day.hasEntry && (
                      <BookOpen className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-success" />
                    )}
                    {day.birthdays && day.birthdays.length > 0 && (
                      <span className="text-[8px]" title={day.birthdays.map(b => b.person_name).join(', ')}>🎂</span>
                    )}
                    {feastInfo && (
                      <span className="text-[8px]" title={feastInfo.name}>🕎</span>
                    )}
                    {(omerCount || []).map((oc, oi) => (
                      <span 
                        key={oi}
                        className={`text-[7px] sm:text-[8px] font-bold ${oc.color}`}
                        title={`${oc.label} Day ${oc.count}`}
                      >
                        {oc.count}
                      </span>
                    ))}
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
            <div className="w-4 h-4 rounded border-2 border-cyan-400 bg-cyan-500/20" />
            <span className="text-muted-foreground">Feast Day</span>
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
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-purple-500 bg-purple-900/30" />
            <span className="text-muted-foreground">Day Out of Time</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-amber-400 bg-black/30" />
            <span className="text-muted-foreground">Omer → Shavu'ot (1-50)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-rose-400 bg-black/30" />
            <span className="text-muted-foreground">Count → New Wine (1-50)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-emerald-400 bg-black/30" />
            <span className="text-muted-foreground">Count → New Oil (1-50)</span>
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
