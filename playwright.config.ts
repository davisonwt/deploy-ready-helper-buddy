import { defineConfig, devices } from '@playwright/test';

// Payments-only Playwright suite. Separate from Cypress (cypress/e2e/, the
// existing e2e tool for the rest of the app) -- this exists specifically to
// drive a REAL production bundle through a REAL button click with a stubbed
// wallet provider, which is what caught the "Buffer is not defined" desktop
// Phantom crash that unit tests (which never load an actual browser bundle)
// could not. Run via `npm run test:payments` before every push that touches
// src/lib/payments -- see tests/payments/README.md.
export default defineConfig({
  testDir: './tests/payments',
  timeout: 60_000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    // Serves the real production build (dist/), not the dev server --
    // dev mode skips minification/tree-shaking and can mask bundling bugs
    // like this one that only show up in the built output.
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
