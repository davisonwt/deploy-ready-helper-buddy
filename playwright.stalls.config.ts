import { defineConfig, devices } from '@playwright/test';

// Stalls-flow Playwright suite -- sibling of playwright.config.ts (the
// payments-only suite), same "real production bundle, hermetically
// stubbed backend" approach, kept in its own config/testDir/npm script so
// `npm run test:payments` (run before every push touching src/lib/payments)
// stays scoped to payments and doesn't pick up unrelated specs, and vice
// versa. Run via `npm run test:stalls`.
export default defineConfig({
  testDir: './tests/stalls',
  timeout: 60_000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    // Serves the real production build (dist/), not the dev server -- same
    // reasoning as playwright.config.ts: dev mode skips minification/
    // tree-shaking and can mask bundling bugs that only show up built.
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    {
      // devices['iPhone 13'] defaults to WebKit, which isn't installed in
      // every environment this runs in (Chromium is, via the payments
      // suite) -- so this reproduces the same 390x844 touch-emulated iPhone
      // viewport the bug report was filed against, but on Chromium.
      name: 'iphone-touch',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      },
    },
  ],
});
