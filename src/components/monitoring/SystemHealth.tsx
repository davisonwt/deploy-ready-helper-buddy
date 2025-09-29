/**
 * System health monitoring component
 * Displays system status and performance metrics
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Database, 
  Server, 
  Wifi, 
  AlertTriangle, 
  CheckCircle, 
  Download,
  RefreshCw 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logInfo, logError } from '@/lib/logging';
import { useToast } from '@/hooks/use-toast';

interface HealthStatus {
  database: 'healthy' | 'warning' | 'error';
  api: 'healthy' | 'warning' | 'error';
  storage: 'healthy' | 'warning' | 'error';
  overall: 'healthy' | 'warning' | 'error';
}

interface PerformanceMetrics {
  responseTime: number;
  uptime: number;
  errorRate: number;
  activeUsers: number;
}

export const SystemHealth = () => {
  const [health, setHealth] = useState<HealthStatus>({
    database: 'healthy',
    api: 'healthy', 
    storage: 'healthy',
    overall: 'healthy',
  });
  
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    responseTime: 0,
    uptime: 0,
    errorRate: 0,
    activeUsers: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const { toast } = useToast();

  const checkSystemHealth = async () => {
    setIsLoading(true);
    const startTime = performance.now();

    try {
      logInfo('Starting system health check');

      // Test database connection
      const dbStart = performance.now();
      const { error: dbError } = await supabase.from('profiles').select('count').limit(1);
      const dbResponseTime = performance.now() - dbStart;

      // Test storage access
      const storageStart = performance.now();
      const { error: storageError } = await supabase.storage.from('avatars').list('', { limit: 1 });
      const storageResponseTime = performance.now() - storageStart;

      // Get active users count
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: activeUsersData } = await supabase
        .from('profiles')
        .select('user_id')
        .gte('updated_at', thirtyMinutesAgo);

      const totalResponseTime = performance.now() - startTime;

      // Calculate health status
      const newHealth: HealthStatus = {
        database: dbError ? 'error' : dbResponseTime > 2000 ? 'warning' : 'healthy',
        api: totalResponseTime > 5000 ? 'warning' : 'healthy',
        storage: storageError ? 'error' : storageResponseTime > 3000 ? 'warning' : 'healthy',
        overall: 'healthy',
      };

      // Set overall status based on individual components
      if (newHealth.database === 'error' || newHealth.storage === 'error') {
        newHealth.overall = 'error';
      } else if (newHealth.database === 'warning' || newHealth.api === 'warning' || newHealth.storage === 'warning') {
        newHealth.overall = 'warning';
      }

      setHealth(newHealth);
      setMetrics({
        responseTime: Math.round(totalResponseTime),
        uptime: Math.round((Date.now() - (performance.timeOrigin || Date.now())) / 1000),
        errorRate: 0, // Would need error tracking over time
        activeUsers: activeUsersData?.length || 0,
      });

      setLastCheck(new Date());
      logInfo('System health check completed', { health: newHealth, metrics });

    } catch (error) {
      logError('System health check failed', { error });
      setHealth({
        database: 'error',
        api: 'error',
        storage: 'error', 
        overall: 'error',
      });
      
      toast({
        variant: 'destructive',
        title: 'Health Check Failed',
        description: 'Unable to complete system health check',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const triggerBackup = async () => {
    try {
      setIsLoading(true);
      logInfo('Triggering manual backup');

      const { data, error } = await supabase.functions.invoke('backup-database', {
        body: { manual: true },
      });

      if (error) throw error;

      toast({
        title: 'Backup Started',
        description: 'Database backup has been initiated successfully',
      });

      logInfo('Manual backup triggered', { data });
    } catch (error) {
      logError('Failed to trigger backup', { error });
      toast({
        variant: 'destructive',
        title: 'Backup Failed',
        description: 'Failed to start database backup',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">System Health</h2>
        <div className="flex gap-2">
          <Button
            onClick={checkSystemHealth}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={triggerBackup}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Backup
          </Button>
        </div>
      </div>

      {lastCheck && (
        <p className="text-sm text-muted-foreground">
          Last checked: {lastCheck.toLocaleString()}
        </p>
      )}

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(health.overall)}
            System Status
            <Badge variant={health.overall === 'healthy' ? 'default' : 'destructive'}>
              {health.overall.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(health.database)}`} />
              <Database className="h-4 w-4" />
              <span className="text-sm">Database</span>
              {getStatusIcon(health.database)}
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(health.api)}`} />
              <Server className="h-4 w-4" />
              <span className="text-sm">API</span>
              {getStatusIcon(health.api)}
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(health.storage)}`} />
              <Wifi className="h-4 w-4" />
              <span className="text-sm">Storage</span>
              {getStatusIcon(health.storage)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Response Time</span>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{metrics.responseTime}ms</div>
            <Progress 
              value={Math.min((metrics.responseTime / 5000) * 100, 100)} 
              className="h-2 mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Users</span>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{metrics.activeUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 30 minutes</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Uptime</span>
              <Server className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">
              {Math.floor(metrics.uptime / 3600)}h {Math.floor((metrics.uptime % 3600) / 60)}m
            </div>
            <p className="text-xs text-muted-foreground mt-1">Session uptime</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Error Rate</span>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{metrics.errorRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Last hour</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemHealth;