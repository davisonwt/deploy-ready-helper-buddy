import { useState, useEffect } from 'react';
import { Download, Smartphone, Monitor, Apple, Chrome } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Platform = 'ios' | 'android' | 'desktop' | 'unknown';

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallAppPage() {
  const [platform] = useState<Platform>(detectPlatform);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  };

  if (installed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-foreground">App Installed!</h1>
        <p className="text-muted-foreground mt-2 max-w-md">
          Sow2Grow is now on your device. You'll receive call notifications even when the browser is in the background.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Install Sow2Grow</h1>
        <p className="text-muted-foreground">
          Install the app for the best experience — get call notifications, faster loading, and offline access.
        </p>
      </div>

      {/* Native install button (Chrome/Edge on Android & Desktop) */}
      {deferredPrompt && (
        <div className="flex justify-center">
          <Button size="lg" onClick={handleInstall} className="gap-2">
            <Download className="h-5 w-5" /> Install Now
          </Button>
        </div>
      )}

      {/* Platform-specific instructions */}
      {(platform === 'ios' || !deferredPrompt) && (
        <div className="grid gap-4">
          {platform === 'ios' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg"><Apple className="h-5 w-5" /> iPhone / iPad</CardTitle>
                <CardDescription>Safari only</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>1. Open this page in <strong>Safari</strong></p>
                <p>2. Tap the <strong>Share</strong> button (square with arrow)</p>
                <p>3. Scroll down and tap <strong>"Add to Home Screen"</strong></p>
                <p>4. Tap <strong>Add</strong> — done!</p>
              </CardContent>
            </Card>
          )}

          {platform === 'android' && !deferredPrompt && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg"><Smartphone className="h-5 w-5" /> Android</CardTitle>
                <CardDescription>Chrome recommended</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>1. Tap the <strong>⋮ menu</strong> (three dots, top right)</p>
                <p>2. Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></p>
                <p>3. Tap <strong>Install</strong> — done!</p>
              </CardContent>
            </Card>
          )}

          {platform === 'desktop' && !deferredPrompt && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg"><Monitor className="h-5 w-5" /> Desktop</CardTitle>
                <CardDescription>Chrome / Edge</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>1. Look for the <strong>install icon</strong> (⊕) in the address bar</p>
                <p>2. Or click the <strong>⋮ menu → Install Sow2Grow</strong></p>
                <p>3. Click <strong>Install</strong> — the app opens in its own window!</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="text-center text-xs text-muted-foreground pt-4">
        <p>Installing the app improves notification reliability and lets calls ring even when the browser tab is inactive.</p>
      </div>
    </div>
  );
}
