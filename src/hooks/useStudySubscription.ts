import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface StudySubscription {
  isSubscribed: boolean;
  loading: boolean;
  expiresAt: string | null;
  subscribe: () => void;
}

/**
 * Checks if user has an active study subscription.
 * The Scriptural Study Q&A is a GoSat project — 5 USDT/month goes entirely
 * to GoSat's tithing wallet (no 85/10/5 split since GoSat IS the platform).
 * User-hosted SkillDrop sessions use skilldrop_session_subscriptions with the
 * standard 85% host / 10% tithing / 5% admin split.
 */
export function useStudySubscription(): StudySubscription {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const checkSubscription = async () => {
      try {
        const { data, error } = await supabase
          .from('study_subscriptions' as any)
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .gte('expires_at', new Date().toISOString())
          .order('expires_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        const sub = (data as any)?.[0];
        if (sub) {
          setIsSubscribed(true);
          setExpiresAt(sub.expires_at);
        } else {
          setIsSubscribed(false);
          setExpiresAt(null);
        }
      } catch (err) {
        console.error('Error checking study subscription:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [user]);

  const subscribe = () => {
    console.log('GoSat study subscription flow triggered — 5 USDT to GoSat tithing wallet');
  };

  return { isSubscribed, loading, expiresAt, subscribe };
}
