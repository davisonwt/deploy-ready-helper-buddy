/**
 * Preloads the Jitsi External API script so it's ready before any call starts.
 * Call this once on app mount (e.g., in App.tsx or main.tsx).
 */
import { JITSI_CONFIG } from '@/lib/jitsi-config';

let preloadAttempted = false;

export function preloadJitsiScript() {
  if (preloadAttempted) return;
  preloadAttempted = true;

  // Skip if already loaded
  if ((window as any).JitsiMeetExternalAPI) return;

  const url = JITSI_CONFIG.getScriptUrl();

  // First, add a <link rel="preload"> hint for the browser
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'script';
  link.href = url;
  document.head.appendChild(link);

  // Then actually load the script in background after a short delay
  // (so it doesn't compete with critical app resources)
  setTimeout(() => {
    if ((window as any).JitsiMeetExternalAPI) return;

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = () => {
      console.log('✅ [JITSI] External API preloaded successfully');
    };
    script.onerror = () => {
      console.warn('⚠️ [JITSI] Preload failed — will retry when call starts');
      script.remove();
      // Reset so the call-time loader can try again
    };
    document.body.appendChild(script);
  }, 3000);
}
