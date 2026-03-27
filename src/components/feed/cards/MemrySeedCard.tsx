import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, Send, Gift, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProductBasket } from '@/contexts/ProductBasketContext';

interface MemrySeedCardProps {
  post: {
    id: string;
    user_id: string;
    content_type: string;
    media_url: string;
    image_urls?: string[];
    caption: string;
    likes_count: number;
    comments_count: number;
    product_id?: string;
    product_price?: number;
    product_title?: string;
    orchard_id?: string;
    book_id?: string;
    profiles?: {
      display_name: string;
      avatar_url: string;
      username: string;
    };
    user_liked?: boolean;
  };
  user: any;
  isFollowing: boolean;
  onLike: (postId: string) => void;
  onFollow: (userId: string) => void;
  onComment: (postId: string) => void;
}

const toHandle = (value?: string) => {
  const v = (value || '').trim().toLowerCase();
  if (!v) return 'sower';
  return v.replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'sower';
};

export const MemrySeedCard: React.FC<MemrySeedCardProps> = ({
  post,
  user,
  isFollowing,
  onLike,
  onFollow,
  onComment,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToBasket } = useProductBasket();
  const [imgIdx, setImgIdx] = useState(0);
  const [inlineMsg, setInlineMsg] = useState('');

  const allImages = post.image_urls && post.image_urls.length > 1 ? post.image_urls : [post.media_url];
  const hasMultipleImages = allImages.length > 1;
  const isProduct = post.content_type === 'new_product';
  const isOrchard = post.content_type === 'new_orchard';
  const isBook = post.content_type === 'new_book';
  const isSeed = isProduct || isOrchard || isBook;

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/memry?post=${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'S2G Memry', text: post.caption, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: 'Link copied!' });
      }
    } catch {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Link copied!' });
    }
  };

  const handleSendMessage = async () => {
    if (!inlineMsg.trim() || !user) return;
    const realPostId = post.id.replace(/^(product|book|music|orchard)-/, '');
    const { error } = await supabase.from('memry_comments').insert({
      post_id: realPostId,
      user_id: user.id,
      content: inlineMsg.trim(),
    });
    if (!error) {
      toast({ title: 'Message sent! 💬' });
      setInlineMsg('');
    }
  };

  const handleBestow = () => {
    if (isProduct && post.product_id) {
      const productId = post.product_id.replace('product-', '');
      addToBasket({
        id: productId,
        title: post.product_title || post.caption.replace('🌱 SEED: ', ''),
        price: post.product_price || 0,
        cover_image_url: post.media_url,
        sower_id: post.user_id,
        bestowal_count: 1,
        sowers: { display_name: post.profiles?.display_name || 'Sower' },
      });
      toast({ title: 'Added to basket! 🛒' });
      navigate('/products/basket');
    } else if (isOrchard && post.orchard_id) {
      navigate(`/orchard/${post.orchard_id}`);
    } else if (isBook && post.book_id) {
      const bookId = post.book_id.replace('book-', '');
      addToBasket({
        id: bookId,
        title: post.product_title || post.caption.replace('📚 BOOK: ', ''),
        price: post.product_price || 0,
        cover_image_url: post.media_url,
        sower_id: post.user_id,
        bestowal_count: 1,
        sowers: { display_name: post.profiles?.display_name || 'Sower' },
      });
      toast({ title: 'Book added to basket! 📚' });
      navigate('/products/basket');
    } else {
      navigate(`/member/${post.user_id}`);
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden bg-card border border-border/30 shadow-md">
      {/* ── Section 1: Image Zone ── */}
      <div className="relative w-full" style={{ height: 340 }}>
        {/* Seed image */}
        <img
          src={allImages[imgIdx] || post.media_url}
          alt={post.caption}
          className="w-full h-full object-cover"
          onError={(e) => {
            const t = e.target as HTMLImageElement;
            if (!t.dataset.fallback) {
              t.dataset.fallback = '1';
              t.src = '/lovable-uploads/ff9e6e48-049d-465a-8d2b-f6e8fed93522.png';
            }
          }}
        />

        {/* Top-left: New Seed Available badge */}
        {isSeed && (
          <Badge className="absolute top-3 left-3 z-10 bg-emerald-500 hover:bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 shadow-lg">
            {isProduct ? '🌱 New Seed Available' : isBook ? '📚 New Book Available' : '🌳 New Orchard Planted'}
          </Badge>
        )}

        {/* Top-right: Slide count pill */}
        {hasMultipleImages && (
          <div className="absolute top-3 right-3 z-10 bg-black/60 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">
            {imgIdx + 1} / {allImages.length}
          </div>
        )}

        {/* Image navigation arrows */}
        {hasMultipleImages && (
          <>
            <button
              onClick={() => setImgIdx(Math.max(0, imgIdx - 1))}
              disabled={imgIdx === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-20"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setImgIdx(Math.min(allImages.length - 1, imgIdx + 1))}
              disabled={imgIdx === allImages.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-20"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

        {/* Sower row + title overlay at bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-3 pb-3">
          {/* Sower row */}
          <div className="flex items-center gap-2.5 mb-1.5">
            <Link to={`/member/${post.user_id}`}>
              <Avatar className="w-9 h-9 border-2 border-white/70 shadow">
                <AvatarImage src={post.profiles?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-pink-400 to-orange-400 text-white text-xs">
                  {post.profiles?.display_name?.[0] || 'S'}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link to={`/member/${post.user_id}`} className="text-white font-bold text-sm truncate hover:underline">
                  {post.profiles?.display_name || 'Sower'}
                </Link>
                {isSeed && (
                  <span className="bg-emerald-500/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">Seed</span>
                )}
                {isFollowing && (
                  <span className="bg-white/20 text-white/80 text-[9px] font-semibold px-1.5 py-0.5 rounded-full backdrop-blur-sm">Following</span>
                )}
              </div>
              <p className="text-white/60 text-[11px]">@{toHandle(post.profiles?.username || post.profiles?.display_name)}</p>
            </div>
          </div>

          {/* Seed title */}
          <p className="text-white font-semibold text-[16px] leading-tight line-clamp-2 drop-shadow">
            {post.product_title || post.caption}
          </p>
        </div>
      </div>

      {/* ── Section 2: Actions Row ── */}
      <div className="flex items-center gap-2 p-3">
        {/* Heart + count */}
        <button
          onClick={() => onLike(post.id)}
          className="flex items-center gap-1 text-muted-foreground hover:text-pink-500 transition-colors"
        >
          <Heart className={`w-[18px] h-[18px] ${post.user_liked ? 'text-pink-500 fill-pink-500' : ''}`} />
          <span className="text-xs font-medium">{post.likes_count}</span>
        </button>

        {/* Comment + count */}
        <button
          onClick={() => onComment(post.id)}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageCircle className="w-[18px] h-[18px]" />
          <span className="text-xs font-medium">{post.comments_count}</span>
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Share2 className="w-[18px] h-[18px]" />
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Message input pill + send */}
        {user && post.user_id !== user?.id && (
          <>
            <Input
              placeholder={`Message...`}
              value={inlineMsg}
              onChange={(e) => setInlineMsg(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="h-7 text-[11px] rounded-full px-3 flex-1 max-w-[140px] min-w-[80px] bg-muted border-border"
            />
            <button
              onClick={handleSendMessage}
              className="w-7 h-7 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <Send className="w-3.5 h-3.5 text-primary-foreground" />
            </button>
          </>
        )}
      </div>

      {/* ── Section 3: Hairline divider ── */}
      <div className="h-px bg-border/50" />

      {/* ── Section 4: Bestow bar ── */}
      <button
        onClick={handleBestow}
        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 transition-colors text-amber-950 font-bold text-sm rounded-b-2xl"
      >
        <Gift className="w-4 h-4" />
        {isBook ? 'Bestow & Get This Book' : 'Bestow & Get This Seed'}
      </button>
    </div>
  );
};
