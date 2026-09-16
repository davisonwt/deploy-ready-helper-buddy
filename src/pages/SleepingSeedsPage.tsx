import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useWorldwideLocation } from '@/hooks/useWorldwideLocation';
import LocationBar from '@/components/sleeping/LocationBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, SlidersHorizontal } from 'lucide-react';
import {
  DEFAULT_RADIUS_M, formatDistance, unitForViewer,
} from '@/lib/sleeping/units';
import { formatNativeAmount } from '@/lib/sleeping/currency';
import SignedImg from '@/components/media/SignedImg';
import {
  RATE_PERIODS, USE_TAGS, VEHICLE_TYPES, ratesOn, vehicleTypeLabel,
} from '@/lib/sleeping/wheelOptions';

type TabKey = 'wheels' | 'pillows' | 'hands';

const TAB_TO_KIND: Record<TabKey, 'wheel' | 'pillow' | 'hand'> = {
  wheels: 'wheel',
  pillows: 'pillow',
  hands: 'hand',
};

const EMPTY_COPY: Record<TabKey, { message: string; cta: string; to: string }> = {
  wheels:  { message: 'No vehicles near you yet — be the first', cta: 'Register a vehicle', to: '/sow/wheel' },
  pillows: { message: 'No places to stay near you yet — be the first', cta: 'List a place', to: '/sow/pillow' },
  hands:   { message: 'No helping hands near you yet — be the first', cta: 'Offer a hand', to: '/sow/hand' },
};

interface WheelRow {
  product_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  sower_name: string | null;
  vehicle_type: string;
  use_tags: string[] | null;
  currency: string;
  rate_per_trip: number | null;
  rate_hourly: number | null;
  rate_per_km: number | null;
  rate_daily: number | null;
  rate_weekly: number | null;
  rate_monthly: number | null;
  base_location: string | null;
  distance_m: number;
  created_at: string;
}

interface ServiceRow {
  product_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  sower_name: string | null;
  price: number | null;
  base_location: string | null;
  distance_m: number;
  created_at: string;
}

/** Availability and listing times read in the viewer's own timezone. */
function localDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return '';
  }
}

export default function SleepingSeedsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const unit = useMemo(() => unitForViewer(), []);

  const tabParam = (params.get('tab') as TabKey) || 'wheels';
  const tab: TabKey = ['wheels', 'pillows', 'hands'].includes(tabParam) ? tabParam : 'wheels';

  const {
    location, status, error: locError, resolving,
    requestBrowserLocation, setPlace, clear,
  } = useWorldwideLocation();

  const [radiusM, setRadiusM] = useState(DEFAULT_RADIUS_M);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [wheels, setWheels] = useState<WheelRow[]>([]);
  const [others, setOthers] = useState<ServiceRow[]>([]);

  // Wheels filters
  const [showFilters, setShowFilters] = useState(false);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [useTags, setUseTags] = useState<string[]>([]);
  const [ratePeriods, setRatePeriods] = useState<string[]>([]);

  const toggle = (list: string[], value: string, set: (v: string[]) => void) => {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const setTab = (next: string) => {
    const p = new URLSearchParams(params);
    p.set('tab', next);
    setParams(p, { replace: true });
  };

  const load = useCallback(async () => {
    if (!location) return;
    setLoading(true);
    setLoadError(null);
    try {
      if (tab === 'wheels') {
        const { data, error } = await supabase.rpc('sleeping_wheels_near', {
          _lat: location.lat,
          _lng: location.lng,
          _radius_m: radiusM,
          _vehicle_types: vehicleTypes.length ? vehicleTypes : null,
          _use_tags: useTags.length ? useTags : null,
          _rate_periods: ratePeriods.length ? ratePeriods : null,
        });
        if (error) throw error;
        setWheels((data ?? []) as WheelRow[]);
      } else {
        const { data, error } = await supabase.rpc('sleeping_services_near', {
          _kind: TAB_TO_KIND[tab],
          _lat: location.lat,
          _lng: location.lng,
          _radius_m: radiusM,
        });
        if (error) throw error;
        setOthers((data ?? []) as ServiceRow[]);
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load listings.');
      setWheels([]);
      setOthers([]);
    } finally {
      setLoading(false);
    }
  }, [location, radiusM, tab, vehicleTypes, useTags, ratePeriods]);

  useEffect(() => { void load(); }, [load]);

  const empty = EMPTY_COPY[tab];
  const activeFilterCount = vehicleTypes.length + useTags.length + ratePeriods.length;

  return (
    <div className="container max-w-5xl mx-auto px-4 py-6">
      {/* Golden rule: every page has a visible way back. */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/cockpit')} className="mb-4 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Cockpit
      </Button>

      <header className="mb-5">
        <h1 className="text-2xl font-bold">Sleeping Seeds</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vehicles, places to stay and helping hands near you.
        </p>
      </header>

      <div className="mb-5">
        <LocationBar
          location={location}
          status={status}
          error={locError}
          resolving={resolving}
          unit={unit}
          radiusM={radiusM}
          onRadiusChange={setRadiusM}
          onRequestBrowser={requestBrowserLocation}
          onSetPlace={setPlace}
          onClear={clear}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 w-full mb-4">
          <TabsTrigger value="wheels">Wheels</TabsTrigger>
          <TabsTrigger value="pillows">Pillows</TabsTrigger>
          <TabsTrigger value="hands">Hands</TabsTrigger>
        </TabsList>

        {tab === 'wheels' && status === 'ready' && (
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
              className="gap-2"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
              )}
            </Button>

            {showFilters && (
              <div className="mt-3 rounded-xl border bg-card p-4 space-y-4">
                <FilterGroup
                  title="Vehicle type"
                  options={VEHICLE_TYPES.map((v) => ({ value: v.value, label: v.label }))}
                  selected={vehicleTypes}
                  onToggle={(v) => toggle(vehicleTypes, v, setVehicleTypes)}
                />
                <FilterGroup
                  title="What it can carry"
                  options={USE_TAGS.map((t) => ({ value: t.value, label: t.label }))}
                  selected={useTags}
                  onToggle={(v) => toggle(useTags, v, setUseTags)}
                />
                <FilterGroup
                  title="Rate period"
                  options={RATE_PERIODS.map((p) => ({ value: p.filterValue, label: p.label }))}
                  selected={ratePeriods}
                  onToggle={(v) => toggle(ratePeriods, v, setRatePeriods)}
                />
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setVehicleTypes([]); setUseTags([]); setRatePeriods([]); }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        <TabsContent value={tab} forceMount>
          {status !== 'ready' && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Set your location above to see what is near you.
            </p>
          )}

          {status === 'ready' && loading && (
            <div className="grid gap-4 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
            </div>
          )}

          {status === 'ready' && !loading && loadError && (
            <div className="rounded-xl border border-destructive/40 p-4 space-y-3">
              <p className="text-sm text-destructive">{loadError}</p>
              <Button size="sm" variant="outline" onClick={() => void load()}>Try again</Button>
            </div>
          )}

          {status === 'ready' && !loading && !loadError && (
            <>
              {tab === 'wheels' ? (
                wheels.length === 0 ? (
                  <EmptyState {...empty} />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {wheels.map((w) => <WheelCard key={w.product_id} row={w} unit={unit} />)}
                  </div>
                )
              ) : (
                others.length === 0 ? (
                  <EmptyState {...empty} />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {others.map((o) => (
                      <ServiceCard key={o.product_id} row={o} unit={unit} kind={TAB_TO_KIND[tab]} />
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FilterGroup({
  title, options, selected, onToggle,
}: {
  title: string;
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium mb-2">{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onToggle(o.value)}
              aria-pressed={on}
              className={`min-h-10 px-3 rounded-full border text-sm transition ${
                on
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-muted border-border'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({ message, cta, to }: { message: string; cta: string; to: string }) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center space-y-4">
      <p className="text-muted-foreground">{message}</p>
      <Button asChild>
        <Link to={to}>{cta}</Link>
      </Button>
    </div>
  );
}

function WheelCard({ row, unit }: { row: WheelRow; unit: ReturnType<typeof unitForViewer> }) {
  const rates = ratesOn(row as unknown as Record<string, unknown>);
  const tags = row.use_tags ?? [];

  return (
    <Link
      to={`/seed/wheel/${row.product_id}`}
      className="rounded-xl border bg-card overflow-hidden hover:border-primary transition block"
    >
      {row.cover_image_url && (
        <SignedImg src={row.cover_image_url} alt="" className="w-full aspect-[16/10] object-cover" loading="lazy" />
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight">{row.title}</h3>
          <Badge variant="secondary" className="shrink-0">{vehicleTypeLabel(row.vehicle_type)}</Badge>
        </div>

        <p className="text-sm text-primary font-medium">
          {formatDistance(row.distance_m, unit)}
          {row.base_location ? ` · ${row.base_location}` : ''}
        </p>

        {tags.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Carries: {tags.slice(0, 4).map((t) => USE_TAGS.find((u) => u.value === t)?.label ?? t).join(', ')}
            {tags.length > 4 ? '…' : ''}
          </p>
        )}

        {rates.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
            {rates.map((r) => (
              <span key={r.short} className="text-sm">
                <strong>{formatNativeAmount(r.amount, row.currency)}</strong>
                <span className="text-muted-foreground"> / {r.short}</span>
              </span>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground pt-1">
          {row.sower_name ?? 'A sower'} · listed {localDate(row.created_at)}
        </p>
      </div>
    </Link>
  );
}

function ServiceCard({
  row, unit, kind,
}: {
  row: ServiceRow;
  unit: ReturnType<typeof unitForViewer>;
  kind: 'pillow' | 'hand';
}) {
  return (
    <Link
      to={`/seed/${kind}/${row.product_id}`}
      className="rounded-xl border bg-card overflow-hidden hover:border-primary transition block"
    >
      {row.cover_image_url && (
        <SignedImg src={row.cover_image_url} alt="" className="w-full aspect-[16/10] object-cover" loading="lazy" />
      )}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold leading-tight">{row.title}</h3>
        <p className="text-sm text-primary font-medium">
          {formatDistance(row.distance_m, unit)}
          {row.base_location ? ` · ${row.base_location}` : ''}
        </p>
        <p className="text-xs text-muted-foreground">
          {row.sower_name ?? 'A sower'} · listed {localDate(row.created_at)}
        </p>
      </div>
    </Link>
  );
}
