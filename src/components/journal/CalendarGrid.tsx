import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { calculateCreatorDate } from '@/utils/dashboardCalendar';
import { JournalEntry } from './Journal';

interface CalendarGridProps {
  entries: JournalEntry[];
  onDateSelect: (date: Date) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Shabbat'];

const YHWH_MONTHS = [
  'Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6',
  'Month 7', 'Month 8', 'Month 9', 'Month 10', 'Month 11', 'Month 12'
];

const DAYS_PER_MONTH = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];

export default function CalendarGrid({ entries, onDateSelect }: CalendarGridProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = React.useState(new Date().getFullYear());

  // Calculate YHWH calendar for the displayed month
  const calendarDays = useMemo(() => {
    const days: Array<{
      gregorianDate: Date;
      yhwhDate: ReturnType<typeof calculateCreatorDate>;
      hasEntry: boolean;
      entry?: JournalEntry;
    }> = [];

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const gregorianDate = new Date(currentYear, currentMonth, day);
      const yhwhDate = calculateCreatorDate(gregorianDate);
      
      // Find entry for this date
      const entry = entries.find(e => {
        const entryDate = new Date(e.createdAt);
        return entryDate.toDateString() === gregorianDate.toDateString();
      });

      days.push({
        gregorianDate,
        yhwhDate,
        hasEntry: !!entry,
        entry,
      });
    }

    return days;
  }, [currentMonth, currentYear, entries]);

  // Get first day of month for grid positioning using YHWH calendar
  // Find the YHWH date for the first day of the Gregorian month
  const firstGregorianDay = new Date(currentYear, currentMonth, 1);
  const firstYhwhDate = calculateCreatorDate(firstGregorianDay);
  // Convert YHWH weekday (1-7, where 7 is Shabbat) to grid position (0-6)
  // YHWH Day 1 = grid position 0, Day 2 = 1, ..., Shabbat (7) = 6
  const firstDayOfMonth = (firstYhwhDate.weekDay - 1) % 7;

  // Navigate months
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // Get YHWH month name for a given day
  const getYhwhMonthName = (yhwhDate: ReturnType<typeof calculateCreatorDate>) => {
    return YHWH_MONTHS[yhwhDate.month - 1] || `Month ${yhwhDate.month}`;
  };

  // Check if day is Shabbat (weekday 7)
  const isShabbat = (yhwhDate: ReturnType<typeof calculateCreatorDate>) => {
    return yhwhDate.weekDay === 7;
  };

  // Check if day is Tequvah (alignment day - simplified check)
  const isTequvah = (yhwhDate: ReturnType<typeof calculateCreatorDate>) => {
    // Tequvah occurs when all wheels align - simplified: check if day is divisible by certain numbers
    // This is a placeholder - actual Tequvah calculation would be more complex
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
                {MONTHS[currentMonth]} {currentYear}
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
          <Button onClick={goToToday} variant="outline" size="sm">
            Today
          </Button>
        </div>

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
                onClick={() => onDateSelect(day.gregorianDate)}
                className={`
                  aspect-square p-2 rounded-lg border-2 transition-all
                  ${isToday ? 'border-primary bg-primary/10' : 'border-border'}
                  ${day.hasEntry ? 'bg-success/10 hover:bg-success/20' : 'hover:bg-muted/50'}
                  ${isShabbatDay ? 'bg-yellow-500/20' : ''}
                  ${isTequvahDay ? 'ring-2 ring-amber-500/50' : ''}
                `}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="flex flex-col items-center justify-center h-full">
                  {/* Gregorian day number */}
                  <div className={`
                    text-lg font-bold mb-1
                    ${isToday ? 'text-primary' : 'text-foreground'}
                  `}>
                    {day.gregorianDate.getDate()}
                  </div>

                  {/* YHWH date */}
                  <div className="text-xs text-muted-foreground text-center leading-tight">
                    <div className="font-semibold">
                      {getYhwhMonthName(day.yhwhDate)}
                    </div>
                    <div>Day {day.yhwhDate.day}</div>
                  </div>

                  {/* Indicators */}
                  <div className="flex gap-1 mt-1">
                    {day.hasEntry && (
                      <BookOpen className="h-3 w-3 text-success" />
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
        </div>
      </CardContent>
    </Card>
  );
}

