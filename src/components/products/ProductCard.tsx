import { useState, useRef } from 'react';
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

interface ProductCardProps {
  product: any;
  featured?: boolean;
}

export default function ProductCard({ product, featured }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { addToBasket } = useProductBasket();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const isOwner = user?.id === product.sowers?.user_id;

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
      window.open(product.file_url, '_blank');
      toast.success('Download started!');
    } catch (error) {
      console.error('Error downloading:', error);
      toast.error('Failed to download');
    } finally {
      setDownloading(false);
    }
  };

  const handleBestow = () => {
    addToBasket(product);
    toast.success('Added to basket!');
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
      <Card className={`group overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-300 ${featured ? 'border-primary/30' : ''}`}>
        <CardContent className="p-0">
          {/* Cover Image */}
          <div className="relative aspect-square overflow-hidden">
            <img
              src={imageError ? '/placeholder.svg' : (product.cover_image_url || '/placeholder.svg')}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              onError={() => setImageError(true)}
            />
            
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
                <AvatarFallback>{product.sowers?.display_name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <span className="text-sm text-muted-foreground truncate">
                  {product.sowers?.display_name}
                </span>
                {product.sowers?.is_verified && (
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                )}
              </div>
            </div>

            {/* Title & Description */}
            <div>
              <h3 className="font-semibold text-lg mb-1 truncate text-foreground">
                {product.title}
              </h3>
              {product.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {product.description}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{formatCount(product.play_count)} plays</span>
              {product.bestowal_count > 0 && (
                <span className="text-primary">{formatCount(product.bestowal_count)} bestowals</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {isOwner ? (
                <>
                  <Button
                    onClick={handleEdit}
                    variant="outline"
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    onClick={handleDelete}
                    disabled={deleting}
                    variant="destructive"
                    className="flex-1"
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
                </>
              ) : (
                <>
                  {product.license_type === 'bestowal' ? (
                    <Button
                      onClick={handleBestow}
                      className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Bestow ${product.price}
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
          </div>

          {/* Hidden audio element for music */}
          {product.type === 'music' && (
            <audio
              ref={audioRef}
              src={product.file_url}
              onEnded={() => setIsPlaying(false)}
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
