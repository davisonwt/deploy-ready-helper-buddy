// Safe polyfills that don't interfere with React
import { Buffer } from 'buffer';
import process from 'process';

// Set up polyfills before any other imports
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer;
}

if (typeof globalThis.process === 'undefined') {
  globalThis.process = process;
}

// Window compatibility
if (typeof window !== 'undefined') {
  if (!window.Buffer) window.Buffer = Buffer;
  if (!window.process) window.process = process;
  if (!window.global) window.global = globalThis;
}

export { Buffer };