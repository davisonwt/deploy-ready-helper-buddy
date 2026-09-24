import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';

/**
 * Every media reference the app ships must resolve on the host under test.
 *
 * This is the check that did not exist on 2026-09-24, when the calendar's
 * seasonal artwork was reported broken and turned out to be 32 imported
 * assets -- 80 MB of images, voice-overs and videos -- that had been
 * 404ing on production since 2026-07-05. They pointed at Lovable's
 * assets-v1 route, which Lovable's preview host serves and Vercel does
 * not, so everything looked fine wherever it was last opened. The residue
 * checker could not have caught it: it counts rows in storage buckets and
 * these were never rows in any bucket.
 *
 * The audit is a script rather than assertions inline here so it can also
 * be run by hand against a local preview:
 *   node scripts/audit-asset-refs.mjs http://localhost:4173
 *
 * Run: npx playwright test --config=playwright.live.config.ts asset-refs
 */
test('every shipped media reference resolves on the live host', () => {
  const base = test.info().project.use.baseURL ?? 'https://www.sow2growapp.com';
  let output = '';
  let failed = false;
  try {
    output = execFileSync('node', ['scripts/audit-asset-refs.mjs', base], {
      encoding: 'utf8',
      cwd: process.cwd(),
      timeout: 5 * 60_000,
    });
  } catch (e) {
    failed = true;
    const err = e as { stdout?: string; stderr?: string; message: string };
    output = err.stdout || err.stderr || err.message;
  }
  console.log(output);
  // The script's own exit code is the verdict; its output names each
  // broken reference, so the failure message is the list itself.
  expect(failed, `broken media references on ${base}:\n${output}`).toBe(false);
  expect(output).toContain('PASS');
});
