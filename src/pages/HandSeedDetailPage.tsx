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
import { ArrowLeft, MapPin, Calendar, Loader2 } from 'lucide-react';

const RATE_UNIT_LABEL: Record<string, string> = {
  per_hour: 'per hour',
  per_job: 'per job',
  callout_quote: 'call-out fee + quote',
};

const QUANTITY_LABEL: Record<string, string> = {
  per_hour: 'Hours',
  per_job: 'Jobs',
};

const DAY_LABEL: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
};

/**
 * /seed/hand/:id — a dedicated detail page rather than reusing
 * BulkProductDetailPage.tsx: a Hand seed is booked, not bought (no
 * basket, no download, a rate+unit instead of a price, a service area
 * instead of stock), different enough that bolting it onto the generic
 * product page would mean threading service-only branches through code
 * that's already carrying art/ebook/physical-goods logic.
 */
export default function HandSeedDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [product, setProduct] = useState<any | null>(null);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [quantity, setQuantity] = useState<number | null>(1);
  const [note, setNote] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);

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
    })();
    return () => { cancelled = true; };
  }, [id]);

  // "About this Wandering Hand" — fetched from the sower's own role
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
        .eq('role', 'hand')
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
        <p className="text-muted-foreground">This Hand seed couldn't be found.</p>
        <Button onClick={() => navigate('/sow')}>Back to Sow</Button>
      </div>
    );
  }

  const details = (product.service_details as Record<string, any>) ?? {};
  const rateUnit: string = details.rate_unit;
  const rateUnitLabel = RATE_UNIT_LABEL[rateUnit] ?? rateUnit;
  const rateText = `$${Number(product.price ?? 0).toFixed(2)} ${rateUnitLabel}`;
  const isCallout = rateUnit === 'callout_quote';

  const areaText = details.area_mode === 'you_come_to_me'
    ? `You come to ${details.base_town || 'them'}`
    : `Comes to you within ${details.radius_km ?? 30} km of ${details.base_town || 'their base town'}`;

  const availabilityDays: string[] = Array.isArray(details.availability_days) ? details.availability_days : [];
  const sowerName = product.sowers?.display_name ?? 'A Wandering Hand';
  const sowerUserId: string | undefined = product.sowers?.user_id;

  const qty = isCallout ? 1 : Math.max(1, quantity ?? 1);
  const amount = Number(product.price ?? 0) * qty;
  const split = amount > 0 ? priceBreakdown(amount) : null;
  const canSubmitBooking = !!bookingDate && !!bookingTime && (isCallout || (quantity != null && quantity > 0));

  const handleRequestBooking = async () => {
    if (!user) { toast.error('Please log in to request a booking.'); return; }
    if (!sowerUserId) { toast.error('Could not find this seed\'s owner. Please try again.'); return; }
    if (user.id === sowerUserId) { toast.error('You can\'t book your own seed.'); return; }
    if (!canSubmitBooking || !split) return;

    setSubmittingBooking(true);
    try {
      const startsAt = new Date(`${bookingDate}T${bookingTime}`);
      if (Number.isNaN(startsAt.getTime())) throw new Error('Pick a valid date and time.');
      const endsAt = rateUnit === 'per_hour' ? new Date(startsAt.getTime() + qty * 60 * 60 * 1000) : null;

      const { data: booking, error: bookingErr } = await supabase
        .from('bookings')
        .insert({
          product_id: product.id,
          grower_user_id: user.id,
          sower_user_id: sowerUserId,
          company_id: product.company_id,
          status: 'requested',
          starts_at: startsAt.toISOString(),
          ends_at: endsAt ? endsAt.toISOString() : null,
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
          ends_at: endsAt ? endsAt.toISOString() : null,
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
      setBookingTime('');
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
            <img src={product.cover_image_url} alt={product.title} className="w-full h-full object-cover" />
          </div>
        )}
        <CardContent className="p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-500/30">
              🤲 Wandering Hand
            </Badge>
            {product.category && <Badge variant="outline">{product.category}</Badge>}
          </div>

          <div>
            <h1 className="text-2xl font-bold">{product.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">by {sowerName}</p>
          </div>

          <p className="text-lg font-semibold">{rateText}</p>

          {product.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{product.description}</p>
          )}

          <div className="flex items-start gap-2 text-sm">
            <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
            <span>{areaText}</span>
          </div>

          {availabilityDays.length > 0 && (
            <div className="flex items-start gap-2 text-sm">
              <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <span>Available: {availabilityDays.map((d) => DAY_LABEL[d] ?? d).join(', ')}</span>
            </div>
          )}

          {details.years_experience != null && (
            <p className="text-sm text-muted-foreground">{details.years_experience} years' experience</p>
          )}
          {details.tools_supplied && (
            <p className="text-sm text-muted-foreground">Tools &amp; equipment supplied</p>
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
                    <Label htmlFor="booking-date">Date</Label>
                    <Input
                      id="booking-date"
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="booking-time">Time</Label>
                    <Input
                      id="booking-time"
                      type="time"
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                    />
                  </div>
                </div>

                {!isCallout && (
                  <div className="space-y-1.5">
                    <Label htmlFor="booking-quantity">{QUANTITY_LABEL[rateUnit] ?? 'Quantity'}</Label>
                    <Input
                      id="booking-quantity"
                      type="number"
                      min="1"
                      step="1"
                      value={quantity ?? ''}
                      onChange={(e) => setQuantity(e.target.value === '' ? null : Math.max(1, Number(e.target.value)))}
                      className="max-w-[140px]"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="booking-note">Note (optional)</Label>
                  <Textarea
                    id="booking-note"
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Anything the sower should know"
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
            <h2 className="text-lg font-bold">About this Wandering Hand</h2>

            <div className="flex items-start gap-3">
              {wanderingProfile.photo_url && (
                <img
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
