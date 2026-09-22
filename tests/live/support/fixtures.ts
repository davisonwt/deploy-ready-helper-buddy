import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const SUPA = 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
export const PUBKEY = 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa';

/**
 * Fixture teardown for the live suite.
 *
 * Why this exists: the sleeping-* specs create listings through the real
 * UI and had NO teardown of any kind -- no afterAll, no afterEach, no
 * cleanup test. Every run left its listings behind, and a run that failed
 * left more, because these specs are test.describe.serial: one failure
 * marks every later test "did not run", so any cleanup written as a final
 * test never executes. On 2026-09-22 two bailed runs left 7 products, a
 * role and 23 storage objects to be swept by hand.
 *
 * afterAll DOES run in serial mode even when tests failed or were never
 * reached, which is why teardown belongs in a hook and never in a test.
 *
 * Everything here runs as the owning member, using only the RLS
 * permissions a real owner has ("Sowers can delete their products", the
 * owner-delete policies on each *_seed_details table, and the
 * owner-scoped storage delete policies). It needs no admin credential.
 */

/** A detail table and the columns on it that hold storage URLs. */
const DETAIL_TABLES: Record<string, string[]> = {
  pillow_seed_details: ['front_image_url', 'interior_image_url', 'gallery_urls'],
  hand_seed_details: ['front_image_url', 'work_sample_image_url', 'gallery_urls'],
  wheel_seed_details: [],
};

export interface SweepResult {
  products: number;
  details: number;
  units: number;
  objects: number;
}

/**
 * Sign in as a member. Throws with the missing variable's name rather
 * than skipping -- a spec that cannot set itself up FAILS and says why
 * (CLAUDE.md: "a live spec never skips silently").
 */
export async function asUser(email: string, password: string, label: string) {
  if (!email || !password) {
    throw new Error(
      `[fixtures] ${label} credentials are missing. Set them in .env.test; ` +
      'this is a setup failure, not a reason to skip.',
    );
  }
  const client = createClient(SUPA, PUBKEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    throw new Error(`[fixtures] could not sign in as ${label}: ${error?.message ?? 'no user'}`);
  }
  return { client, userId: data.user.id };
}

/** Pull { bucket, path } out of a public or signed Supabase storage URL. */
function storageRef(url: unknown): { bucket: string; path: string } | null {
  if (typeof url !== 'string' || !url.includes('/storage/v1/object/')) return null;
  const m = /\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/.exec(url);
  if (!m) return null;
  return { bucket: decodeURIComponent(m[1]), path: decodeURIComponent(m[2]) };
}

function collectRefs(row: Record<string, unknown>, cols: string[], into: Map<string, Set<string>>) {
  for (const col of cols) {
    const v = row[col];
    for (const one of Array.isArray(v) ? v : [v]) {
      const ref = storageRef(one);
      if (!ref) continue;
      if (!into.has(ref.bucket)) into.set(ref.bucket, new Set());
      into.get(ref.bucket)!.add(ref.path);
    }
  }
}

/**
 * Delete the exact products this member owns with these titles, along
 * with their detail rows, their units and every storage object those
 * rows point at.
 *
 * Exact titles, never a prefix: spec FILES run in parallel workers, and
 * every one of these specs mints titles like "QA Truck <stamp>". A
 * prefix sweep of "QA %" from one file would delete another file's live
 * fixtures mid-run. Each spec passes the titles it actually created.
 *
 * Never throws: teardown must not turn a red test into a confusing
 * error, and must not stop halfway and leave the rest behind.
 */
export async function sweepProducts(
  client: SupabaseClient,
  userId: string,
  titles: string[],
): Promise<SweepResult> {
  const out: SweepResult = { products: 0, details: 0, units: 0, objects: 0 };
  try {
    const { data: sowers } = await client.from('sowers').select('id').eq('user_id', userId);
    const sowerIds = (sowers ?? []).map((s: { id: string }) => s.id);
    if (!sowerIds.length) return out;

    if (!titles.length) return out;
    const { data: products } = await client
      .from('products')
      .select('id, kind, cover_image_url, image_urls')
      .in('sower_id', sowerIds)
      .in('title', titles);

    const ids = (products ?? []).map((p: { id: string }) => p.id);
    if (!ids.length) return out;

    const objects = new Map<string, Set<string>>();
    for (const p of products ?? []) collectRefs(p, ['cover_image_url', 'image_urls'], objects);

    for (const [table, cols] of Object.entries(DETAIL_TABLES)) {
      const { data: rows } = await client.from(table).select('*').in('product_id', ids);
      if (!rows?.length) continue;
      for (const r of rows) collectRefs(r, cols, objects);
      const { error } = await client.from(table).delete().in('product_id', ids);
      if (!error) out.details += rows.length;
    }

    const { data: units } = await client.from('pillow_units').select('id').in('product_id', ids);
    if (units?.length) {
      const { error } = await client.from('pillow_units').delete().in('product_id', ids);
      if (!error) out.units += units.length;
    }

    const { error: pErr } = await client.from('products').delete().in('id', ids);
    if (!pErr) out.products += ids.length;

    for (const [bucket, paths] of objects) {
      const list = [...paths];
      const { data: removed } = await client.storage.from(bucket).remove(list);
      out.objects += removed?.length ?? 0;
    }
  } catch (err) {
    console.error('[fixtures] sweep failed:', err);
  }
  return out;
}

/** Delete storage objects directly, for uploads no product row points at. */
export async function sweepStorage(
  client: SupabaseClient,
  bucket: string,
  paths: string[],
): Promise<number> {
  if (!paths.length) return 0;
  try {
    const { data } = await client.storage.from(bucket).remove(paths);
    return data?.length ?? 0;
  } catch (err) {
    console.error('[fixtures] storage sweep failed:', err);
    return 0;
  }
}

export function reportSweep(label: string, r: SweepResult, extraObjects = 0) {
  const objects = r.objects + extraObjects;
  console.log(
    `[TEARDOWN] ${label}: ${r.products} products, ${r.details} detail rows, ` +
    `${r.units} units, ${objects} storage objects removed`,
  );
}

/**
 * Make sure this member holds `role`, creating it if absent.
 *
 * Returns whether THIS call created it. Teardown removes the role only
 * when it did: a spec must never delete a role the account already had,
 * which is how the QA rows swept on 2026-09-22 came to be depended on in
 * the first place.
 */
export async function ensureWanderingRole(
  client: SupabaseClient,
  userId: string,
  role: 'pillow' | 'wheel' | 'hand',
  opts: { town: string; lat: number; lng: number; displayName?: string },
): Promise<{ id: string; created: boolean }> {
  const { data: existing, error: readErr } = await client
    .from('wandering_roles')
    .select('id, status')
    .eq('user_id', userId)
    .eq('role', role)
    .maybeSingle();
  if (readErr) throw new Error(`[fixtures] could not read ${role} role: ${readErr.message}`);
  if (existing?.status === 'active') return { id: existing.id as string, created: false };

  const now = new Date().toISOString();
  const { data, error } = await client
    .from('wandering_roles')
    .insert({
      user_id: userId,
      role,
      display_name: opts.displayName ?? `QA ${role} fixture`,
      base_town: opts.town,
      lat: opts.lat,
      lng: opts.lng,
      status: 'active',
      declared_self_operated_at: now,
      accepted_terms_at: now,
    })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(`[fixtures] could not create the ${role} role: ${error?.message ?? 'no row'}`);
  }
  return { id: data.id as string, created: true };
}

/**
 * Remove a role this run created, and PROVE it is gone.
 *
 * Before 20260922120000 there was no DELETE policy on wandering_roles, so
 * this call returned no error and removed nothing. A teardown that
 * trusts the absence of an error would have reported success while the
 * row survived, which is why the row count is re-read rather than
 * assumed.
 */
export async function removeWanderingRole(client: SupabaseClient, roleId: string): Promise<void> {
  const { error } = await client.from('wandering_roles').delete().eq('id', roleId);
  if (error) throw new Error(`[fixtures] deleting role ${roleId} errored: ${error.message}`);
  const { data: still } = await client
    .from('wandering_roles')
    .select('id')
    .eq('id', roleId)
    .maybeSingle();
  if (still) {
    throw new Error(
      `[fixtures] role ${roleId} SURVIVED its delete -- the delete reported success and ` +
      'removed nothing. Check the "Owner can delete own wandering_roles" policy.',
    );
  }
  console.log(`[TEARDOWN] wandering role ${roleId} removed`);
}
