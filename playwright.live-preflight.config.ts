import { defineConfig, devices } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Live pre-flight suite: unlike playwright.config.ts / playwright.stalls.config.ts
// (hermetic, stubbed backend against a locally-built bundle), these specs hit
// the REAL deployed TEST_BASE_URL with REAL TEST_USER/TEST_USER2 accounts and
// the REAL Supabase/Daily.co backend -- for verifying things a stub can't
// (two real browsers sharing a real Supabase Realtime channel, a real Daily
// room, a real "is someone actually live" badge). Same plain KEY=VALUE
// .env.test reader as playwright.config.ts -- no dotenv dependency.
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
  testDir: './tests/live-preflight',
  timeout: 300_000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.TEST_BASE_URL,
    trace: 'retain-on-failure',
    permissions: ['camera', 'microphone'],
    launchOptions: {
      args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
