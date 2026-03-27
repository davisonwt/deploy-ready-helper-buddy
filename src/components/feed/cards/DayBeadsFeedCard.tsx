import React from 'react';
import { Gem, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { getDayInfo } from '@/utils/sacredCalendar';
import { calculateCreatorDate } from '@/utils/dashboardCalendar';

interface DayBeadsFeedCardProps {
  calendarData: any;
}

const weekdayLabel = (weekday?: number) => {
  const labels = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Sabbath'];
  if (!weekday || weekday < 1 || weekday > 7) return 'Day 1';
  return labels[weekday - 1];
};

const DAYS_PER_MONTH = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];

const calculateSabbathDays = (month: number): number[] => {
  let dayOfYearStart = 1;
  for (let m = 1; m < month; m++) dayOfYearStart += DAYS_PER_MONTH[m - 1];
  const sabbaths: number[] = [];
  for (let d = 1; d <= DAYS_PER_MONTH[month - 1]; d++) {
    const weekday = ((dayOfYearStart + d - 2 + 3) % 7) + 1;
    if (weekday === 7) sabbaths.push(d);
  }
  return sabbaths;
};

interface BeadData {
  day: number;
  color: string;
  isToday: boolean;
  isSabbath: boolean;
  isFeast: boolean;
  feastName?: string;
  weekday: number;
}

const buildWeekBeads = (month: number, dayOfMonth: number): BeadData[] => {
  const sabbaths = calculateSabbathDays(month);
  let dayOfYearStart = 1;
  for (let m = 1; m < month; m++) dayOfYearStart += DAYS_PER_MONTH[m - 1];

  const currentWeekday = ((dayOfYearStart + dayOfMonth - 2 + 3) % 7) + 1;
  const weekStartDay = dayOfMonth - (currentWeekday - 1);

  const beads: BeadData[] = [];
  for (let wd = 1; wd <= 7; wd++) {
    const d = weekStartDay + (wd - 1);
    if (d < 1 || d > DAYS_PER_MONTH[month - 1]) continue;
    const dayOfYear = dayOfYearStart + d - 1;
    const info = getDayInfo(dayOfYear);
    const isSabbath = sabbaths.includes(d);
    beads.push({
      day: d,
      color: isSabbath ? '#fbbf24' : info.isFeast ? '#22d3ee' : '#374151',
      isToday: d === dayOfMonth,
      isSabbath,
      isFeast: info.isFeast,
      feastName: info.feastName,
      weekday: wd,
    });
  }
  return beads;
};

export const DayBeadsFeedCard: React.FC<DayBeadsFeedCardProps> = ({ calendarData }) => {
  const dayInfo = calendarData?.dayOfYear ? getDayInfo(calendarData.dayOfYear) : null;
  const isSabbath = dayInfo?.isSabbath || calendarData?.weekday === 7;
  const isFeast = !!dayInfo?.isFeast;
  const month = calendarData?.month || 1;
  const dayOfMonth = calendarData?.dayOfMonth || 1;
  const weekBeads = buildWeekBeads(month, dayOfMonth);

  return (
    <section>
      <div className="flex items-center gap-2 mb-2.5">
        <Gem className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-bold text-foreground">Day&apos;s Beads</h2>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        <div
          className="p-4 space-y-4"
          style={{
            background: 'linear-gradient(135deg, hsl(210 40% 10%) 0%, hsl(210 45% 16%) 100%)',
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

          {/* ── Bead Holder ── */}
          <div className="rounded-2xl p-3 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, hsl(30 10% 8%) 0%, hsl(30 8% 5%) 100%)' }}>
            {/* String line */}
            <div className="absolute top-1/2 left-4 right-4 h-[2px] -translate-y-1/2 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(217,167,87,0.5), rgba(217,167,87,0.4), transparent)' }} />

            <div className="relative z-10 flex items-center justify-center gap-2 sm:gap-3 py-2">
              {weekBeads.map((bead) => (
                <Link
                  key={bead.day}
                  to={`/enochian-calendar-design?month=${month}&day=${bead.day}`}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div
                    className={`rounded-full border-[3px] border-black flex items-center justify-center transition-transform ${bead.isToday ? 'scale-125 ring-2 ring-pink-500/60 ring-offset-1 ring-offset-black' : 'hover:scale-110'}`}
                    style={{
                      width: bead.isToday ? 42 : 36,
                      height: bead.isToday ? 42 : 36,
                      background: `radial-gradient(circle at 30% 30%, #fff, ${bead.color})`,
                      boxShadow: bead.isToday
                        ? '0 0 18px #ec4899, inset 0 0 10px rgba(255,255,255,0.3)'
                        : bead.isSabbath
                          ? '0 0 12px #fbbf24, inset 0 2px 6px rgba(255,255,255,0.2)'
                          : '0 4px 12px rgba(0,0,0,0.8), inset 0 2px 6px rgba(255,255,255,0.15)',
                    }}
                  >
                    <span className="text-[11px] font-extrabold" style={{ color: '#fef3c7', textShadow: '0 1px 3px rgba(0,0,0,0.95)', WebkitTextStroke: '0.5px rgba(0,0,0,0.8)' }}>
                      {bead.day}
                    </span>
                  </div>
                  <span className={`text-[8px] font-semibold ${bead.isToday ? 'text-pink-400' : bead.isSabbath ? 'text-amber-400/80' : 'text-muted-foreground/50'}`}>
                    {bead.isToday ? 'TODAY' : bead.isSabbath ? 'שבת' : weekdayLabel(bead.weekday).replace('Day ', '')}
                  </span>
                </Link>
              ))}
            </div>

            <div className="text-center mt-1">
              <span className="text-[9px] text-amber-500/40 tracking-[0.2em]">MONTH {month} · WEEK {Math.ceil(dayOfMonth / 7)}</span>
            </div>
          </div>

          {/* Info row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge className="bg-background/40 text-foreground border border-border/50 text-[10px]">
                M{month} · D{dayOfMonth}
              </Badge>
              <Badge className="bg-background/40 text-foreground border border-border/50 text-[10px]">
                {weekdayLabel(calendarData?.weekday)}
              </Badge>
              <Badge className="bg-background/40 text-foreground border border-border/50 text-[10px]">
                Watch {calendarData?.part || '-'}
              </Badge>
              {isSabbath && (
                <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px]">🕊️ Sabbath</Badge>
              )}
              {isFeast && dayInfo?.feastName && (
                <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px]">🕎 {dayInfo.feastName}</Badge>
              )}
              {!isSabbath && !isFeast && (
                <Badge className="bg-secondary/50 text-secondary-foreground border border-border/50 text-[10px]">
                  {calendarData?.season || 'Regular Day'}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
