import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Book, Heart, Share2, MessageCircle, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { GradientPlaceholder } from '@/components/ui/GradientPlaceholder';
import { SocialActionButtons } from '@/components/social/SocialActionButtons';
import { ImageCarousel } from './ImageCarousel';
import BookCheckoutModal from './BookCheckoutModal';

interface CommunityBookCardProps {
  book: {
    id: string;
    title: string;
    description: string | null;
    cover_image_url: string | null;
    image_urls: string[];
    genre: string | null;
    publisher: string | null;
    page_count: number | null;
    bestowal_value: number | null;
    sower_id: string;
    sower?: {
      display_name: string;
      logo_url?: string;
      user_id: string;
    };
  };
}

export default function CommunityBookCard({ book }: CommunityBookCardProps) {
  const [showCheckout, setShowCheckout] = useState(false);

  const images = book.image_urls?.length > 0 ? book.image_urls : (book.cover_image_url ? [book.cover_image_url] : []);
  const totalPrice = (book.bestowal_value || 0) * 1.15;

  return (
    <>
      <motion.div whileHover={{ y: -8 }} transition={{ duration: 0.2 }}>
        <Card className='group overflow-hidden border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all duration-300'>
          <CardContent className='p-0'>
            {/* Cover Image Carousel */}
            <ImageCarousel
              images={images}
              title={book.title}
              type="book"
            />

            {/* Content */}
            <div className='p-4 space-y-3'>
              {/* Sower Info */}
              {book.sower && (
                <div className='flex items-center gap-2'>
                  <div className='w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs'>
                    {book.sower.display_name?.[0] || '?'}
                  </div>
                  <span className='text-sm text-white/70 truncate'>
                    {book.sower.display_name}
                  </span>
                </div>
              )}

              {/* Title & Genre */}
              <div>
                <h3 className='font-semibold text-lg text-white truncate'>{book.title}</h3>
                {book.genre && (
                  <Badge variant='secondary' className='mt-1 bg-white/10 text-white/80'>
                    {book.genre}
                  </Badge>
                )}
              </div>

              {/* Description */}
              {book.description && (
                <p className='text-sm text-white/80 line-clamp-2'>{book.description}</p>
              )}

              {/* Price */}
              {book.bestowal_value && book.bestowal_value > 0 && (
                <div className='p-3 bg-purple-500/20 border border-purple-400/50 rounded-lg'>
                  <p className='text-xl font-bold text-white'>
                    ${totalPrice.toFixed(2)} USDC
                  </p>
                  <p className='text-xs text-white/60'>Physical delivery included</p>
                </div>
              )}

              {/* Actions */}
              <Button
                onClick={() => setShowCheckout(true)}
                className='w-full bg-gradient-to-r from-primary to-accent hover:opacity-90'
                disabled={!book.bestowal_value || book.bestowal_value <= 0}
              >
                <ShoppingCart className='w-4 h-4 mr-2' />
                Bestow Now
              </Button>

              {/* Social Actions */}
              <SocialActionButtons
                type='product'
                itemId={book.id}
                ownerId={book.sower?.user_id || book.sower_id}
                ownerName={book.sower?.display_name || 'Author'}
                title={book.title}
                likeCount={0}
                isOwner={false}
                variant='compact'
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <BookCheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        book={{
          id: book.id,
          title: book.title,
          bestowal_value: book.bestowal_value || 0,
          sower_id: book.sower_id,
          cover_image_url: book.cover_image_url,
          image_urls: book.image_urls,
        }}
      />
    </>
  );
}
