import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUserLocation } from '@/hooks/useUserLocation';
import { getCreatorDateSync } from '@/utils/customCalendar';
import { getRegion, describeRegion } from '@/utils/calendarSeason';
import { loadCalendarBundle, calendarFilename } from '@/lib/calendarPdf/buildCalendar';
import type { CalendarOutput } from '@/lib/calendarPdf/WallCalendarDocument';

type Phase = 'idle' | 'generating-art' | 'rendering-pdf' | 'done' | 'error';

const PrintCalendarPage: React.FC = () => {
  const { toast } = useToast();
  const { location, loading: locLoading, verifyLocation } = useUserLocation();

  const currentScripturalYear = useMemo(() => getCreatorDateSync(new Date()).year, []);
  const [year, setYear] = useState<number>(currentScripturalYear);
  const [output, setOutput] = useState<CalendarOutput>('both');
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<string>('');

  const region = useMemo(() => getRegion(location.lat), [location.lat]);

  // Preload bundle in background so first-time users in a new region aren't
  // staring at a spinner after they click Download.
  useEffect(() => {
    if (locLoading) return;
    void loadCalendarBundle(year, location.lat, location.lon).catch(() => {
      /* prewarm only — errors surface on the real Download click */
    });
  }, [year, location.lat, location.lon, locLoading]);

  const handleDownload = async () => {
    try {
      setPhase('generating-art');
      setProgress('Preparing seasonal artwork for your region…');
      const bundle = await loadCalendarBundle(year, location.lat, location.lon);

      setPhase('rendering-pdf');
      setProgress('Building your PDF…');
      // Lazy-load @react-pdf/renderer so it doesn't bloat the dashboard bundle.
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

          <Button onClick={handleDownload} disabled={busy || locLoading} className="w-full">
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {busy ? progress : 'Download PDF'}
          </Button>

          {phase === 'error' && (
            <p className="text-sm text-destructive">{progress}</p>
          )}

          <p className="text-xs text-muted-foreground">
            First-time generation for a brand-new region takes a minute while 12 seasonal images are produced.
            After that, the same images are reused for everyone in your region — no wait, no per-user regeneration.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrintCalendarPage;
