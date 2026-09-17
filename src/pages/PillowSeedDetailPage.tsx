import { formatNativeAmount, paymentCurrencyNoteFor } from '@/lib/sleeping/currency';
import { loadUnits, ratesOnUnit, unitTypeLabel, type PillowUnit } from '@/lib/sleeping/pillowUnits';
import { pillowRatesOn, labelForAmenity, stayTypeLabel } from '@/lib/sleeping/pillowOptions';
import { formatDistance, haversineMetres, unitForViewer } from '@/lib/sleeping/units';
import { useWorldwideLocation } from '@/hooks/useWorldwideLocation';
import SignedImg from '@/components/media/SignedImg';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchProductBySlugOrId } from '@/api/products';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { priceBreakdown } from '@/lib/pricing/platformFee';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ArrowLeft, MapPin, Users, Loader2 } from 'lucide-react';

const RATE_UNIT_LABEL: Record<string, string> = {
  per_night: 'per night',
  per_week: 'per week',
};

const QUANTITY_LABEL: Record<string, string> = {
  per_night: 'Nights',
  per_week: 'Weeks',
};

const AMENITY_LABEL: Record<string, string> = {
  wifi: 'Wifi',
  breakfast: 'Breakfast included',
  parking: 'Parking',
  pool: 'Pool',
  aircon: 'Air conditioning',
  kitchen: 'Kitchen',
  'pet-friendly': 'Pet friendly',
};

/**
 * /seed/pillow/:id -- same "booked, not bought" reasoning as
 * HandSeedDetailPage.tsx: a Pillow seed is an accommodation stay, booked
 * for a date range, not a basket/download purchase.
 */
export default function PillowSeedDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [product, setProduct] = useState<any | null>(null);

  const [units, setUnits] = useState<PillowUnit[]>([]);
  /** Which unit the guest is booking. Null until they pick, and for a
   *  single-unit listing it is selected for them. */
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [quantity, setQuantity] = useState<number | null>(1);
  const [note, setNote] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Structured stay detail. A listing made before this table has no row;
  // the page falls back to service_details.
  const [pillow, setPillow] = useState<any | null>(null);
  const { location: viewerLocation } = useWorldwideLocation();
  const distanceUnit = unitForViewer();

  const [wanderingProfile, setWanderingProfile] = useState<any | null>(null);
  const [loadingWanderingProfile, setLoadingWanderingProfile] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNotFound(false);
      const { data, error } = await fetchProductBySlugOrId(id ?? '');
      if (cancelled) return;
      const row = data?.[0];
      if (error || !row) { setNotFound(true); setLoading(false); return; }
      setProduct(row);
      setLoading(false);

      const { data: detail } = await supabase
        .from('pillow_seed_details')
        .select('*')
        .eq('product_id', row.id)
        .maybeSingle();
      if (!cancelled) setPillow(detail ?? null);
    })();
    return () => { cancelled = true; };
  }, [id]);

  // The bookable units. A single-unit listing selects itself, so the guest
  // is not asked to choose between one thing.
  useEffect(() => {
    let alive = true;
    if (!id) return;
    loadUnits(id).then((rows) => {
      if (!alive) return;
      setUnits(rows);
      if (rows.length === 1) setSelectedUnitId(rows[0].id ?? null);
    });
    return () => { alive = false; };
  }, [id]);

  // "About this Wandering Pillow" -- fetched from the sower's own role
  // profile (RegisterWanderingPage.tsx), not the product row.
  useEffect(() => {
    let alive = true;
    const sid = product?.sowers?.user_id;
    if (!sid) { setLoadingWanderingProfile(false); return; }
    setLoadingWanderingProfile(true);
    (async () => {
      const { data } = await supabase
        .from('wandering_roles')
        .select('photo_url, tagline, gallery_urls, testimonials')
        .eq('user_id', sid)
        .eq('role', 'pillow')
        .maybeSingle();
      if (!alive) return;
      setWanderingProfile(data);
      setLoadingWanderingProfile(false);
    })();
    return () => { alive = false; };
  }, [product?.sowers?.user_id]);

  if (loading) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="container max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-muted-foreground">This Pillow seed couldn't be found.</p>
        <Button onClick={() => navigate('/sow')}>Back to Sow</Button>
      </div>
    );
  }

  const details = (product.service_details as Record<string, any>) ?? {};
  const rateUnit: string = details.rate_unit;
  const rateUnitLabel = RATE_UNIT_LABEL[rateUnit] ?? rateUnit;
  // Rates show in the LISTING's own currency and are never converted.
  const listingCurrency: string = pillow?.currency ?? 'USD';
  const structuredRates = pillow ? pillowRatesOn(pillow) : [];
  const rateText = structuredRates.length === 0
    ? `${formatNativeAmount(Number(product.price ?? 0), listingCurrency)} ${rateUnitLabel ?? ''}`.trim()
    : '';

  const distanceM = (viewerLocation && pillow?.base_lat != null && pillow?.base_lng != null)
    ? haversineMetres(viewerLocation.lat, viewerLocation.lng, Number(pillow.base_lat), Number(pillow.base_lng))
    : null;

  const sowerName = product.sowers?.display_name ?? 'A Wandering Pillow';
  const sowerUserId: string | undefined = product.sowers?.user_id;
  const amenityList: string[] = (pillow?.amenities ?? (Array.isArray(details.amenities) ? details.amenities : [])) as string[];
  const sleepsCount = pillow?.sleeps ?? details.sleeps ?? null;
  const placeLocation = pillow?.base_location ?? details.location ?? null;
  const galleryUrls: string[] = [
    pillow?.interior_image_url,
    ...((pillow?.gallery_urls ?? []) as string[]),
  ].filter(Boolean);

  const selectedUnit = units.find((u) => u.id === selectedUnitId) ?? (units.length === 1 ? units[0] : null);
  const qty = Math.max(1, quantity ?? 1);
  // The guest pays the unit's rate, not the listing's headline number. The
  // split itself is untouched: priceBreakdown still does the 85/15.
  const unitRate = selectedUnit ? ratesOnUnit(selectedUnit)[0]?.amount : undefined;
  const amount = Number(unitRate ?? product.price ?? 0) * qty;
  const split = amount > 0 ? priceBreakdown(amount) : null;
  const canSubmitBooking = !!bookingDate && quantity != null && quantity > 0
    && (units.length === 0 || !!selectedUnit);

  const handleRequestBooking = async () => {
    if (!user) { toast.error('Please log in to request a booking.'); return; }
    if (!sowerUserId) { toast.error('Could not find this seed\'s owner. Please try again.'); return; }
    if (user.id === sowerUserId) { toast.error('You can\'t book your own seed.'); return; }
    if (!canSubmitBooking || !split) return;

    setSubmittingBooking(true);
    try {
      const startsAt = new Date(`${bookingDate}T14:00`); // typical check-in time -- guest's exact arrival is confirmed in chat, not collected here
      if (Number.isNaN(startsAt.getTime())) throw new Error('Pick a valid check-in date.');
      const msPerUnit = rateUnit === 'per_week' ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      const endsAt = new Date(startsAt.getTime() + qty * msPerUnit);

      const { data: booking, error: bookingErr } = await supabase
        .from('bookings')
        .insert({
          product_id: product.id,
          pillow_unit_id: selectedUnit?.id ?? null,
          grower_user_id: user.id,
          sower_user_id: sowerUserId,
          company_id: product.company_id,
          status: 'requested',
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          quantity: qty,
          rate_unit: rateUnit,
          amount: split.base,
          s2g_fee: split.s2gFee,
          total: split.total,
          note: note.trim() || null,
        } as any)
        .select()
        .single();
      if (bookingErr) throw bookingErr;

      const { data: roomId, error: roomErr } = await supabase.rpc('get_or_create_direct_room', {
        user1_id: sowerUserId,
        user2_id: user.id,
      } as any);
      if (roomErr || !roomId) throw roomErr ?? new Error('Could not open a chat with the sower.');

      const { error: msgErr } = await supabase.from('chat_messages').insert({
        room_id: roomId,
        sender_id: user.id,
        content: `📅 Booking request for "${product.title}"`,
        message_type: 'booking_request',
        system_metadata: {
          is_system: false,
          type: 'booking_request',
          booking_id: (booking as any).id,
          product_id: product.id,
          product_title: product.title,
          quantity: qty,
          rate_unit: rateUnit,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          note: note.trim() || null,
          amount: split.base,
          s2g_fee: split.s2gFee,
          total: split.total,
        },
      } as any);
      if (msgErr) throw msgErr;

      toast.success('Booking request sent!');
      setBookingOpen(false);
      setBookingDate('');
      setQuantity(1);
      setNote('');
    } catch (err) {
      console.error('Request booking failed:', err);
      toast.error(err instanceof Error ? err.message : 'Could not send this booking request. Please try again.');
    } finally {
      setSubmittingBooking(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 md:py-8">
      <Button variant="ghost" size="sm" onClick={() => navigate('/sow')} className="mb-4 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <Card className="overflow-hidden">
        {product.cover_image_url && (
          <div className="aspect-video w-full overflow-hidden bg-muted">
            <SignedImg src={product.cover_image_url} alt={product.title} className="w-full h-full object-cover" />
          </div>
        )}
        <CardContent className="p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
              🛏️ Wandering Pillow
            </Badge>
            {/* products.category holds the raw enum (bush_camp), which is a
                database value, not something to show a member. */}
            {product.category && (
              <Badge variant="outline">{stayTypeLabel(product.category)}</Badge>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold">{product.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">by {sowerName}</p>
          </div>

          {pillow?.stay_type && (
            <Badge variant="outline">{stayTypeLabel(pillow.stay_type)}</Badge>
          )}

          {distanceM != null && (
            <p className="text-sm font-medium text-primary">
              {formatDistance(distanceM, distanceUnit)}
            </p>
          )}

          {units.length > 0 && (
            <div className="rounded-lg border p-3">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                {units.length === 1 ? 'What you can book' : `${units.length} units to choose from`}
              </p>
              <ul className="space-y-2">
                {units.map((u) => {
                  const on = (selectedUnitId ?? (units.length === 1 ? u.id : null)) === u.id;
                  const unitRates = ratesOnUnit(u);
                  return (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedUnitId(u.id ?? null)}
                        aria-pressed={on}
                        /*
                          flex-col is not optional. index.css gives every bare
                          <button> `inline-flex items-center justify-center` at
                          zero specificity, which laid the name, the capacity
                          and the price out side by side and read as
                          "TentSleeps 4". Same cause as the vehicle cards'
                          "CarA normal car".
                        */
                        className={`flex w-full flex-col items-stretch gap-1 rounded-lg
                          border-2 p-3 text-left transition ${
                          on ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="font-semibold leading-tight">{u.name}</span>
                          {/*
                            The type earns its place only when it tells the
                            guest something. With one unit the listing's own
                            badge already says the kind, and repeating it
                            beside a unit named after the listing is noise.
                            With several it is what separates the dome from
                            the garden room.
                          */}
                          {units.length > 1 && (
                            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              {unitTypeLabel(u.unit_type)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">Sleeps {u.sleeps}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {unitRates.map((r) => (
                            <span key={r.short} className="text-sm">
                              <strong>{formatNativeAmount(r.amount, listingCurrency)}</strong>
                              <span className="text-muted-foreground"> / {r.short}</span>
                            </span>
                          ))}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">Rates in {listingCurrency}</p>
            </div>
          )}

          {units.length === 0 && structuredRates.length > 0 ? (
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Rates in {listingCurrency}
              </p>
              <ul className="space-y-1">
                {structuredRates.map((r) => (
                  <li key={r.short} className="flex items-baseline justify-between gap-4">
                    <span className="text-sm text-muted-foreground">{r.label}</span>
                    <span className="text-lg font-semibold">
                      {formatNativeAmount(r.amount, listingCurrency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-lg font-semibold">{rateText}</p>
          )}

          {galleryUrls.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {galleryUrls.map((u, i) => (
                <SignedImg key={`${u}-${i}`} src={u} alt="" className="h-24 w-24 shrink-0 rounded-lg border object-cover" />
              ))}
            </div>
          )}

          {product.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{product.description}</p>
          )}

          {sleepsCount != null && (
            <div className="flex items-start gap-2 text-sm">
              <Users className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <span>Sleeps {sleepsCount}</span>
            </div>
          )}

          {placeLocation && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <span>{placeLocation}</span>
            </div>
          )}

          {(amenityList.length > 0 || details.amenities_other) && (
            <div className="flex flex-wrap gap-1.5">
              {amenityList.map((a) => (
                <Badge key={a} variant="outline">{AMENITY_LABEL[a] ?? labelForAmenity(a)}</Badge>
              ))}
              {details.amenities_other && <Badge variant="outline">{details.amenities_other}</Badge>}
            </div>
          )}

          <Sheet open={bookingOpen} onOpenChange={setBookingOpen}>
            <SheetTrigger asChild>
              <Button size="lg" className="w-full">
                Request booking
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
              <SheetHeader className="text-left">
                <SheetTitle>Request a booking</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="booking-date">Check-in date</Label>
                    <Input
                      id="booking-date"
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="booking-quantity">{QUANTITY_LABEL[rateUnit] ?? 'Quantity'}</Label>
                    <Input
                      id="booking-quantity"
                      type="number"
                      min="1"
                      step="1"
                      value={quantity ?? ''}
                      onChange={(e) => setQuantity(e.target.value === '' ? null : Math.max(1, Number(e.target.value)))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="booking-note">Note (optional)</Label>
                  <Textarea
                    id="booking-note"
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Number of guests, arrival time, anything the host should know"
                  />
                </div>

                <div className="rounded-lg border p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate × quantity</span>
                    <span>${split ? split.base.toFixed(2) : '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sow2Grow fee (15%)</span>
                    <span>${split ? split.s2gFee.toFixed(2) : '0.00'}</span>
                  </div>
                  <div className="flex justify-between font-semibold mt-1 pt-1 border-t">
                    <span>Total</span>
                    <span>${split ? split.total.toFixed(2) : '0.00'}</span>
                  </div>
                </div>

                {/*
                  The listing prices in its own currency; the existing booking
                  path charges in USD (PayPal) or ZAR (Paystack). Say so rather
                  than showing a converted figure.
                */}
                <p className="text-xs text-muted-foreground">
                  {paymentCurrencyNoteFor(listingCurrency, 'paypal')}
                </p>

                <Button
                  size="lg"
                  className="w-full"
                  disabled={!canSubmitBooking || submittingBooking}
                  onClick={handleRequestBooking}
                >
                  {submittingBooking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Send request
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </CardContent>
      </Card>

      {!loadingWanderingProfile && wanderingProfile && (
        wanderingProfile.photo_url || wanderingProfile.tagline ||
        wanderingProfile.gallery_urls?.length || wanderingProfile.testimonials?.length
      ) && (
        <Card className="mt-4">
          <CardContent className="p-5 md:p-6 space-y-4">
            <h2 className="text-lg font-bold">About this Wandering Pillow</h2>

            <div className="flex items-start gap-3">
              {wanderingProfile.photo_url && (
                <SignedImg
                  src={wanderingProfile.photo_url}
                  alt={sowerName}
                  className="w-16 h-16 rounded-full object-cover border shrink-0"
                />
              )}
              <div>
                <p className="font-semibold">{sowerName}</p>
                {wanderingProfile.tagline && (
                  <p className="text-sm text-muted-foreground">{wanderingProfile.tagline}</p>
                )}
              </div>
            </div>

            {!!wanderingProfile.gallery_urls?.length && (
              <div className="flex gap-2 overflow-x-auto">
                {wanderingProfile.gallery_urls.map((url: string, i: number) => (
                  <img key={i} src={url} alt="" className="w-24 h-24 rounded-lg object-cover border shrink-0" />
                ))}
              </div>
            )}

            {!!wanderingProfile.testimonials?.length && (
              <div className="space-y-3">
                {wanderingProfile.testimonials.map((t: any, i: number) => (
                  <div key={i} className="rounded-lg border p-3">
                    <p className="text-sm italic">"{t.quote}"</p>
                    <p className="text-xs text-muted-foreground mt-1">— {t.name}, {t.town}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
