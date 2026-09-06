// One place for the service-worker script URL. The query string carries
// the build id (stamped by vite.config.ts at build time), and the worker
// file itself is stamped with the same id, so every publish yields a
// byte-different worker: the browser installs it, the worker calls
// skipWaiting + clients.claim, and main.tsx reloads any tab that was
// running the previous build. Without the stamp, sw.js only changed when
// someone edited it by hand, and open tabs kept the old bundle (and its
// API key) until a manual hard refresh.

export const BUILD_ID: string = typeof __BUILD_ID__ !== 'undefined' && __BUILD_ID__ ? __BUILD_ID__ : 'dev';

export const SERVICE_WORKER_URL = `/sw.js?v=${BUILD_ID}`;
