import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchProductBySlugOrId } from '@/api/products';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, MapPin, Calendar, Loader2 } from 'lucide-react';

const RATE_UNIT_LABEL: Record<string, string> = {
  per_hour: 'per hour',
  per_job: 'per job',
  callout_quote: 'call-out fee + quote',
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
 * that's already carrying art/ebook/physical-goods logic. "Request
 * booking" is wired disabled for now — spec-service-seeds.md §7/step 4.
 */
export default function HandSeedDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [product, setProduct] = useState<any | null>(null);

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
  const rateUnitLabel = RATE_UNIT_LABEL[details.rate_unit] ?? details.rate_unit;
  const rateText = `$${Number(product.price ?? 0).toFixed(2)} ${rateUnitLabel}`;

  const areaText = details.area_mode === 'you_come_to_me'
    ? `You come to ${details.base_town || 'them'}`
    : `Comes to you within ${details.radius_km ?? 30} km of ${details.base_town || 'their base town'}`;

  const availabilityDays: string[] = Array.isArray(details.availability_days) ? details.availability_days : [];
  const sowerName = product.sowers?.display_name ?? 'A Wandering Hand';

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

          <Button size="lg" className="w-full" disabled title="Bookings coming soon">
            Request booking — Bookings coming soon
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
