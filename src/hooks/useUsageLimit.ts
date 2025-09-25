import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useUsageLimit = (type: string) => {
  const { session } = useAuth();
  const user = session?.user;

  const { data: limitData, isLoading } = useQuery({
    queryKey: ['usage-limit', user?.id, type],
    queryFn: async () => {
      if (!user) return { remaining: 0 };
      
      // Get today's usage count for this user and type
      const { data: usageCount, error } = await supabase.rpc('get_ai_usage_today', {
        user_id_param: user.id
      });
      
      if (error) {
        console.error('Error fetching usage:', error);
        return { remaining: 0 };
      }
      
      // Default limits based on type
      const limits = {
        'script': 10,
        'thumbnail': 5,
        'video': 3,
        'content_idea': 10,
        'marketing_tip': 10
      };
      
      const dailyLimit = limits[type as keyof typeof limits] || 5;
      const remaining = Math.max(0, dailyLimit - (usageCount || 0));
      
      return { remaining, used: usageCount || 0, limit: dailyLimit };
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return { 
    remaining: limitData?.remaining || 0, 
    used: limitData?.used || 0,
    limit: limitData?.limit || 10,
    loading: isLoading 
  };
};