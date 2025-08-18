// This file will be injected to provide Buffer globally
// without interfering with React's module loading
import { Buffer } from 'buffer';

// Safely provide Buffer on globalThis
if (typeof globalThis !== 'undefined') {
  globalThis.Buffer = Buffer;
}

export {};