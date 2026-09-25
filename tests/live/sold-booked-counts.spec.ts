import { test, expect } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { asUser, signInThroughUi, createWheelListing, sweepProducts, reportSweep } from './support/fixtures';

/**
 * 20260925160000_sold_and_booked_counts, against production.
 *
 *   1. products.bestowal_count follows completed product_bestowals through
 *      every transition: insert in each status, pending -> completed,
 *      completed -> refunded, completed -> cancelled, delete of a completed
 *      row, and a completed row moved to another product.
 *   2. My Listings shows "Booked: N" -- bookings whose payment completed:
 *      status in paid, in_progress, on_my_way, arrived, in_transit,
 *      collected, delivered, completed, no_show, and not refunded. A QA
 *      listing gets one booking in EVERY status plus a refunded 'paid' one
 *      (expected 9); a second QA listing has none (expected 0, shown, not
 *      hidden). A visitor calling the RPC for the owner's listing gets
 *      nothing.
 *
 * Fixtures: two QA wheel listings of davisontest1's (createWheelListing),
 * bestowals and bookings on them by davisontest2. Bestowal and booking rows
 * can only be written by the service role, so they go through the
 * Management API (SUPABASE_ACCESS_TOKEN in .env.test, local only).
 * Fixture bestowals are unreachable by the money jobs: release_status
 * 'pending' (release_due_escrow takes only 'held') and payout_status
 * 'qa_fixture' (owed_payout_balances takes only 'pending'). All of it is
 * deleted in afterAll, and the residue check proves it.
 *
 *   npx playwright test --config=playwright.live.config.ts sold-booked-counts
 */

const REF = 'zuwkgasbkpjlxzsjzumu';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';
const A_E = process.env.TEST_A_EMAIL || '', A_P = process.env.TEST_A_PASSWORD || '';
const B_E = process.env.TEST_B_EMAIL || '', B_P = process.env.TEST_B_PASSWORD || '';
const STAMP = Date.now();
const TITLE_A = `QA counts ${STAMP} A`;
const TITLE_B = `QA counts ${STAMP} B`;

async function sql<T = any>(query: string): Promise<T[]> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const body = await res.json();
  if (!res.ok || !Array.isArray(body)) throw new Error(`sql failed: ${JSON.stringify(body).slice(0, 300)}`);
  return body as T[];
}

let owner: { client: SupabaseClient; userId: string };
let visitor: { client: SupabaseClient; userId: string };
let productA = '';
let productB = '';
let sowerId = '';
let companyId = '';

async function counted(productId: string): Promise<{ stored: number; real: number }> {
  const [r] = await sql(`select p.bestowal_count::int stored,
    (select count(*)::int from product_bestowals pb where pb.product_id=p.id and pb.status='completed') real
    from products p where p.id='${productId}'`);
  return r;
}

async function insertBestowal(productId: string, status: string): Promise<string> {
  const [r] = await sql(`insert into product_bestowals
      (bestower_id, product_id, sower_id, amount, s2g_fee, sower_amount, grower_amount, status, release_status, payout_status, payment_method, payment_reference)
    values ('${visitor.userId}', '${productId}', '${sowerId}', 1, 0, 1, 0, '${status}', 'pending', 'qa_fixture', 'qa_fixture', 'QA ${STAMP}')
    returning id`);
  return r.id;
}

test.describe.serial('sold and booked counts', () => {
  test.setTimeout(5 * 60_000);

  test.beforeAll(async () => {
    if (!TOKEN) throw new Error('SUPABASE_ACCESS_TOKEN is missing from .env.test. Fixture bestowals and bookings need the service role; add it (local only) and re-run.');
    owner = await asUser(A_E, A_P, 'TEST_A (davisontest1)');
    visitor = await asUser(B_E, B_P, 'TEST_B (davisontest2)');
    productA = await createWheelListing(owner.client, owner.userId, TITLE_A, { town: 'Bethlehem, Free State' });
    productB = await createWheelListing(owner.client, owner.userId, TITLE_B, { town: 'Bethlehem, Free State' });
    const [p] = await sql(`select sower_id, company_id from products where id='${productA}'`);
    sowerId = p.sower_id; companyId = p.company_id;
  });

  test.afterAll(async () => {
    const problems: string[] = [];
    try {
      await sql(`delete from product_bestowals where payment_reference='QA ${STAMP}' and product_id in ('${productA || '00000000-0000-0000-0000-000000000000'}','${productB || '00000000-0000-0000-0000-000000000000'}')`);
      await sql(`delete from bookings where note='QA ${STAMP}' and product_id in ('${productA || '00000000-0000-0000-0000-000000000000'}','${productB || '00000000-0000-0000-0000-000000000000'}')`);
    } catch (e) { problems.push(String(e)); }
    if (owner) reportSweep('sold-booked-counts', await sweepProducts(owner.client, owner.userId, [TITLE_A, TITLE_B]));
    const [r] = await sql(`select
      (select count(*)::int from product_bestowals where payment_reference='QA ${STAMP}') bestowals,
      (select count(*)::int from bookings where note='QA ${STAMP}') bookings,
      (select count(*)::int from products where title in ('${TITLE_A}','${TITLE_B}')) products`);
    console.log(`[RESIDUE] ${JSON.stringify(r)}`);
    if (problems.length) console.log(`[TEARDOWN PROBLEMS] ${problems.join(' | ')}`);
    expect(problems).toEqual([]);
    expect(r).toEqual({ bestowals: 0, bookings: 0, products: 0 });
  });

  test('1. bestowal_count follows completed bestowals through every transition', async () => {
    const step = async (label: string, expected: number, productId = productA) => {
      const c = await counted(productId);
      console.log(`[COUNT] ${label}: stored=${c.stored} completed_rows=${c.real} expected=${expected}`);
      expect(c.stored, `${label}: stored count`).toBe(expected);
      expect(c.real, `${label}: completed rows`).toBe(expected);
    };
    await step('fresh listing', 0);

    const ids: Record<string, string> = {};
    for (const s of ['completed', 'pending', 'failed', 'refunded', 'cancelled']) ids[s] = await insertBestowal(productA, s);
    await step('one row in each status', 1);

    await sql(`update product_bestowals set status='completed' where id='${ids.pending}'`);
    await step('pending -> completed', 2);

    await sql(`update product_bestowals set status='refunded' where id='${ids.completed}'`);
    await step('completed -> refunded', 1);

    await sql(`update product_bestowals set status='cancelled' where id='${ids.pending}'`);
    await step('completed -> cancelled', 0);

    await sql(`update product_bestowals set status='completed' where id='${ids.failed}'`);
    await step('failed -> completed', 1);
    await sql(`update product_bestowals set payout_reference='touch' where id='${ids.failed}'`);
    await step('an unrelated column changes on a completed row', 1);

    await sql(`delete from product_bestowals where id='${ids.failed}'`);
    await step('delete of a completed row', 0);

    const moved = await insertBestowal(productA, 'completed');
    await step('new completed row', 1);
    await sql(`update product_bestowals set product_id='${productB}' where id='${moved}'`);
    await step('completed row moved away (A)', 0);
    await step('completed row moved in (B)', 1, productB);
  });

  test('2. My Listings shows "Booked: N" for paid bookings only; a visitor gets nothing', async ({ page }) => {
    const statuses = ['requested', 'accepted', 'declined', 'cancelled', 'expired', 'paid', 'in_progress', 'completed',
      'on_my_way', 'arrived', 'in_transit', 'no_show', 'collected', 'delivered'];
    const values = statuses.map((s) => `('${productA}', '${visitor.userId}', '${owner.userId}', '${companyId}', '${s}', now() + interval '30 days', 1, 'day', 1, 0, 1, 'none', 'ride', 'QA ${STAMP}')`);
    values.push(`('${productA}', '${visitor.userId}', '${owner.userId}', '${companyId}', 'paid', now() + interval '30 days', 1, 'day', 1, 0, 1, 'refunded', 'ride', 'QA ${STAMP}')`);
    await sql(`insert into bookings (product_id, grower_user_id, sower_user_id, company_id, status, starts_at, quantity, rate_unit, amount, s2g_fee, total, payment_status, booking_kind, note) values ${values.join(',\n')}`);
    const [n] = await sql(`select count(*)::int n from bookings where note='QA ${STAMP}'`);
    console.log(`[BOOKINGS] inserted ${n.n} on ${TITLE_A}: one per status (${statuses.length}) + one refunded 'paid'`);

    const { data: ownerRows, error: ownerErr } = await owner.client.rpc('my_listing_booked_counts', { listing_ids: [productA, productB] });
    expect(ownerErr).toBeNull();
    const byId = Object.fromEntries(((ownerRows ?? []) as { listing_id: string; booked: number }[]).map((r) => [r.listing_id, r.booked]));
    console.log(`[RPC owner] A=${byId[productA]} B=${byId[productB]}`);
    expect(byId[productA]).toBe(9);
    expect(byId[productB]).toBe(0);

    const { data: visitorRows, error: visitorErr } = await visitor.client.rpc('my_listing_booked_counts', { listing_ids: [productA, productB] });
    console.log(`[RPC visitor] rows=${JSON.stringify(visitorRows)} error=${visitorErr?.message ?? 'none'}`);
    expect(visitorErr).toBeNull();
    expect(visitorRows ?? []).toEqual([]);

    await page.setViewportSize({ width: 1280, height: 900 });
    let rpcCalls = 0;
    page.on('request', (r) => { if (r.url().includes('/rpc/my_listing_booked_counts')) rpcCalls++; });
    await signInThroughUi(page, A_E, A_P, 'TEST_A');
    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
    const cardA = page.locator('li').filter({ hasText: TITLE_A }).first();
    const cardB = page.locator('li').filter({ hasText: TITLE_B }).first();
    await expect(cardA.getByTestId('booked-count')).toHaveText('Booked: 9', { timeout: 45000 });
    await expect(cardB.getByTestId('booked-count')).toHaveText('Booked: 0', { timeout: 15000 });
    await page.waitForTimeout(3000);
    console.log(`[UI] A shows "${await cardA.getByTestId('booked-count').innerText()}", B shows "${await cardB.getByTestId('booked-count').innerText()}", RPC calls for the page: ${rpcCalls}`);
    expect(rpcCalls, 'one RPC call per page').toBe(1);
    await cardA.screenshot({ path: 'test-results/booked-count-A.png' });
  });
});
