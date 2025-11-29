import { useEffect, useRef, useState } from 'react';
import { launchConfetti, launchSparkles, playSoundEffect } from '@/utils/confetti';

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

    // Load Jitsi external API script if not already loaded
    if (!window.JitsiMeetExternalAPI) {
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => {
        initializeJitsi();
      };
      document.body.appendChild(script);
    } else {
      initializeJitsi();
    }

    return () => {
      if (jitsiAPIRef.current) {
        jitsiAPIRef.current.dispose();
        jitsiAPIRef.current = null;
      }
    };
  }, [isOpen, roomName, displayName, password]);

  const initializeJitsi = () => {
    if (!jitsiMeetRef.current || !window.JitsiMeetExternalAPI) return;

    // Clear any existing content
    jitsiMeetRef.current.innerHTML = '';

    const domain = 'meet.jit.si';
    const options = {
      roomName: `S2G-${roomName}`,
      width: '100%',
      height: '100%',
      parentNode: jitsiMeetRef.current,
      interfaceConfigOverwrite: {
        filmStripOnly: false,
        SHOW_JITSI_WATERMARK: false,
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
        TOOLBAR_BUTTONS: [
          'microphone',
          'camera',
          'fullscreen',
          'fodeviceselection',
          'hangup',
          'chat',
          'tileview',
          'raisehand',
        ],
      },
      userInfo: { displayName },
      password: password || undefined,
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: true,
        disableDeepLinking: true,
      },
    };

    jitsiAPIRef.current = new window.JitsiMeetExternalAPI(domain, options);

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

// Global function to start Jitsi call (for use from anywhere)
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

