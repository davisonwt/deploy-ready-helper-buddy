/**
 * Yhvh364Page — the 364yhvh living calendar.
 *
 * Brings back the wheels-in-wheels, the bead-strand month calendar, the
 * diary/journal, and the daily garden tips into one sacred-time page.
 * All time data flows from useSacredNow() so day rollover happens at the
 * user's local sunrise.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sprout, BookOpen, Sparkles, Sun } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { YHVHWheelCalendarLive } from '@/components/watch/YHVHWheelCalendar';
import BeadCalendarNavigator from '@/components/watch/BeadCalendarNavigator';
import { LocationVerification } from '@/components/calendar/LocationVerification';
import Journal from '@/components/journal/Journal';
import GardenSetup from '@/components/garden/GardenSetup';
import { useSacredNow } from '@/hooks/useSacredNow';
import { useSeasonalArt } from '@/hooks/useSeasonalArt';
import { useUserLocation } from '@/hooks/useUserLocation';

const GARDEN_TIPS: Record<number, string[]> = {
  // Indexed by month — at least one tip per month in the Creator's year.
  1: ['Aviv: prepare beds and sow early greens.', 'Pesach week — rest the soil after the feast.'],
  2: ['Iyar: thin seedlings, mulch deeply.', 'Watch for the first fruit set — bestow water at dawn.'],
  3: ['Sivan: harvest first wheat at Shavu’ot.', 'Pinch back herbs to encourage bushy growth.'],
  4: ['Tammuz: water before sunrise to beat the heat.', 'Shade tender crops at midday.'],
  5: ['Av: prune for airflow, watch for pests.', 'Save the strongest seeds for next year.'],
  6: ['Elul: prepare for the autumn feasts — clear weeds.', 'Sow late greens for cool-season harvest.'],
  7: ['Tishrei: feast month — gather the harvest.', 'Cover crops protect the soil through the wet months.'],
  8: ['Cheshvan: plant garlic and onions.', 'Compost the year’s spent growth.'],
  9: ['Kislev: rest with the soil. Plan next year’s plot.', 'Tend indoor sprouts and herbs.'],
  10: ['Tevet: prune dormant fruit trees.', 'Sharpen tools for the coming year.'],
  11: ['Shevat: bless the trees — Tu BiShvat.', 'Start seeds indoors for spring transplants.'],
  12: ['Adar: prepare beds for Aviv. Test soil and amend.', 'Welcome the wave-sheaf with clean rows.'],
};

function GardenTipCard({ month, dayOfYear }: { month: number; dayOfYear: number }) {
  const tips = GARDEN_TIPS[month] ?? ['Tend the garden you’ve been given.'];
  const tip = tips[dayOfYear % tips.length];
  return (
    <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 to-slate-900/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-emerald-300">
          <Sprout className="h-5 w-5" />
          Today’s Garden Tip
        </CardTitle>
      </CardHeader>
      <CardContent className="text-emerald-50/90 text-sm leading-relaxed">{tip}</CardContent>
    </Card>
  );
}

export default function Yhvh364Page() {
  const sacred = useSacredNow();
  const { location } = useUserLocation();
  const { imageUrl: monthImage } = useSeasonalArt(sacred.date.month, location.lat, location.lon);

  const headerLine = useMemo(() => {
    const omer = sacred.omer ? ` · Omer ${sacred.omer}/${sacred.omerTotal}` : '';
    const sabbath = sacred.isSabbath ? ' · Sabbath' : '';
    const feast = sacred.isFeast && sacred.feastName ? ` · ${sacred.feastName}` : '';
    return `Year ${sacred.date.year} · Month ${sacred.date.month} · Day ${sacred.date.day}${omer}${sabbath}${feast}`;
  }, [sacred]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a15] via-[#0f1226] to-[#0a0a15]">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Button>
          </Link>
          <div className="text-right">
            <div className="text-xs uppercase tracking-widest text-amber-300/70">364 YHVH</div>
            <div className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
              The Living Calendar
            </div>
          </div>
        </div>

        {/* Live sacred-time banner */}
        <Card className="mb-6 border-amber-500/30 bg-black/40 backdrop-blur">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-3">
              <Sun className="h-6 w-6 text-amber-400" />
              <div>
                <div className="text-lg font-semibold text-amber-100">{headerLine}</div>
                <div className="text-xs text-amber-200/60">
                  {sacred.sunriseAware ? 'Day rolls at your local sunrise' : 'Using fallback time — verify location for sunrise rollover'}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {sacred.isSabbath && <Badge className="bg-yellow-600/30 text-yellow-200">Sabbath Rest</Badge>}
              {sacred.omer && <Badge className="bg-amber-600/30 text-amber-200">Omer {sacred.omer}/{sacred.omerTotal}</Badge>}
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-200">Day {sacred.dayOfYear}/364</Badge>
            </div>
          </CardContent>
        </Card>

        <LocationVerification />

        {/* Main tabbed surface */}
        <Tabs defaultValue="wheels" className="mt-6">
          <TabsList className="bg-black/40 border border-amber-500/20">
            <TabsTrigger value="wheels" className="gap-2"><Sparkles className="h-4 w-4" /> Wheels in Wheels</TabsTrigger>
            <TabsTrigger value="beads" className="gap-2"><Sprout className="h-4 w-4" /> Ed's Month Beads</TabsTrigger>
            <TabsTrigger value="journal" className="gap-2"><BookOpen className="h-4 w-4" /> Diary &amp; Journal</TabsTrigger>
            <TabsTrigger value="garden" className="gap-2"><Sprout className="h-4 w-4" /> Garden Tips</TabsTrigger>
          </TabsList>

          {/* Wheels-in-wheels live calendar */}
          <TabsContent value="wheels" className="mt-4">
            <Card className="border-amber-500/20 bg-black/40 overflow-hidden">
              {monthImage && (
                <div className="relative w-full h-40 md:h-56 overflow-hidden">
                  <img
                    src={monthImage}
                    alt={`Seasonal artwork for Month ${sacred.date.month}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
                </div>
              )}
              <CardContent className="flex justify-center p-6">
                <YHVHWheelCalendarLive size={Math.min(700, typeof window !== 'undefined' ? window.innerWidth * 0.7 : 700)} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bead strands per month — flip between months */}
          <TabsContent value="beads" className="mt-4">
            <BeadCalendarNavigator
              currentMonth={sacred.date.month}
              currentDay={sacred.date.day}
              currentYear={sacred.date.year}
            />
          </TabsContent>

          {/* Diary / Journal */}
          <TabsContent value="journal" className="mt-4">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Journal />
            </motion.div>
          </TabsContent>

          {/* Garden Tips + Setup */}
          <TabsContent value="garden" className="mt-4 space-y-4">
            <GardenTipCard month={sacred.date.month} dayOfYear={sacred.dayOfYear} />
            <Card className="border-emerald-500/20 bg-black/40">
              <CardHeader>
                <CardTitle className="text-emerald-200">All Tips This Month</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-emerald-50/80">
                {(GARDEN_TIPS[sacred.date.month] ?? []).map((t, i) => (
                  <div key={i} className="rounded-md border border-emerald-500/20 bg-emerald-950/30 p-3">
                    {t}
                  </div>
                ))}
              </CardContent>
            </Card>
            <GardenSetup />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
