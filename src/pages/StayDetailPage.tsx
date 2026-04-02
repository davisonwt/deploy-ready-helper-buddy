import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Star, Heart, Calendar, Users, Clock, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useStayListing, useStayWishlist, StayUnit } from '@/hooks/useStays';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const StayDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { listing, units, reviews, loading } = useStayListing(id);
  const { wishlistIds, toggleWishlist } = useStayWishlist();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [selectedUnit, setSelectedUnit] = useState<StayUnit | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookForm, setBookForm] = useState({
    check_in: '', check_out: '', guests_count: 1, guest_name: '', guest_email: '', guest_phone: '', special_requests: '',
  });
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading property...</div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl mb-4">🏡</p>
          <h2 className="text-xl font-bold text-foreground mb-2">Property not found</h2>
          <Button onClick={() => navigate('/stays')}>Browse Stays</Button>
        </div>
      </div>
    );
  }

  const photos = listing.photos?.length ? listing.photos : ['/placeholder.svg'];
  const avgRating = listing.avg_rating || 0;

  const calculateTotal = () => {
    if (!selectedUnit || !bookForm.check_in || !bookForm.check_out) return 0;
    const nights = Math.max(1, Math.ceil((new Date(bookForm.check_out).getTime() - new Date(bookForm.check_in).getTime()) / 86400000));
    return nights * selectedUnit.price_per_night;
  };

  const handleBook = async () => {
    if (!user) { toast.error('Please sign in to book'); return; }
    if (!selectedUnit) { toast.error('Please select a unit'); return; }
    if (!bookForm.check_in || !bookForm.check_out) { toast.error('Please select dates'); return; }

    setSubmitting(true);
    try {
      const total = calculateTotal();
      const { error } = await supabase.from('stay_bookings').insert({
        listing_id: listing.id,
        unit_id: selectedUnit.id,
        guest_id: user.id,
        sower_id: listing.sower_id,
        check_in: bookForm.check_in,
        check_out: bookForm.check_out,
        guests_count: bookForm.guests_count,
        total_price: total,
        currency: selectedUnit.currency,
        guest_name: bookForm.guest_name,
        guest_email: bookForm.guest_email,
        guest_phone: bookForm.guest_phone,
        special_requests: bookForm.special_requests,
        status: 'pending',
      } as any);
      if (error) throw error;
      toast.success('🎉 Booking request sent! The host will confirm shortly.');
      setBookingOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Photo Gallery */}
      <div className="relative h-[50vh] min-h-[300px] bg-card">
        <img src={photos[photoIndex]} alt={listing.business_name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-black/20" />

        {/* Nav */}
        <div className="absolute top-4 left-4 z-10">
          <Button variant="ghost" onClick={() => navigate(-1)} className="bg-background/60 backdrop-blur-sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>

        {/* Wishlist */}
        <Button
          variant="ghost" size="icon"
          className="absolute top-4 right-4 z-10 bg-background/60 backdrop-blur-sm rounded-full"
          onClick={() => toggleWishlist(listing.id)}
        >
          <Heart className={`w-5 h-5 ${wishlistIds.has(listing.id) ? 'fill-red-500 text-red-500' : 'text-foreground'}`} />
        </Button>

        {/* Photo nav */}
        {photos.length > 1 && (
          <>
            <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/60 backdrop-blur-sm rounded-full"
              onClick={() => setPhotoIndex(i => (i - 1 + photos.length) % photos.length)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/60 backdrop-blur-sm rounded-full"
              onClick={() => setPhotoIndex(i => (i + 1) % photos.length)}>
              <ChevronRight className="w-5 h-5" />
            </Button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {photos.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === photoIndex ? 'bg-primary' : 'bg-white/50'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title */}
            <div>
              <Badge variant="secondary" className="mb-2">{listing.property_type.replace(/_/g, ' ')}</Badge>
              <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: '"Playfair Display", serif' }}>
                {listing.business_name}
              </h1>
              <div className="flex items-center gap-3 mt-2 text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {[listing.city, listing.province].filter(Boolean).join(', ')}</span>
                {avgRating > 0 && (
                  <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {avgRating.toFixed(1)} ({listing.total_reviews})</span>
                )}
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">About this place</h2>
              <p className="text-muted-foreground whitespace-pre-line">{listing.description || 'No description provided.'}</p>
            </div>

            {/* Amenities */}
            {listing.amenities?.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-3">Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {listing.amenities.map(a => <Badge key={a} variant="outline">{a}</Badge>)}
                </div>
              </div>
            )}

            {/* Activities */}
            {listing.activities?.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-3">Activities</h2>
                <div className="flex flex-wrap gap-2">
                  {listing.activities.map(a => <Badge key={a} variant="outline">🎯 {a}</Badge>)}
                </div>
              </div>
            )}

            {/* Check-in Info */}
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <div><p className="text-xs text-muted-foreground">Check-in</p><p className="font-medium text-foreground">{listing.check_in_time}</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <div><p className="text-xs text-muted-foreground">Check-out</p><p className="font-medium text-foreground">{listing.check_out_time}</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <div><p className="text-xs text-muted-foreground">Cancellation</p><p className="font-medium text-foreground capitalize">{listing.cancellation_policy}</p></div>
                </div>
              </CardContent>
            </Card>

            {/* Units */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">Available Rooms & Units</h2>
              {units.length === 0 ? (
                <p className="text-muted-foreground">No units listed yet.</p>
              ) : (
                <div className="space-y-3">
                  {units.map(unit => (
                    <Card
                      key={unit.id}
                      className={`bg-card border-border cursor-pointer transition-all ${selectedUnit?.id === unit.id ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}
                      onClick={() => setSelectedUnit(unit)}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground">{unit.name}</h3>
                          <p className="text-sm text-muted-foreground">{unit.max_guests} guests · {unit.bedrooms} bed · {unit.bathrooms} bath</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">{unit.currency} {unit.price_per_night}</p>
                          <p className="text-xs text-muted-foreground">per night</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Reviews */}
            {reviews.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-3">Guest Reviews</h2>
                <div className="space-y-4">
                  {reviews.map(review => (
                    <Card key={review.id} className="bg-card border-border">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted'}`} />
                          ))}
                        </div>
                        <p className="text-foreground">{review.review_text}</p>
                        {review.host_response && (
                          <div className="mt-3 pl-4 border-l-2 border-primary/30">
                            <p className="text-xs text-muted-foreground font-semibold mb-1">Host response:</p>
                            <p className="text-sm text-muted-foreground">{review.host_response}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-border sticky top-4">
              <CardContent className="p-6 space-y-4">
                {selectedUnit ? (
                  <>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{selectedUnit.currency} {selectedUnit.price_per_night}</p>
                      <p className="text-sm text-muted-foreground">per night · {selectedUnit.name}</p>
                    </div>
                    <Separator />
                    <div>
                      <Label>Check-in</Label>
                      <Input type="date" value={bookForm.check_in} onChange={e => setBookForm(p => ({ ...p, check_in: e.target.value }))} className="bg-background" />
                    </div>
                    <div>
                      <Label>Check-out</Label>
                      <Input type="date" value={bookForm.check_out} onChange={e => setBookForm(p => ({ ...p, check_out: e.target.value }))} className="bg-background" />
                    </div>
                    <div>
                      <Label>Guests</Label>
                      <Input type="number" min={1} max={selectedUnit.max_guests} value={bookForm.guests_count} onChange={e => setBookForm(p => ({ ...p, guests_count: parseInt(e.target.value) || 1 }))} className="bg-background" />
                    </div>
                    {bookForm.check_in && bookForm.check_out && (
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-xl font-bold text-foreground">{selectedUnit.currency} {calculateTotal().toFixed(2)}</p>
                      </div>
                    )}
                    <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full" size="lg">Book via S2G</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Complete Your Booking</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                          <div><Label>Full Name</Label><Input value={bookForm.guest_name} onChange={e => setBookForm(p => ({ ...p, guest_name: e.target.value }))} /></div>
                          <div><Label>Email</Label><Input type="email" value={bookForm.guest_email} onChange={e => setBookForm(p => ({ ...p, guest_email: e.target.value }))} /></div>
                          <div><Label>Phone</Label><Input value={bookForm.guest_phone} onChange={e => setBookForm(p => ({ ...p, guest_phone: e.target.value }))} /></div>
                          <div><Label>Special Requests</Label><Textarea value={bookForm.special_requests} onChange={e => setBookForm(p => ({ ...p, special_requests: e.target.value }))} /></div>
                          <Button onClick={handleBook} disabled={submitting} className="w-full">{submitting ? 'Booking...' : '🎉 Confirm Booking'}</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <Calendar className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Select a unit above to start booking</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StayDetailPage;
