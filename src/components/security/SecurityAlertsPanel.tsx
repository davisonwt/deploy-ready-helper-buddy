import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, Eye, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SecurityAlert {
  id: string;
  access_type: string;
  created_at: string;
  success: boolean;
  ip_address: string | null;
  user_agent?: string | null;
}

export const SecurityAlertsPanel: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (user) {
      loadSecurityAlerts();
    }
  }, [user]);

  const loadSecurityAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('billing_access_logs')
        .select('id, access_type, created_at, success, ip_address, user_agent')
        .eq('user_id', user?.id)
        .or('access_type.ilike.%security_event%,access_type.ilike.%ALERT%')
        .order('created_at', { ascending: false })
        .limit(showAll ? 50 : 10);

      if (error) throw error;
      setAlerts((data || []).map(alert => ({
        ...alert,
        ip_address: alert.ip_address as string | null,
        user_agent: alert.user_agent as string | null
      })));
    } catch (error) {
      console.error('Error loading security alerts:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load security alerts"
      });
    } finally {
      setLoading(false);
    }
  };

  const getAlertSeverity = (accessType: string): 'critical' | 'warning' | 'info' => {
    if (accessType.includes('ALERT') || accessType.includes('critical')) return 'critical';
    if (accessType.includes('warning') || accessType.includes('suspicious')) return 'warning';
    return 'info';
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'warning': return <Shield className="h-4 w-4 text-warning" />;
      default: return <Eye className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatAlertType = (accessType: string): string => {
    return accessType
      .replace('security_event:', '')
      .replace('ALERT:', '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : alerts.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No recent security activity
          </p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const severity = getAlertSeverity(alert.access_type);
              return (
                <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  {getAlertIcon(severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {formatAlertType(alert.access_type)}
                      </span>
                      <Badge 
                        variant={severity === 'critical' ? 'destructive' : 
                                severity === 'warning' ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {severity}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(alert.created_at).toLocaleString()}
                      </div>
                      {alert.ip_address && (
                        <div>IP: {alert.ip_address}</div>
                      )}
                      {alert.success === false && (
                        <Badge variant="destructive" className="text-xs">
                          Failed Attempt
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {alerts.length >= 10 && !showAll && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setShowAll(true);
                  loadSecurityAlerts();
                }}
                className="w-full"
              >
                Show More Security Events
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};