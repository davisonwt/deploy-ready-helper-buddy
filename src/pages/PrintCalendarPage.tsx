import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, MapPin, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUserLocation } from '@/hooks/useUserLocation';
import { getCreatorDateSync } from '@/utils/customCalendar';
import { getRegion, describeRegion, scripturalMonthToSeason, type SeasonLabel } from '@/utils/calendarSeason';
import { loadCalendarBundle, calendarFilename, type CalendarBundle } from '@/lib/calendarPdf/buildCalendar';
import type { CalendarOutput } from '@/lib/calendarPdf/WallCalendarDocument';
import { MONTH_LABELS } from '@/utils/calendarYearBuild';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { buildSeasonalChoiceUrls } from '@/hooks/useSeasonalArt';

type Phase = 'idle' | 'generating-art' | 'rendering-pdf' | 'done' | 'error';

type PickerSeason = 'autumn' | 'summer' | 'spring' | 'winter';

interface CuratedPhoto {
  id: string;
  scriptural_month: number | null;
  season: PickerSeason;
  slot: number;
  public_url: string;
  label: string | null;
}

interface MonthPhotoChoice {
  id: string;
  season: PickerSeason;
  slot: number;
  url: string;
  label: string;
}

const DEFAULT_MONTH_SLOTS = Object.fromEntries(
  Array.from({ length: 12 }, (_, i) => [i + 1, 1]),
) as Record<number, number>;

/** Map any season label (incl. wet/dry/polar) to one of the 4 picker buckets. */
function pickerSeasonFor(label: SeasonLabel): PickerSeason {
  switch (label) {
    case 'spring': return 'spring';
    case 'summer':
    case 'wet':
    case 'polar-day': return 'summer';
    case 'autumn': return 'autumn';
    case 'winter':
    case 'dry':
    case 'polar-night': return 'winter';
  }
}

const PrintCalendarPage: React.FC = () => {
  const { toast } = useToast();
  const { location, loading: locLoading, verifyLocation } = useUserLocation();

  const currentScripturalYear = useMemo(() => getCreatorDateSync(new Date()).year, []);
  const [year, setYear] = useState<number>(currentScripturalYear);
  const [output, setOutput] = useState<CalendarOutput>('both');
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<string>('');
  const [previewBundle, setPreviewBundle] = useState<CalendarBundle | null>(null);
  const [photos, setPhotos] = useState<CuratedPhoto[]>([]);
  const [selectedMonthSlots, setSelectedMonthSlots] = useState<Record<number, number>>(DEFAULT_MONTH_SLOTS);

  const region = useMemo(() => getRegion(location.lat), [location.lat]);

  // Load curated photos
  useEffect(() => {
    supabase
      .from('curated_calendar_photos')
      .select('id,scriptural_month,season,slot,public_url,label')
      .order('scriptural_month', { nullsFirst: false })
      .order('slot')
      .then(({ data, error }) => {
        if (error) { console.error(error); return; }
        setPhotos((data ?? []) as CuratedPhoto[]);
      });
  }, []);

  const photosBySeason = useMemo(() => {
    const g: Record<PickerSeason, CuratedPhoto[]> = { autumn: [], summer: [], spring: [], winter: [] };
    for (const p of photos) {
      if (p.scriptural_month === null) g[p.season].push(p);
    }
    return g;
  }, [photos]);

  const photosByMonth = useMemo(() => {
    const g: Record<number, CuratedPhoto[]> = {};
    for (const p of photos) {
      if (p.scriptural_month) {
        g[p.scriptural_month] = [...(g[p.scriptural_month] ?? []), p];
      }
    }
    return g;
  }, [photos]);

  const monthChoicesByMonth = useMemo<Record<number, MonthPhotoChoice[]>>(() => {
    const choices: Record<number, MonthPhotoChoice[]> = {};

    for (let m = 1; m <= 12; m++) {
      const season = pickerSeasonFor(scripturalMonthToSeason(m, region));
      const localMonthPhotos = (photosByMonth[m] ?? []).filter((p) => p.season === season);
      const curated = localMonthPhotos.length ? localMonthPhotos : photosBySeason[season];

      choices[m] = curated.length > 0
        ? curated.map((p) => ({
            id: `${m}-${p.id}`,
            season,
            slot: p.slot,
            url: p.public_url,
            label: p.label ?? `${MONTH_LABELS[m - 1]} ${season} ${p.slot}`,
          }))
        : buildSeasonalChoiceUrls(m, region).map((url, index) => ({
            id: `${m}-fallback-${index + 1}`,
            season,
            slot: index + 1,
            url,
            label: `${MONTH_LABELS[m - 1]} ${season} ${index + 1}`,
          }));
    }

    return choices;
  }, [photosByMonth, photosBySeason, region]);

  // Build a per-month curated override map from the month-specific picks.
  const curatedImages = useMemo<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    for (let m = 1; m <= 12; m++) {
      const slot = selectedMonthSlots[m] ?? 1;
      const choice = monthChoicesByMonth[m]?.find((p) => p.slot === slot) ?? monthChoicesByMonth[m]?.[0];
      if (choice?.url) map[m] = choice.url;
    }
    return map;
  }, [monthChoicesByMonth, selectedMonthSlots]);

  // Preload bundle in background
  useEffect(() => {
    if (locLoading) return;
    let cancelled = false;
    loadCalendarBundle(year, location.lat, location.lon, curatedImages)
      .then((b) => { if (!cancelled) setPreviewBundle(b); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [year, location.lat, location.lon, locLoading, curatedImages]);

  const handleDownload = async () => {
    try {
      setPhase('generating-art');
      setProgress('Preparing seasonal artwork for your region…');
      const bundle = await loadCalendarBundle(year, location.lat, location.lon, curatedImages);

      setPhase('rendering-pdf');
      setProgress('Building your PDF…');
      const [{ pdf }, { WallCalendarDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/lib/calendarPdf/WallCalendarDocument'),
      ]);

      const blob = await pdf(
        <WallCalendarDocument year={bundle.year} monthImages={bundle.monthImages} output={output} />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = calendarFilename(year, bundle.region.key);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setPhase('done');
      setProgress('Downloaded.');
      toast({ title: 'Calendar ready', description: 'Your PDF has been downloaded.' });
    } catch (e) {
      console.error(e);
      setPhase('error');
      setProgress((e as Error).message || 'Something went wrong');
      toast({ title: 'Calendar failed', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const busy = phase === 'generating-art' || phase === 'rendering-pdf';
  const years = [currentScripturalYear, currentScripturalYear + 1];

  return (
    <div className="container mx-auto max-w-3xl py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link to="/dashboard"><ArrowLeft className="w-4 h-4 mr-2" />Back to Dashboard</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Print My Scriptural Calendar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-md border p-3 flex items-start gap-3 bg-muted/30">
            <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
            <div className="text-sm flex-1">
              <div className="font-medium">Seasonal artwork region</div>
              <div className="text-muted-foreground">
                {describeRegion(region)} — derived from your saved location ({location.lat.toFixed(2)}, {location.lon.toFixed(2)})
                {location.verified ? ' · verified' : ''}.
              </div>
              <div className="mt-2">
                <Button size="sm" variant="outline" onClick={verifyLocation} disabled={locLoading}>
                  Use my current location
                </Button>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Year</label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Output</label>
              <Select value={output} onValueChange={(v) => setOutput(v as CalendarOutput)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wall">Wall calendar (12 month pages)</SelectItem>
                  <SelectItem value="planner">Year planner (overview)</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Month Photo Picker */}
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium">Choose one photo for each month</div>
              <div className="text-xs text-muted-foreground">
                Each scriptural month has three real seasonal photos. The season is calculated from your location.
              </div>
            </div>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
              const localSeason = scripturalMonthToSeason(month, region);
              const choices = monthChoicesByMonth[month] ?? [];
              return (
                <div key={month}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {MONTH_LABELS[month - 1]}
                    </div>
                    <div className="text-[10px] font-medium text-muted-foreground capitalize">
                      {localSeason.replace('-', ' ')} artwork
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {choices.map((p) => {
                      const active = (selectedMonthSlots[month] ?? 1) === p.slot;
                      const fallbackUrl = buildSeasonalChoiceUrls(month, region)[p.slot - 1] ?? buildSeasonalChoiceUrls(month, region)[0];
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedMonthSlots((s) => ({ ...s, [month]: p.slot }))}
                          className={cn(
                            'relative rounded-md overflow-hidden border aspect-[4/3] bg-muted/30 transition',
                            active ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'hover:opacity-90',
                          )}
                        >
                          <img
                            src={p.url}
                            alt={`${MONTH_LABELS[month - 1]} ${p.label}`}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).src = fallbackUrl; }}
                          />
                          {active && (
                            <div className="absolute top-1 right-1 rounded-full bg-primary text-primary-foreground p-1">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] font-semibold px-1.5 py-1">
                            Option {p.slot}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <Button onClick={handleDownload} disabled={busy || locLoading} className="w-full">
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {busy ? progress : 'Download PDF'}
          </Button>

          {phase === 'error' && (
            <p className="text-sm text-destructive">{progress}</p>
          )}

          {/* Per-month preview reflecting current picks */}
          <div>
            <div className="text-sm font-medium mb-2">Month-by-month preview</div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const url = previewBundle?.monthImages[m];
                return (
                  <div key={m} className="relative rounded-md overflow-hidden border bg-muted/30 aspect-[3/4]">
                    {url ? (
                      <img src={url} alt={`${MONTH_LABELS[m - 1]} seasonal art`} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground text-center px-1">
                        Loading…
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] font-semibold px-1.5 py-1">
                      {MONTH_LABELS[m - 1]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrintCalendarPage;
