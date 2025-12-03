/**
 * JaaS (8x8.vc) Configuration - ONLY JaaS is used for all calls
 * This is the single source of truth for all Jitsi/JaaS integrations
 */

// JaaS (8x8) Configuration
export const JAAS_CONFIG = {
  appId: 'vpaas-magic-cookie-f5f6bee4f16440d4b49cd8668f03d55d',
  domain: '8x8.vc',
  getScriptUrl: () => `https://8x8.vc/${JAAS_CONFIG.appId}/external_api.js`,
  getRoomName: (roomName: string) => `${JAAS_CONFIG.appId}/${roomName}`,
  // JWT can be set for premium features (recording, outbound calls, etc.)
  jwt: null as string | null,
  setJwt: (token: string | null) => { JAAS_CONFIG.jwt = token; },
};

// Default configuration for JaaS calls
export const getDefaultJaaSConfig = () => ({
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

// Audio call specific config
export const getAudioCallConfig = () => ({
  ...getDefaultJaaSConfig(),
  startWithVideoMuted: true,
  startVideoMuted: 0,
});

// Video call specific config
export const getVideoCallConfig = () => ({
  ...getDefaultJaaSConfig(),
  startWithVideoMuted: false,
  startWithAudioMuted: false,
});

// Interface configuration for JaaS
export const getJaaSInterfaceConfig = (minimal = false) => ({
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

// Generate unique room name
export const generateJaaSRoomName = (prefix: string, id: string) => {
  return `${prefix}_${id.replace(/-/g, '')}`;
};
