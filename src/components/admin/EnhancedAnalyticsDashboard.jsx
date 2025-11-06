import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart as PieIcon,
  DollarSign,
  Users,
  Sprout,
  Activity,
  Download,
  RefreshCw,
  Calendar,
  Target
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import { supabase } from '@/integrations/supabase/client';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00c49f'];

export function EnhancedAnalyticsDashboard() {
  const { user } = useAuth();
  const { isAdminOrGosat } = useRoles();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [analytics, setAnalytics] = useState(null);

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

      // Fetch orchards data
      const { data: orchardsData, error: orchardsError } = await supabase
        .from('orchards')
        .select('id, created_at, status, seed_value, category')
        .gte('created_at', startDate.toISOString());

      // Fetch bestowals data
      const { data: bestowalsData, error: bestowalsError } = await supabase
        .from('bestowals')
        .select('id, amount, created_at, payment_status')
        .gte('created_at', startDate.toISOString());

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
      const categoryData = {};
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

      // Calculate growth rates (simplified)
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
      toast.error('Failed to load analytics data');
      
      // Fallback mock data
      setAnalytics({
        overview: {
          totalUsers: 1250,
          totalOrchards: 89,
          totalRevenue: 125000,
          totalBestowals: 340,
          userGrowth: 15.2,
          revenueGrowth: 28.5
        },
        timeSeriesData: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          users: Math.floor(Math.random() * 20) + 5,
          orchards: Math.floor(Math.random() * 5) + 1,
          bestowals: Math.floor(Math.random() * 15) + 3,
          revenue: Math.floor(Math.random() * 5000) + 1000
        })),
        categoryData: [
          { name: 'Technology', count: 25, value: 45000 },
          { name: 'Vehicles', count: 18, value: 38000 },
          { name: 'Property', count: 12, value: 52000 },
          { name: 'Wellness', count: 10, value: 15000 },
          { name: 'Food', count: 8, value: 12000 }
        ],
        conversionRate: 75.2
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = () => {
    try {
      const dataToExport = {
        timestamp: new Date().toISOString(),
        dateRange,
        analytics
      };
      
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Analytics data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  if (!isAdminOrGosat) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <BarChart3 className="h-16 w-16 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Admin privileges required</p>
        </CardContent>
      </Card>
    );
  }

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex space-x-2">
          <Button onClick={fetchAnalytics} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExportData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{analytics.overview.totalUsers.toLocaleString()}</p>
                <div className="flex items-center mt-1">
                  {analytics.overview.userGrowth > 0 ? 
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" /> :
                    <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                  }
                  <span className={`text-sm ${analytics.overview.userGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(analytics.overview.userGrowth).toFixed(1)}%
                  </span>
                </div>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${analytics.overview.totalRevenue.toLocaleString()}</p>
                <div className="flex items-center mt-1">
                  {analytics.overview.revenueGrowth > 0 ? 
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" /> :
                    <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                  }
                  <span className={`text-sm ${analytics.overview.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(analytics.overview.revenueGrowth).toFixed(1)}%
                  </span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Orchards</p>
                <p className="text-2xl font-bold">{analytics.overview.totalOrchards}</p>
                <p className="text-sm text-muted-foreground">Total created</p>
              </div>
              <Sprout className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">{analytics.conversionRate.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Orchard to bestowal</p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="justify-center">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/30">Overview</TabsTrigger>
          <TabsTrigger value="growth" className="data-[state=active]:bg-secondary/10 data-[state=active]:text-secondary data-[state=active]:border-secondary/30">Growth Trends</TabsTrigger>
          <TabsTrigger value="categories" className="data-[state=active]:bg-accent/20 data-[state=active]:text-accent-foreground data-[state=active]:border-accent/30">Categories</TabsTrigger>
          <TabsTrigger value="revenue" className="data-[state=active]:bg-[hsl(var(--s2g-purple))]/10 data-[state=active]:text-[hsl(var(--s2g-purple))] data-[state=active]:border-[hsl(var(--s2g-purple))]/30">Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Signups Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="users" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.timeSeriesData.slice(-7)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="orchards" fill="#82ca9d" name="Orchards" />
                    <Bar dataKey="bestowals" fill="#ffc658" name="Bestowals" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="growth" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Growth Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analytics.timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="users" stroke="#8884d8" strokeWidth={2} name="Users" />
                  <Line type="monotone" dataKey="orchards" stroke="#82ca9d" strokeWidth={2} name="Orchards" />
                  <Line type="monotone" dataKey="bestowals" stroke="#ffc658" strokeWidth={2} name="Bestowals" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Popular Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.categoryData.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analytics.categoryData.slice(0, 6).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.categoryData.slice(0, 8)} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={analytics.timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}