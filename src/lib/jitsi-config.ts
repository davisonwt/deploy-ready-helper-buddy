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
  // JWT for premium features (recording, outbound calls, etc.)
  jwt: 'eyJraWQiOiJ2cGFhcy1tYWdpYy1jb29raWUtZjVmNmJlZTRmMTY0NDBkNGI0OWNkODY2OGYwM2Q1NWQvMTAwMWE5LVNBTVBMRV9BUFAiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiJqaXRzaSIsImlzcyI6ImNoYXQiLCJpYXQiOjE3NjgyOTE3MDcsImV4cCI6MTc2ODI5ODkwNywibmJmIjoxNzY4MjkxNzAyLCJzdWIiOiJ2cGFhcy1tYWdpYy1jb29raWUtZjVmNmJlZTRmMTY0NDBkNGI0OWNkODY2OGYwM2Q1NWQiLCJjb250ZXh0Ijp7ImZlYXR1cmVzIjp7ImxpdmVzdHJlYW1pbmciOnRydWUsImZpbGUtdXBsb2FkIjp0cnVlLCJvdXRib3VuZC1jYWxsIjp0cnVlLCJzaXAtb3V0Ym91bmQtY2FsbCI6ZmFsc2UsInRyYW5zY3JpcHRpb24iOnRydWUsImxpc3QtdmlzaXRvcnMiOmZhbHNlLCJyZWNvcmRpbmciOnRydWUsImZsaXAiOmZhbHNlfSwidXNlciI6eyJoaWRkZW4tZnJvbS1yZWNvcmRlciI6ZmFsc2UsIm1vZGVyYXRvciI6dHJ1ZSwibmFtZSI6ImRhdmlzb24udGFsamFhcmQiLCJpZCI6ImF1dGgwfDY5MjY5ZDEwYWI2Y2U1ZGE1YjlhM2RkMiIsImF2YXRhciI6Imh0dHBzOi8vc293Mmdyb3dhcHAuY29tIiwiZW1haWwiOiJkYXZpc29uLnRhbGphYXJkQGljbG91ZC5jb20ifX0sInJvb20iOiIqIn0.C2NomRfp2rJVMQ-G0wb72tJk_x3N7Tl1KVRNxf-Gl7uVig7-vjdZVvjeVMrb6fattp3odyFa6FMbBCATx6bK_2P5ejhpgYPJC9I_vduUcYevqC61P5uK2es38V-lxpmM01EW56b7EL7yntv0KyXNZe9uJA35wJA55XdBct7gWYG02bzeexfihRb25vDKYUXkEvSPtWVcu_Q8AQV9KNxtu4wABmWQisWWOJekgWlNAzByI2cZXqAsMq2m8h4pvOOH6eRGW1MxzG9s2TNVgvQ0yZ63FOqd9bKiZFdRPa_B1Hk_lL-N4pGvvoY7wcghLtm9AuU4fJxsiDdux3Q92zPfdA' as string | null,
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
