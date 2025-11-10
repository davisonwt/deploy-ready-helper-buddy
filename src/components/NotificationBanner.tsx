import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';

export const NotificationBanner = () => {
  const { user } = useAuth();
  const { isEnabled, isInitializing, initializeNotifications } = useNotifications();
  const [dismissed, setDismissed] = useState(false);

  // Check if user has dismissed the banner
  useEffect(() => {
    const wasDismissed = localStorage.getItem('notification-banner-dismissed');
    setDismissed(wasDismissed === 'true');
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('notification-banner-dismissed', 'true');
  };

  const handleEnable = async () => {
    await initializeNotifications();
    handleDismiss();
  };

  // Don't show if user is not logged in, notifications are already enabled, or banner was dismissed
  if (!user || isEnabled || dismissed) {
    return null;
  }

  return (
    <Card className="fixed bottom-20 right-4 z-50 max-w-md shadow-lg border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">
              Enable Notifications
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Get notified about incoming calls, new messages, and new orchards even when you're not in the app.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleEnable}
                disabled={isInitializing}
                size="sm"
                className="flex-1"
              >
                {isInitializing ? 'Enabling...' : 'Enable Notifications'}
              </Button>
              <Button
                onClick={handleDismiss}
                variant="ghost"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
