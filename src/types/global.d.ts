// Global type declarations for window extensions

declare global {
  interface Window {
    launchConfetti?: () => void;
    floatingScore?: (score: number | string, x?: number, y?: number) => void;
    startJitsi?: (roomName: string) => void;
    playSoundEffect?: (sound: string, volume?: number) => void;
    launchSparkles?: () => void;
  }
}

export {};
