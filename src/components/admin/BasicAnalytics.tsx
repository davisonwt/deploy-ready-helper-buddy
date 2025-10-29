import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Users, 
  DollarSign, 
  Sprout, 
  TrendingUp, 
  Activity,
  MessageSquare,
  Eye,
  MousePointerClick
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRealAnalytics } from '@/hooks/useRealAnalytics';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658'];

export default function BasicAnalytics() {
  // Fetch REAL visitor analytics from Lovable's system
  const { data: realAnalytics, isLoading: realAnalyticsLoading } = useRealAnalytics(30);

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['basic-analytics'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get basic counts
      const [
        { count: userCount },
        { count: orchardCount },
        { count: chatMessageCount },
        bestowalsData,
        orchardCategories,
        dailyActivity
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('orchards').select('*', { count: 'exact', head: true }),
        supabase.from('chat_messages').select('*', { count: 'exact', head: true }),
        supabase.from('bestowals').select('amount, payment_status').eq('payment_status', 'completed'),
        supabase.from('orchards').select('category'),
        supabase
          .from('profiles')
          .select('created_at')
          .gte('created_at', thirtyDaysAgo.toISOString())
      ]);

      // Calculate total revenue
      const totalRevenue = bestowalsData.data?.reduce((sum, b) => 
        sum + parseFloat(String(b.amount || 0)), 0) || 0;

      // Process category data for pie chart
      const categoryMap = new Map();
      orchardCategories.data?.forEach(({ category }) => {
        if (category) {
          const cleanCategory = category.replace('The Gift of ', '');
          categoryMap.set(cleanCategory, (categoryMap.get(cleanCategory) || 0) + 1);
        }
      });

      const categoryChartData = Array.from(categoryMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      // Process daily user registrations for line chart
      const userGrowthMap = new Map();
      dailyActivity.data?.forEach(({ created_at }) => {
        const date = new Date(created_at).toISOString().split('T')[0];
        userGrowthMap.set(date, (userGrowthMap.get(date) || 0) + 1);
      });

      const userGrowthData = Array.from(userGrowthMap.entries())
        .map(([date, users]) => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          users
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-7); // Last 7 days

      return {
        users: userCount || 0,
        orchards: orchardCount || 0,
        messages: chatMessageCount || 0,
        revenue: totalRevenue,
        categoryData: categoryChartData,
        userGrowth: userGrowthData
      };
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  if (isLoading || realAnalyticsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* REAL Traffic Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Site Visitors</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{realAnalytics?.visitors.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days (Real traffic)
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{realAnalytics?.pageviews.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {realAnalytics?.pageviewsPerVisit.toFixed(1)} views per visit
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Session</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {Math.floor((realAnalytics?.avgSessionDuration || 0) / 60)}m {Math.floor((realAnalytics?.avgSessionDuration || 0) % 60)}s
            </div>
            <p className="text-xs text-muted-foreground">
              {realAnalytics?.bounceRate}% bounce rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Action Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registered Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.users?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total accounts created
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orchards Created</CardTitle>
            <Sprout className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.orchards?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total projects
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Generated</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${((metrics?.revenue || 0) as number).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">
              From bestowals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Pages & Countries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Pages (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {realAnalytics?.topPages.slice(0, 10).map((page, index) => (
                <div key={page.page} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                    <span className="text-sm font-mono">{page.page}</span>
                  </div>
                  <span className="text-sm font-bold">{page.views} views</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Visitors by Country
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {realAnalytics?.topCountries.map((country, index) => (
                <div key={country.country} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                    <span className="text-sm font-medium">{country.country}</span>
                  </div>
                  <span className="text-sm font-bold">{country.visitors} visitors</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              User Growth (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics?.userGrowth || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs fill-muted-foreground"
                  />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="users" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Orchard Categories Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Orchard Categories (Top 5)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics?.categoryData || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(Number(percent) * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {metrics?.categoryData?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Activity Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <div className="font-medium">User Engagement</div>
              <div className="text-muted-foreground">
                {metrics?.messages} total messages across all chat rooms
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">Project Success</div>
              <div className="text-muted-foreground">
                {metrics?.orchards} orchards created by the community
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">Revenue Growth</div>
              <div className="text-muted-foreground">
                ${(metrics?.revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} raised through bestowals
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}