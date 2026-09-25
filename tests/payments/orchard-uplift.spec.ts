import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// P0-5 Phase D, against the REAL backend:
//   Part 1 (always, no money moves):
//     1. as member A: inserting kind = uplift is refused by the DB gate;
//     2. as the gosat: an Uplift test orchard exists (created here if none is
//        open: 1 pocket x 10 USDC, digital, opened_by_gosat set), and
//        /admin/orchards shows it with the Uplift badge and Fund now, and no
//        release card yet;
//     3. as member A: the orchard page reads "Sow2Grow pays the parties
//        directly" and offers the bestow button.
//   Part 2 (NOT RUN -- see its test.skip): release to two parties.
//     orchard-release-uplift signs only with the production secret
//     SOLANA_HOT_WALLET_SECRET_KEY (_shared/solanaPayout.ts), i.e. S2G's live
//     payout wallet, and there is no way to point it at a test treasury short
//     of letting a request pick the signing key (never) or a separate test
//     deployment (none exists). Decided 2026-09-25: never run it against the
//     live wallet, so the old PHASE_D_RELEASE=1 opt-in is gone.
//
// Part 1 creates its own Uplift orchard under the gosat's account each run
// ("QA uplift <stamp>") and deletes it in afterAll, with the rows its insert
// triggers write; a residue scan proves nothing references it afterwards.
// It only READS the gosat's settlement consent -- a spec never writes a real
// member's rows. Fails, saying why, without credentials or
// SUPABASE_ACCESS_TOKEN. Never commit .env.test.

const SUPABASE_URL = 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const SUPABASE_PROJECT_REF = 'zuwkgasbkpjlxzsjzumu';
const ANON_KEY = 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa';
const TITLE = 'Phase D uplift test orchard';
const DEFAULT_PARTY = 'EbSUvuE8sstLCcGsMZqXb7rB6rvgpVR4dTqEZEi32ekx';

const GOSAT_EMAIL = process.env.TEST_GOSAT_EMAIL;
const GOSAT_PASSWORD = process.env.TEST_GOSAT_PASSWORD;
const A_EMAIL = process.env.TEST_A_EMAIL;
const A_PASSWORD = process.env.TEST_A_PASSWORD;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';
const QA_TITLE = `QA uplift ${Date.now()}`;
const createdOrchards: string[] = [];

async function sql<T = any>(query: string): Promise<T[]> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const body = await res.json();
  if (!res.ok || !Array.isArray(body)) throw new Error(`sql failed: ${JSON.stringify(body).slice(0, 300)}`);
  return body as T[];
}
const PARTY1 = process.env.PHASE_D_PARTY1_ADDRESS || DEFAULT_PARTY;
const PARTY2 = process.env.PHASE_D_PARTY2_ADDRESS || DEFAULT_PARTY;

async function signIn(email: string, password: string) {
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  expect(error, `sign-in as ${email} must succeed`).toBeNull();
  return { client, session: data.session! };
}

async function useSession(page: import('@playwright/test').Page, session: unknown) {
  await page.addInitScript(
    ({ storageKey, session }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(session));
      window.sessionStorage.setItem('audioUnlocked', '1');
    },
    { storageKey: `sb-${SUPABASE_PROJECT_REF}-auth-token`, session },
  );
}

async function findUpliftTestOrchard(client: ReturnType<typeof createClient>) {
  const { data } = await client
    .from('orchards')
    .select('id, title, funding_state, orchard_kind, opened_by_gosat, user_id')
    .eq('title', TITLE)
    .eq('orchard_kind', 'uplift')
    .in('funding_state', ['open', 'funded', 'released'])
    .order('created_at', { ascending: false })
    .limit(1);
  return (data ?? [])[0] ?? null;
}

test.describe('orchard Uplift (Phase D)', () => {
  test.beforeAll(() => {
    if (!GOSAT_EMAIL || !GOSAT_PASSWORD || !A_EMAIL || !A_PASSWORD) throw new Error('TEST_GOSAT_EMAIL/PASSWORD and TEST_A_EMAIL/PASSWORD must be set in .env.test.');
    if (!TOKEN) throw new Error('SUPABASE_ACCESS_TOKEN must be set in .env.test (teardown and the consent read).');
  });

  test.afterAll(async () => {
    if (!createdOrchards.length) return;
    const ids = createdOrchards.map((i) => `'${i}'`).join(',');
    await sql(`begin;
      delete from linux_family_suggestions where seed_id in (${ids});
      delete from linux_family_activity_log where seed_id in (${ids});
      delete from orchards where id in (${ids});
      commit;`);
    const [scan] = await sql(`
      select coalesce(sum(n), 0)::int left_rows, coalesce(string_agg(tbl || '.' || col || ':' || n, ', '), '') where_left from (
        select c.table_name tbl, c.column_name col, (xpath('/row/n/text()', query_to_xml(format('select count(*) n from public.%I where %I::text in (${ids.replace(/'/g, "''")})', c.table_name, c.column_name), false, true, '')))[1]::text::int n
          from information_schema.columns c join information_schema.tables t on t.table_name = c.table_name and t.table_schema = c.table_schema
         where c.table_schema = 'public' and t.table_type = 'BASE TABLE' and c.data_type = 'uuid'
      ) x where n > 0`);
    console.log(`[RESIDUE] orchard-uplift: ${createdOrchards.length} orchard(s) created, rows referencing them now: ${scan.left_rows} ${scan.where_left}`);
    expect(scan.left_rows, `left: ${scan.where_left}`).toBe(0);
  });

  test('a non-gosat cannot open an Uplift; the gosat can, and the console shows it', async ({ page }) => {
    // 1. A is refused by trg_orchards_uplift_gate (42501 -> 403 with the reason).
    const a = await signIn(A_EMAIL!, A_PASSWORD!);
    const { data: aRow, error: aErr } = await a.client.from('orchards').insert([{
      title: `${QA_TITLE} non-gosat attempt`, description: 'must be refused by the DB gate', category: 'General', orchard_type: 'standard',
      seed_value: 8.69, original_seed_value: 8.69, pocket_price: 10, product_type: 'digital', status: 'active', currency: 'USDC',
      user_id: a.session.user.id, orchard_kind: 'uplift',
    }] as any).select('id');
    for (const r of (aRow ?? []) as any[]) createdOrchards.push(r.id); // only if the gate failed open
    expect(aErr, 'A inserting kind = uplift must fail').not.toBeNull();
    expect(aErr!.message).toMatch(/uplift_orchards_are_gosat_only/);

    // 2. The gosat opens a fresh one for this run (1 pocket x 10 USDC, digital),
    //    deleted in afterAll. The gosat is a real member: his settlement consent
    //    is READ here, never created by a spec.
    const g = await signIn(GOSAT_EMAIL!, GOSAT_PASSWORD!);
    const [consent] = await sql(`select count(*)::int n from settlement_consents
      where user_id='${g.session.user.id}' and version = public.get_settlement_consent_version()`);
    if (!consent.n) throw new Error('The gosat has not accepted the current settlement consent; accept it in the app, then re-run. A spec never accepts it for him.');
    const { data: created, error: createErr } = await g.client.from('orchards').insert([{
      title: QA_TITLE, description: 'QA fixture: created and deleted by orchard-uplift.spec.ts in the same run.',
      category: 'General', orchard_type: 'standard', seed_value: 8.69, original_seed_value: 8.69, pocket_price: 10, product_type: 'digital',
      status: 'active', currency: 'USDC', user_id: g.session.user.id, orchard_kind: 'uplift',
    }] as any).select('id, title, funding_state, orchard_kind, opened_by_gosat, user_id').single();
    expect(createErr, 'the gosat creating the Uplift test orchard must succeed').toBeNull();
    createdOrchards.push((created as any).id);
    const orchard = created as any;
    console.log('created Uplift test orchard:', JSON.stringify(orchard));
    expect(orchard.orchard_kind).toBe('uplift');
    expect(orchard.opened_by_gosat, 'opened_by_gosat is stamped by the gate').toBe(g.session.user.id);
    console.log('PHASE_D_ORCHARD_ID=' + orchard.id + ' state=' + orchard.funding_state);

    await useSession(page, g.session);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/admin/orchards', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('orchards-table')).toBeVisible({ timeout: 30_000 });
    const row = page.locator(`[data-testid="orchard-row"][data-orchard-id="${orchard.id}"]`);
    await expect(row).toHaveCount(1);
    await expect(row).toHaveAttribute('data-kind', 'uplift');
    await expect(row.getByTestId('orchard-kind')).toHaveText('Uplift');
    if (orchard.funding_state === 'open') {
      await expect(row.getByTestId('fund-now')).toBeVisible();
      await expect(page.locator(`[data-testid="uplift-release"][data-orchard-id="${orchard.id}"]`)).toHaveCount(0);
    } else {
      await expect(page.locator(`[data-testid="uplift-release"][data-orchard-id="${orchard.id}"]`)).toBeVisible();
    }
    expect(errors, 'no uncaught page errors').toEqual([]);

    // 3. As A: the Uplift wording and (while open) the bestow button.
    await page.context().clearCookies();
    await useSession(page, a.session);
    await page.goto(`/orchard/${orchard.id}`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('uplift-notice')).toContainText('Sow2Grow pays the parties directly', { timeout: 30_000 });
    if (orchard.funding_state === 'open') await expect(page.getByTestId('orchard-bestow-button')).toBeVisible();
  });

  test('devnet proof: the gosat releases the funded Uplift to two parties; A sees where the gifts went', async ({ page }) => {
    test.skip(true, 'Not run, by decision (2026-09-25): orchard-release-uplift can only sign with S2G\'s live payout wallet '
      + '(SOLANA_HOT_WALLET_SECRET_KEY), and it must never be run against it. Needs a test treasury the release can be pointed at.');
    test.setTimeout(6 * 60_000);
    const g = await signIn(GOSAT_EMAIL!, GOSAT_PASSWORD!);
    const orchardId = process.env.PHASE_D_ORCHARD_ID || (await findUpliftTestOrchard(g.client))?.id;
    expect(orchardId, 'an Uplift test orchard').toBeTruthy();

    await useSession(page, g.session);
    await page.goto('/admin/orchards', { waitUntil: 'networkidle' });
    const card = page.locator(`[data-testid="uplift-release"][data-orchard-id="${orchardId}"]`);
    await expect(card).toBeVisible({ timeout: 30_000 });
    const state = await card.getAttribute('data-state');
    const remaining = Number(await card.getAttribute('data-remaining'));
    console.log(`uplift ${orchardId}: state ${state}, left to pay ${remaining}`);

    if (remaining > 0) {
      // Two parties: a round 5.00 and the rest.
      const first = Math.min(5, Math.round((remaining / 2) * 100) / 100);
      const second = Math.round((remaining - first) * 100) / 100;
      await card.getByTestId('party-label-0').fill('Party one (devnet proof)');
      await card.getByTestId('party-amount-0').fill(first.toFixed(2));
      await card.getByTestId('party-destination-0').fill(PARTY1);
      await card.getByTestId('party-add').click();
      await card.getByTestId('party-label-1').fill('Party two (devnet proof)');
      await card.getByTestId('party-amount-1').fill(second.toFixed(2));
      await card.getByTestId('party-destination-1').fill(PARTY2);
      await expect(card.getByTestId('uplift-release-submit')).toBeEnabled();
      await card.getByTestId('uplift-release-submit').click();
      const title = (await g.client.from('orchards').select('title').eq('id', orchardId).single()).data!.title as string;
      await page.getByTestId('release-typed').fill(title);
      await page.getByTestId('release-confirm').click();
    }

    // Each USDC send waits for finalized commitment (up to ~90 s each).
    const paidRows = card.locator('[data-testid="party-row"][data-status="paid"]');
    await expect(paidRows).toHaveCount(2, { timeout: 4 * 60_000 });
    for (let i = 0; i < 2; i += 1) {
      const link = paidRows.nth(i).getByTestId('party-reference').locator('a');
      await expect(link).toHaveAttribute('href', /solscan\.io\/tx\/.+cluster=devnet/);
      console.log('party', i + 1, 'signature link:', await link.getAttribute('href'));
    }
    await expect(card).toHaveAttribute('data-state', 'released');
    await expect(card.getByTestId('uplift-settled')).toContainText('Every party has been paid.');

    // As A: the tribe-facing list.
    const a = await signIn(A_EMAIL!, A_PASSWORD!);
    await page.context().clearCookies();
    await useSession(page, a.session);
    await page.goto(`/orchard/${orchardId}`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('funding-progress')).toHaveAttribute('data-released', '1', { timeout: 30_000 });
    await expect(page.getByTestId('party-paid')).toHaveCount(2);
    await expect(page.getByTestId('party-paid').first()).toContainText('Party one (devnet proof)');
    await expect(page.getByTestId('my-pocket-state').first()).toContainText('Sow2Grow pays the parties directly');
  });
});
