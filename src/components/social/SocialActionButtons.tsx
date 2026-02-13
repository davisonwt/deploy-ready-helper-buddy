import { FC, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Heart, Share2, DollarSign, UserPlus, UserCheck, Copy, Check, Facebook, Mail } from 'lucide-react';
import { useSocialActions } from '@/hooks/useSocialActions';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DonateModal } from '@/components/chat/DonateModal';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error('Please login to like');
      return;
    }

    try {
      const result = type === 'product' 
        ? await likeProduct(itemId)
        : await likeOrchard(itemId);

      // Toggle like state based on result
      setIsLiked(result.success);
      if (result.success) {
        setLocalLikeCount(prev => prev + 1);
      } else {
        // Check if it was an unlike (result.success = false but was previously liked)
        if (isLiked) {
          setLocalLikeCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Like error:', error);
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

  const [copied, setCopied] = useState(false);

  const getShareUrl = () => {
    return `https://sow2growapp.com/${type === 'product' ? 'products' : 'orchard'}/${itemId}`;
  };

  const shareText = `Check out "${title}" on Sow2Grow! 🌱🌿`;

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleFacebookShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}&quote=${encodeURIComponent(shareText)}`, '_blank', 'width=600,height=400');
  };

  const handleTwitterShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(getShareUrl())}&hashtags=Sow2Grow,Community`, '_blank', 'width=600,height=400');
  };

  const handleWhatsAppShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + getShareUrl())}`, '_blank');
  };

  const handleTelegramShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://t.me/share/url?url=${encodeURIComponent(getShareUrl())}&text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleTikTokShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const tikTokText = `${shareText} ${getShareUrl()} #Sow2Grow #Community`;
    await navigator.clipboard.writeText(tikTokText);
    toast.success('Share text copied! Open TikTok and paste it into your new post.');
  };

  const handleEmailShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const subject = encodeURIComponent(`Check out: ${title}`);
    const body = encodeURIComponent(`${shareText}\n\n${getShareUrl()}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await shareContent(type, itemId, title);
    } catch (error) {
      console.error('Share error:', error);
    }
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

        {/* Share Button with Social Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size={isCompact ? "sm" : "default"}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="gap-1"
            >
              <Share2 className="h-4 w-4" />
              {!isCompact && <span>Share</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="end">
            <div className="space-y-2">
              <h4 className="font-medium text-sm mb-2">Share to</h4>
              <Button onClick={handleCopyLink} variant="ghost" className="w-full justify-start h-auto p-2 gap-2">
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                <span className="text-sm">Copy Link</span>
              </Button>
              <Button onClick={handleFacebookShare} variant="ghost" className="w-full justify-start h-auto p-2 gap-2">
                <Facebook className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Facebook</span>
              </Button>
              <Button onClick={handleTwitterShare} variant="ghost" className="w-full justify-start h-auto p-2 gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                <span className="text-sm">X (Twitter)</span>
              </Button>
              <Button onClick={handleWhatsAppShare} variant="ghost" className="w-full justify-start h-auto p-2 gap-2">
                <svg className="h-4 w-4 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                <span className="text-sm">WhatsApp</span>
              </Button>
              <Button onClick={handleTelegramShare} variant="ghost" className="w-full justify-start h-auto p-2 gap-2">
                <svg className="h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16l-1.58 7.44c-.12.54-.44.67-.89.42l-2.46-1.81-1.19 1.14c-.13.13-.24.24-.49.24l.17-2.43 4.33-3.91c.19-.17-.04-.26-.29-.1l-5.35 3.37-2.31-.72c-.5-.16-.51-.5.11-.74l9.03-3.48c.42-.16.78.1.65.73z"/></svg>
                <span className="text-sm">Telegram</span>
              </Button>
              <Button onClick={handleTikTokShare} variant="ghost" className="w-full justify-start h-auto p-2 gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.321 5.562a5.124 5.124 0 01-.443-.258 6.228 6.228 0 01-1.137-.966c-.849-.948-1.254-2.12-1.254-2.12S16.423 1.85 16.423.972h-3.322v14.307c0 2.363-1.916 4.279-4.279 4.279-2.363 0-4.279-1.916-4.279-4.279 0-2.363 1.916-4.279 4.279-4.279.297 0 .58.034.854.088v-3.37C8.96 7.66 8.233 7.6 7.5 7.6c-4.142 0-7.5 3.358-7.5 7.5s3.358 7.5 7.5 7.5 7.5-3.358 7.5-7.5V9.841a9.77 9.77 0 005.645 1.802v-3.322c-1.645 0-3.322-.759-3.322-2.759z"/></svg>
                <span className="text-sm">TikTok</span>
              </Button>
              <Button onClick={handleEmailShare} variant="ghost" className="w-full justify-start h-auto p-2 gap-2">
                <Mail className="h-4 w-4" />
                <span className="text-sm">Email</span>
              </Button>
              <div className="border-t my-1" />
              <Button onClick={(e: React.MouseEvent) => { e.stopPropagation(); window.open('https://www.364yhvh.org/', '_blank'); }} variant="ghost" className="w-full justify-start h-auto p-2 gap-2">
                <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                <span className="text-sm">364yhvh.org</span>
              </Button>
            </div>
          </PopoverContent>
        </Popover>

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
