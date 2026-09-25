import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction,
} from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferCheckedInstruction } from '@solana/spl-token';
import bs58 from 'bs58';
import { createStallFixture, setStallHotspots } from '../live/support/fixtures';

/**
 * "Bestow & Get This Seed" is a real purchase -- proven with devnet money.
 *
 * Runs the built app (this working tree, served locally by the payments
 * suite) against production's backend, whose Solana checkout is on devnet.
 * davisontest2 buys, on davisontest1's throwaway stall:
 *   1. a QA seed through its card's "Bestow & Get This Seed" button;
 *   2. a QA album track through the album row's own "Bestow $X".
 * Each is paid with a real devnet USDC transfer from the suite's devnet
 * test wallet (TEST_DEVNET_WALLET_* in .env.test), carrying the intent's
 * reference key -- the same transfer a Phantom wallet makes. Then, per
 * purchase: a completed product_bestowals row for exactly that product,
 * sower_amount = the price, S2G's 15% on top, bestowal_count +1, the full
 * file unlocked for the buyer (get-seed-file / album-tracks full), and no
 * gift row.
 *
 * Money safety: the spec refuses to pay unless the intent's cluster is
 * 'devnet' AND its destination is the S2G hot wallet. It never touches
 * mainnet. The devnet USDC stays in the devnet hot wallet (test money).
 *
 * Teardown (afterAll) deletes everything this run created, by id: the
 * orders, purchase rows, escrow events, basket links, Books rows keyed to
 * them, the receipt/thank-you chat messages, the payment intents, the
 * buyer's XP gain, and the fixtures (stall, products, files).
 * revenue_ledger is append-only (a trigger refuses DELETE), so its rows are
 * reversed with a 'correction' row each; the residue check allows only
 * those pairs and asserts they net to exactly 0. Every other public table
 * must hold no row referencing this run's ids.
 * Needs SUPABASE_ACCESS_TOKEN in .env.test (local only).
 */

const REF = 'zuwkgasbkpjlxzsjzumu';
const SUPA = `https://${REF}.supabase.co`;
const PUBKEY = 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa';
const HOT_WALLET = '6zbpF3HQbxFVMfUPMRzZZ52nwA7PSvqeq2Cqibq2BcxZ';
const DEVNET_USDC = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';
const WALLET_SECRET = process.env.TEST_DEVNET_WALLET_SECRET || '';
const A_E = process.env.TEST_A_EMAIL || '', A_P = process.env.TEST_A_PASSWORD || '';
const B_E = process.env.TEST_B_EMAIL || '', B_P = process.env.TEST_B_PASSWORD || '';
const STAMP = Date.now();
const SEED_TITLE = `QA buy ${STAMP} seed`;
const ALBUM_TITLE = `QA buy ${STAMP} album`;
const TRACK_TITLE = `01) QA buy ${STAMP} track`;
// Inserted at 1; music has a price floor, so the stored price is what counts.
const INSERT_PRICE = 1;
const SHOTS = 'test-results/devnet-purchase';

async function sql<T = any>(query: string): Promise<T[]> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const body = await res.json();
  if (!res.ok || !Array.isArray(body)) throw new Error(`sql failed: ${JSON.stringify(body).slice(0, 300)}`);
  return body as T[];
}

async function serviceClient(): Promise<SupabaseClient> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const keys = (await res.json()) as { name: string; type: string; api_key: string }[];
  const secret = keys.find((k) => k.type === 'secret')?.api_key || keys.find((k) => k.name === 'service_role')?.api_key;
  if (!secret) throw new Error('could not resolve the service key for teardown');
  return createClient(SUPA, secret, { auth: { persistSession: false } });
}

async function signIn(email: string, password: string) {
  const c = createClient(SUPA, PUBKEY, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`sign-in failed for ${email}: ${error?.message}`);
  return { client: c, userId: data.user.id, token: data.session!.access_token };
}

function wav(seconds: number): Buffer {
  const rate = 8000, byteRate = rate * 2, dataSize = byteRate * seconds;
  const b = Buffer.alloc(44 + dataSize);
  b.write('RIFF', 0); b.writeUInt32LE(36 + dataSize, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(byteRate, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(dataSize, 40);
  return b;
}

/** Pays the newest pending basket intent of the buyer's, on devnet only. Returns the tx signature. */
async function payPendingIntent(buyerId: string, since: string): Promise<{ signature: string; amount: number; intentId: string; basketId: string }> {
  let intent: any = null;
  for (let i = 0; i < 30 && !intent; i++) {
    const rows = await sql(`select i.id, i.order_id, i.amount_usdc, i.reference_pubkey, i.hot_wallet_address, i.cluster, i.status
        from solana_payment_intents i join basket_orders b on b.id = i.order_id
       where i.order_kind = 'basket' and b.user_id = '${buyerId}' and i.created_at > '${since}' and i.status = 'pending'
       order by i.created_at desc limit 1`);
    intent = rows[0] ?? null;
    if (!intent) await new Promise((r) => setTimeout(r, 1000));
  }
  if (!intent) throw new Error('no pending Solana intent appeared for the buyer');
  if (intent.cluster !== 'devnet') throw new Error(`REFUSING TO PAY: intent ${intent.id} is on ${intent.cluster}, not devnet`);
  if (intent.hot_wallet_address !== HOT_WALLET) throw new Error(`REFUSING TO PAY: unexpected destination ${intent.hot_wallet_address}`);

  const conn = new Connection('https://api.devnet.solana.com', 'confirmed');
  const payer = Keypair.fromSecretKey((bs58 as any).decode ? (bs58 as any).decode(WALLET_SECRET) : (bs58 as any).default.decode(WALLET_SECRET));
  const mint = new PublicKey(DEVNET_USDC);
  const fromAta = await getAssociatedTokenAddress(mint, payer.publicKey);
  const toAta = await getAssociatedTokenAddress(mint, new PublicKey(HOT_WALLET));
  const amount = Number(intent.amount_usdc);
  const ix = createTransferCheckedInstruction(fromAta, mint, toAta, payer.publicKey, BigInt(Math.round(amount * 1_000_000)), 6);
  ix.keys.push({ pubkey: new PublicKey(intent.reference_pubkey), isSigner: false, isWritable: false });
  const signature = await sendAndConfirmTransaction(conn, new Transaction().add(ix), [payer], { commitment: 'confirmed' });
  console.log(`[DEVNET] paid ${amount} USDC for basket ${intent.order_id}: tx ${signature}`);
  return { signature, amount, intentId: intent.id, basketId: intent.order_id };
}

async function chooseSolanaAndConfirm(page: Page) {
  const dialog = page.getByRole('dialog').filter({ hasText: 'Payment method' }).last();
  await expect(dialog).toBeVisible({ timeout: 20000 });
  await dialog.getByRole('radio').filter({ hasText: /Solana/i }).first().click();
  await dialog.getByRole('button', { name: /^Bestow/ }).last().click();
  await expect(page.getByText('Pay with USDC (Solana)').first()).toBeVisible({ timeout: 45000 });
}

let seller: Awaited<ReturnType<typeof signIn>>;
let buyer: Awaited<ReturnType<typeof signIn>>;
let stallId = '';
let seedId = '';
let albumId = '';
let singleId = '';
const storedPrice: Record<string, number> = {};
const storagePaths: string[] = [];
const stallObjects: string[] = [];
const since = new Date().toISOString();
let pointsBefore: any[] = [];
let visitBefore: any[] = [];
const results: Array<{ what: string; signature: string; amount: number; basketId: string }> = [];

test.describe.serial('devnet purchase routing', () => {
  test.setTimeout(6 * 60_000);

  test.beforeAll(async () => {
    if (!TOKEN) throw new Error('SUPABASE_ACCESS_TOKEN is missing from .env.test (needed for intent lookup and teardown).');
    if (!WALLET_SECRET) throw new Error('TEST_DEVNET_WALLET_SECRET is missing from .env.test; see the devnet test wallet setup.');
    seller = await signIn(A_E, A_P);
    buyer = await signIn(B_E, B_P);
    pointsBefore = await sql(`select * from user_points where user_id='${buyer.userId}'`);
    visitBefore = await sql(`select last_seen_at::text from stall_visits where viewer_id='${buyer.userId}' and stall_user_id='${seller.userId}'`);

    const conn = new Connection('https://api.devnet.solana.com', 'confirmed');
    const wallet = Keypair.fromSecretKey((bs58 as any).decode ? (bs58 as any).decode(WALLET_SECRET) : (bs58 as any).default.decode(WALLET_SECRET));
    const bal = await conn.getParsedTokenAccountsByOwner(wallet.publicKey, { mint: new PublicKey(DEVNET_USDC) });
    const usdc = Number(bal.value[0]?.account.data.parsed.info.tokenAmount.uiAmount ?? 0);
    console.log(`[WALLET] ${wallet.publicKey.toBase58()} devnet USDC ${usdc}`);
    if (usdc < 3) throw new Error(`devnet test wallet has ${usdc} USDC; two purchases need about 2.4. Top it up from faucet.circle.com (Solana Devnet).`);

    const { data: existing } = await seller.client.from('stalls').select('name').eq('user_id', seller.userId).maybeSingle();
    if (existing) throw new Error(`davisontest1's one stall is held by "${existing.name}"; run this spec alone.`);
    const { data: sower } = await seller.client.from('sowers').select('id').eq('user_id', seller.userId).single();
    const { data: company } = await seller.client.from('companies').select('id').eq('owner_user_id', seller.userId).limit(1).maybeSingle();

    const up = async (path: string, bytes: Buffer, type: string) => {
      const { error } = await seller.client.storage.from('premium-room').upload(path, bytes, { contentType: type, upsert: false });
      if (error) throw new Error(`upload ${path}: ${error.message}`);
      storagePaths.push(path);
      return `${SUPA}/storage/v1/object/public/premium-room/${path}`;
    };
    const seedUrl = await up(`products/${seller.userId}/qa-buy-${STAMP}-seed.wav`, wav(30), 'audio/wav');
    const trackPath = `products/${seller.userId}/qa-buy-${STAMP}/01__track.wav`;
    const trackUrl = await up(trackPath, wav(30), 'audio/wav');
    const manifestUrl = await up(`products/${seller.userId}/qa-buy-${STAMP}/manifest.json`,
      Buffer.from(JSON.stringify({ type: 'album', tracks: [{ name: `${TRACK_TITLE}.wav`, size: 44 + 16000 * 30, path: trackPath, url: trackUrl, price: INSERT_PRICE }] })),
      'application/json');

    const product = async (title: string, fileUrl: string, price: number, tags: string[] | null) => {
      const { data, error } = await seller.client.from('products').insert({
        sower_id: sower!.id, company_id: company?.id ?? null, title, description: 'QA purchase fixture',
        type: 'music', category: 'music', status: 'active', price, delivery_type: 'digital', file_url: fileUrl, tags,
      }).select('id, price').single();
      if (error || !data) throw new Error(`product ${title}: ${error?.message}`);
      storedPrice[data.id] = Number(data.price);
      return data.id as string;
    };
    seedId = await product(SEED_TITLE, seedUrl, INSERT_PRICE, null);
    albumId = await product(ALBUM_TITLE, manifestUrl, 3, ['album']);
    singleId = await product(TRACK_TITLE, trackUrl, INSERT_PRICE, null);

    const created = await createStallFixture(seller.client, seller.userId, `QA buy ${STAMP} stall`);
    stallId = created.stallId;
    stallObjects.push(...created.objectPaths);
    await setStallHotspots(seller.client, stallId, [{ id: 'qa-music', kind: 'music', label: 'QA MUSIC', x: 20, y: 20, w: 60, h: 60 }]);
    console.log(`[SETUP] seed ${seedId}, album ${albumId}, single ${singleId}, stall ${stallId}; stored prices ${JSON.stringify(storedPrice)}`);
  });

  test.afterAll(async () => {
    const problems: string[] = [];
    const basketIds = (await sql(`select id from basket_orders where user_id='${buyer.userId}' and created_at > '${since}'`)).map((r: any) => r.id);
    const bestowalIds = basketIds.length
      ? (await sql(`select bestowal_id from basket_order_bestowals where basket_order_id in (${basketIds.map((i: string) => `'${i}'`).join(',')})`)).map((r: any) => r.bestowal_id)
      : [];
    const ids = [...basketIds, ...bestowalIds];
    const list = (xs: string[]) => (xs.length ? xs.map((x) => `'${x}'`).join(',') : `'00000000-0000-0000-0000-000000000000'`);
    console.log(`[TEARDOWN] baskets ${JSON.stringify(basketIds)} bestowals ${JSON.stringify(bestowalIds)}`);
    try {
      await sql(`begin;
        delete from chat_messages where system_metadata->>'source_id' in (${list(ids)});
        do $$ declare t record; begin
          for t in select c.table_name from information_schema.columns c
                     join information_schema.tables tb on tb.table_name = c.table_name and tb.table_schema = c.table_schema
                    where c.table_schema = 'public' and c.column_name = 'source_id' and tb.table_type = 'BASE TABLE'
                      and c.table_name not in ('media_moderation', 'revenue_ledger') loop
            execute format('delete from public.%I where source_id::text in (${list(ids).replace(/'/g, "''")})', t.table_name);
          end loop;
        end $$;
        delete from escrow_events where bestowal_id in (${list(bestowalIds)});
        delete from whisperer_earnings where bestowal_id in (${list(bestowalIds)});
        delete from basket_order_bestowals where basket_order_id in (${list(basketIds)});
        delete from product_bestowals where id in (${list(bestowalIds)});
        delete from solana_payment_intents where order_id in (${list(basketIds)});
        delete from basket_orders where id in (${list(basketIds)});
        insert into revenue_ledger (kind, direction, amount, currency, rail, environment, source_table, source_id, notes)
          select 'correction', case when r.amount > 0 then 'cost' else 'income' end, -r.amount, r.currency, r.rail,
                 r.environment, r.source_table, r.source_id,
                 'Reverses ' || r.kind || ' ' || r.id || ': devnet QA purchase test (devnet-purchase-routing), fixture removed'
            from revenue_ledger r
           where r.source_id::text in (${list(ids)}) and r.kind <> 'correction'
             and not exists (select 1 from revenue_ledger c where c.kind = 'correction' and c.notes like '%' || r.id || '%');
        commit;`);
    } catch (e) { problems.push(`ledger: ${String(e)}`); }

    try {
      if (pointsBefore.length) {
        const p = pointsBefore[0];
        const sets = Object.keys(p).filter((k) => k !== 'user_id' && k !== 'id').map((k) => `${k} = ${p[k] === null ? 'null' : `'${String(p[k]).replace(/'/g, "''")}'`}`).join(', ');
        await sql(`update user_points set ${sets} where user_id='${buyer.userId}'`);
      } else {
        await sql(`delete from user_points where user_id='${buyer.userId}'`);
      }
    } catch (e) { problems.push(`xp: ${String(e)}`); }
    try {
      // Visiting the fixture stall moves the buyer's visit row for the seller; put it back.
      if (visitBefore.length) await sql(`update stall_visits set last_seen_at='${visitBefore[0].last_seen_at}' where viewer_id='${buyer.userId}' and stall_user_id='${seller.userId}'`);
      else await sql(`delete from stall_visits where viewer_id='${buyer.userId}' and stall_user_id='${seller.userId}'`);
    } catch (e) { problems.push(`visit: ${String(e)}`); }

    try {
      const service = await serviceClient();
      if (storagePaths.length) { const { error } = await service.storage.from('premium-room').remove(storagePaths); if (error) problems.push(`files: ${error.message}`); }
      const { data: pv } = await service.storage.from('seed-previews').list(seller.userId, { search: `album-${albumId}` });
      if (pv?.length) await service.storage.from('seed-previews').remove(pv.map((o: any) => `${seller.userId}/${o.name}`));
      if (stallObjects.length) await service.storage.from('stalls').remove(stallObjects);
      await sql(`delete from media_moderation where object_path like '%qa-buy-${STAMP}%' or object_path like '%album-${albumId || 'none'}-%'`);
    } catch (e) { problems.push(`storage: ${String(e)}`); }

    if (seedId || albumId || singleId) {
      const { error } = await seller.client.from('products').delete().in('id', [seedId, albumId, singleId].filter(Boolean));
      if (error) problems.push(`products: ${error.message}`);
    }
    if (stallId) { const { error } = await seller.client.from('stalls').delete().eq('id', stallId); if (error) problems.push(`stall: ${error.message}`); }

    // Residue: every public table, every uuid column, for any id this run created.
    const all = [...ids, seedId, albumId, singleId, stallId].filter(Boolean);
    const [scan] = await sql(`
      select coalesce(sum(n), 0)::int left_rows, coalesce(string_agg(tbl || ':' || n, ', '), '') where_left from (
        select c.table_name tbl, (xpath('/row/n/text()', query_to_xml(format('select count(*) n from public.%I where %I::text in (${list(all).replace(/'/g, "''")})', c.table_name, c.column_name), false, true, '')))[1]::text::int n
          from information_schema.columns c join information_schema.tables t on t.table_name = c.table_name and t.table_schema = c.table_schema
         where c.table_schema = 'public' and t.table_type = 'BASE TABLE' and c.data_type = 'uuid'
           and c.table_name <> 'revenue_ledger'
      ) x where n > 0`);
    const [ledger] = await sql(`select count(*)::int n, coalesce(sum(amount), 0)::numeric net,
        count(*) filter (where kind = 'correction')::int corrections
        from revenue_ledger where source_id::text in (${list(all)})`);
    const [xp] = await sql(`select coalesce((select total_points from user_points where user_id='${buyer.userId}'), -1) pts`);
    const xpBefore = pointsBefore.length ? Number(pointsBefore[0].total_points) : -1;
    const [objs] = await sql(`select count(*)::int n from storage.objects where name like '%qa-buy-${STAMP}%' or name like '%album-${albumId || 'none'}-%'`);
    console.log(`[RESIDUE] rows referencing this run's ids: ${scan.left_rows} ${scan.where_left}; storage objects: ${objs.n}; `
      + `revenue_ledger ${ledger.n} rows (${ledger.corrections} corrections) net ${ledger.net}; buyer XP ${xp.pts} (before ${xpBefore})`);
    if (problems.length) console.log(`[TEARDOWN PROBLEMS] ${problems.join(' | ')}`);
    expect(problems).toEqual([]);
    expect(scan.left_rows, `left: ${scan.where_left}`).toBe(0);
    expect(objs.n).toBe(0);
    expect(Number(ledger.net), 'revenue_ledger rows for this run net to zero').toBe(0);
    expect(ledger.corrections * 2, 'every ledger row has its correction').toBe(ledger.n);
    expect(Number(xp.pts), "the buyer's XP is back where it was").toBe(xpBefore);
  });

  async function login(page: Page) {
    await page.goto('/login');
    await page.fill('input[type="email"]', B_E);
    await page.fill('input[type="password"]', B_P);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 });
  }

  async function openShelf(page: Page) {
    await page.goto('/stall/davisontest1', { waitUntil: 'domcontentloaded' });
    const hs = page.locator('button[aria-label="QA MUSIC"]').filter({ visible: true }).first();
    await expect(hs).toBeVisible({ timeout: 45000 });
    await hs.click();
  }

  async function verifyPurchase(productId: string, what: string, paid: { signature: string; amount: number; basketId: string }) {
    const [pb] = await sql(`select pb.id, pb.status, pb.amount, pb.s2g_fee, pb.sower_amount, pb.payment_method,
        (select bestowal_count from products where id='${productId}') bestowal_count
        from product_bestowals pb join basket_order_bestowals bob on bob.bestowal_id = pb.id
       where bob.basket_order_id='${paid.basketId}' and pb.product_id='${productId}' and pb.bestower_id='${buyer.userId}'`);
    console.log(`[${what}] product_bestowals: ${JSON.stringify(pb)}`);
    expect(pb?.status, 'a completed purchase row exists').toBe('completed');
    const price = storedPrice[productId];
    expect(Number(pb.sower_amount), 'the sower is owed exactly their price').toBeCloseTo(price, 2);
    expect(Number(pb.s2g_fee), "S2G's 15% on top").toBeCloseTo(price * 0.15, 2);
    expect(Number(pb.amount), 'the buyer paid price + 15%').toBeCloseTo(price * 1.15, 2);
    expect(Number(pb.bestowal_count), 'sold count moved by exactly one').toBe(1);
    const [gifts] = await sql(`select count(*)::int n from bestowals where bestower_id='${buyer.userId}' and created_at > '${since}'`);
    expect(gifts.n, 'no gift row was written').toBe(0);
    results.push({ what, ...paid });
  }

  test('1. the card button buys the seed: purchase row, full file, one sale, no gift', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page);
    await openShelf(page);
    await expect(page.getByText(SEED_TITLE).filter({ visible: true }).first()).toBeVisible({ timeout: 45000 });
    await page.waitForTimeout(2000);
    const names = await page.getByRole('button').filter({ hasText: /Bestow/ }).evaluateAll((els) => els.map((e) => `${(e as HTMLElement).innerText.trim()} [visible=${(e as HTMLElement).offsetParent !== null}]`));
    console.log(`[DEBUG] Bestow buttons on the shelf: ${JSON.stringify(names)}`);
    await page.screenshot({ path: `${SHOTS}/shelf.png` });
    // The seed and the single cost the same: take the card whose title is the seed's.
    const card = page.locator('div').filter({ has: page.getByText(SEED_TITLE, { exact: true }) })
      .filter({ has: page.getByRole('button', { name: /Bestow & Get This Seed/ }) }).last();
    await card.getByRole('button', { name: /Bestow & Get This Seed/ }).first().click();
    const t0 = new Date().toISOString();
    await chooseSolanaAndConfirm(page);
    await page.screenshot({ path: `${SHOTS}/seed-checkout.png` });
    const paid = await payPendingIntent(buyer.userId, since);
    await expect(page.getByText(/is yours/).first()).toBeVisible({ timeout: 120000 });
    await verifyPurchase(seedId, 'seed', paid);

    const r = await fetch(`${SUPA}/functions/v1/get-seed-file`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', apikey: PUBKEY, Authorization: `Bearer ${buyer.token}` },
      body: JSON.stringify({ productId: seedId, purpose: 'play' }),
    });
    console.log(`[seed] get-seed-file for the buyer: HTTP ${r.status}`);
    expect(r.status, 'the full file is unlocked for the buyer').toBe(200);
    void t0;
  });

  test('2. the album row buys that track: purchase row, full track, one sale, no gift', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page);
    await openShelf(page);
    await page.getByRole('button', { name: 'Show tracks' }).filter({ visible: true }).first().click();
    const row = page.locator('[data-track-row="1"]').filter({ visible: true }).first();
    await expect(row).toBeVisible({ timeout: 30000 });
    await row.getByRole('button', { name: `Bestow $${storedPrice[singleId].toFixed(2)}`, exact: true }).click();
    await chooseSolanaAndConfirm(page);
    await page.screenshot({ path: `${SHOTS}/track-checkout.png` });
    const paid = await payPendingIntent(buyer.userId, since);
    await expect(page.getByText(/is yours/).first()).toBeVisible({ timeout: 120000 });
    await verifyPurchase(singleId, 'album row', paid);

    const r = await fetch(`${SUPA}/functions/v1/album-tracks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', apikey: PUBKEY, Authorization: `Bearer ${buyer.token}` },
      body: JSON.stringify({ albumId, action: 'play', index: 0 }),
    });
    const j = await r.json();
    console.log(`[album row] album-tracks play for the buyer: full=${j.full}`);
    expect(j.full, 'the bought track now plays in full for the buyer').toBe(true);
    console.log(`[DEVNET TXS] ${JSON.stringify(results.map((x) => ({ what: x.what, tx: x.signature, usdc: x.amount })))}`);
  });
});
