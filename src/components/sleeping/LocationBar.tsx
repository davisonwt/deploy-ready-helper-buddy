import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Loader2, Crosshair } from 'lucide-react';
import type { LocationStatus, ViewerLocation } from '@/hooks/useWorldwideLocation';
import { type DistanceUnit, RADIUS_CHOICES_M, formatRadius } from '@/lib/sleeping/units';

interface Props {
  location: ViewerLocation | null;
  status: LocationStatus;
  error: string | null;
  resolving: boolean;
  unit: DistanceUnit;
  radiusM: number;
  onRadiusChange: (metres: number) => void;
  onRequestBrowser: () => void;
  onSetPlace: (place: string) => Promise<boolean>;
  onClear: () => void;
}

/**
 * The location control for every Sleeping tab.
 *
 * Browser position first. If that is refused or unavailable, the viewer
 * types any place on earth. No country is suggested, pre-selected or
 * assumed anywhere in this component.
 */
export default function LocationBar({
  location, status, error, resolving, unit, radiusM,
  onRadiusChange, onRequestBrowser, onSetPlace, onClear,
}: Props) {
  const [place, setPlace] = useState('');

  const submitPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onSetPlace(place);
    if (ok) setPlace('');
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      {status === 'locating' && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Finding where you are...
        </p>
      )}

      {status === 'ready' && location && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="flex items-center gap-2 text-sm min-w-0">
            <MapPin className="w-4 h-4 shrink-0 text-primary" />
            <span className="truncate font-medium">{location.label}</span>
          </p>
          <Button variant="ghost" size="sm" onClick={onClear} className="h-8">
            Change
          </Button>
        </div>
      )}

      {(status === 'needs-place' || status === 'unknown' || status === 'error') && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Tell us where you are, so we can show what is near you.
          </p>

          <Button
            variant="outline"
            onClick={onRequestBrowser}
            className="w-full h-12 justify-center gap-2"
          >
            <Crosshair className="w-4 h-4" />
            Use my current location
          </Button>

          <form onSubmit={submitPlace} className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="Or type any town or city"
                aria-label="Town or city"
                className="h-12"
                autoComplete="off"
              />
              <Button type="submit" disabled={resolving || place.trim().length < 2} className="h-12 px-5">
                {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Go'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Anywhere on earth. Adding the country helps, for example "Lyon, France".
            </p>
          </form>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {status === 'ready' && (
        <div className="flex items-center gap-3 pt-1">
          <label htmlFor="radius" className="text-sm text-muted-foreground shrink-0">
            Within
          </label>
          <Select value={String(radiusM)} onValueChange={(v) => onRadiusChange(Number(v))}>
            <SelectTrigger id="radius" className="h-10 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RADIUS_CHOICES_M.map((m) => (
                <SelectItem key={m} value={String(m)}>{formatRadius(m, unit)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
