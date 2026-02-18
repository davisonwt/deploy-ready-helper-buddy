/**
 * Jitsi Meet Configuration - Free public server
 * This is the single source of truth for all Jitsi integrations
 * Using meet.jit.si (free, no JWT required)
 * When scaling beyond ~1000 users, consider self-hosting or JaaS (8x8.vc)
 */

export const JITSI_CONFIG = {
  domain: 'meet.jit.si',
  getScriptUrl: () => 'https://meet.jit.si/external_api.js',
  // Room names must be ALL LOWERCASE to avoid meet.jit.si lobby enforcement
  // Long lowercase alphanumeric names are treated as "secure enough" and skip lobby
  getRoomName: (roomName: string) => {
    const hash = roomName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return `sow2growprivatechannel${hash}`;
  },
};

// Keep old export name for backward compatibility
export const JAAS_CONFIG = JITSI_CONFIG;

// Default configuration for calls
export const getDefaultJitsiConfig = () => ({
  startWithAudioMuted: false,
  startWithVideoMuted: false,
  enableWelcomePage: false,
  prejoinPageEnabled: false,
  disableDeepLinking: true,
  enableClosePage: false,
  defaultLanguage: 'en',
  enableLayerSuspension: true,
  resolution: 720,
  constraints: {
    video: {
      height: { ideal: 720, max: 1080, min: 240 },
      width: { ideal: 1280, max: 1920, min: 320 },
    },
  },
  disableAudioLevels: false,
  enableNoAudioDetection: true,
  enableNoisyMicDetection: true,
  channelLastN: 8,
});

// Keep old export name
export const getDefaultJaaSConfig = getDefaultJitsiConfig;

// Audio call specific config
export const getAudioCallConfig = () => ({
  ...getDefaultJitsiConfig(),
  startWithVideoMuted: true,
  startVideoMuted: 0,
});

// Video call specific config
export const getVideoCallConfig = () => ({
  ...getDefaultJitsiConfig(),
  startWithVideoMuted: false,
  startWithAudioMuted: false,
});

// Interface configuration
export const getJitsiInterfaceConfig = (minimal = false) => ({
  SHOW_JITSI_WATERMARK: false,
  SHOW_WATERMARK_FOR_GUESTS: false,
  SHOW_BRAND_WATERMARK: false,
  TOOLBAR_BUTTONS: minimal 
    ? ['microphone', 'camera', 'hangup', 'settings', 'desktop', 'fullscreen']
    : [
        'microphone',
        'camera',
        'closedcaptions',
        'desktop',
        'fullscreen',
        'fodeviceselection',
        'hangup',
        'profile',
        'chat',
        'raisehand',
        'videoquality',
        'filmstrip',
        'settings',
        'tileview',
      ],
  SETTINGS_SECTIONS: ['devices', 'language', 'profile'],
  MOBILE_APP_PROMO: false,
  DISPLAY_WELCOME_PAGE_CONTENT: false,
  HIDE_INVITE_MORE_HEADER: false,
  DEFAULT_REMOTE_DISPLAY_NAME: 'Participant',
  VERTICAL_FILMSTRIP: false,
});

// Keep old export name
export const getJaaSInterfaceConfig = getJitsiInterfaceConfig;

// Generate unique room name
export const generateJitsiRoomName = (prefix: string, id: string) => {
  return `${prefix}_${id.replace(/-/g, '')}`;
};

export const generateJaaSRoomName = generateJitsiRoomName;
