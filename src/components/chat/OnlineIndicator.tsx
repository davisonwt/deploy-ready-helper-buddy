/**
 * OnlineIndicator - Shows user online/offline status
 * Can display as a dot or with text (last seen / online)
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface OnlineIndicatorProps {
  userId: string;
  showText?: boolean;
  className?: string;
}

export const OnlineIndicator: React.FC<OnlineIndicatorProps> = ({
  userId,
  showText = false,
  className,
}) => {
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Check last activity from latest chat message, then profile
    const checkStatus = async () => {
      try {
        // First check latest chat message as most reliable "last seen"
        const { data: msgData } = await supabase
          .from('chat_messages')
          .select('created_at')
          .eq('sender_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Also get profile updated_at as fallback
        const { data: profileData } = await supabase
          .from('profiles')
          .select('updated_at')
          .eq('user_id', userId)
          .single();

        // Use whichever is more recent
        const lastMsgDate = msgData?.created_at ? new Date(msgData.created_at) : null;
        const profileDate = profileData?.updated_at ? new Date(profileData.updated_at) : null;
        
        const latestDate = lastMsgDate && profileDate 
          ? (lastMsgDate > profileDate ? lastMsgDate : profileDate)
          : lastMsgDate || profileDate;

        if (latestDate) {
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          setIsOnline(latestDate > fiveMinutesAgo);
          setLastSeen(latestDate);
        }
      } catch (error) {
        // Silently fail - user might not have a profile
      }
    };

    checkStatus();

    // Subscribe to presence changes
    const channel = supabase.channel(`presence:${userId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setIsOnline(Object.keys(state).length > 0);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (showText) {
    return (
      <span className={cn("text-xs", className)}>
        {isOnline ? (
          <span className="text-green-500 font-medium">online</span>
        ) : lastSeen ? (
          <span className="text-muted-foreground">
            last seen {formatDistanceToNow(lastSeen, { addSuffix: true })}
          </span>
        ) : (
          <span className="text-muted-foreground">offline</span>
        )}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "h-3 w-3 rounded-full border-2 border-background",
        isOnline ? "bg-green-500" : "bg-muted",
        className
      )}
    />
  );
};
