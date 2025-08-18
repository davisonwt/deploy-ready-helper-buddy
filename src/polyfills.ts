// Polyfills for Node.js modules in browser environment
import { Buffer } from 'buffer';
import process from 'process';

// Only add polyfills if they don't exist
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer;
}

if (typeof globalThis.process === 'undefined') {
  globalThis.process = process;
}

// Set up window globals only if window exists
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

export {};