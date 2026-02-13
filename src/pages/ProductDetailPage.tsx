import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package, Music, FileText, BookOpen, Image, ShoppingCart, Loader2 } from 'lucide-react';
import { SocialActionButtons } from '@/components/social/SocialActionButtons';
import { GradientPlaceholder } from '@/components/ui/GradientPlaceholder';
import { formatCurrency } from '@/lib/utils';


const typeIcons: Record<string, React.ReactNode> = {
  music: <Music className="h-5 w-5" />,
  art: <Image className="h-5 w-5" />,
  file: <FileText className="h-5 w-5" />,
  book: <BookOpen className="h-5 w-5" />,
  produce: <Package className="h-5 w-5" />,
  product: <Package className="h-5 w-5" />,
  ebook: <BookOpen className="h-5 w-5" />,
};

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [sower, setSower] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*, sowers(id, user_id, display_name, wallet_address)')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !data) {
        setError(true);
        setLoading(false);
        return;
      }

      setProduct(data);
      const sowerData = data.sowers as any;
      
      // Fetch profile display name via sower's user_id
      if (sowerData?.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('user_id', sowerData.user_id)
          .maybeSingle();
        setSower({ ...sowerData, profile });
      } else {
        setSower(sowerData);
      }
      setLoading(false);
    };

    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h1 className="text-2xl font-bold">Seed Not Found</h1>
        <p className="text-muted-foreground">This seed may have been removed or is no longer available.</p>
        <Button onClick={() => navigate('/products')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Browse Community Seeds
        </Button>
      </div>
    );
  }

  const images = [
    ...(product.cover_image_url ? [product.cover_image_url] : []),
    ...(Array.isArray(product.image_urls) ? product.image_urls.filter((url: string) => url !== product.cover_image_url) : []),
  ];

  const sowerName = sower?.profile?.display_name || sower?.display_name || 'A Sower';
  const sowerUserId = sower?.user_id || '';

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      <Button variant="ghost" onClick={() => navigate('/products')} className="mb-4 gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Seeds
      </Button>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Image Section */}
        <div className="space-y-3">
          <div className="aspect-square rounded-xl overflow-hidden bg-muted">
            {images.length > 0 ? (
              <img
                src={images[selectedImage]}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <GradientPlaceholder title={product.title} className="w-full h-full" />
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((url: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                    selectedImage === i ? 'border-primary ring-2 ring-primary/30' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {product.type && (
                <Badge variant="secondary" className="gap-1">
                  {typeIcons[product.type] || <Package className="h-3 w-3" />}
                  {product.type}
                </Badge>
              )}
              {product.category && (
                <Badge variant="outline">{product.category}</Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold">{product.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              by {sowerName}
            </p>
          </div>

          {product.price != null && (
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(product.price)}
            </div>
          )}

          {product.description && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm whitespace-pre-wrap">{product.description}</p>
              </CardContent>
            </Card>
          )}

          {product.tags && Array.isArray(product.tags) && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {product.tags.map((tag: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {product.delivery_type && (
            <p className="text-sm text-muted-foreground">
              Delivery: {product.delivery_type}
            </p>
          )}

          <div className="pt-2">
            <SocialActionButtons
              type="product"
              itemId={product.id}
              ownerId={sowerUserId}
              ownerName={sowerName}
              ownerWallet={sower?.wallet_address}
              title={product.title}
              likeCount={product.like_count || 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
