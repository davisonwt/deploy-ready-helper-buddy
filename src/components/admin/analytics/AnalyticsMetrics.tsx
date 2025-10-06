import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Users, Sprout, Activity } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: 'users' | 'orchards' | 'revenue' | 'bestowals';
  className?: string;
}

const iconMap = {
  users: Users,
  orchards: Sprout,
  revenue: DollarSign,
  bestowals: Activity,
};

export const MetricCard = ({ title, value, trend, icon, className = '' }: MetricCardProps) => {
  const Icon = iconMap[icon];
  const isPositiveTrend = trend && trend > 0;
  const TrendIcon = isPositiveTrend ? TrendingUp : TrendingDown;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend !== undefined && (
          <div className="flex items-center text-xs text-muted-foreground">
            <TrendIcon className={`h-3 w-3 mr-1 ${isPositiveTrend ? 'text-green-600' : 'text-red-600'}`} />
            <span className={isPositiveTrend ? 'text-green-600' : 'text-red-600'}>
              {Math.abs(trend).toFixed(1)}%
            </span>
            <span className="ml-1">from previous period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface MetricsOverviewProps {
  totalUsers: number;
  totalOrchards: number;
  totalRevenue: number;
  totalBestowals: number;
  userGrowth?: number;
  revenueGrowth?: number;
}

export const MetricsOverview = ({ 
  totalUsers, 
  totalOrchards, 
  totalRevenue, 
  totalBestowals,
  userGrowth,
  revenueGrowth 
}: MetricsOverviewProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Users"
        value={totalUsers.toLocaleString()}
        trend={userGrowth}
        icon="users"
      />
      <MetricCard
        title="Total Orchards"
        value={totalOrchards.toLocaleString()}
        icon="orchards"
      />
      <MetricCard
        title="Total Revenue"
        value={`$${totalRevenue.toLocaleString()}`}
        trend={revenueGrowth}
        icon="revenue"
      />
      <MetricCard
        title="Total Bestowals"
        value={totalBestowals.toLocaleString()}
        icon="bestowals"
      />
    </div>
  );
};
