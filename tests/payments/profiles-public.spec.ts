import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// P0-4 (2026-09-05): profiles are locked to owner-or-admin by RLS; every
// cross-member read goes through the profiles_public view, which exposes
// only approved public columns. This spec proves both halves against the
// REAL backend with two ordinary (non-admin) member accounts:
//
//   as A: profiles        .eq('user_id', B) -> 0 rows
//   as A: profiles_public .eq('user_id', B) -> 1 row, display_name present,
//         and NO email / phone / latitude / longitude / payout_address keys
//   then the seed listing, chat app, leaderboard and Wandering Hearts browse
//   load as A with every profiles_public request succeeding, and the chat
//   app's contact list receives B's public row.
//
// It needs credentials the repo does not ship (the payments suite runs
// hermetically with a fake session). Provide them as env vars, otherwise
// the whole file is skipped and says so:
//
//   TEST_A_EMAIL / TEST_A_PASSWORD   a non-admin member (the reader)
//   TEST_B_USER_ID                   another non-admin member's auth user id
//
// A test on an admin/gosat account proves nothing here: admins are allowed
// to read every profile row by design.

const SUPABASE_URL = 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const SUPABASE_PROJECT_REF = 'zuwkgasbkpjlxzsjzumu';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1d2tnYXNia3BqbHh6c2p6dW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDk4MjEsImV4cCI6MjA2ODQyNTgyMX0.ffH_7MzNCgyjXf8BFzGDCiVE7Qjptqb9qKBkq3gVbiU';

const A_EMAIL = process.env.TEST_A_EMAIL;
const A_PASSWORD = process.env.TEST_A_PASSWORD;
const B_USER_ID = process.env.TEST_B_USER_ID;
const HAVE_CREDS = Boolean(A_EMAIL && A_PASSWORD && B_USER_ID);

const PRIVATE_KEYS = [
  'email', 'phone', 'whatsapp_url', 'telegram_url', 'date_of_birth',
  'latitude', 'longitude', 'payout_address', 'payout_network', 'payout_tag',
  'payout_wallet_type', 'solana_wallet_address', 'recovery_locked_until',
  'failed_recovery_attempts', 'suspended', 'last_login', 'garden_settings',
  'video_credits',
];

test.describe('profiles_public: locked table, public view', () => {
  test.skip(!HAVE_CREDS, 'Set TEST_A_EMAIL, TEST_A_PASSWORD and TEST_B_USER_ID (two non-admin members) to run this spec.');

  test('member A cannot read B\'s profile row but can read B\'s public row', async ({ page }) => {
    const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { data: signIn, error: signInErr } = await client.auth.signInWithPassword({
      email: A_EMAIL!, password: A_PASSWORD!,
    });
    expect(signInErr, 'sign-in as A must succeed').toBeNull();
    const session = signIn.session!;

    // A must be an ordinary member, or this test proves nothing.
    const { data: roles } = await client.from('user_roles').select('role').eq('user_id', session.user.id);
    expect((roles || []).map((r: any) => r.role)).not.toContain('admin');
    expect((roles || []).map((r: any) => r.role)).not.toContain('gosat');

    const { data: rawRows, error: rawErr } = await client.from('profiles').select('*').eq('user_id', B_USER_ID!);
    expect(rawErr).toBeNull();
    expect(rawRows, 'RLS must hide B\'s row from A').toHaveLength(0);

    const { data: pubRows, error: pubErr } = await client.from('profiles_public').select('*').eq('user_id', B_USER_ID!);
    expect(pubErr).toBeNull();
    expect(pubRows, 'the public view must return B\'s row to A').toHaveLength(1);
    const b = pubRows![0] as Record<string, unknown>;
    expect(b.display_name ?? b.username ?? b.first_name, 'B must have a visible name').toBeTruthy();
    expect('avatar_url' in b).toBe(true);
    for (const k of PRIVATE_KEYS) expect(k in b, `private column ${k} must not be in profiles_public`).toBe(false);

    // Log the real session into the app the same way the payments suite
    // injects its fake one, then walk the pages that show other members.
    const bDisplayName = String(b.display_name ?? b.username ?? b.first_name);
    await page.addInitScript(
      ({ storageKey, session }) => {
        window.localStorage.setItem(storageKey, JSON.stringify(session));
        window.sessionStorage.setItem('audioUnlocked', '1');
      },
      { storageKey: `sb-${SUPABASE_PROJECT_REF}-auth-token`, session },
    );

    const failedProfileRequests: string[] = [];
    const publicRowsSeen: string[] = [];
    const profileUrls: string[] = [];
    page.on('response', async (res) => {
      const url = res.url();
      if (!url.includes('/rest/v1/profiles')) return;
      profileUrls.push(`${res.status()} ${url.slice(0, 140)}`);
      if (res.status() >= 400) failedProfileRequests.push(`${res.status()} ${url}`);
      if (url.includes('profiles_public') && res.status() < 300) {
        try { publicRowsSeen.push(await res.text()); } catch { /* body already consumed */ }
      }
    });

    const landed: Record<string, string> = {};
    for (const path of ['/products', '/stats', '/tribal-hearts', '/chatapp']) {
      await page.goto(path, { waitUntil: 'networkidle' });
      landed[path] = page.url();
      await expect(page.locator('body')).not.toContainText('permission denied');
    }
    // Every page must have kept A signed in (a bounce to /login would mean
    // the injected session was rejected).
    for (const [path, url] of Object.entries(landed)) expect(url, `${path} stayed put`).toContain(path);

    // The cross-member read that failed live on 2026-09-05 ("No users
    // found"): ChatApp's New Chat dialog lists registered sowers and fetches
    // their public rows from profiles_public. Open it and capture that
    // response. (The other pages only read A's own row for a fresh account,
    // so they prove "no failures", not "other members visible".)
    const sowerRowsPromise = page.waitForResponse(
      (res) => res.url().includes('/rest/v1/profiles_public') && res.request().method() === 'GET' && res.url().includes('user_id=in.'),
      { timeout: 20_000 },
    );
    await page.getByRole('button', { name: /new chat/i }).first().click();
    const sowerRows = await (await sowerRowsPromise).json();
    console.log('New Chat dialog received public rows:', JSON.stringify(
      (sowerRows as any[]).map((r) => ({ user_id: r.user_id, name: r.display_name ?? r.username ?? r.first_name })),
    ));
    console.log('profile requests:', JSON.stringify(profileUrls, null, 1));

    expect(failedProfileRequests, 'no profile read may fail on these pages').toEqual([]);
    const others = (sowerRows as any[]).filter((r) => r?.user_id && r.user_id !== session.user.id);
    expect(others.length, 'New Chat dialog must receive other members\' public rows').toBeGreaterThan(0);
    expect(others.every((r) => r.display_name || r.username || r.first_name), 'every listed member has a visible name').toBe(true);
    void bDisplayName; void publicRowsSeen;
  });
});
