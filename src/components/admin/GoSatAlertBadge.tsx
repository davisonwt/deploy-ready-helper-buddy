import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRoles } from '@/hooks/useRoles';
import { cn } from '@/lib/utils';

interface GoSatAlertBadgeProps {
  className?: string;
  showIcon?: boolean;
  onClick?: () => void;
}

export function GoSatAlertBadge({ className, showIcon = true, onClick }: GoSatAlertBadgeProps) {
  const { isAdminOrGosat } = useRoles();
  const [pendingCount, setPendingCount] = useState(0);
  const [hasCritical, setHasCritical] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    if (!isAdminOrGosat) return;

    try {
      // Get unread alert count
      const { count: totalCount, error: countError } = await supabase
        .from('gosat_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      if (countError) throw countError;

      // Check for critical alerts
      const { count: criticalCount, error: criticalError } = await supabase
        .from('gosat_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .eq('priority', 'critical');

      if (criticalError) throw criticalError;

      setPendingCount(totalCount || 0);
      setHasCritical((criticalCount || 0) > 0);
    } catch (error) {
      console.error('Error fetching GoSat alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdminOrGosat) {
      setLoading(false);
      return;
    }

    fetchAlerts();

    // Subscribe to real-time alerts
    const channel = supabase
      .channel('gosat-alerts-badge')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gosat_alerts',
        },
        () => {
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdminOrGosat]);

  // Don't render if not admin/gosat or no alerts
  if (!isAdminOrGosat || loading || pendingCount === 0) {
    return null;
  }

  return (
    <div 
      className={cn(
        "relative inline-flex items-center cursor-pointer",
        hasCritical && "animate-pulse",
        className
      )}
      onClick={onClick}
    >
      {showIcon && (
        hasCritical ? (
          <AlertTriangle className="w-5 h-5 text-red-500" />
        ) : (
          <Bell className="w-5 h-5 text-amber-500" />
        )
      )}
      <Badge 
        variant={hasCritical ? "destructive" : "default"}
        className={cn(
          "ml-1 min-w-[20px] h-5 flex items-center justify-center text-xs font-bold",
          hasCritical ? "bg-red-500 animate-bounce" : "bg-amber-500"
        )}
      >
        {pendingCount > 99 ? '99+' : pendingCount}
      </Badge>
    </div>
  );
}
