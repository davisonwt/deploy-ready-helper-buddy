import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, Zap, Clock, MemoryStick } from 'lucide-react';

interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  cls?: number; // Cumulative Layout Shift
  fid?: number; // First Input Delay
  memory?: {
    used: number;
    total: number;
  };
}

const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        switch (entry.entryType) {
          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              setMetrics(prev => ({ ...prev, fcp: entry.startTime }));
            }
            break;
          case 'largest-contentful-paint':
            setMetrics(prev => ({ ...prev, lcp: entry.startTime }));
            break;
          case 'layout-shift':
            if (!(entry as any).hadRecentInput) {
              setMetrics(prev => ({ 
                ...prev, 
                cls: (prev.cls || 0) + (entry as any).value 
              }));
            }
            break;
          case 'first-input':
            setMetrics(prev => ({ ...prev, fid: (entry as any).processingStart - entry.startTime }));
            break;
        }
      });
    });

    // Observe performance entries
    try {
      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift', 'first-input'] });
    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }

    // Monitor memory usage if available
    const updateMemory = () => {
      if ((performance as any).memory) {
        const memory = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memory: {
            used: memory.usedJSHeapSize / 1024 / 1024, // MB
            total: memory.totalJSHeapSize / 1024 / 1024, // MB
          }
        }));
      }
    };

    updateMemory();
    const memoryInterval = setInterval(updateMemory, 5000);

    // Show monitor after a delay
    const timer = setTimeout(() => setIsVisible(true), 2000);

    return () => {
      observer.disconnect();
      clearInterval(memoryInterval);
      clearTimeout(timer);
    };
  }, []);

  const getScoreColor = (value: number, thresholds: [number, number]) => {
    if (value <= thresholds[0]) return 'bg-green-500';
    if (value <= thresholds[1]) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreLabel = (value: number, thresholds: [number, number]) => {
    if (value <= thresholds[0]) return 'Good';
    if (value <= thresholds[1]) return 'Needs Improvement';
    return 'Poor';
  };

  if (!isVisible || process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="bg-background/95 backdrop-blur-sm border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" />
            Performance Monitor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {metrics.fcp && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-3 w-3" />
                <span className="text-xs">FCP</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs">{Math.round(metrics.fcp)}ms</span>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${getScoreColor(metrics.fcp, [1800, 3000])}`}
                >
                  {getScoreLabel(metrics.fcp, [1800, 3000])}
                </Badge>
              </div>
            </div>
          )}

          {metrics.lcp && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                <span className="text-xs">LCP</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs">{Math.round(metrics.lcp)}ms</span>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${getScoreColor(metrics.lcp, [2500, 4000])}`}
                >
                  {getScoreLabel(metrics.lcp, [2500, 4000])}
                </Badge>
              </div>
            </div>
          )}

          {metrics.cls !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs">CLS</span>
              <div className="flex items-center gap-2">
                <span className="text-xs">{metrics.cls.toFixed(3)}</span>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${getScoreColor(metrics.cls, [0.1, 0.25])}`}
                >
                  {getScoreLabel(metrics.cls, [0.1, 0.25])}
                </Badge>
              </div>
            </div>
          )}

          {metrics.memory && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MemoryStick className="h-3 w-3" />
                  <span className="text-xs">Memory</span>
                </div>
                <span className="text-xs">
                  {metrics.memory.used.toFixed(1)}MB / {metrics.memory.total.toFixed(1)}MB
                </span>
              </div>
              <Progress 
                value={(metrics.memory.used / metrics.memory.total) * 100} 
                className="h-1"
              />
            </div>
          )}

          <div className="text-xs text-muted-foreground pt-2 border-t">
            Dev Mode Only
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceMonitor;