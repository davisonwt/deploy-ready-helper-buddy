import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// SeedCard Message-action chat fixes, against the REAL backend:
//   1. Sending a text in the DM opened from a SeedCard's Message button
//      renders exactly ONE bubble, with the sender's real name (never
//      "Unknown User") -- ChatRoom.tsx's optimistic local append now
//      carries the sender's own auth-context profile, and its realtime
//      INSERT handler now dedupes by id (both used to be missing, which
//      is what produced the double-render: an unenriched local echo
//      first, then the fully-resolved realtime row on top of it,
//      unconditionally appended).
//   2. That room's first-ever message is a seed-context quote card
//      (title + cover + a link back to the exact stall sheet) --
//      SeedCard.tsx's attachSeedReferenceIfFirstMessage.
//   3. Back out of that DM lands on the SAME stall sheet
//      (/stall/<username>#stall-kind=<kind>), not "Community Chats" --
//      SeedCard.tsx's captureStallReturn + ChatApp.tsx's chatReturnTo.
//   4. No navigation loop: feed -> stall -> Message -> chat -> Back ->
//      stall -> close sheet -> close interior lands on the FEED (not back
//      on the chat), and one real browser Back from there does not
//      reopen the chat either. The loop's actual cause was every one of
//      these "go back" hops PUSHING a new history entry instead of
//      replacing the current one (ChatApp's handleBackToList,
//      StallInteriorView's own hash-sync effect clobbering the { from }
//      origin state back to null) combined with StallVisitPage's old
//      close handler doing a blind navigate(-1) -- see StallInteriorView.tsx,
//      StallVisitPage.tsx, ChatApp.tsx, ProductBasketPage.tsx for the fix.
//
// Needs two ordinary (non-admin) member accounts, at least one of which
// (B) has a published stall with a real product. Provide as env vars
// (.env.test, gitignored), otherwise this file skips itself:
//
//   TEST_A_EMAIL / TEST_A_PASSWORD   sender (e.g. davisontest2)
//   TEST_B_EMAIL / TEST_B_PASSWORD   unused here, just needs B to exist
//   TEST_B_USER_ID                   B's auth user id (e.g. davisontest1)
//
// Nothing destructive: sends one real chat message to a real room
// between the two test accounts (harmless, same as any other DM).

const SUPABASE_URL = 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const SUPABASE_PROJECT_REF = 'zuwkgasbkpjlxzsjzumu';
const ANON_KEY = 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa';

const A_EMAIL = process.env.TEST_A_EMAIL;
const A_PASSWORD = process.env.TEST_A_PASSWORD;
const B_USER_ID = process.env.TEST_B_USER_ID;
const HAVE_CREDS = Boolean(A_EMAIL && A_PASSWORD && B_USER_ID);

async function signIn(email: string, password: string) {
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  expect(error, `sign-in as ${email} must succeed`).toBeNull();
  return { session: data.session!, client };
}

async function useSession(page: import('@playwright/test').Page, session: unknown) {
  await page.addInitScript(
    ({ storageKey, session }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(session));
    },
    { storageKey: `sb-${SUPABASE_PROJECT_REF}-auth-token`, session },
  );
}

test.describe('SeedCard Message action: no duplicate bubble, seed quote, back-to-stall', () => {
  test.skip(!HAVE_CREDS, 'Set TEST_A_EMAIL / TEST_A_PASSWORD / TEST_B_USER_ID (two non-admin members, B publishes a stall) to run this spec.');

  test('A messages B from a SeedCard on B\'s stall: one bubble, real name, seed quote, back-to-stall', async ({ page }) => {
    const { session, client } = await signIn(A_EMAIL!, A_PASSWORD!);
    await useSession(page, session);

    // Resolve B's username (profiles_public, authenticated-readable) and
    // A's own display name (what the bubble must show -- never "Unknown User").
    const { data: bProfile } = await client
      .from('profiles_public')
      .select('username, display_name')
      .eq('user_id', B_USER_ID!)
      .maybeSingle();
    expect(bProfile?.username, 'B must have a username to reach /stall/<username>').toBeTruthy();
    const { data: aProfile } = await client
      .from('profiles_public')
      .select('display_name')
      .eq('user_id', session.user.id)
      .maybeSingle();
    const aName = aProfile?.display_name;

    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    // Start from the actual reported scenario's origin (the stalls feed),
    // not a direct /stall/<username> link -- that's what gives
    // StallVisitPage's { from } state something real to carry, and is
    // what the loop bug actually happened from.
    await page.goto('/stalls-feed', { waitUntil: 'networkidle' });
    const feedCard = page.getByRole('button', { name: new RegExp(`Open .*${bProfile!.username}.*stall|Open ${bProfile?.display_name ?? ''}`, 'i') })
      .or(page.locator('article', { hasText: bProfile?.display_name ?? bProfile!.username }))
      .first();
    if (await feedCard.count()) {
      await feedCard.click({ timeout: 15_000 }).catch(() => {});
      await page.waitForURL(/\/stall\//, { timeout: 15_000 }).catch(() => {});
    }
    if (!page.url().includes('/stall/')) {
      // Feed card not found by heuristic (chip filter, ordering, etc.) --
      // fall back to a direct link so the rest of the flow still runs,
      // but note this didn't exercise the feed->stall { from } hop itself.
      await page.goto(`/stall/${bProfile!.username}`, { waitUntil: 'networkidle' });
    }

    // Open the first hotspot with at least one item -- whichever kind
    // it is, its own painted button became the entry point (Farm-Stalls
    // batch 2b's interior view), no fixed "Books" assumption needed.
    // Interior hotspots are unlabeled-icon buttons positioned over the
    // photo -- easiest robust hook is the sheet itself opening and
    // showing a real SeedCard with a Message rail button.
    const firstHotspot = page.locator('button[aria-label]').first();
    await firstHotspot.click({ timeout: 15_000 }).catch(() => {});

    const messageButton = page.getByRole('button', { name: 'Message' }).first();
    await expect(messageButton).toBeVisible({ timeout: 15_000 });
    await messageButton.click();

    await page.waitForURL(/\/chatapp\?room=/, { timeout: 15_000 });

    // Seed quote card: the room's first message, "About this seed".
    await expect(page.getByText('About this seed')).toBeVisible({ timeout: 15_000 });

    // Send a real text and assert exactly one bubble with it, correctly named.
    const probe = `verify-${Date.now()}`;
    await page.getByPlaceholder(/message/i).first().fill(probe);
    await page.keyboard.press('Enter');

    const bubbles = page.getByText(probe, { exact: true });
    await expect(bubbles).toHaveCount(1, { timeout: 10_000 });
    await expect(page.getByText('Unknown User')).toHaveCount(0);
    if (aName) {
      await expect(page.getByText(aName).first()).toBeVisible();
    }

    // Back -> the same stall sheet, not Community Chats.
    const backButton = page.getByRole('button', { name: /Back to .+'s stall/ });
    await expect(backButton).toBeVisible();
    await backButton.click();
    await page.waitForURL(/\/stall\//, { timeout: 15_000 });
    expect(page.url()).toContain('#stall-kind=');

    // Close the hotspot sheet, then the interior itself -- both are
    // "Close"-labeled icon buttons (StallHotspotSheet's own, and
    // StallInteriorView's desktop/mobile header, whichever is visible at
    // this viewport); the sheet's is the one still visible right after
    // Back, so close it first.
    const visibleCloseButtons = page.locator('button[aria-label="Close"]:visible');
    await visibleCloseButtons.first().click({ timeout: 10_000 });
    // Sheet gone -- exactly the interior's own Close button(s) left for this viewport.
    await expect(page.locator('button[aria-label="Close"]:visible').first()).toBeVisible({ timeout: 10_000 });
    await page.locator('button[aria-label="Close"]:visible').first().click();

    // Must land on the feed, never back on the chat.
    await page.waitForURL(/\/stalls-feed/, { timeout: 15_000 });
    expect(page.url()).not.toContain('/chatapp');

    // One real browser Back must not resurrect the chat either -- this is
    // the actual regression: every one of the "go back" hops above used
    // to PUSH a new history entry instead of replacing the current one,
    // so a single Back from the feed landed right back on the chat room.
    await page.goBack({ waitUntil: 'networkidle', timeout: 15_000 });
    expect(page.url(), 'browser Back from the feed must not reopen the chat').not.toContain('/chatapp');

    expect(pageErrors, `no uncaught page errors: ${pageErrors.join('; ')}`).toHaveLength(0);
  });
});
