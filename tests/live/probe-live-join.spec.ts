import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * Harness or product? The 4-browser baseline reads 0 remote audio streams even
 * with three distinct identities. This dumps what each tab actually believes:
 * whether it joined Daily at all, what audio elements exist, and what the app
 * logged on the way.
 */

const HOST_EMAIL = process.env.TEST_A_EMAIL ?? '';
const HOST_PASS = process.env.TEST_A_PASSWORD ?? '';
const G1_EMAIL = process.env.TEST_GOSAT_EMAIL ?? '';
const G1_PASS = process.env.TEST_GOSAT_PASSWORD ?? '';
const STALL = 'davisontest1';

async function login(page: Page, email: string, pass: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 25000 }).catch(() => {});
}

async function snapshot(page: Page, who: string) {
  const s = await page.evaluate(() => {
    const audios = Array.from(document.querySelectorAll('audio'));
    return {
      url: location.href.replace(/^https?:\/\/[^/]+/, ''),
      audioEls: audios.length,
      withStream: audios.filter((a) => (a as HTMLAudioElement).srcObject instanceof MediaStream).length,
      videoEls: document.querySelectorAll('video').length,
      hosting: /You are hosting/.test(document.body.innerText),
      inLive: /Leave call|End live|Raise hand|You are hosting/i.test(document.body.innerText),
      enableSound: /Enable sound|tap to enable/i.test(document.body.innerText),
      bodyHead: document.body.innerText.replace(/\s+/g, ' ').slice(0, 160),
    };
  });
  console.log(`[${who}] ${JSON.stringify(s)}`);
  return s;
}

test('diagnose: does anyone actually join the Daily call?', async ({ browser }) => {
  test.skip(!HOST_EMAIL || !G1_EMAIL, 'credentials required');
  test.setTimeout(8 * 60_000);

  const ctxs: BrowserContext[] = [];
  const mk = async () => {
    const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['camera', 'microphone'] });
    ctxs.push(c);
    return c;
  };
  const hostPage = await (await mk()).newPage();
  const g1 = await (await mk()).newPage();

  const logs: string[] = [];
  for (const [who, p] of [['host', hostPage], ['g1', g1]] as const) {
    p.on('console', (m) => {
      const t = m.text();
      if (/daily|call|audio|join|token|mic/i.test(t)) logs.push(`[${who}] ${m.type()}: ${t.slice(0, 220)}`);
    });
    p.on('pageerror', (e) => logs.push(`[${who}] PAGEERROR: ${String(e).slice(0, 220)}`));
  }

  await login(hostPage, HOST_EMAIL, HOST_PASS);
  await login(g1, G1_EMAIL, G1_PASS);

  // Host goes live from their own stall.
  await hostPage.goto(`/stall/${STALL}`, { waitUntil: 'domcontentloaded' });
  await hostPage.waitForTimeout(6000);
  const books = hostPage.locator('button[aria-label="Books"]').first();
  await expect(books, 'Books hotspot').toHaveCount(1);
  await books.click();
  await hostPage.waitForTimeout(3000);
  await snapshot(hostPage, 'host after opening Books');

  const goLive = hostPage.locator('button[aria-label="Go Live"], button:has-text("Go Live")').first();
  console.log(`go-live control present: ${await goLive.count()}`);
  if (await goLive.count()) {
    await goLive.click({ force: true });
    await hostPage.waitForTimeout(12000);
  }
  await snapshot(hostPage, 'host after Go Live');

  // Guest steps in.
  await g1.goto(`/stall/${STALL}`, { waitUntil: 'domcontentloaded' });
  await g1.waitForTimeout(6000);
  const gBooks = g1.locator('button[aria-label="Books"]').first();
  if (await gBooks.count()) { await gBooks.click(); await g1.waitForTimeout(3000); }
  const stepIn = g1.locator('button[aria-label="Step In"], button:has-text("Step In")').first();
  console.log(`step-in control present: ${await stepIn.count()}`);
  if (await stepIn.count()) { await stepIn.click({ force: true }); await g1.waitForTimeout(12000); }
  await snapshot(g1, 'guest after Step In');
  await snapshot(hostPage, 'host after guest joined');

  console.log('--- console (filtered) ---');
  for (const l of logs.slice(0, 30)) console.log('  ' + l);

  await hostPage.screenshot({ path: 'test-results/livejoin-host.png' });
  await g1.screenshot({ path: 'test-results/livejoin-guest.png' });
  for (const c of ctxs) await c.close();
});
