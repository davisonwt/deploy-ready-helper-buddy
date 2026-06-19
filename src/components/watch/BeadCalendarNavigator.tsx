/**
 * BeadCalendarNavigator
 *
 * Month-by-month bead strand viewer matching the legacy 364yhvh layout:
 *  - Hemisphere season header (Northern / Southern)
 *  - Month title with bead count
 *  - Auto-scaled bead strand so the entire month fits on any screen
 *  - Opens centered on today's bead
 *  - Prev / Next chevrons + dot navigator (1..12 + Helo-Yaseph)
 */

import React, { useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import {
  Month1Strand, Month2Strand, Month3Strand, Month4Strand,
  Month5Strand, Month6Strand, Month7Strand, Month8Strand,
  Month9Strand, Month10Strand, Month11Strand, Month12Strand,
} from './EnochianWheelCalendar';

const STRANDS = [
  Month1Strand, Month2Strand, Month3Strand, Month4Strand,
  Month5Strand, Month6Strand, Month7Strand, Month8Strand,
  Month9Strand, Month10Strand, Month11Strand, Month12Strand,
];

const MONTH_DAYS = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];

const NORTHERN_SEASONS = ['Spring', 'Spring', 'Spring', 'Summer', 'Summer', 'Summer', 'Fall', 'Fall', 'Fall', 'Winter', 'Winter', 'Winter'];
const SOUTHERN_SEASONS = ['Fall', 'Fall', 'Fall', 'Winter', 'Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer', 'Summer', 'Summer'];

interface Props {
  currentMonth: number; // 1-12
  currentDay: number;   // 1-31
  currentYear: number;
}

export default function BeadCalendarNavigator({ currentMonth, currentDay, currentYear }: Props) {
  // -1 = Helo-Yaseph (day out of time), 0..11 = months
  const [view, setView] = useState<number>(currentMonth - 1);

  const isHelo = view === -1;
  const monthIndex = isHelo ? -1 : view;

  const Strand = !isHelo ? STRANDS[monthIndex] : null;
  const monthNum = monthIndex + 1;
  const beadCount = !isHelo ? (monthNum === 1 ? 33 : MONTH_DAYS[monthIndex]) : 1;

  const northSeason = !isHelo ? NORTHERN_SEASONS[monthIndex] : '—';
  const southSeason = !isHelo ? SOUTHERN_SEASONS[monthIndex] : '—';

  const goPrev = () => setView(v => (v === -1 ? 11 : v === 0 ? -1 : v - 1));
  const goNext = () => setView(v => (v === 11 ? -1 : v === -1 ? 0 : v + 1));

  // Only pass real day if viewing the actual current month
  const dayProp = !isHelo && monthNum === currentMonth ? currentDay : 0;

  return (
    <div className="relative w-full bg-gradient-to-b from-[#0a0a15] via-[#0f1226] to-[#0a0a15] rounded-2xl overflow-hidden border border-amber-500/20">
      {/* Season header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-amber-500/10 bg-black/40">
        <div className="flex items-center gap-2 text-emerald-300">
          <span className="text-xs uppercase tracking-widest text-emerald-400/70">Northern</span>
          <span className="font-bold">❄ {northSeason}</span>
        </div>
        <div className="text-center">
          <div className="text-lg md:text-xl font-bold text-emerald-300">
            {isHelo ? 'Helo-Yaseph' : `Month ${monthNum}`}
          </div>
        </div>
        <div className="flex items-center gap-2 text-emerald-300">
          <span className="font-bold">🍃 {southSeason}</span>
          <span className="text-xs uppercase tracking-widest text-emerald-400/70">Southern</span>
        </div>
      </div>

      {/* Strand viewport with side chevrons */}
      <div className="relative flex items-center min-h-[420px]">
        <button
          onClick={goPrev}
          aria-label="Previous month"
          className="absolute left-2 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 border border-amber-500/30 text-amber-200 flex items-center justify-center transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 flex justify-center px-12 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md flex flex-col items-center"
            >
              {isHelo ? (
                <HeloYasephView />
              ) : (
                <>
                  <div className="text-center mb-4">
                    <h3 className="text-2xl md:text-3xl font-bold text-amber-400">MONTH {monthNum}</h3>
                    <p className="text-sm text-amber-200/70 mt-1">
                      {beadCount} Beads{monthNum === 1 ? ' (includes days 29-31 from Month 12)' : ''}
                    </p>
                  </div>
                  <FitStrand viewKey={`${view}-${dayProp}`}>
                    {Strand && <Strand dayOfMonth={dayProp} year={currentYear} />}
                  </FitStrand>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <button
          onClick={goNext}
          aria-label="Next month"
          className="absolute right-2 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 border border-amber-500/30 text-amber-200 flex items-center justify-center transition"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Dot navigator */}
      <div className="px-4 py-4 border-t border-amber-500/10 bg-black/40">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(n => {
            const active = !isHelo && n === monthNum;
            const isToday = n === currentMonth;
            return (
              <button
                key={n}
                onClick={() => setView(n - 1)}
                className={`w-9 h-9 rounded-full text-sm font-semibold transition-all ${
                  active
                    ? 'bg-amber-500 text-black ring-2 ring-amber-300 scale-110'
                    : isToday
                    ? 'bg-amber-900/60 text-amber-200 border border-amber-400/60'
                    : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700'
                }`}
                aria-label={`Month ${n}`}
              >
                {n}
              </button>
            );
          })}
          <button
            onClick={() => setView(-1)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              isHelo
                ? 'bg-purple-500 text-white ring-2 ring-purple-300 scale-110'
                : 'bg-purple-900/60 text-purple-200 border border-purple-500/60 hover:bg-purple-800/60'
            }`}
            aria-label="Helo-Yaseph (Day Out of Time)"
            title="Helo-Yaseph • Day Out of Time"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-xs text-slate-400 mt-2">Tap to navigate months · ✨ = Day Out of Time</p>
      </div>
    </div>
  );
}

function HeloYasephView() {
  return (
    <div className="text-center px-4 py-8">
      <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-purple-900 to-black border-4 border-purple-700 shadow-2xl flex items-center justify-center mb-6">
        <span className="text-xl font-bold text-purple-200">אֱלוֹיָסֵף</span>
      </div>
      <h3 className="text-3xl font-bold text-amber-300 mb-2">Helo-Yaseph</h3>
      <p className="text-purple-200 mb-6">Day Out of Time 1</p>
      <div className="rounded-xl bg-purple-950/40 border border-purple-500/30 p-5 text-left space-y-3">
        <p className="text-sm text-purple-100/90 leading-relaxed">
          Helo-Yaseph (the 6th month's name) — Day out of time 1: if the
          tequvah appears on the 2nd day of the 7th month only 1 day is added
          and this day is not counted.
        </p>
        <div className="border-t border-purple-500/20 pt-3">
          <p className="text-amber-300 font-semibold text-sm">בְּרֵאשִׁית / Genesis 1:1-2</p>
          <p className="italic text-purple-100/80 text-sm mt-1">
            "In the beginning Elohim created the heavens and the earth. And the
            earth was without form, and void; and darkness was upon the face of
            the deep."
          </p>
        </div>
        <p className="text-center text-xs uppercase tracking-widest text-amber-400/80 pt-2">
          Eternity — A Place Where No Time Existed
        </p>
        <p className="text-center text-xs text-purple-300/70">Not counted in the sacred calendar</p>
      </div>
    </div>
  );
}

/**
 * FitStrand
 *
 * Measures its child strand's natural size and scales it down with a CSS
 * transform so the entire month of beads is visible without scrolling on any
 * screen. Also auto-centers on today's bead (the `.scale-150` "isToday" bead
 * rendered by the Month*Strand components) when content does still overflow.
 */
function FitStrand({ children, viewKey }: { children: React.ReactNode; viewKey: string }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const fit = () => {
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (!outer || !inner) return;
      // Reset before measuring
      inner.style.transform = 'none';
      const oh = outer.clientHeight;
      const ow = outer.clientWidth;
      const ih = inner.scrollHeight;
      const iw = inner.scrollWidth;
      if (!ih || !iw) return;
      const s = Math.min(1, oh / ih, ow / iw);
      setScale(s);
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (outerRef.current) ro.observe(outerRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    window.addEventListener('resize', fit);
    // Re-fit after fonts/images settle
    const t = setTimeout(fit, 300);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fit);
      clearTimeout(t);
    };
  }, [viewKey]);

  return (
    <div
      ref={outerRef}
      className="w-full flex justify-center items-start overflow-hidden"
      style={{ height: 'min(70vh, calc(100dvh - 320px))' }}
    >
      <div
        ref={innerRef}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          width: '100%',
        }}
      >
        {children}
      </div>
    </div>
  );
}
