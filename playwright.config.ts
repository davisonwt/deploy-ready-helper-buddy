import { defineConfig, devices } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Optional test credentials (two non-admin member accounts) for the specs
// that talk to the real backend, e.g. tests/payments/profiles-public.spec.ts.
// `.env.test` is gitignored (`.env.*`); without it those specs skip
// themselves. No dotenv dependency: a plain KEY=VALUE reader is enough.
const envTest = resolve(process.cwd(), '.env.test');
if (existsSync(envTest)) {
  for (const line of readFileSync(envTest, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}

// Payments-only Playwright suite. Separate from Cypress (cypress/e2e/, the
// existing e2e tool for the rest of the app) -- this exists specifically to
// drive a REAL production bundle through a REAL button click with a stubbed
// wallet provider, which is what caught the "Buffer is not defined" desktop
// Phantom crash that unit tests (which never load an actual browser bundle)
// could not. Run via `npm run test:payments` before every push that touches
// src/lib/payments -- see tests/payments/README.md.
// devnet-purchase-routing pays with real devnet USDC from the test wallet
// (~4.62 a run), so it runs only when asked: RUN_DEVNET_PURCHASE=1.
// global-setup.ts prints a one-line reminder whenever it was left out.
const RUN_DEVNET_PURCHASE = process.env.RUN_DEVNET_PURCHASE === '1';

export default defineConfig({
  testDir: './tests/payments',
  testIgnore: RUN_DEVNET_PURCHASE ? [] : ['**/devnet-purchase-routing.spec.ts'],
  globalSetup: './tests/payments/global-setup.ts',
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
