import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSecurityLogging } from '@/hooks/useSecurityLogging';
import { supabase } from '@/integrations/supabase/client';
import { Shield, AlertTriangle, Eye, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * Security monitoring component for detecting suspicious activities
 */
export const SecurityMonitor: React.FC = () => {
  const { user } = useAuth();
  const { logSuspiciousActivity, logSecurityEvent } = useSecurityLogging();
  const [securityStatus, setSecurityStatus] = useState<'secure' | 'warning' | 'alert'>('secure');
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const [sessionCount, setSessionCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Monitor session changes
    const checkSessionSecurity = async () => {
      try {
        // Check for multiple active sessions (basic implementation)
        const currentTime = new Date();
        const timeDiff = lastActivity ? currentTime.getTime() - lastActivity.getTime() : 0;
        
        // If activity gap is unusual, log it
        if (lastActivity && timeDiff > 30 * 60 * 1000) { // 30 minutes
          await logSecurityEvent('session_gap_detected', {
            gap_minutes: Math.floor(timeDiff / 60000),
            last_activity: lastActivity.toISOString(),
            current_time: currentTime.toISOString()
          }, 'info');
        }

        setLastActivity(currentTime);
        
        // Simple session tracking
        setSessionCount(prev => prev + 1);
        
        // Detect potential session hijacking (basic check)
        if (sessionCount > 10 && timeDiff < 1000) {
          await logSuspiciousActivity('rapid_session_activity', {
            session_count: sessionCount,
            time_window: timeDiff
          });
          setSecurityStatus('warning');
        }

      } catch (error) {
        console.error('Session security check failed:', error);
      }
    };

    // Monitor page visibility for tab switching detection
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSessionSecurity();
      }
    };

    // Monitor network status
    const handleNetworkChange = async () => {
      if (!navigator.onLine) {
        await logSecurityEvent('network_disconnected', {
          timestamp: new Date().toISOString()
        }, 'info');
      } else {
        await logSecurityEvent('network_reconnected', {
          timestamp: new Date().toISOString()
        }, 'info');
      }
    };

    // Monitor local storage tampering
    const monitorLocalStorage = () => {
      const originalSetItem = localStorage.setItem;
      const originalRemoveItem = localStorage.removeItem;
      
      localStorage.setItem = function(key, value) {
        if (key.includes('supabase') || key.includes('auth')) {
          logSuspiciousActivity('storage_manipulation', {
            key: key,
            action: 'setItem',
            timestamp: new Date().toISOString()
          });
        }
        return originalSetItem.apply(this, [key, value]);
      };

      localStorage.removeItem = function(key) {
        if (key.includes('supabase') || key.includes('auth')) {
          logSuspiciousActivity('storage_manipulation', {
            key: key,
            action: 'removeItem',
            timestamp: new Date().toISOString()
          });
        }
        return originalRemoveItem.apply(this, [key]);
      };
    };

    // Set up monitoring
    const interval = setInterval(checkSessionSecurity, 60000); // Check every minute
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);
    
    // Initialize monitoring
    monitorLocalStorage();
    checkSessionSecurity();

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
    };
  }, [user, lastActivity, sessionCount, logSuspiciousActivity, logSecurityEvent]);

  // Listen for auth state changes to detect unusual patterns
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' && user) {
        await logSecurityEvent('unexpected_signout', {
          previous_user: user.id,
          timestamp: new Date().toISOString()
        }, 'warning');
      }
      
      if (event === 'TOKEN_REFRESHED') {
        await logSecurityEvent('token_refreshed', {
          user_id: session?.user?.id,
          timestamp: new Date().toISOString()
        }, 'info');
      }
    });

    return () => subscription.unsubscribe();
  }, [user, logSecurityEvent]);

  if (!user) return null;

  const getSecurityIcon = () => {
    switch (securityStatus) {
      case 'alert': return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'warning': return <Eye className="h-5 w-5 text-yellow-500" />;
      default: return <Shield className="h-5 w-5 text-green-500" />;
    }
  };

  const getSecurityBadge = () => {
    switch (securityStatus) {
      case 'alert': return <Badge variant="destructive">Security Alert</Badge>;
      case 'warning': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Monitoring</Badge>;
      default: return <Badge variant="secondary" className="bg-green-100 text-green-800">Secure</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          {getSecurityIcon()}
          Security Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status</span>
          {getSecurityBadge()}
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Session</span>
          <div className="flex items-center gap-1">
            <Lock className="h-3 w-3 text-green-500" />
            <span className="text-xs">Encrypted</span>
          </div>
        </div>
        
        {lastActivity && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Last Activity</span>
            <span className="text-xs">
              {lastActivity.toLocaleTimeString()}
            </span>
          </div>
        )}
        
        {securityStatus === 'warning' && (
          <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
            Monitoring unusual activity patterns
          </div>
        )}
        
        {securityStatus === 'alert' && (
          <div className="text-xs text-destructive bg-destructive/5 p-2 rounded">
            Security alert detected - please verify your account
          </div>
        )}
      </CardContent>
    </Card>
  );
};