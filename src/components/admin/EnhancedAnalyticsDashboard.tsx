import { useCallback, useEffect, useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  DollarSign,
  Users,
  Sprout,
  Download,
  RefreshCw,
  Target,
  AlertTriangle,
  Landmark,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRoles } from '@/hooks/useRoles';
import { supabase } from '@/integrations/supabase/client';
import { GROSS_VOLUME_LABEL, GROSS_VOLUME_SUB, S2G_REVENUE_LABEL, s2gRevenueSub } from '@/lib/analytics/honestTiles';

// Admin analytics (the /admin "Analytics" tab). BOOKKEEPING-PLAN.md phase 3,
// "honest tiles": the word "revenue" is reserved for revenue_ledger sums.
// Gross bestowal + sale volume is still shown, labelled as volume; S2G's
// own revenue comes from public.revenue_summary(). There is no fabricated
// fallback: when a query fails the page says so and offers a retry.

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00c49f'];

interface DayPoint { date: string; users: number; orchards: number; bestowals: number; volume: number }
interface CategoryPoint { name: string; count: number; value: number }
interface Analytics {
  overview: { totalUsers: number; totalOrchards: number; grossVolume: number; totalBestowals: number; userGrowth: number; volumeGrowth: number };
  timeSeriesData: DayPoint[];
  categoryData: CategoryPoint[];
  conversionRate: number;
}
interface RevenueSummary { operating_net: number; net: number; income_total: number; cost_total: number; rows: number; period: string }
interface S2gRevenue { allTime: RevenueSummary; thisMonth: RevenueSummary }

const money = (n: number) => `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function EnhancedAnalyticsDashboard() {
  const { isAdminOrGosat } = useRoles();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [s2g, setS2g] = useState<S2gRevenue | null>(null);
  const [s2gError, setS2gError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(dateRange, 10));
      const since = startDate.toISOString();

      const [users, orchards, bestowals, productBestowals] = await Promise.all([
        supabase.from('profiles').select('user_id, created_at').gte('created_at', since),
        supabase.from('orchards').select('id, created_at, status, seed_value, category').gte('created_at', since),
        supabase.from('bestowals').select('id, amount, created_at, payment_status').gte('created_at', since),
        supabase.from('product_bestowals').select('id, amount, created_at, status').gte('created_at', since),
      ]);
      const failed = [
        ['profiles', users.error], ['orchards', orchards.error], ['bestowals', bestowals.error], ['product_bestowals', productBestowals.error],
      ].filter(([, e]) => e) as Array<[string, { message: string }]>;
      if (failed.length) {
        throw new Error(failed.map(([t, e]) => `${t}: ${e.message}`).join('; '));
      }
      const usersData = users.data ?? [];
      const orchardsData = orchards.data ?? [];
      const bestowalsData = bestowals.data ?? [];
      const productBestowalsData = productBestowals.data ?? [];

      // Daily series. "volume" is gross money moved that day (completed
      // bestowals), not S2G's revenue.
      const timeSeriesData: DayPoint[] = [];
      for (let i = parseInt(dateRange, 10) - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayVolume =
          bestowalsData.filter((b) => b.created_at.startsWith(dateStr) && b.payment_status === 'completed')
            .reduce((sum, b) => sum + parseFloat(String(b.amount || 0)), 0) +
          productBestowalsData.filter((p) => p.created_at.startsWith(dateStr) && p.status === 'completed')
            .reduce((sum, p) => sum + parseFloat(String(p.amount || 0)), 0);
        timeSeriesData.push({
          date: dateStr,
          users: usersData.filter((u) => u.created_at.startsWith(dateStr)).length,
          orchards: orchardsData.filter((o) => o.created_at.startsWith(dateStr)).length,
          bestowals: bestowalsData.filter((b) => b.created_at.startsWith(dateStr)).length,
          volume: Math.round(dayVolume * 100) / 100,
        });
      }

      const categoryData: Record<string, { count: number; value: number }> = {};
      for (const orchard of orchardsData) {
        const category = orchard.category || 'Other';
        categoryData[category] ??= { count: 0, value: 0 };
        categoryData[category].count++;
        categoryData[category].value += parseFloat(String(orchard.seed_value || 0));
      }
      const categoryChartData: CategoryPoint[] = Object.entries(categoryData)
        .map(([name, data]) => ({ name: name.replace('The Gift of ', ''), count: data.count, value: data.value }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const totalUsers = usersData.length;
      const totalOrchards = orchardsData.filter((o) => o.status === 'active').length;
      // Gross volume across both tables: what bestowers paid, most of which
      // is other people's money (sowers' shares, orchard holdings).
      const grossVolume =
        bestowalsData.filter((b) => b.payment_status === 'completed').reduce((sum, b) => sum + parseFloat(String(b.amount || 0)), 0) +
        productBestowalsData.filter((p) => p.status === 'completed').reduce((sum, p) => sum + parseFloat(String(p.amount || 0)), 0);
      const totalBestowals = bestowalsData.length + productBestowalsData.length;

      const midPoint = Math.floor(timeSeriesData.length / 2);
      const firstHalf = timeSeriesData.slice(0, midPoint);
      const secondHalf = timeSeriesData.slice(midPoint);
      const firstHalfUsers = firstHalf.reduce((sum, d) => sum + d.users, 0);
      const secondHalfUsers = secondHalf.reduce((sum, d) => sum + d.users, 0);
      const userGrowth = firstHalfUsers > 0 ? ((secondHalfUsers - firstHalfUsers) / firstHalfUsers) * 100 : 0;
      const firstHalfVolume = firstHalf.reduce((sum, d) => sum + d.volume, 0);
      const secondHalfVolume = secondHalf.reduce((sum, d) => sum + d.volume, 0);
      const volumeGrowth = firstHalfVolume > 0 ? ((secondHalfVolume - firstHalfVolume) / firstHalfVolume) * 100 : 0;

      setAnalytics({
        overview: { totalUsers, totalOrchards, grossVolume: Math.round(grossVolume * 100) / 100, totalBestowals, userGrowth, volumeGrowth },
        timeSeriesData,
        categoryData: categoryChartData,
        conversionRate: totalOrchards > 0 ? (totalBestowals / totalOrchards) * 100 : 0,
      });
    } catch (err) {
      // No fabricated numbers: the page shows the failure and a retry.
      const message = err instanceof Error ? err.message : String(err);
      console.error('Error fetching analytics:', err);
      setAnalytics(null);
      setError(message);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // S2G's own revenue, from the ledger: all-time and this month, live only.
  const fetchS2gRevenue = useCallback(async () => {
    setS2gError(null);
    try {
      const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString().slice(0, 10);
      const [all, month] = await Promise.all([
        supabase.rpc('revenue_summary' as never, { _period: null, _environment: 'live' } as never),
        supabase.rpc('revenue_summary' as never, { _period: monthStart, _environment: 'live' } as never),
      ]);
      if (all.error) throw all.error;
      if (month.error) throw month.error;
      setS2g({ allTime: all.data as unknown as RevenueSummary, thisMonth: month.data as unknown as RevenueSummary });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('revenue_summary failed:', err);
      setS2g(null);
      setS2gError(message);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);
  useEffect(() => { fetchS2gRevenue(); }, [fetchS2gRevenue]);

  const handleExportData = () => {
    try {
      const dataToExport = { timestamp: new Date().toISOString(), dateRange, analytics, s2gRevenue: s2g };
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Analytics data exported successfully');
    } catch {
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

  const aliveBtn =
    'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold text-cyan-100 bg-white/5 hover:bg-white/10 border border-cyan-400/40 hover:border-cyan-300/70 backdrop-blur transition-all hover:-translate-y-0.5 active:scale-95 shadow-[0_0_18px_rgba(34,211,238,0.18)] hover:shadow-[0_0_24px_rgba(34,211,238,0.35)]';
  const aliveBtnAmber =
    'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold text-amber-100 bg-white/5 hover:bg-white/10 border border-amber-400/40 hover:border-amber-300/70 backdrop-blur transition-all hover:-translate-y-0.5 active:scale-95 shadow-[0_0_18px_rgba(245,158,11,0.18)] hover:shadow-[0_0_24px_rgba(245,158,11,0.35)]';

  // The admin page paints its own dark background regardless of theme, so
  // the tab bar uses explicit colours, not theme tokens: theme tokens gave
  // light-grey text on a grey pill over near-black in light mode.
  const tabsListClass = 'bg-[#0f172a]/90 border border-white/15 text-slate-300 shadow-[0_0_24px_rgba(0,0,0,0.35)]';
  const tabTriggerClass = (accent: string) =>
    `text-slate-300 hover:text-white hover:bg-white/10 data-[state=active]:text-white data-[state=active]:bg-white/15 data-[state=active]:ring-1 ${accent}`;

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="analytics-loading">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="rounded-2xl border border-rose-400/30 bg-[#0f172a]/80 p-6 text-slate-100" data-testid="analytics-error">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-rose-300 shrink-0" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Analytics could not be loaded</h2>
            <p className="text-sm text-slate-300 mt-1">Nothing is shown rather than a made-up number. {error ?? 'No data returned.'}</p>
            <button onClick={fetchAnalytics} className={`${aliveBtn} mt-4`}>
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-48 bg-white/5 border-white/10 text-slate-100 hover:bg-white/10">
            <SelectValue placeholder="Select date range" />
          </SelectTrigger>
          <SelectContent className="bg-[#0f172a] border-white/10 text-slate-100">
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <button onClick={() => { fetchAnalytics(); fetchS2gRevenue(); }} className={aliveBtn}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={handleExportData} className={aliveBtnAmber}>
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard title="New users" value={analytics.overview.totalUsers.toLocaleString()} trend={analytics.overview.userGrowth} Icon={Users} accent="cyan" />
        <MetricCard title={GROSS_VOLUME_LABEL} value={money(analytics.overview.grossVolume)} trend={analytics.overview.volumeGrowth} sub={GROSS_VOLUME_SUB} Icon={DollarSign} accent="amber" testId="tile-gross-volume" />
        <MetricCard
          title={S2G_REVENUE_LABEL}
          value={s2g ? money(s2g.allTime.operating_net) : s2gError ? 'unavailable' : '…'}
          sub={s2g ? s2gRevenueSub(s2g.thisMonth.operating_net) : s2gError ? `revenue_summary: ${s2gError}` : 'reading the ledger'}
          Icon={Landmark}
          accent="emerald"
          testId="tile-s2g-revenue"
          footer={<Link to="/admin/treasury" className="text-xs text-emerald-300 hover:underline">Treasury</Link>}
        />
        <MetricCard title="Active Orchards" value={String(analytics.overview.totalOrchards)} sub="Currently active" Icon={Sprout} accent="amber" />
        <MetricCard title="Conversion Rate" value={`${analytics.conversionRate.toFixed(1)}%`} sub="Orchard to bestowal" Icon={Target} accent="violet" />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <div className="flex justify-center">
          <TabsList className={`gap-2 ${tabsListClass}`} data-testid="analytics-tabs">
            <TabsTrigger value="overview" className={tabTriggerClass('data-[state=active]:ring-cyan-300/60')}>Overview</TabsTrigger>
            <TabsTrigger value="growth" className={tabTriggerClass('data-[state=active]:ring-emerald-300/60')}>Growth Trends</TabsTrigger>
            <TabsTrigger value="categories" className={tabTriggerClass('data-[state=active]:ring-amber-300/60')}>Categories</TabsTrigger>
            <TabsTrigger value="revenue" className={tabTriggerClass('data-[state=active]:ring-violet-300/60')}>Volume &amp; revenue</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>User Signups Over Time</CardTitle></CardHeader>
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
              <CardHeader><CardTitle>Activity Summary</CardTitle></CardHeader>
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
            <CardHeader><CardTitle>Growth Trends</CardTitle></CardHeader>
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
              <CardHeader><CardTitle>Popular Categories</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.categoryData.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analytics.categoryData.slice(0, 6).map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Category Performance</CardTitle></CardHeader>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Gross volume over time</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={analytics.timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [money(Number(value)), 'Gross volume']} />
                    <Area type="monotone" dataKey="volume" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.5} />
                  </AreaChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground mt-2">Money bestowers paid on completed bestowals and sales, per day. Sowers' shares and orchard holdings are inside this number; it is not income.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>{S2G_REVENUE_LABEL}</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm" data-testid="s2g-revenue-detail">
                {s2g ? (
                  <>
                    <Row label="All time, operating net" value={money(s2g.allTime.operating_net)} strong />
                    <Row label="This month" value={money(s2g.thisMonth.operating_net)} />
                    <Row label="Income recognised" value={money(s2g.allTime.income_total)} />
                    <Row label="Costs absorbed" value={money(s2g.allTime.cost_total)} />
                    <Row label="Ledger rows" value={String(s2g.allTime.rows)} />
                    <p className="text-xs text-muted-foreground">From the revenue ledger (live environment). Fees on completed sales, gifts, bookings and released orchards, less refund and payout costs. Full view on the <Link to="/admin/treasury" className="underline">treasury page</Link>.</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">{s2gError ? `The ledger could not be read: ${s2gError}` : 'Reading the ledger…'}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono ${strong ? 'font-semibold' : ''}`}>{value}</span>
    </div>
  );
}

function MetricCard({ title, value, accent = 'cyan', trend, sub, Icon, testId, footer }: {
  title: string; value: string; accent?: 'cyan' | 'amber' | 'violet' | 'emerald'; trend?: number; sub?: string;
  Icon?: ComponentType<{ className?: string }>; testId?: string; footer?: React.ReactNode;
}) {
  const ring =
    accent === 'amber' ? 'border-amber-400/25 shadow-[0_0_30px_rgba(245,158,11,0.10)]'
    : accent === 'violet' ? 'border-violet-400/25 shadow-[0_0_30px_rgba(139,92,246,0.10)]'
    : accent === 'emerald' ? 'border-emerald-400/25 shadow-[0_0_30px_rgba(16,185,129,0.10)]'
    : 'border-cyan-400/25 shadow-[0_0_30px_rgba(34,211,238,0.10)]';
  const iconColor =
    accent === 'amber' ? 'text-amber-300'
    : accent === 'violet' ? 'text-violet-300'
    : accent === 'emerald' ? 'text-emerald-300'
    : 'text-cyan-300';
  return (
    <div className={`rounded-2xl border bg-[#0f172a]/80 backdrop-blur p-5 ${ring}`} data-testid={testId}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400">{title}</p>
          <p className="text-3xl font-extrabold text-white mt-2">{value}</p>
          {trend !== undefined && (
            <div className="flex items-center mt-1">
              {trend > 0 ? <TrendingUp className="h-4 w-4 text-emerald-400 mr-1" /> : <TrendingDown className="h-4 w-4 text-rose-400 mr-1" />}
              <span className={`text-sm ${trend > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
          {footer && <div className="mt-1">{footer}</div>}
        </div>
        {Icon && <Icon className={`h-7 w-7 ${iconColor} opacity-90`} />}
      </div>
    </div>
  );
}
