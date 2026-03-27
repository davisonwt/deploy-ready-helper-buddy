import React from 'react';
import { Gem, CalendarDays, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { getDayInfo } from '@/utils/sacredCalendar';

interface DayBeadsFeedCardProps {
  calendarData: any;
}

const weekdayLabel = (weekday?: number) => {
  const labels = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Sabbath'];
  if (!weekday || weekday < 1 || weekday > 7) return 'Day 1';
  return labels[weekday - 1];
};

export const DayBeadsFeedCard: React.FC<DayBeadsFeedCardProps> = ({ calendarData }) => {
  const dayInfo = calendarData?.dayOfYear ? getDayInfo(calendarData.dayOfYear) : null;
  const isSabbath = dayInfo?.isSabbath || calendarData?.weekday === 7;
  const isFeast = !!dayInfo?.isFeast;

  return (
    <section>
      <div className="flex items-center gap-2 mb-2.5">
        <Gem className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-bold text-foreground">Day&apos;s Beads</h2>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        <div
          className="p-4 space-y-3"
          style={{
            background:
              'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--secondary) / 0.55) 100%)',
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Today in Creator&apos;s Count</p>
              <p className="text-lg font-extrabold text-foreground leading-tight">
                Year {calendarData?.year || '-'} · Day {calendarData?.dayOfYear || '-'}
              </p>
            </div>
            <Badge className="bg-primary/15 text-primary border border-primary/30">
              <Sparkles className="w-3 h-3 mr-1" />
              Live Daily
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-border/60 bg-background/65 p-2">
              <p className="text-[10px] text-muted-foreground">Month / Day</p>
              <p className="text-xs font-bold text-foreground">M{calendarData?.month || '-'} · D{calendarData?.dayOfMonth || '-'}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/65 p-2">
              <p className="text-[10px] text-muted-foreground">Weekday</p>
              <p className="text-xs font-bold text-foreground">{weekdayLabel(calendarData?.weekday)}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/65 p-2">
              <p className="text-[10px] text-muted-foreground">Watch</p>
              <p className="text-xs font-bold text-foreground">{calendarData?.part || 'Day'}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isSabbath && (
              <Badge className="bg-accent/20 text-accent-foreground border border-accent/35">🕊️ Sabbath</Badge>
            )}
            {isFeast && dayInfo?.feastName && (
              <Badge className="bg-primary/20 text-primary border border-primary/35">🕎 {dayInfo.feastName}</Badge>
            )}
            {!isSabbath && !isFeast && (
              <Badge className="bg-secondary text-secondary-foreground border border-border/70">
                {calendarData?.season || 'Regular Day'}
              </Badge>
            )}
          </div>
        </div>

        <div className="border-t border-border/60 bg-background/70 px-4 py-2.5">
          <Link
            to="/enochian-calendar-design"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Open full beads view
          </Link>
        </div>
      </div>
    </section>
  );
};
