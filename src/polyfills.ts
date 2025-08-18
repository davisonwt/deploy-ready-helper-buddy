// Polyfills for Node.js modules in browser environment
import { Buffer } from 'buffer';
import process from 'process';

// Make Buffer globally available
window.Buffer = Buffer;
window.global = window.global ?? window;
window.process = process;

// Add any other globals that might be needed
window.global.Buffer = Buffer;
window.global.process = process;

export {};