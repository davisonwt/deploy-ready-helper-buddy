import { defineConfig, devices } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Same .env.test loader as playwright.config.ts (TEST_USER_EMAIL/PASSWORD,
// TEST_USER2_EMAIL/PASSWORD) -- kept as a separate config, not merged into
// playwright.config.ts's payments suite, because this one drives the LIVE
// production deployment (sow2growapp.com) with two real accounts, not a
// local `npm run preview` build.
const envTest = resolve(process.cwd(), '.env.test');
if (existsSync(envTest)) {
  for (const line of readFileSync(envTest, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}

export default defineConfig({
  testDir: './tests/live',
  timeout: 5 * 60_000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'https://sow2growapp.com',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    // Real (synthetic but non-silent) audio/video tracks, auto-granted --
    // the audio requirement needs an actual received track to measure
    // energy on, not a permission prompt neither side can click through.
    launchOptions: {
      args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
