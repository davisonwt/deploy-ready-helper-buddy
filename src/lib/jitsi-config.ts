/**
 * Jitsi Meet Configuration Utilities
 * Provides centralized configuration for all Jitsi integrations
 */

export const JITSI_CONFIG = {
  domain: import.meta.env.VITE_JITSI_DOMAIN || 'meet.jit.si',
  
  // Default configuration for all Jitsi instances
  getDefaultConfig: () => ({
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
    // Mobile optimization
    disableAudioLevels: false,
    enableNoAudioDetection: true,
    enableNoisyMicDetection: true,
    // Performance
    channelLastN: 8, // Max video streams
    startVideoMuted: 10, // Start with video muted if more than 10 participants
  }),

  // Audio call specific config
  getAudioCallConfig: () => ({
    ...JITSI_CONFIG.getDefaultConfig(),
    startWithVideoMuted: true,
    startVideoMuted: 0,
    disableInitialGUM: false, // Get User Media for audio
  }),

  // Video call specific config
  getVideoCallConfig: () => ({
    ...JITSI_CONFIG.getDefaultConfig(),
    startWithVideoMuted: false,
    startWithAudioMuted: false,
  }),

  // Live room/group call config
  getLiveRoomConfig: (participantCount: number = 0) => ({
    ...JITSI_CONFIG.getDefaultConfig(),
    startWithVideoMuted: participantCount > 10,
    channelLastN: participantCount > 20 ? 4 : 8,
  }),

  // Interface configuration
  getInterfaceConfig: (options: {
    showWatermark?: boolean;
    toolbarButtons?: string[];
  } = {}) => ({
    SHOW_JITSI_WATERMARK: options.showWatermark ?? false,
    SHOW_WATERMARK_FOR_GUESTS: false,
    SHOW_BRAND_WATERMARK: false,
    TOOLBAR_BUTTONS: options.toolbarButtons ?? [
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
      'videobackgroundblur',
    ],
    SETTINGS_SECTIONS: ['devices', 'language', 'profile'],
    MOBILE_APP_PROMO: false,
    DISPLAY_WELCOME_PAGE_CONTENT: false,
    HIDE_INVITE_MORE_HEADER: false,
    DEFAULT_REMOTE_DISPLAY_NAME: 'Participant',
    VERTICAL_FILMSTRIP: false,
  }),

  // Minimal interface for one-on-one calls
  getMinimalInterfaceConfig: () => ({
    ...JITSI_CONFIG.getInterfaceConfig({
      toolbarButtons: [
        'microphone',
        'camera',
        'hangup',
        'settings',
        'desktop',
        'fullscreen',
      ],
    }),
  }),

  // Generate unique room name
  generateRoomName: (prefix: string, id: string) => {
    return `${prefix}_${id.replace(/-/g, '')}`;
  },

  // Create full Jitsi options object
  createJitsiOptions: (
    roomName: string,
    displayName: string,
    config: 'audio' | 'video' | 'live' | 'custom',
    customConfig?: any
  ) => {
    let configOverwrite;
    let interfaceConfigOverwrite;

    switch (config) {
      case 'audio':
        configOverwrite = JITSI_CONFIG.getAudioCallConfig();
        interfaceConfigOverwrite = JITSI_CONFIG.getMinimalInterfaceConfig();
        break;
      case 'video':
        configOverwrite = JITSI_CONFIG.getVideoCallConfig();
        interfaceConfigOverwrite = JITSI_CONFIG.getMinimalInterfaceConfig();
        break;
      case 'live':
        configOverwrite = JITSI_CONFIG.getLiveRoomConfig();
        interfaceConfigOverwrite = JITSI_CONFIG.getInterfaceConfig();
        break;
      case 'custom':
        configOverwrite = customConfig?.configOverwrite || JITSI_CONFIG.getDefaultConfig();
        interfaceConfigOverwrite = customConfig?.interfaceConfigOverwrite || JITSI_CONFIG.getInterfaceConfig();
        break;
    }

    return {
      roomName,
      width: '100%',
      height: '100%',
      userInfo: { displayName },
      configOverwrite,
      interfaceConfigOverwrite,
    };
  },
};

// Export domain for direct access
export const JITSI_DOMAIN = JITSI_CONFIG.domain;
