/**
 * Preloads the Jitsi External API script so it's ready before any call starts.
 * Call this once on app mount (e.g., in App.tsx).
 */
import { loadJitsiApi } from '@/lib/jitsiLoader';

let preloadAttempted = false;

export function preloadJitsiScript() {
  if (preloadAttempted) return;
  preloadAttempted = true;

  // Delay preload so it doesn't compete with critical app resources
  setTimeout(() => {
    loadJitsiApi().then((api) => {
      if (api) {
        console.log('✅ [JITSI] External API preloaded successfully');
      } else {
        console.warn('⚠️ [JITSI] Preload failed — will use iframe fallback when call starts');
      }
    });
  }, 3000);
}
