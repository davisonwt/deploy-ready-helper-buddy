import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Home, Calendar, Star, DollarSign, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSowerStays } from '@/hooks/useStays';
import UnitManager from '@/components/stays/UnitManager';

const SowerStaysDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { listings, bookings, loading } = useSowerStays();

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const totalEarnings = bookings.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + b.total_price, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Dashboard
        </Button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: '"Playfair Display", serif' }}>
              🏡 My Stays
            </h1>
            <p className="text-muted-foreground">Manage your properties on The Wandering Pillow</p>
          </div>
          <Button asChild>
            <Link to="/list-your-stay"><Plus className="w-4 h-4 mr-2" /> New Listing</Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <Home className="w-6 h-6 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold text-foreground">{listings.length}</p>
              <p className="text-xs text-muted-foreground">Properties</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <Calendar className="w-6 h-6 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold text-foreground">{pendingBookings.length}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <Star className="w-6 h-6 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold text-foreground">{confirmedBookings.length}</p>
              <p className="text-xs text-muted-foreground">Confirmed</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <DollarSign className="w-6 h-6 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold text-foreground">R{totalEarnings.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Earnings</p>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground text-center mb-8 italic">
          💼 Payouts and invoicing are managed through your S2G Sower bookkeeping dashboard
        </p>

        {/* Listings */}
        {listings.length === 0 ? (
          <Card className="bg-card border-border text-center py-12">
            <CardContent>
              <Home className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No listings yet</h3>
              <p className="text-muted-foreground mb-4">Start by creating your first property listing</p>
              <Button asChild><Link to="/list-your-stay">List Your Stay</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {listings.map(listing => (
              <Card key={listing.id} className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-foreground">{listing.business_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{listing.city}, {listing.province}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={listing.status === 'approved' ? 'default' : listing.status === 'pending' ? 'secondary' : 'destructive'}>
                        {listing.status}
                      </Badge>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/stays/${listing.id}`}><Eye className="w-4 h-4 mr-1" /> View</Link>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <UnitManager listingId={listing.id} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Booking Inbox */}
        {pendingBookings.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-semibold text-foreground mb-4">📬 Booking Requests</h2>
            <div className="space-y-3">
              {pendingBookings.map(b => (
                <Card key={b.id} className="bg-card border-border">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{b.guest_name || 'Guest'}</p>
                      <p className="text-sm text-muted-foreground">{b.check_in} → {b.check_out} · {b.guests_count} guests</p>
                      <p className="text-sm font-medium text-primary">{b.currency} {b.total_price}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={async () => {
                        await (await import('@/integrations/supabase/client')).supabase.from('stay_bookings').update({ status: 'confirmed' } as any).eq('id', b.id);
                        window.location.reload();
                      }}>Accept</Button>
                      <Button size="sm" variant="destructive" onClick={async () => {
                        await (await import('@/integrations/supabase/client')).supabase.from('stay_bookings').update({ status: 'declined' } as any).eq('id', b.id);
                        window.location.reload();
                      }}>Decline</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SowerStaysDashboard;
