import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface StudySubscription {
  isSubscribed: boolean;
  loading: boolean;
  expiresAt: string | null;
  subscribe: () => void; // trigger payment flow
}

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
    // This will be wired to the payment flow (NOWPayments/PayPal)
    // For now, it serves as a trigger point
    console.log('Subscribe flow triggered');
  };

  return { isSubscribed, loading, expiresAt, subscribe };
}
