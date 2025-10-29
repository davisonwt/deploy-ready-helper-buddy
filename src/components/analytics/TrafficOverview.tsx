import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, MousePointerClick, Activity } from 'lucide-react';
import { useRealAnalytics } from '@/hooks/useRealAnalytics';

export default function TrafficOverview() {
  const { data, isLoading } = useRealAnalytics(30);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Site Visitors</CardTitle>
          <Eye className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{data?.visitors.total.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Last 30 days (Real traffic)</p>
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Page Views</CardTitle>
          <MousePointerClick className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{data?.pageviews.total.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">{data?.pageviewsPerVisit.toFixed(1)} views per visit</p>
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Session</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {Math.floor((data?.avgSessionDuration || 0) / 60)}m {Math.floor((data?.avgSessionDuration || 0) % 60)}s
          </div>
          <p className="text-xs text-muted-foreground">{data?.bounceRate}% bounce rate</p>
        </CardContent>
      </Card>
    </div>
  );
}
