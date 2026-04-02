import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, MapPin, Calendar, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StayCard from '@/components/stays/StayCard';
import StayFilters from '@/components/stays/StayFilters';
import { useStayListings, useStayWishlist } from '@/hooks/useStays';
import staysHero from '@/assets/stays-hero.jpg';

const StaysDiscoveryPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [propertyType, setPropertyType] = useState('all');
  const [petFriendly, setPetFriendly] = useState(false);

  const { listings, loading } = useStayListings({
    search, propertyType: propertyType === 'all' ? undefined : propertyType, petFriendly: petFriendly || undefined,
  });
  const { wishlistIds, toggleWishlist } = useStayWishlist();

  const featured = listings.filter(l => l.is_featured);
  const clearFilters = () => { setSearch(''); setPropertyType('all'); setPetFriendly(false); };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-[60vh] min-h-[400px] overflow-hidden">
        <img src={staysHero} alt="African lodge at sunset" className="absolute inset-0 w-full h-full object-cover" width={1920} height={1080} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-background" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg" style={{ fontFamily: '"Playfair Display", serif' }}>
            The Wandering Pillow
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl drop-shadow">
            Stay where something is growing. Discover unique stays powered by the S2G community.
          </p>

          {/* Search bar */}
          <div className="w-full max-w-2xl bg-card/90 backdrop-blur-md rounded-2xl p-4 border border-border shadow-xl">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Where to?"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 bg-background/50 border-border"
                />
              </div>
              <Button className="md:w-auto" onClick={() => document.getElementById('listings')?.scrollIntoView({ behavior: 'smooth' })}>
                <Search className="w-4 h-4 mr-2" /> Search Stays
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8" id="listings">
        {/* Featured */}
        {featured.length > 0 && (
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4" style={{ fontFamily: '"Playfair Display", serif' }}>
              ✨ Featured Stays
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.slice(0, 3).map(l => (
                <StayCard key={l.id} listing={l} isWishlisted={wishlistIds.has(l.id)} onToggleWishlist={toggleWishlist} />
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6">
          <StayFilters
            search={search} setSearch={setSearch}
            propertyType={propertyType} setPropertyType={setPropertyType}
            petFriendly={petFriendly} setPetFriendly={setPetFriendly}
            onClear={clearFilters}
          />
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="animate-pulse bg-card rounded-xl h-72" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-2xl mb-2">🏡</p>
            <h3 className="text-xl font-semibold text-foreground mb-2">No stays found</h3>
            <p className="text-muted-foreground mb-4">Try adjusting your filters or search for a different destination.</p>
            <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">{listings.length} stays found</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map(l => (
                <StayCard key={l.id} listing={l} isWishlisted={wishlistIds.has(l.id)} onToggleWishlist={toggleWishlist} />
              ))}
            </div>
          </>
        )}

        {/* CTA for Sowers */}
        <div className="mt-16 text-center p-8 rounded-2xl bg-card border border-border">
          <h2 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: '"Playfair Display", serif' }}>
            Are you a Sower with a place to share?
          </h2>
          <p className="text-muted-foreground mb-4">
            List your stay on The Wandering Pillow and connect with travellers from around the world.
          </p>
          <Button asChild>
            <Link to="/list-your-stay">
              List Your Stay <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StaysDiscoveryPage;
