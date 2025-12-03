import { useEffect, useRef } from 'react';
import { launchConfetti, launchSparkles, playSoundEffect } from '@/utils/confetti';
import { JAAS_CONFIG, getJaaSInterfaceConfig, getVideoCallConfig } from '@/lib/jitsi-config';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

interface JitsiVideoWindowProps {
  isOpen: boolean;
  roomName: string;
  displayName?: string;
  password?: string | null;
  onClose: () => void;
}

export function JitsiVideoWindow({
  isOpen,
  roomName,
  displayName = 'Sower',
  password = null,
  onClose,
}: JitsiVideoWindowProps) {
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiMeetRef = useRef<HTMLDivElement>(null);
  const jitsiAPIRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen || !jitsiMeetRef.current) return;

    // Load JaaS API script if not already loaded
    if (!window.JitsiMeetExternalAPI) {
      const script = document.createElement('script');
      script.src = JAAS_CONFIG.getScriptUrl();
      script.async = true;
      script.onload = () => {
        initializeJaaS();
      };
      document.body.appendChild(script);
    } else {
      initializeJaaS();
    }

    return () => {
      if (jitsiAPIRef.current) {
        jitsiAPIRef.current.dispose();
        jitsiAPIRef.current = null;
      }
    };
  }, [isOpen, roomName, displayName, password]);

  const initializeJaaS = () => {
    if (!jitsiMeetRef.current || !window.JitsiMeetExternalAPI) return;

    // Clear any existing content
    jitsiMeetRef.current.innerHTML = '';

    const jaasRoomName = JAAS_CONFIG.getRoomName(`S2G-${roomName}`);
    const options: any = {
      roomName: jaasRoomName,
      width: '100%',
      height: '100%',
      parentNode: jitsiMeetRef.current,
      interfaceConfigOverwrite: {
        ...getJaaSInterfaceConfig(),
        filmStripOnly: false,
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
      },
      userInfo: { displayName, email: '' },
      password: password || undefined,
      configOverwrite: {
        ...getVideoCallConfig(),
        startWithVideoMuted: true,
      },
    };

    // Add JWT if available
    if (JAAS_CONFIG.jwt) {
      options.jwt = JAAS_CONFIG.jwt;
    }

    jitsiAPIRef.current = new window.JitsiMeetExternalAPI(JAAS_CONFIG.domain, options);

    // Garden-style UI touches
    jitsiAPIRef.current.addEventListener('videoConferenceJoined', () => {
      launchSparkles();
      playSoundEffect('mysterySeed', 0.6);
      document.body.style.overflow = 'hidden';
    });

    jitsiAPIRef.current.addEventListener('participantJoined', () => {
      launchConfetti();
    });

    jitsiAPIRef.current.addEventListener('videoConferenceLeft', () => {
      handleEndCall();
    });
  };

  const handleEndCall = () => {
    if (jitsiAPIRef.current) {
      jitsiAPIRef.current.dispose();
      jitsiAPIRef.current = null;
    }
    document.body.style.overflow = 'auto';
    onClose();
  };

  const toggleFullscreen = () => {
    if (jitsiAPIRef.current) {
      jitsiAPIRef.current.executeCommand('toggleLobby');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={jitsiContainerRef}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl"
    >
      <div className="absolute top-4 right-4 z-10 flex gap-4">
        <button
          onClick={toggleFullscreen}
          className="bg-white/20 hover:bg-white/30 backdrop-blur p-4 rounded-full text-white font-semibold transition"
        >
          Fullscreen
        </button>
        <button
          onClick={handleEndCall}
          className="bg-red-600 hover:bg-red-500 p-4 rounded-full text-white text-2xl font-bold transition"
        >
          End Call
        </button>
      </div>
      <div ref={jitsiMeetRef} className="w-full h-full" />
    </div>
  );
}

// Global function to start JaaS call (for use from anywhere)
export function startJitsiCall(
  roomName: string,
  displayName: string = 'Sower',
  password: string | null = null
) {
  // Dispatch custom event that Layout can listen to
  window.dispatchEvent(
    new CustomEvent('jitsi-start-call', {
      detail: { roomName, displayName, password },
    })
  );
}
