import { FC, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Share2, DollarSign, UserPlus, UserCheck } from 'lucide-react';
import { useSocialActions } from '@/hooks/useSocialActions';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DonateModal } from '@/components/chat/DonateModal';
import { cn } from '@/lib/utils';

interface SocialActionButtonsProps {
  type: 'product' | 'orchard';
  itemId: string;
  ownerId: string;
  ownerName?: string;
  ownerWallet?: string;
  title: string;
  likeCount?: number;
  isOwner?: boolean;
  variant?: 'default' | 'compact';
  className?: string;
}

export const SocialActionButtons: FC<SocialActionButtonsProps> = ({
  type,
  itemId,
  ownerId,
  ownerName,
  ownerWallet,
  title,
  likeCount = 0,
  isOwner = false,
  variant = 'default',
  className
}) => {
  const { user } = useAuth();
  const { followUser, unfollowUser, likeProduct, likeOrchard, shareContent } = useSocialActions();
  const [isLiked, setIsLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(likeCount);
  const [showDonate, setShowDonate] = useState(false);

  useEffect(() => {
    if (!user) return;

    const checkStatus = async () => {
      try {
        // Check if liked
        if (type === 'product') {
          const { data: likeData } = await supabase
            .from('product_likes')
            .select('id')
            .eq('product_id', itemId)
            .eq('user_id', user.id)
            .maybeSingle();
          setIsLiked(!!likeData);
        } else {
          const { data: likeData } = await supabase
            .from('orchard_likes')
            .select('id')
            .eq('orchard_id', itemId)
            .eq('user_id', user.id)
            .maybeSingle();
          setIsLiked(!!likeData);
        }

        // Check if following
        const { data: followData } = await supabase
          .from('followers')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', ownerId)
          .maybeSingle();

        setIsFollowing(!!followData);
      } catch (error) {
        console.error('Error checking status:', error);
      }
    };

    checkStatus();
  }, [user, itemId, ownerId, type]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    const result = type === 'product' 
      ? await likeProduct(itemId)
      : await likeOrchard(itemId);

    if (result.success) {
      setIsLiked(true);
      setLocalLikeCount(prev => prev + 1);
    } else {
      setIsLiked(false);
      setLocalLikeCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || isOwner || user.id === ownerId) return;

    if (isFollowing) {
      const result = await unfollowUser(ownerId);
      if (result.success) setIsFollowing(false);
    } else {
      const result = await followUser(ownerId, type, itemId);
      if (result.success) setIsFollowing(true);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await shareContent(type, itemId, title);
  };

  const handleDonate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDonate(true);
  };

  const isCompact = variant === 'compact';

  return (
    <>
      <div className={cn("flex items-center gap-2", className)}>
        {/* Like Button */}
        <Button
          variant={isLiked ? "default" : "outline"}
          size={isCompact ? "sm" : "default"}
          onClick={handleLike}
          disabled={!user}
          className={cn(
            "gap-1",
            isLiked && "bg-destructive hover:bg-destructive/90"
          )}
        >
          <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
          {!isCompact && <span>{localLikeCount}</span>}
        </Button>

        {/* Follow Button */}
        {!isOwner && user?.id !== ownerId && (
          <Button
            variant={isFollowing ? "secondary" : "outline"}
            size={isCompact ? "sm" : "default"}
            onClick={handleFollow}
            disabled={!user}
            className="gap-1"
          >
            {isFollowing ? (
              <>
                <UserCheck className="h-4 w-4" />
                {!isCompact && <span>Following</span>}
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                {!isCompact && <span>Follow</span>}
              </>
            )}
          </Button>
        )}

        {/* Share Button */}
        <Button
          variant="outline"
          size={isCompact ? "sm" : "default"}
          onClick={handleShare}
          className="gap-1"
        >
          <Share2 className="h-4 w-4" />
          {!isCompact && <span>Share</span>}
        </Button>

        {/* Donate Button */}
        {!isOwner && user?.id !== ownerId && (
          <Button
            variant="outline"
            size={isCompact ? "sm" : "default"}
            onClick={handleDonate}
            disabled={!user || !ownerWallet}
            className="gap-1"
          >
            <DollarSign className="h-4 w-4" />
            {!isCompact && <span>Donate</span>}
          </Button>
        )}
      </div>

      <DonateModal
        isOpen={showDonate}
        onClose={() => setShowDonate(false)}
        hostWallet={ownerWallet}
        hostName={ownerName}
      />
    </>
  );
};
