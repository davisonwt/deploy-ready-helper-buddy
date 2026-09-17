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
import {
  AMENITIES, PILLOW_RATE_PERIODS, STAY_TYPES, labelForAmenity,
  pillowRatesOn, stayTypeLabel,
} from '@/lib/sleeping/pillowOptions';
import {
  COMMON_LANGUAGES, HAND_RATE_PERIODS, HOUSEHOLD_CATEGORIES,
  PROFESSIONAL_CATEGORIES, handRatesOn, serviceCategoryLabel,
} from '@/lib/sleeping/handOptions';

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

interface PillowRow {
  product_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  front_image_url: string | null;
  interior_image_url: string | null;
  sower_name: string | null;
  stay_type: string;
  sleeps: number | null;
  amenities: string[] | null;
  currency: string;
  rate_nightly: number | null;
  rate_weekly: number | null;
  rate_monthly: number | null;
  base_location: string | null;
  distance_m: number;
  created_at: string;
  // Added by 20260917110000_pillow_units: a listing holds many units, so the
  // card quotes the cheapest rate and the capacity of the largest unit.
  unit_count: number | null;
  from_rate: number | null;
  max_sleeps: number | null;
  unit_types: string[] | null;
}

interface HandRow {
  product_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  front_image_url: string | null;
  sower_name: string | null;
  service_category: string;
  is_professional: boolean;
  qualification: string | null;
  years_experience: number;
  languages: string[] | null;
  service_radius_m: number | null;
  currency: string;
  rate_hourly: number | null;
  rate_per_job: number | null;
  rate_daily: number | null;
  rate_weekly: number | null;
  rate_monthly: number | null;
  base_location: string | null;
  background_check_declared: boolean;
  reference_count: number;
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
  const [pillows, setPillows] = useState<PillowRow[]>([]);
  const [hands, setHands] = useState<HandRow[]>([]);

  // Hands filters
  const [professional, setProfessional] = useState<boolean | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [minYears, setMinYears] = useState<number | null>(null);
  const [handRates, setHandRates] = useState<string[]>([]);
  const [langFilter, setLangFilter] = useState<string[]>([]);

  // Pillows filters
  const [stayTypes, setStayTypes] = useState<string[]>([]);
  const [amenityFilter, setAmenityFilter] = useState<string[]>([]);
  const [pillowRates, setPillowRates] = useState<string[]>([]);
  const [minSleeps, setMinSleeps] = useState<number | null>(null);

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
      } else if (tab === 'pillows') {
        const { data, error } = await supabase.rpc('sleeping_pillows_near', {
          _lat: location.lat,
          _lng: location.lng,
          _radius_m: radiusM,
          _stay_types: stayTypes.length ? stayTypes : null,
          _amenities: amenityFilter.length ? amenityFilter : null,
          _min_sleeps: minSleeps,
          _rate_periods: pillowRates.length ? pillowRates : null,
        });
        if (error) throw error;
        setPillows((data ?? []) as PillowRow[]);
      } else if (tab === 'hands') {
        const { data, error } = await supabase.rpc('sleeping_hands_near', {
          _lat: location.lat,
          _lng: location.lng,
          _radius_m: radiusM,
          _professional: professional,
          _categories: categories.length ? categories : null,
          _min_years: minYears,
          _languages: langFilter.length ? langFilter : null,
          _rate_periods: handRates.length ? handRates : null,
        });
        if (error) throw error;
        setHands((data ?? []) as HandRow[]);
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
      setPillows([]);
      setHands([]);
    } finally {
      setLoading(false);
    }
  }, [location, radiusM, tab, vehicleTypes, useTags, ratePeriods, stayTypes, amenityFilter, pillowRates, minSleeps,
      professional, categories, minYears, handRates, langFilter]);

  useEffect(() => { void load(); }, [load]);

  const empty = EMPTY_COPY[tab];
  const activeFilterCount = vehicleTypes.length + useTags.length + ratePeriods.length;
  const pillowFilterCount = stayTypes.length + amenityFilter.length + pillowRates.length
    + (minSleeps != null ? 1 : 0);
  const handFilterCount = categories.length + handRates.length + langFilter.length
    + (minYears != null ? 1 : 0) + (professional != null ? 1 : 0);

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

        {tab === 'pillows' && status === 'ready' && (
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
              className="gap-2"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {pillowFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">{pillowFilterCount}</Badge>
              )}
            </Button>

            {showFilters && (
              <div className="mt-3 rounded-xl border bg-card p-4 space-y-4">
                <FilterGroup
                  title="Kind of place"
                  options={STAY_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                  selected={stayTypes}
                  onToggle={(v) => toggle(stayTypes, v, setStayTypes)}
                />
                <FilterGroup
                  title="Must have"
                  options={AMENITIES.map((a) => ({ value: a.value, label: a.label }))}
                  selected={amenityFilter}
                  onToggle={(v) => toggle(amenityFilter, v, setAmenityFilter)}
                />
                <FilterGroup
                  title="Rate period"
                  options={PILLOW_RATE_PERIODS.map((p) => ({ value: p.filterValue, label: p.label }))}
                  selected={pillowRates}
                  onToggle={(v) => toggle(pillowRates, v, setPillowRates)}
                />
                <div>
                  <p className="text-sm font-medium mb-2">Sleeps at least</p>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 4, 6, 8].map((n) => {
                      const on = minSleeps === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setMinSleeps(on ? null : n)}
                          aria-pressed={on}
                          className={`min-h-10 px-3 rounded-full border text-sm transition ${
                            on
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background hover:bg-muted border-border'
                          }`}
                        >
                          {n}+
                        </button>
                      );
                    })}
                  </div>
                </div>
                {pillowFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setStayTypes([]); setAmenityFilter([]); setPillowRates([]); setMinSleeps(null); }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'hands' && status === 'ready' && (
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
              className="gap-2"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {handFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">{handFilterCount}</Badge>
              )}
            </Button>

            {showFilters && (
              <div className="mt-3 rounded-xl border bg-card p-4 space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Kind of work</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Trades & professions', value: true },
                      { label: 'Around the home', value: false },
                    ].map((o) => {
                      const on = professional === o.value;
                      return (
                        <button
                          key={o.label}
                          type="button"
                          onClick={() => setProfessional(on ? null : o.value)}
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
                <FilterGroup
                  title="Service"
                  options={[...PROFESSIONAL_CATEGORIES, ...HOUSEHOLD_CATEGORIES]
                    .map((c) => ({ value: c.value, label: c.label }))}
                  selected={categories}
                  onToggle={(v) => toggle(categories, v, setCategories)}
                />
                <FilterGroup
                  title="Rate period"
                  options={HAND_RATE_PERIODS.map((p) => ({ value: p.filterValue, label: p.label }))}
                  selected={handRates}
                  onToggle={(v) => toggle(handRates, v, setHandRates)}
                />
                <FilterGroup
                  title="Language"
                  options={COMMON_LANGUAGES.map((l) => ({ value: l, label: l }))}
                  selected={langFilter}
                  onToggle={(v) => toggle(langFilter, v, setLangFilter)}
                />
                <div>
                  <p className="text-sm font-medium mb-2">At least this many years</p>
                  <div className="flex flex-wrap gap-2">
                    {[1, 3, 5, 10].map((n) => {
                      const on = minYears === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setMinYears(on ? null : n)}
                          aria-pressed={on}
                          className={`min-h-10 px-3 rounded-full border text-sm transition ${
                            on
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background hover:bg-muted border-border'
                          }`}
                        >
                          {n}+
                        </button>
                      );
                    })}
                  </div>
                </div>
                {handFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setProfessional(null); setCategories([]);
                      setMinYears(null); setHandRates([]); setLangFilter([]);
                    }}
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
              ) : tab === 'hands' ? (
                hands.length === 0 ? (
                  <EmptyState {...empty} />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {hands.map((h) => <HandCard key={h.product_id} row={h} unit={unit} />)}
                  </div>
                )
              ) : tab === 'pillows' ? (
                pillows.length === 0 ? (
                  <EmptyState {...empty} />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {pillows.map((p) => <PillowCard key={p.product_id} row={p} unit={unit} />)}
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

function PillowCard({ row, unit }: { row: PillowRow; unit: ReturnType<typeof unitForViewer> }) {
  const rates = pillowRatesOn(row as unknown as Record<string, unknown>);
  const list = row.amenities ?? [];
  const cover = row.front_image_url || row.cover_image_url;
  const unitCount = row.unit_count ?? 0;
  // from_rate is the cheapest rate across every unit, computed server-side.
  // Falling back to the listing's own rates keeps a not-yet-converted row
  // readable rather than blank.
  const fromAmount = row.from_rate ?? null;
  const sleepsShown = row.max_sleeps ?? row.sleeps;

  return (
    <Link
      to={`/seed/pillow/${row.product_id}`}
      className="rounded-xl border bg-card overflow-hidden hover:border-primary transition block"
    >
      {cover && (
        <SignedImg src={cover} alt="" className="w-full aspect-[16/10] object-cover" loading="lazy" />
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight">{row.title}</h3>
          <Badge variant="secondary" className="shrink-0">
            {unitCount > 1
              ? `${unitCount} units`
              : (row.unit_types?.[0] ? unitTypeLabel(row.unit_types[0]) : stayTypeLabel(row.stay_type))}
          </Badge>
        </div>

        <p className="text-sm text-primary font-medium">
          {formatDistance(row.distance_m, unit)}
          {row.base_location ? ` · ${row.base_location}` : ''}
        </p>

        {sleepsShown != null && (
          <p className="text-xs text-muted-foreground">
            {unitCount > 1 ? `Sleeps up to ${sleepsShown}` : `Sleeps ${sleepsShown}`}
          </p>
        )}

        {list.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {list.slice(0, 4).map((a) => labelForAmenity(a)).join(', ')}
            {list.length > 4 ? '…' : ''}
          </p>
        )}

        {fromAmount != null ? (
          <p className="pt-1 text-sm">
            <span className="text-muted-foreground">from </span>
            <strong>{formatNativeAmount(fromAmount, row.currency)}</strong>
          </p>
        ) : rates.length > 0 && (
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
          {row.sower_name ?? 'A host'} · listed {localDate(row.created_at)}
        </p>
      </div>
    </Link>
  );
}

function HandCard({ row, unit }: { row: HandRow; unit: ReturnType<typeof unitForViewer> }) {
  const rates = handRatesOn(row as unknown as Record<string, unknown>);
  const langs = row.languages ?? [];
  const cover = row.front_image_url || row.cover_image_url;

  return (
    <Link
      to={`/seed/hand/${row.product_id}`}
      className="rounded-xl border bg-card overflow-hidden hover:border-primary transition block"
    >
      {cover && (
        <SignedImg src={cover} alt="" className="w-full aspect-[16/10] object-cover" loading="lazy" />
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight">{row.title}</h3>
          <Badge variant="secondary" className="shrink-0">{serviceCategoryLabel(row.service_category)}</Badge>
        </div>

        <p className="text-sm text-primary font-medium">
          {formatDistance(row.distance_m, unit)}
          {row.base_location ? ` · ${row.base_location}` : ''}
        </p>

        <p className="text-xs text-muted-foreground">
          {row.years_experience} {row.years_experience === 1 ? 'year' : 'years'} experience
          {langs.length > 0 ? ` · ${langs.slice(0, 3).join(', ')}` : ''}
        </p>

        {/* A count only. Referee details are never in this payload. */}
        {row.reference_count > 0 && (
          <p className="text-xs text-muted-foreground">
            {row.reference_count} {row.reference_count === 1 ? 'reference' : 'references'} available
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
          {row.sower_name ?? 'A member'} · listed {localDate(row.created_at)}
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
