import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Circle, Cog, MapPin, RotateCcw, Star, Calendar, BookOpen, PenLine, Sprout } from 'lucide-react';
import { getCurrentTheme } from '@/utils/dashboardThemes';
import { calculateCreatorDate } from '@/utils/dashboardCalendar';
import { getCreatorTime } from '@/utils/customTime';
import { useUserLocation } from '@/hooks/useUserLocation';
import { sacredCalendarNotes } from '@/data/sacredCalendarNotes';
import { LocationVerification } from '@/components/calendar/LocationVerification';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { GardenGuideSection } from '@/components/garden/GardenGuideSection';
import RemnantsWheelCalendar from '@/components/watch/RemnantsWheelCalendar';
import {
  Month1Strand, Month2Strand, Month3Strand, Month4Strand,
  Month5Strand, Month6Strand, Month7Strand, Month8Strand,
  Month9Strand, Month10Strand, Month11Strand, Month12Strand
} from '@/components/watch/EnochianWheelCalendar';

// ─── Season Config ───
const SEASONS = [
  { months: [1,2,3], northern: 'Spring', southern: 'Fall', emoji: '🌸', gradient: 'from-emerald-900/40 to-teal-900/40', accent: '#34d399' },
  { months: [4,5,6], northern: 'Summer', southern: 'Winter', emoji: '☀️', gradient: 'from-amber-900/40 to-yellow-900/40', accent: '#fbbf24' },
  { months: [7,8,9], northern: 'Fall', southern: 'Spring', emoji: '🍂', gradient: 'from-orange-900/40 to-red-900/40', accent: '#f97316' },
  { months: [10,11,12], northern: 'Winter', southern: 'Summer', emoji: '❄️', gradient: 'from-blue-900/40 to-indigo-900/40', accent: '#60a5fa' },
];

const TRIBES = ['Reuben','Simeon','Levi','Judah','Dan','Naphtali','Gad','Asher','Issachar','Zebulun','Joseph','Benjamin'];

const MonthComponents: Record<number, any> = {
  1: Month1Strand, 2: Month2Strand, 3: Month3Strand, 4: Month4Strand,
  5: Month5Strand, 6: Month6Strand, 7: Month7Strand, 8: Month8Strand,
  9: Month9Strand, 10: Month10Strand, 11: Month11Strand, 12: Month12Strand,
};

const PART_NAMES = [
  'Boker 1','Boker 2','Boker 3',
  'Tzohorayim 1','Tzohorayim 2','Tzohorayim 3',
  'Tzohorayim 4','Tzohorayim 5','Tzohorayim 6',
  'Erev 1','Erev 2','Erev 3',
  'Laylah 1','Laylah 2','Laylah 3',
  'Laylah 4','Laylah 5','Laylah 6'
];

function getFeastDayName(month: number, day: number): string | null {
  if (month === 1) {
    if (day === 10) return 'Pick Lamb';
    if (day === 14) return 'Slaughter Lamb (Evening)';
    if (day >= 15 && day <= 21) return 'Unleavened Bread';
  }
  if (month === 2) {
    if (day === 14) return 'Pesach';
    if (day >= 15 && day <= 21) return 'Unleavened Bread';
  }
  if (month === 3 && day === 15) return "Shavu'ot";
  if (month === 5 && day === 3) return 'New Wine';
  if (month === 6) {
    if (day === 22) return 'New Oil';
    if (day >= 23 && day <= 27) return 'Wood Gathering';
  }
  if (month === 7) {
    if (day === 1) return 'Yowm Teruah';
    if (day >= 9 && day <= 10) return 'Yowm Kippur';
    if (day >= 15 && day <= 22) return 'Sukkot';
  }
  return null;
}

function getSeasonForMonth(m: number) {
  return SEASONS.find(s => s.months.includes(m)) || SEASONS[0];
}

// ─── Info Panel ───
function DayInfoPanel({ year, month, day, theme, enochianDate }: {
  year: number; month: number; day: number; theme: any; enochianDate: any;
}) {
  const navigate = useNavigate();
  const feast = getFeastDayName(month, day);

  // Calculate Gregorian date for this YHWH date
  const EPOCH_DATE = new Date(2025, 2, 20);
  const monthDays = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
  let daysFromEpoch = 0;
  const yearDiff = year - 6029;
  daysFromEpoch += yearDiff * 364;
  for (let i = 0; i < month - 1; i++) daysFromEpoch += monthDays[i];
  daysFromEpoch += day - 1;
  const gregorianDate = new Date(EPOCH_DATE);
  gregorianDate.setDate(gregorianDate.getDate() + daysFromEpoch);
  const gregFormatted = `${gregorianDate.getFullYear()}/${String(gregorianDate.getMonth() + 1).padStart(2, '0')}/${String(gregorianDate.getDate()).padStart(2, '0')}`;
  const noteKey = `M${month}_D${day}`;
  const dayNotes = sacredCalendarNotes?.[noteKey];
  const isSabbath = enochianDate?.weekDay === 7;
  const season = getSeasonForMonth(month);

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto pr-1" style={{ maxHeight: '500px' }}>
      {/* Day Header */}
      <div className="text-center pb-2" style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
        <div className="text-2xl font-black" style={{ color: theme.accent }}>
          Day {day}
        </div>
        <div className="text-xs mt-1" style={{ color: theme.textSecondary }}>
          Month {month} • Year {year}
        </div>
        <div className="text-xs mt-1" style={{ color: theme.textSecondary }}>
          {TRIBES[month - 1]} • Part {enochianDate?.part || 1}/18
        </div>
        <div className="text-[10px] mt-0.5" style={{ color: theme.textSecondary, opacity: 0.7 }}>
          Gregorian: {gregFormatted}
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {isSabbath && (
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
            <Star className="w-3 h-3 mr-1" /> 🕊️ Shabbat
          </Badge>
        )}
        {feast && (
          <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[10px]">
            <Calendar className="w-3 h-3 mr-1" /> 🕎 {feast}
          </Badge>
        )}
        <Badge className="border-white/10 text-[10px]" style={{ color: theme.textSecondary }}>
          {season.emoji} {season.northern}
        </Badge>
      </div>

      {/* Sacred History */}
      {dayNotes && dayNotes.notes.length > 0 && (
        <div className="rounded-xl p-3" style={{ background: `${theme.accent}15`, border: `1px solid ${theme.accent}30` }}>
          <div className="flex items-center gap-1.5 mb-2">
            <BookOpen className="w-3.5 h-3.5" style={{ color: theme.accent }} />
            <span className="text-xs font-semibold" style={{ color: theme.accent }}>Sacred History</span>
          </div>
          <div className="space-y-1">
            {dayNotes.notes.slice(0, 3).map((note: string, i: number) => (
              <p key={i} className="text-[11px] leading-relaxed pl-2" style={{ 
                color: theme.textSecondary,
                borderLeft: `2px solid ${theme.accent}40`
              }}>
                {note}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto pt-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-[11px] gap-1 h-8"
          style={{ borderColor: theme.cardBorder, color: theme.textSecondary }}
          onClick={() => navigate(`/profile?tab=journal&year=${year}&month=${month}&day=${day}&view=journal`)}
        >
          <PenLine className="w-3 h-3" /> Journal
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-[11px] gap-1 h-8"
          style={{ borderColor: theme.cardBorder, color: theme.textSecondary }}
          onClick={() => navigate(`/profile?tab=journal&year=${year}&month=${month}&day=${day}&view=diary`)}
        >
          <BookOpen className="w-3 h-3" /> Diary
        </Button>
      </div>
    </div>
  );
}

// ─── Feast Event Cards ───
function FeastEventCards({ month, theme }: { month: number; theme: any }) {
  const feasts: { day: number; name: string; rest?: boolean }[] = [];
  
  // Collect all feast days for this month
  for (let d = 1; d <= 31; d++) {
    const name = getFeastDayName(month, d);
    if (name) {
      const isRest = (month === 1 && (d === 15 || d === 21)) ||
                     (month === 2 && (d === 15 || d === 21)) ||
                     (month === 7 && (d === 1 || d === 10 || d === 15 || d === 22));
      feasts.push({ day: d, name, rest: isRest });
    }
  }

  // Group consecutive feast days
  const grouped: { days: string; name: string; rest?: boolean }[] = [];
  let i = 0;
  while (i < feasts.length) {
    let j = i;
    while (j + 1 < feasts.length && feasts[j + 1].day === feasts[j].day + 1 && feasts[j + 1].name === feasts[j].name) {
      j++;
    }
    grouped.push({
      days: i === j ? `Day ${feasts[i].day}` : `Days ${feasts[i].day}–${feasts[j].day}`,
      name: feasts[i].name,
      rest: feasts[i].rest,
    });
    i = j + 1;
  }

  if (grouped.length === 0) return null;

  return (
    <div className="space-y-2">
      {grouped.map((feast, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="rounded-xl p-3 flex items-center gap-3"
          style={{
            background: `${theme.accent}12`,
            border: `1px solid ${theme.accent}25`,
          }}
        >
          <div className="text-xl">🕎</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{feast.name}</div>
            <div className="text-xs" style={{ color: theme.textSecondary }}>{feast.days}</div>
          </div>
          {feast.rest && (
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] shrink-0">
              🕊️ Rest
            </Badge>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ─── Main Feed Component ───
export default function SacredCalendarFeed() {
  const navigate = useNavigate();
  const { location } = useUserLocation();
  const [theme, setTheme] = useState(getCurrentTheme());
  const [activeMonth, setActiveMonth] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);
  const [viewMode, setViewMode] = useState<'beads' | 'wheel'>('beads');
  const [direction, setDirection] = useState(0);
  const touchStartX = useRef(0);

  const [enochianDate, setEnochianDate] = useState({
    year: 6028, month: 1, dayOfMonth: 1, part: 1, dayOfYear: 1, weekDay: 1
  });

  // Theme rotation
  useEffect(() => {
    const interval = setInterval(() => setTheme(getCurrentTheme()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Calendar date update
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const cd = calculateCreatorDate(now);
      const ct = getCreatorTime(now, location.lat, location.lon);
      setEnochianDate({
        year: cd.year, month: cd.month, dayOfMonth: cd.day,
        part: ct.part, dayOfYear: cd.dayOfYear, weekDay: cd.weekDay
      });
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [location.lat, location.lon]);

  // Set active month to current on load
  useEffect(() => {
    if (enochianDate.month >= 1 && enochianDate.month <= 12) {
      setActiveMonth(enochianDate.month);
      setSelectedDay(enochianDate.dayOfMonth);
    }
  }, [enochianDate.month]);

  const goToMonth = useCallback((m: number) => {
    if (m < 1 || m > 12) return;
    setDirection(m > activeMonth ? 1 : -1);
    setActiveMonth(m);
    setSelectedDay(1);
  }, [activeMonth]);

  const goPrev = useCallback(() => {
    if (activeMonth > 1) { setDirection(-1); setActiveMonth(p => p - 1); setSelectedDay(1); }
  }, [activeMonth]);

  const goNext = useCallback(() => {
    if (activeMonth < 12) { setDirection(1); setActiveMonth(p => p + 1); setSelectedDay(1); }
  }, [activeMonth]);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? goNext() : goPrev(); }
  };

  const isCurrentMonth = activeMonth === enochianDate.month;
  const season = getSeasonForMonth(activeMonth);
  const MonthComponent = MonthComponents[activeMonth];
  const isNorthern = location.lat >= 0;

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -200 : 200, opacity: 0 }),
  };

  const [wheelSize, setWheelSize] = useState(320);
  useEffect(() => {
    const update = () => setWheelSize(Math.min(window.innerWidth * 0.85, 500));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div className="min-h-screen w-full pb-24" style={{ background: theme.background }}>
      {/* ─── Header Card ─── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-2xl px-4 pt-6 pb-3"
      >
        <div className="rounded-2xl p-4" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
          <h1 className="text-2xl font-black text-center bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 bg-clip-text text-transparent">
            364yhvh Calendar
          </h1>
          <p className="text-center text-xs mt-1" style={{ color: theme.textSecondary }}>
            Sunrise to Sunrise • Eternal Alignment
          </p>

          {/* Current date info */}
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: `${theme.accent}20`, color: theme.accent }}>
              Year {enochianDate.year} • M{enochianDate.month} • D{enochianDate.dayOfMonth}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: `${theme.accent}20`, color: theme.accent }}>
              Part {enochianDate.part}/18 • {PART_NAMES[enochianDate.part - 1]}
            </span>
          </div>

          {/* Location */}
          <div className="flex items-center justify-center gap-1.5 mt-2 text-[10px]" style={{ color: theme.textSecondary }}>
            <MapPin className={`w-3 h-3 ${location.verified ? 'text-green-400' : 'text-yellow-400'}`} />
            <span>{location.verified ? 'Verified' : 'Approx'} ({location.lat.toFixed(1)}°, {location.lon.toFixed(1)}°) • {isNorthern ? 'N' : 'S'}</span>
          </div>
        </div>
      </motion.div>

      {/* ─── View Toggle ─── */}
      <div className="mx-auto max-w-2xl px-4 mb-3">
        <div className="flex justify-center">
          <div className="inline-flex rounded-full p-1" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
            <button
              onClick={() => setViewMode('beads')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${viewMode === 'beads' ? 'shadow-lg' : 'opacity-60'}`}
              style={{
                background: viewMode === 'beads' ? theme.accent : 'transparent',
                color: viewMode === 'beads' ? '#000' : theme.textSecondary,
              }}
            >
              📿 Ed's Beads
            </button>
            <button
              onClick={() => setViewMode('wheel')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${viewMode === 'wheel' ? 'shadow-lg' : 'opacity-60'}`}
              style={{
                background: viewMode === 'wheel' ? theme.accent : 'transparent',
                color: viewMode === 'wheel' ? '#000' : theme.textSecondary,
              }}
            >
              ☸️ Wheel
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'beads' ? (
          <motion.div key="beads" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* ─── Season Bar ─── */}
            <div className="mx-auto max-w-2xl px-4 mb-3">
              <div className={`rounded-xl p-2.5 bg-gradient-to-r ${season.gradient}`} style={{ border: `1px solid ${season.accent}30` }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: season.accent }}>
                    {season.emoji} {isNorthern ? season.northern : season.southern}
                  </span>
                  <span className="text-sm font-black" style={{ color: season.accent }}>
                    Month {activeMonth} — {TRIBES[activeMonth - 1]}
                  </span>
                  {isCurrentMonth && (
                    <span className="text-[10px] text-pink-300 font-semibold">● NOW</span>
                  )}
                </div>
              </div>
            </div>

            {/* ─── Split Bead + Info Panel ─── */}
            <div className="mx-auto max-w-2xl px-4 mb-4">
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                <div className="flex" style={{ minHeight: '520px' }}>
                  {/* Left: Beads — full height */}
                  <div className="relative flex-shrink-0 flex flex-col" style={{ width: '38%' }}>
                    {/* Nav arrows */}
                    <button
                      onClick={goPrev}
                      disabled={activeMonth <= 1}
                      className="absolute left-1 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 disabled:opacity-20"
                    >
                      <ChevronLeft className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={goNext}
                      disabled={activeMonth >= 12}
                      className="absolute right-1 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 disabled:opacity-20"
                    >
                      <ChevronRight className="w-4 h-4 text-white" />
                    </button>

                    <div className="flex-1 overflow-hidden">
                      <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                          key={activeMonth}
                          custom={direction}
                          variants={slideVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="flex justify-center h-full w-full"
                        >
                          <div className="transform scale-[0.95] origin-top w-full">
                            <MonthComponent
                              dayOfMonth={isCurrentMonth ? enochianDate.dayOfMonth : 0}
                              year={enochianDate.year}
                              currentMonth={enochianDate.month}
                              currentDayOfMonth={enochianDate.dayOfMonth}
                            />
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Right: Info Panel */}
                  <div className="flex-1 p-4" style={{ borderLeft: `1px solid ${theme.cardBorder}` }}>
                    <DayInfoPanel
                      year={enochianDate.year}
                      month={activeMonth}
                      day={isCurrentMonth ? enochianDate.dayOfMonth : selectedDay}
                      theme={theme}
                      enochianDate={isCurrentMonth ? enochianDate : { ...enochianDate, weekDay: 1 }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Month Dots ─── */}
            <div className="mx-auto max-w-2xl px-4 mb-4">
              <div className="flex items-center justify-center gap-1.5">
                {Array.from({ length: 12 }, (_, i) => {
                  const m = i + 1;
                  const isActive = m === activeMonth;
                  const isCurrent = m === enochianDate.month;
                  return (
                    <button
                      key={m}
                      onClick={() => goToMonth(m)}
                      className={`relative flex items-center justify-center rounded-full transition-all duration-200 ${
                        isActive ? 'w-7 h-7 font-black text-[11px]' : 'w-6 h-6 text-[10px] font-semibold opacity-60 hover:opacity-100'
                      }`}
                      style={{
                        background: isActive ? theme.accent : `${theme.accent}20`,
                        color: isActive ? '#000' : theme.textSecondary,
                        boxShadow: isCurrent && !isActive ? `0 0 0 2px #ec4899` : undefined,
                      }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
              <p className="text-center text-[10px] mt-1.5" style={{ color: `${theme.textSecondary}80` }}>
                Swipe or tap to navigate months
              </p>
            </div>

            {/* ─── Feast Event Cards ─── */}
            <div className="mx-auto max-w-2xl px-4 mb-4">
              <FeastEventCards month={activeMonth} theme={theme} />
            </div>

            {/* ─── Garden Guide Card ─── */}
            <div className="mx-auto max-w-2xl px-4 mb-4">
              <div className="rounded-2xl p-4" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                <div className="flex items-center gap-2 mb-3">
                  <Sprout className="w-4 h-4" style={{ color: theme.accent }} />
                  <span className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Garden Guide</span>
                </div>
                <GardenGuideSection
                  gregorianDate={new Date()}
                  weekDay={enochianDate.weekDay}
                  yhwhMonth={activeMonth}
                  yhwhDay={isCurrentMonth ? enochianDate.dayOfMonth : 1}
                />
              </div>
            </div>

            {/* ─── Legend ─── */}
            <div className="mx-auto max-w-2xl px-4 mb-4">
              <div className="rounded-2xl p-4" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: theme.accent }}>Bead Colors</h3>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#fbbf24] shadow-sm" />
                    <span style={{ color: theme.textSecondary }}>Sabbath (7th Day)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#22d3ee] shadow-sm" />
                    <span style={{ color: theme.textSecondary }}>Feast Day</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#1f2937] border border-white/20 shadow-sm" />
                    <span style={{ color: theme.textSecondary }}>Regular Day</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 shadow-sm animate-pulse" />
                    <span style={{ color: theme.textSecondary }}>Today</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ─── Wheel View ─── */
          <motion.div key="wheel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="mx-auto max-w-2xl px-4">
              <div className="rounded-2xl p-4 flex justify-center" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                <RemnantsWheelCalendar size={wheelSize} />
              </div>

              {/* Week structure */}
              <div className="rounded-2xl p-4 mt-4" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: theme.accent }}>Year-End Week Structure</h3>
                <div className="space-y-1 text-[11px]" style={{ color: theme.textSecondary }}>
                  <p><span className="text-purple-400">Day 361</span> — 52nd Sabbath (end of Man's count)</p>
                  <p><span className="text-pink-400">• DOT 1</span> — Helo-Yaseph</p>
                  <p><span className="text-pink-400">• DOT 2</span> — Asfa'el (leap years)</p>
                  <p><span className="text-cyan-400">Day 362-364</span> — YHVH Days 1-3</p>
                  <p><span className="text-amber-400">Tequvah</span> — YHVH Day 4 = Man's Day 1 (New Year)</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="mx-auto max-w-2xl px-4 mt-4">
        <p className="text-center text-[10px]" style={{ color: `${theme.textSecondary}60` }}>
          Day begins at sunrise, not midnight • Location determines sunrise time
        </p>
      </div>
    </div>
  );
}
