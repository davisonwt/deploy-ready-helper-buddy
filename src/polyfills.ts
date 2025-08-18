// Import this file in components that need Solana polyfills only
import { Buffer } from 'buffer';

// Only add Buffer if it doesn't exist
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer;
}

if (typeof globalThis !== 'undefined' && !globalThis.Buffer) {
  globalThis.Buffer = Buffer;
}

export {};