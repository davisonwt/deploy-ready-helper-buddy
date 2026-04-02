import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, MapPin, Star, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StayListing } from '@/hooks/useStays';

interface StayCardProps {
  listing: StayListing;
  isWishlisted?: boolean;
  onToggleWishlist?: (id: string) => void;
  currency?: 'ZAR' | 'USD';
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  game_lodge: '🦁 Game Lodge',
  guesthouse: '🏠 Guesthouse',
  bnb: '☕ B&B',
  farm_stay: '🌾 Farm Stay',
  self_catering: '🍳 Self-Catering',
  glamping: '⛺ Glamping',
  backpackers: '🎒 Backpackers',
  eco_retreat: '🌿 Eco Retreat',
  treehouse: '🌳 Treehouse',
  bush_camp: '🏕️ Bush Camp',
  boutique_hotel: '🏨 Boutique Hotel',
  vineyard_stay: '🍇 Vineyard Stay',
  mountain_hut: '⛰️ Mountain Hut',
  coastal_cottage: '🌊 Coastal Cottage',
  family_farm: '👨‍👩‍👧 Family Farm',
};

const StayCard: React.FC<StayCardProps> = ({ listing, isWishlisted, onToggleWishlist, currency = 'ZAR' }) => {
  const coverImage = listing.cover_photo || listing.photos?.[0] || '/placeholder.svg';
  const typeLabel = PROPERTY_TYPE_LABELS[listing.property_type] || listing.property_type;

  return (
    <Link to={`/stays/${listing.id}`}>
      <Card className="group overflow-hidden border-none bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={coverImage}
            alt={listing.business_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {/* Wishlist button */}
          {onToggleWishlist && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 bg-background/60 backdrop-blur-sm rounded-full hover:bg-background/80 z-10"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleWishlist(listing.id);
              }}
            >
              <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-foreground'}`} />
            </Button>
          )}
          {/* Featured badge */}
          {listing.is_featured && (
            <Badge className="absolute top-3 left-3 bg-amber-500 text-white border-none">
              ✨ Featured
            </Badge>
          )}
          {/* Type badge */}
          <Badge variant="secondary" className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm text-foreground border-none text-xs">
            {typeLabel}
          </Badge>
        </div>

        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground text-sm line-clamp-1 group-hover:text-primary transition-colors">
              {listing.business_name}
            </h3>
            {listing.avg_rating > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-medium text-foreground">{listing.avg_rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs line-clamp-1">
              {[listing.city, listing.province, listing.country].filter(Boolean).join(', ')}
            </span>
          </div>

          {listing.short_description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{listing.short_description}</p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {listing.pet_friendly && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">🐾 Pet-Friendly</Badge>
            )}
            {listing.activities?.slice(0, 2).map(a => (
              <Badge key={a} variant="outline" className="text-[10px] px-1.5 py-0">{a}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default StayCard;
