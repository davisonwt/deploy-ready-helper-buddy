// Safe polyfills for Solana - only add what's missing
import { Buffer } from 'buffer';
import process from 'process';

// Only add Buffer if it doesn't exist, using safe property access
try {
  if (typeof globalThis !== 'undefined' && !globalThis.Buffer) {
    globalThis.Buffer = Buffer;
  }
  
  if (typeof globalThis !== 'undefined' && !globalThis.process) {
    globalThis.process = process;
  }

  // For window environments - check for existence first
  if (typeof window !== 'undefined') {
    if (!window.Buffer) {
      window.Buffer = Buffer;
    }
    if (!window.process) {
      window.process = process;
    }
    if (!window.global) {
      window.global = globalThis;
    }
  }
} catch (e) {
  // Silently ignore polyfill errors to avoid breaking React
  console.warn('Polyfill initialization warning:', e);
}

export {};