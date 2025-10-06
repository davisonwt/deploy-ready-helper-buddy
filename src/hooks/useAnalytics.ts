import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryConfigs } from '@/lib/queryPersistence';

interface AnalyticsData {
  totalUsers: number;
  totalOrchards: number;
  totalBestowals: number;
  totalRevenue: number;
  timeSeriesData: any[];
  categoryData: any[];
}

export const useAnalytics = (dateRange: number = 30) => {
  return useQuery({
    queryKey: ['admin-analytics', dateRange],
    queryFn: async (): Promise<AnalyticsData> => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - dateRange);

      // Fetch all data in parallel
      const [usersResult, orchardsResult, bestowalsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, created_at')
          .gte('created_at', startDate.toISOString()),
        
        supabase
          .from('orchards')
          .select('id, created_at, status, seed_value, category')
          .gte('created_at', startDate.toISOString()),
        
        supabase
          .from('bestowals')
          .select('id, amount, created_at, payment_status')
          .gte('created_at', startDate.toISOString())
      ]);

      if (usersResult.error) throw usersResult.error;
      if (orchardsResult.error) throw orchardsResult.error;
      if (bestowalsResult.error) throw bestowalsResult.error;

      const usersData = usersResult.data || [];
      const orchardsData = orchardsResult.data || [];
      const bestowalsData = bestowalsResult.data || [];

      // Process time series data
      const timeSeriesData = [];
      for (let i = dateRange - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayUsers = usersData.filter(u => u.created_at.startsWith(dateStr)).length;
        const dayOrchards = orchardsData.filter(o => o.created_at.startsWith(dateStr)).length;
        const dayBestowals = bestowalsData.filter(b => b.created_at.startsWith(dateStr)).length;
        const dayRevenue = bestowalsData
          .filter(b => b.created_at.startsWith(dateStr) && b.payment_status === 'completed')
          .reduce((sum, b) => sum + (typeof b.amount === 'number' ? b.amount : parseFloat(b.amount || '0')), 0);

        timeSeriesData.push({
          date: dateStr,
          users: dayUsers,
          orchards: dayOrchards,
          bestowals: dayBestowals,
          revenue: dayRevenue
        });
      }

      // Process category data
      const categoryMap: Record<string, { count: number; value: number }> = {};
      orchardsData.forEach(orchard => {
        const category = orchard.category || 'Other';
        if (!categoryMap[category]) {
          categoryMap[category] = { count: 0, value: 0 };
        }
        categoryMap[category].count++;
        categoryMap[category].value += (typeof orchard.seed_value === 'number' ? orchard.seed_value : parseFloat(orchard.seed_value || '0'));
      });

      const categoryData = Object.entries(categoryMap).map(([name, data]) => ({
        name: name.replace('The Gift of ', ''),
        count: data.count,
        value: data.value
      }));

      return {
        totalUsers: usersData.length,
        totalOrchards: orchardsData.length,
        totalBestowals: bestowalsData.length,
        totalRevenue: bestowalsData
          .filter(b => b.payment_status === 'completed')
          .reduce((sum, b) => sum + (typeof b.amount === 'number' ? b.amount : parseFloat(b.amount || '0')), 0),
        timeSeriesData,
        categoryData
      };
    },
    ...queryConfigs.user, // Use user-specific cache config
    staleTime: 2 * 60 * 1000, // 2 minutes for analytics
  });
};
