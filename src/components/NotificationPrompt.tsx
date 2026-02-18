import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';
import { useAuth } from '@/hooks/useAuth';
import { registerServiceWorker } from '@/lib/pushNotifications';
import { toast } from '@/hooks/use-toast';

export default function NotificationPrompt() {
  const { user } = useAuth();
  const { isGranted, isDenied, isSupported, hasBeenPrompted, requestPermission, dismissPrompt } = useNotificationPermission();

  // Don't show if: not logged in, not supported, already granted/denied, or already prompted
  if (!user || !isSupported || isGranted || isDenied || hasBeenPrompted) {
    return null;
  }

  const handleEnable = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      try {
        await registerServiceWorker();
      } catch { /* sw registration is optional */ }
      toast({ title: 'Notifications enabled', description: "You'll be notified of incoming calls even when this tab is in the background." });
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[95vw] max-w-md animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="rounded-xl border border-primary/20 bg-card p-4 shadow-xl flex items-start gap-3">
        <div className="flex-shrink-0 rounded-full bg-primary/10 p-2">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground">Enable call notifications?</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Get notified when someone calls you — even when you're on another tab.
          </p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleEnable}>Enable</Button>
            <Button size="sm" variant="ghost" onClick={dismissPrompt}>Not now</Button>
          </div>
        </div>
        <button onClick={dismissPrompt} className="text-muted-foreground hover:text-foreground" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
