import React, { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProviderFeedCard } from '@/components/feed/cards/ProviderFeedCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sprout } from 'lucide-react';

const SUBTYPE_META: Record<
  string,
  { emoji: string; title: string; subtitle: string; brand: string }
> = {
  farmer: {
    emoji: '🌾',
    title: 'The Wandering Field',
    subtitle: 'Fresh produce direct from tribal farmers',
    brand: 'Farmer',
  },
  homesteader: {
    emoji: '🏡',
    title: 'The Wandering Hearth',
    subtitle: 'Handmade goods from tribal homesteaders',
    brand: 'Homesteader',
  },
  manufacturer: {
    emoji: '🏭',
    title: 'The Wandering Forge',
    subtitle: 'Tribal manufacturers producing at scale',
    brand: 'Manufacturer',
  },
};

const ProvidersDirectoryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const subtypeParam = (searchParams.get('type') || 'farmer').toLowerCase();
  const subtype = SUBTYPE_META[subtypeParam] ? subtypeParam : 'farmer';
  const meta = SUBTYPE_META[subtype];

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['providers-directory', subtype],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('providers')
        .select(
          'id, user_id, subtype, business_name, bio, city, country, logo_url, photos, created_at',
        )
        .eq('subtype', subtype)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const heroBlock = useMemo(
    () => (
      <div className="rounded-2xl border border-border/40 bg-card/60 p-6 backdrop-blur-md shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-4xl" aria-hidden>
            {meta.emoji}
          </span>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{meta.title}</h1>
            <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
          </div>
        </div>
      </div>
    ),
    [meta],
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="text-muted-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Back
      </Button>

      {heroBlock}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : providers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 bg-card/40 p-10 text-center space-y-3">
          <Sprout className="mx-auto h-10 w-10 text-primary/70" />
          <h2 className="text-lg font-semibold text-foreground">
            No {meta.brand.toLowerCase()}s here yet
          </h2>
          <p className="text-sm text-muted-foreground">
            We're still gathering tribal {meta.brand.toLowerCase()}s in your region.
            Check back soon, or invite one from your tribe.
          </p>
          <Button
            onClick={() => navigate(`/register-provider?type=${subtype}`)}
            className="mt-2"
          >
            Become a {meta.brand}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {providers.map((p) => (
            <ProviderFeedCard key={p.id} provider={p as any} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProvidersDirectoryPage;
