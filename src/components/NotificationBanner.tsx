import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { useAppContext } from '@/contexts/AppContext';
import { isFullPageFormRoute } from '@/lib/chrome/formRoutes';

export const NotificationBanner = () => {
  const { user } = useAuth();
  const { isEnabled, isInitializing, initializeNotifications } = useNotifications();
  const { wizardOpen, stallInteriorOpen } = useAppContext();
  const location = useLocation();
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

  // Don't show if user is not logged in, notifications are already enabled, banner was
  // dismissed, a WizardContainer flow (its own Back/Next/Submit bar sits in this same
  // bottom-right corner on mobile) is on screen, or a stall interior is open -- this
  // fixed bottom-right card was intercepting taps on any hotspot painted underneath it
  // (found via the Gosat's Boardroom hotspot bug: GlobalChrome already hides its own
  // three fixed-bottom-right widgets for stallInteriorOpen, but this banner -- mounted
  // separately at the App root, not through GlobalChrome -- never got the same check).
  // A form route is the same collision as a stall interior: this card is
  // wide enough to sit on several choice buttons at once.
  if (!user || isEnabled || dismissed || wizardOpen || stallInteriorOpen
      || isFullPageFormRoute(location.pathname)) {
    return null;
  }

  return (
    <Card className="fixed bottom-20 right-4 z-50 w-[calc(100vw-2rem)] max-w-md shadow-lg border-primary/20">
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
