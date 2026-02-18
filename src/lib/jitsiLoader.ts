/**
 * Resilient Jitsi External API loader with retries and iframe fallback.
 * The @jitsi/react-sdk caches failed promises and never retries,
 * so we handle script loading ourselves.
 */

const JITSI_DOMAIN = 'meet.jit.si';
const SCRIPT_URL = `https://${JITSI_DOMAIN}/external_api.js`;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

let loadPromise: Promise<any> | null = null;
let loadAttempts = 0;

function loadScript(): Promise<any> {
  return new Promise((resolve, reject) => {
    // Already available globally
    if ((window as any).JitsiMeetExternalAPI) {
      return resolve((window as any).JitsiMeetExternalAPI);
    }

    // Remove any previously failed script tags
    document.querySelectorAll(`script[src="${SCRIPT_URL}"]`).forEach(s => s.remove());

    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      console.log('✅ [JITSI] External API loaded successfully');
      resolve((window as any).JitsiMeetExternalAPI);
    };
    script.onerror = () => {
      script.remove();
      reject(new Error('Failed to load Jitsi script'));
    };
    document.head.appendChild(script);
  });
}

async function loadWithRetries(): Promise<any> {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      loadAttempts++;
      console.log(`📞 [JITSI] Loading external API (attempt ${loadAttempts})`);
      const api = await loadScript();
      return api;
    } catch (e) {
      console.warn(`⚠️ [JITSI] Load attempt ${loadAttempts} failed`);
      if (i < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }
  throw new Error('All Jitsi load attempts failed');
}

/**
 * Load the Jitsi External API with retries.
 * Returns the JitsiMeetExternalAPI constructor, or null if all attempts fail.
 */
export async function loadJitsiApi(): Promise<any | null> {
  // If already loaded, return immediately
  if ((window as any).JitsiMeetExternalAPI) {
    return (window as any).JitsiMeetExternalAPI;
  }

  // Reset cached promise if previous attempt failed
  if (loadPromise) {
    try {
      return await loadPromise;
    } catch {
      // Previous attempt failed, reset and retry
      loadPromise = null;
      loadAttempts = 0;
    }
  }

  loadPromise = loadWithRetries();
  try {
    return await loadPromise;
  } catch {
    loadPromise = null;
    return null;
  }
}

/**
 * Build a direct Jitsi Meet iframe URL as fallback when the API script can't load.
 * This provides basic call functionality without programmatic control.
 */
export function getJitsiIframeUrl(
  roomName: string,
  options: {
    displayName?: string;
    startWithVideoMuted?: boolean;
    startWithAudioMuted?: boolean;
  } = {}
): string {
  const params = new URLSearchParams();
  
  const config: Record<string, string> = {
    'config.prejoinPageEnabled': 'false',
    'config.prejoinConfig.enabled': 'false',
    'config.disableDeepLinking': 'true',
    'config.enableClosePage': 'false',
    'config.startWithAudioMuted': String(options.startWithAudioMuted ?? false),
    'config.startWithVideoMuted': String(options.startWithVideoMuted ?? true),
    'config.enableLobbyChat': 'false',
    'config.hideLobbyButton': 'true',
    'config.requireDisplayName': 'false',
    'config.lobby.autoKnock': 'true',
    'config.lobby.enabled': 'false',
    'config.enableInsecureRoomNameWarning': 'false',
    'config.membersOnly': 'false',
    // P2P and connectivity settings for reliable audio
    'config.p2p.enabled': 'true',
    'config.p2p.useStunTurn': 'true',
    'config.p2p.stunServers': JSON.stringify([{ urls: 'stun:stun.l.google.com:19302' }]),
    'config.enableForcedReload': 'false',
    'config.channelLastN': '-1',
    'config.enableLayerSuspension': 'true',
    'config.disableAudioLevels': 'false',
    'config.enableNoAudioDetection': 'true',
    'config.enableNoisyMicDetection': 'true',
    'config.audioQuality.stereo': 'false',
    'config.audioQuality.opusMaxAverageBitrate': '32000',
    // Security bypass
    'config.security.lobbyEnabled': 'false',
    'config.security.requireLobby': 'false',
    'config.hideConferenceSubject': 'true',
    'config.hideConferenceTimer': 'false',
    'interfaceConfig.SHOW_JITSI_WATERMARK': 'false',
    'interfaceConfig.MOBILE_APP_PROMO': 'false',
    'interfaceConfig.SHOW_WATERMARK_FOR_GUESTS': 'false',
  };

  if (options.displayName) {
    config['userInfo.displayName'] = options.displayName;
  }

  Object.entries(config).forEach(([key, value]) => {
    params.set(key, value);
  });

  return `https://${JITSI_DOMAIN}/${roomName}#${params.toString()}`;
}

export { JITSI_DOMAIN };
