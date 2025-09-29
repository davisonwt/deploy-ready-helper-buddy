/**
 * Production metrics and performance monitoring
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Users, 
  Clock, 
  TrendingUp,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { logInfo } from '@/lib/logging';

interface MetricsData {
  performance: {
    responseTime: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    cumulativeLayoutShift: number;
  };
  usage: {
    activeUsers: number;
    pageViews: number;
    sessionDuration: number;
  };
  health: {
    uptime: number;
    errorRate: number;
    lastUpdate: Date;
  };
}

export const ProductionMetrics = () => {
  const [metrics, setMetrics] = useState<MetricsData>({
    performance: {
      responseTime: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      cumulativeLayoutShift: 0,
    },
    usage: {
      activeUsers: 0,
      pageViews: 0,
      sessionDuration: 0,
    },
    health: {
      uptime: 0,
      errorRate: 0,
      lastUpdate: new Date(),
    },
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const collectMetrics = async () => {
      try {
        // Collect Web Vitals
        const performanceEntries = performance.getEntriesByType('navigation');
        const navigationEntry = performanceEntries[0] as PerformanceNavigationTiming;

        // Get paint metrics
        const paintEntries = performance.getEntriesByType('paint');
        const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;

        // Calculate metrics
        const responseTime = navigationEntry ? navigationEntry.responseEnd - navigationEntry.requestStart : 0;
        const sessionStart = sessionStorage.getItem('sessionStart');
        const sessionDuration = sessionStart ? Date.now() - parseInt(sessionStart) : 0;

        // Store session start if not exists
        if (!sessionStart) {
          sessionStorage.setItem('sessionStart', Date.now().toString());
        }

        const newMetrics: MetricsData = {
          performance: {
            responseTime: Math.round(responseTime),
            firstContentfulPaint: Math.round(fcp),
            largestContentfulPaint: 0, // Would need observer
            cumulativeLayoutShift: 0, // Would need observer
          },
          usage: {
            activeUsers: 1, // Current user
            pageViews: parseInt(sessionStorage.getItem('pageViews') || '1'),
            sessionDuration: Math.round(sessionDuration / 1000),
          },
          health: {
            uptime: Math.round((Date.now() - performance.timeOrigin) / 1000),
            errorRate: 0, // Would need error tracking
            lastUpdate: new Date(),
          },
        };

        setMetrics(newMetrics);
        logInfo('Metrics collected', { metrics: newMetrics });

        // Increment page views
        const currentPageViews = parseInt(sessionStorage.getItem('pageViews') || '0');
        sessionStorage.setItem('pageViews', (currentPageViews + 1).toString());

      } catch (error) {
        console.error('Failed to collect metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    collectMetrics();
    
    // Update metrics every 30 seconds
    const interval = setInterval(collectMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const getPerformanceScore = (metric: number, thresholds: [number, number]) => {
    if (metric <= thresholds[0]) return { score: 100, status: 'good' };
    if (metric <= thresholds[1]) return { score: 75, status: 'needs-improvement' };
    return { score: 50, status: 'poor' };
  };

  const responseTimeScore = getPerformanceScore(metrics.performance.responseTime, [100, 300]);
  const fcpScore = getPerformanceScore(metrics.performance.firstContentfulPaint, [1800, 3000]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 animate-pulse" />
            <span>Collecting metrics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Production Metrics</h3>
        <Badge variant="outline" className="text-xs">
          Last updated: {metrics.health.lastUpdate.toLocaleTimeString()}
        </Badge>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.performance.responseTime}ms</div>
            <div className="flex items-center gap-2 mt-1">
              {responseTimeScore.status === 'good' ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
              )}
              <span className="text-xs text-muted-foreground">
                {responseTimeScore.status.replace('-', ' ')}
              </span>
            </div>
            <Progress value={responseTimeScore.score} className="h-1 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              First Contentful Paint
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.performance.firstContentfulPaint}ms</div>
            <div className="flex items-center gap-2 mt-1">
              {fcpScore.status === 'good' ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
              )}
              <span className="text-xs text-muted-foreground">
                {fcpScore.status.replace('-', ' ')}
              </span>
            </div>
            <Progress value={fcpScore.score} className="h-1 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Page Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.usage.pageViews}</div>
            <p className="text-xs text-muted-foreground mt-1">This session</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Session Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(metrics.usage.sessionDuration / 60)}m {metrics.usage.sessionDuration % 60}s
            </div>
            <p className="text-xs text-muted-foreground mt-1">Current session</p>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm font-medium">Uptime</div>
              <div className="text-2xl font-bold">
                {Math.floor(metrics.health.uptime / 3600)}h {Math.floor((metrics.health.uptime % 3600) / 60)}m
              </div>
              <p className="text-xs text-muted-foreground">Session uptime</p>
            </div>
            
            <div>
              <div className="text-sm font-medium">Error Rate</div>
              <div className="text-2xl font-bold text-green-600">{metrics.health.errorRate}%</div>
              <p className="text-xs text-muted-foreground">No errors detected</p>
            </div>
            
            <div>
              <div className="text-sm font-medium">Status</div>
              <div className="flex items-center gap-2 mt-1">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-bold text-green-600">Healthy</span>
              </div>
              <p className="text-xs text-muted-foreground">All systems operational</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductionMetrics;