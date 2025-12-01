import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { calculateCreatorDate } from '@/utils/dashboardCalendar';
import { JournalEntry } from './Journal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DayEntryPanel } from './DayEntryPanel';
import { BirthdayManager } from './BirthdayManager';

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
function getGregorianDateForYhwh(yhwhYear: number, yhwhMonth: number, yhwhDay: number): Date {
  // Calculate days from epoch
  const monthDays = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
  
  // Days from epoch year start (each year has 364 days)
  let daysFromEpoch = (yhwhYear - 6028) * 364;
  
  // Add days from months before current month
  for (let i = 0; i < yhwhMonth - 1; i++) {
    daysFromEpoch += monthDays[i];
  }
  
  // Add days in current month (subtract 1 because Day 1 is the first day, so 0 days added)
  daysFromEpoch += yhwhDay - 1;
  
  // Calculate Gregorian date
  // Use UTC to avoid timezone issues, then convert to local
  const gregorianDate = new Date(EPOCH_DATE);
  gregorianDate.setDate(gregorianDate.getDate() + daysFromEpoch);
  
  return gregorianDate;
}

export default function CalendarGrid({ entries: propEntries, onDateSelect }: CalendarGridProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>(propEntries || []);
  const [selectedDay, setSelectedDay] = useState<{ date: Date; yhwhDate: ReturnType<typeof calculateCreatorDate> } | null>(null);
  const [isDayPanelOpen, setIsDayPanelOpen] = useState(false);
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
        .from('journal_entries')
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
        .from('birthdays')
        .select('yhwh_month, yhwh_day, person_name')
        .eq('user_id', user.id)

      if (error) {
        console.error('Error loading birthdays:', error)
        return
      }

      setBirthdays(data || [])
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
      yhwhDate: ReturnType<typeof calculateCreatorDate>;
      hasEntry: boolean;
      entry?: JournalEntry;
      birthdays: Array<{ yhwh_month: number; yhwh_day: number; person_name: string }>;
    }> = [];

    const daysInMonth = DAYS_PER_MONTH[currentYhwhMonth - 1];
    
    // Generate all days in the YHWH month
    const monthDays = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
    for (let day = 1; day <= daysInMonth; day++) {
      const gregorianDate = getGregorianDateForYhwh(currentYhwhYear, currentYhwhMonth, day);
      // Use noon to avoid sunrise time issues when calculating YHWH date
      const gregorianAtNoon = new Date(gregorianDate);
      gregorianAtNoon.setHours(12, 0, 0, 0);
      const yhwhDate = calculateCreatorDate(gregorianAtNoon);
      
      // Calculate day of year for fixed weekday pattern
      let dayOfYear = 0;
      for (let i = 0; i < currentYhwhMonth - 1; i++) {
        dayOfYear += monthDays[i];
      }
      dayOfYear += day;
      
      // Override weekday with fixed pattern calculation (same for all years)
      const STARTING_WEEKDAY_YEAR_6028 = 4; // Year 6028 Month 1 Day 1 = Day 4
      const fixedWeekday = ((dayOfYear - 1 + STARTING_WEEKDAY_YEAR_6028 - 1) % 7) + 1;
      const yhwhDateWithFixedWeekday = { ...yhwhDate, weekDay: fixedWeekday };
      
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
        gregorianDate, // Keep original for display
        yhwhDate: yhwhDateWithFixedWeekday, // Use fixed weekday pattern
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

  // Check if day is Tequvah (alignment day - simplified check)
  const isTequvah = (yhwhDate: ReturnType<typeof calculateCreatorDate>) => {
    return yhwhDate.day === 1 || yhwhDate.day === 15 || yhwhDate.day === 30;
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
            const isToday = day.gregorianDate.toDateString() === new Date().toDateString();
            const isShabbatDay = isShabbat(day.yhwhDate);
            const isTequvahDay = isTequvah(day.yhwhDate);

            return (
              <motion.button
                key={idx}
                onClick={() => {
                  setSelectedDay({ date: day.gregorianDate, yhwhDate: day.yhwhDate });
                  setIsDayPanelOpen(true);
                  if (onDateSelect) {
                    onDateSelect(day.gregorianDate);
                  }
                }}
                className={`
                  aspect-square p-2 rounded-lg border-2 transition-all
                  ${isToday ? 'border-primary bg-primary/10' : 'border-border'}
                  ${day.hasEntry ? 'bg-success/10 hover:bg-success/20' : 'hover:bg-muted/50'}
                  ${day.birthdays && day.birthdays.length > 0 ? 'bg-pink-500/10 ring-1 ring-pink-500/30' : ''}
                  ${isShabbatDay ? 'bg-yellow-500/20' : ''}
                  ${isTequvahDay ? 'ring-2 ring-amber-500/50' : ''}
                `}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="flex flex-col items-center justify-center h-full">
                  {/* YHWH day number - PRIMARY */}
                  <div className={`
                    text-lg font-bold mb-1
                    ${isToday ? 'text-primary' : 'text-foreground'}
                  `}>
                    {day.yhwhDate.day}
                  </div>

                  {/* Gregorian date - SECONDARY */}
                  <div className="text-xs text-muted-foreground text-center leading-tight">
                    <div className="font-semibold">
                      {day.gregorianDate.getFullYear()}/{String(day.gregorianDate.getMonth() + 1).padStart(2, '0')}/{String(day.gregorianDate.getDate()).padStart(2, '0')}
                    </div>
                  </div>

                  {/* Indicators */}
                  <div className="flex gap-1 mt-1 flex-wrap justify-center">
                    {day.hasEntry && (
                      <BookOpen className="h-3 w-3 text-success" />
                    )}
                    {day.birthdays && day.birthdays.length > 0 && (
                      <Badge className="bg-pink-500/20 text-pink-700 text-[8px] px-1 py-0" title={day.birthdays.map(b => b.person_name).join(', ')}>
                        🎂 {day.birthdays.length}
                      </Badge>
                    )}
                    {isShabbatDay && (
                      <Badge className="bg-yellow-500/20 text-yellow-700 text-[8px] px-1 py-0">
                        S
                      </Badge>
                    )}
                    {isTequvahDay && (
                      <Badge className="bg-amber-500/20 text-amber-700 text-[8px] px-1 py-0">
                        T
                      </Badge>
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
      
      {/* Day Entry Panel */}
      {selectedDay && (
        <DayEntryPanel
          isOpen={isDayPanelOpen}
          onClose={() => {
            setIsDayPanelOpen(false);
            setSelectedDay(null);
          }}
          selectedDate={selectedDay.date}
          yhwhDate={selectedDay.yhwhDate}
        />
      )}
    </Card>
  );
}
