import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, ShoppingBag, Eye, MessageSquare } from 'lucide-react';

const SUBTYPE_META: Record<string, { icon: string; label: string; color: string }> = {
  farmer: { icon: '🌾', label: 'Farmer', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  homesteader: { icon: '🏡', label: 'Homesteader', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  manufacturer: { icon: '🏭', label: 'Manufacturer', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
};

interface Provider {
  id: string;
  user_id: string;
  subtype: string;
  business_name: string;
  bio: string | null;
  city: string | null;
  country: string | null;
  logo_url: string | null;
  photos: string[];
}

interface ProviderFeedCardProps {
  provider: Provider;
  onMessage?: (userId: string) => void;
}

export const ProviderFeedCard: React.FC<ProviderFeedCardProps> = ({ provider, onMessage }) => {
  const navigate = useNavigate();
  const meta = SUBTYPE_META[provider.subtype] || SUBTYPE_META.farmer;
  const heroImage = provider.logo_url || (provider.photos?.length > 0 ? provider.photos[0] : null);

  return (
    <div className="rounded-2xl overflow-hidden bg-card border border-border/30 shadow-md flex flex-col">
      {/* Hero image */}
      {heroImage && (
        <div className="w-full">
          <img
            src={heroImage}
            alt={provider.business_name}
            className="w-full aspect-video object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Badge + Name */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`${meta.color} text-xs font-semibold`}>
            {meta.icon} {meta.label}
          </Badge>
          <Badge variant="outline" className="text-xs">🌿 Provider</Badge>
        </div>

        <h3 className="text-xl font-bold text-foreground leading-tight">{provider.business_name}</h3>

        {provider.bio && (
          <p className="text-sm text-muted-foreground leading-relaxed">{provider.bio}</p>
        )}

        {(provider.city || provider.country) && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span>{[provider.city, provider.country].filter(Boolean).join(', ')}</span>
          </div>
        )}

        {/* Action buttons — normal flow, no overlap */}
        <div className="flex flex-col gap-2 pt-2">
          <Button
            size="lg"
            onClick={() => navigate(`/provider/${provider.id}`)}
            className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <ShoppingBag className="w-5 h-5 mr-2" />
            Order Direct
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="default"
              onClick={() => navigate(`/provider/${provider.id}`)}
              className="flex-1 h-11"
            >
              <Eye className="w-4 h-4 mr-1" />
              View Products
            </Button>
            <Button
              variant="outline"
              size="default"
              onClick={() => onMessage?.(provider.user_id)}
              className="flex-1 h-11"
            >
              <MessageSquare className="w-4 h-4 mr-1" />
              Message
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
