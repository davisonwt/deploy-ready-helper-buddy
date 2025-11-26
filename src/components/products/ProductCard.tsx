import { useState, useRef, useEffect } from 'react';
import { useProductBasket } from '@/contexts/ProductBasketContext';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Play, Pause, Download, ShoppingCart, Sparkles, CheckCircle2, Edit, Trash2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SocialActionButtons } from '@/components/social/SocialActionButtons';
import { SowerAnalyticsTooltip } from '@/components/social/SowerAnalyticsTooltip';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GradientPlaceholder } from '@/components/ui/GradientPlaceholder';
import { formatCurrency } from '@/lib/utils';

interface ProductCardProps {
  product: any;
  featured?: boolean;
  showActions?: boolean; // Control whether to show edit/delete actions
}

export default function ProductCard({ product, featured, showActions = false }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { addToBasket } = useProductBasket();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const isOwner = user?.id === product.sowers?.user_id;
  const isAlbum = product.tags?.includes('album');

  useEffect(() => {
    const loadAudioUrl = async () => {
      if (!isAlbum) {
        setAudioUrl(product.file_url);
        return;
      }

      try {
        const response = await fetch(product.file_url);
        const manifest = await response.json();
        if (manifest.tracks && manifest.tracks.length > 0) {
          setAudioUrl(manifest.tracks[0].url);
        }
      } catch (error) {
        console.error('Failed to load album manifest:', error);
      }
    };

    if (product.type === 'music') {
      loadAudioUrl();
    }
  }, [product.file_url, product.type, isAlbum]);

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const handlePlayPause = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await supabase.rpc('increment_product_play_count', { product_uuid: product.id });
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Error playing audio:', error);
        toast.error('Failed to play audio');
      }
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await supabase.rpc('increment_product_download_count', { product_uuid: product.id });
      
      if (isAlbum) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.error('Please login to download');
          return;
        }

        const downloadUrl = `https://zuwkgasbkpjlxzsjzumu.supabase.co/functions/v1/download-album?product_id=${product.id}`;
        const response = await fetch(downloadUrl, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Download failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${product.title.replace(/[^a-z0-9]/gi, '_')}_album.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Album downloaded!');
      } else {
        window.open(product.file_url, '_blank');
        toast.success('Download started!');
      }
    } catch (error) {
      console.error('Error downloading:', error);
      toast.error('Failed to download');
    } finally {
      setDownloading(false);
    }
  };

  const handleBestow = () => {
    console.log('ProductCard: handleBestow called', product);
    addToBasket(product);
    toast.success('Added to basket!', {
      action: {
        label: 'View Basket',
        onClick: () => navigate('/products/basket')
      }
    });
    // Navigate to basket after adding
    navigate('/products/basket');
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (error) throw error;

      toast.success('Product deleted successfully');
      window.location.reload();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = () => {
    navigate(`/products/edit/${product.id}`);
  };

  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={`group overflow-hidden border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all duration-300 ${featured ? 'border-white/30' : ''}`}>
        <CardContent className="p-0">
          {/* Cover Image */}
          <div className="relative aspect-square overflow-hidden">
            {imageError || !product.cover_image_url ? (
              <GradientPlaceholder 
                type={product.type || 'product'} 
                title={product.title}
                className="w-full h-full"
              />
            ) : (
              <img
                src={product.cover_image_url}
                alt={product.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                onError={() => setImageError(true)}
              />
            )}
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute inset-0 flex items-center justify-center">
                {product.type === 'music' && (
                  <Button
                    size="lg"
                    onClick={handlePlayPause}
                    className="rounded-full bg-primary hover:bg-primary/90 shadow-lg"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6 ml-1" />
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="absolute top-3 left-3 flex gap-2">
              {product.is_featured && (
                <Badge className="bg-primary/90 backdrop-blur-sm">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Featured
                </Badge>
              )}
              <Badge variant="secondary" className="backdrop-blur-sm">
                {product.type}
              </Badge>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            {/* Sower Info */}
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={product.sowers?.logo_url} />
                <AvatarFallback className="bg-white/20 text-white">{product.sowers?.display_name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <span className="text-sm text-white/70 truncate">
                  {product.sowers?.display_name}
                </span>
                {product.sowers?.is_verified && (
                  <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
                )}
              </div>
            </div>

            {/* Title & Description */}
            <div>
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-semibold text-lg truncate text-white flex-1">
                  {product.title}
                </h3>
                {product.bestow > 0 && (
                  <Badge className="bg-purple-500/30 text-white border-purple-400/50 whitespace-nowrap">
                    {formatCurrency(product.bestow)}
                  </Badge>
                )}
              </div>
              {product.description && (
                <p className="text-sm text-white/80 line-clamp-2">
                  {product.description}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-white/70">
              <span>{formatCount(product.play_count)} plays</span>
              {product.bestowal_count > 0 && (
                <span className="text-white">{formatCount(product.bestowal_count)} bestowals</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {showActions && isOwner ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex gap-2 flex-1">
                        <Button
                          onClick={handleEdit}
                          variant="outline"
                          className="flex-1 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          onClick={handleDelete}
                          disabled={deleting}
                          variant="outline"
                          className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/20 backdrop-blur-sm"
                        >
                          {deleting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </>
                          )}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="p-0">
                      <SowerAnalyticsTooltip
                        userId={product.sowers?.user_id}
                        itemId={product.id}
                        itemType="product"
                      />
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : showActions ? null : (
                <>
                  {product.license_type === 'bestowal' ? (
                    <Button
                      onClick={handleBestow}
                      className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Bestow {formatCurrency(product.bestow)}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleDownload}
                      disabled={downloading}
                      variant="secondary"
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {downloading ? 'Downloading...' : 'Free Download'}
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Social Actions */}
            <div className="pt-2">
              <SocialActionButtons
                type="product"
                itemId={product.id}
                ownerId={product.sowers?.user_id}
                ownerName={product.sowers?.display_name || `${product.sowers?.first_name || ''} ${product.sowers?.last_name || ''}`.trim()}
                ownerWallet={product.sowers?.wallet_address}
                title={product.title}
                likeCount={product.like_count || 0}
                isOwner={isOwner}
                variant="compact"
              />
            </div>
          </div>

          {/* Hidden audio element for music */}
          {product.type === 'music' && audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
