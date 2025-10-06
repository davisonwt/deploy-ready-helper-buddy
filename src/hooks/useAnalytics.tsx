import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/lib/errorHandler';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalOrchards: number;
    totalRevenue: number;
    totalBestowals: number;
    userGrowth: number;
    revenueGrowth: number;
  };
  timeSeriesData: any[];
  categoryData: any[];
  conversionRate: number;
}

export const useAnalytics = (dateRange: string) => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(dateRange));

      // Fetch users data
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('user_id, created_at')
        .gte('created_at', startDate.toISOString());

      if (usersError) throw usersError;

      // Fetch orchards data
      const { data: orchardsData, error: orchardsError } = await supabase
        .from('orchards')
        .select('id, created_at, status, seed_value, category')
        .gte('created_at', startDate.toISOString());

      if (orchardsError) throw orchardsError;

      // Fetch bestowals data
      const { data: bestowalsData, error: bestowalsError } = await supabase
        .from('bestowals')
        .select('id, amount, created_at, payment_status')
        .gte('created_at', startDate.toISOString());

      if (bestowalsError) throw bestowalsError;

      // Process time series data for charts
      const timeSeriesData = [];
      for (let i = parseInt(dateRange) - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayUsers = usersData?.filter(u => u.created_at.startsWith(dateStr)).length || 0;
        const dayOrchards = orchardsData?.filter(o => o.created_at.startsWith(dateStr)).length || 0;
        const dayBestowals = bestowalsData?.filter(b => b.created_at.startsWith(dateStr)).length || 0;
        const dayRevenue = bestowalsData?.filter(b => 
          b.created_at.startsWith(dateStr) && b.payment_status === 'completed'
        ).reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);

        timeSeriesData.push({
          date: dateStr,
          users: dayUsers,
          orchards: dayOrchards,
          bestowals: dayBestowals,
          revenue: dayRevenue
        });
      }

      // Process category data
      const categoryData: Record<string, any> = {};
      orchardsData?.forEach(orchard => {
        const category = orchard.category || 'Other';
        if (!categoryData[category]) {
          categoryData[category] = { count: 0, value: 0 };
        }
        categoryData[category].count++;
        categoryData[category].value += parseFloat(orchard.seed_value || 0);
      });

      const categoryChartData = Object.entries(categoryData).map(([name, data]) => ({
        name: name.replace('The Gift of ', ''),
        count: data.count,
        value: data.value
      })).sort((a, b) => b.count - a.count).slice(0, 10);

      // Calculate totals and growth
      const totalUsers = usersData?.length || 0;
      const totalOrchards = orchardsData?.length || 0;
      const totalRevenue = bestowalsData?.filter(b => b.payment_status === 'completed')
        .reduce((sum, b) => sum + parseFloat(b.amount || 0), 0) || 0;
      const totalBestowals = bestowalsData?.length || 0;

      // Calculate growth rates
      const midPoint = Math.floor(timeSeriesData.length / 2);
      const firstHalf = timeSeriesData.slice(0, midPoint);
      const secondHalf = timeSeriesData.slice(midPoint);
      
      const firstHalfUsers = firstHalf.reduce((sum, d) => sum + d.users, 0);
      const secondHalfUsers = secondHalf.reduce((sum, d) => sum + d.users, 0);
      const userGrowth = firstHalfUsers > 0 ? ((secondHalfUsers - firstHalfUsers) / firstHalfUsers * 100) : 0;

      const firstHalfRevenue = firstHalf.reduce((sum, d) => sum + d.revenue, 0);
      const secondHalfRevenue = secondHalf.reduce((sum, d) => sum + d.revenue, 0);
      const revenueGrowth = firstHalfRevenue > 0 ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue * 100) : 0;

      setAnalytics({
        overview: {
          totalUsers,
          totalOrchards,
          totalRevenue,
          totalBestowals,
          userGrowth,
          revenueGrowth
        },
        timeSeriesData,
        categoryData: categoryChartData,
        conversionRate: totalOrchards > 0 ? (totalBestowals / totalOrchards * 100) : 0
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      handleError(error, { component: 'useAnalytics' });
    } finally {
      setLoading(false);
    }
  };

  return { analytics, loading, refetch: fetchAnalytics };
};
