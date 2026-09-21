// One place for the service-worker script URL.
//
// The worker FILE is stamped with the build id by vite.config.ts, so every
// publish ships byte-different sw.js: registration.update() sees new bytes,
// the worker calls skipWaiting + clients.claim, and main.tsx reloads a tab
// still running the previous build. That is what fixes the stale-tab case
// (2026-09-06: members on an old tab saw "Legacy API keys are disabled"),
// and the stamp in the file is the whole of it.
//
// This URL used to carry `?v=<BUILD_ID>` as well, which was not a second
// belt but a loop. A registration is keyed by SCOPE, so registering a
// different script URL at the same scope always installs a "new" worker
// even when the bytes are identical. So a tab that reloaded onto a newer
// build immediately registered a URL its current controller did not have,
// installed again, claimed again, and fired controllerchange again --
// a second reload, every single recovery. Measured 2026-09-21 on a phone
// resuming a tab left open across ~35 deploys.
//
// sw.js is served `Cache-Control: no-cache` (vercel.json), so a constant
// URL still revalidates on every update() call. Nothing is lost.

export const BUILD_ID: string = typeof __BUILD_ID__ !== 'undefined' && __BUILD_ID__ ? __BUILD_ID__ : 'dev';

export const SERVICE_WORKER_URL = '/sw.js';
