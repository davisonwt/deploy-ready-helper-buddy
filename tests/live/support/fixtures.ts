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

/**
 * Create a wheel listing this run owns, so a spec that needs to edit,
 * pause or delete a listing never has to do it to a real member's.
 *
 * This exists because two specs used to act on the founder's own
 * production rows: my-listings toggled "Silver Hyundai Venue" offline
 * (and did, twice -- 2026-09-17 and 2026-09-22), and stall-hotspot-editor
 * deleted a hotspot from his stall. Both relied on putting it back
 * afterwards, and both failed open.
 *
 * Inserted directly rather than driven through /sow/wheel: the point is a
 * dependable fixture, not coverage of the sow form, which its own specs
 * already cover.
 */
export async function createWheelListing(
  client: SupabaseClient,
  userId: string,
  title: string,
  opts?: { town?: string; lat?: number; lng?: number; ratePerKm?: number },
): Promise<string> {
  const { data: sower } = await client.from('sowers').select('id').eq('user_id', userId).maybeSingle();
  const { data: company } = await client
    .from('companies').select('id').eq('owner_user_id', userId).limit(1).maybeSingle();
  if (!sower || !company) {
    throw new Error(`[fixtures] ${userId} needs a sower and a company row to own a listing`);
  }

  const { data: product, error: pErr } = await client
    .from('products')
    .insert({
      sower_id: sower.id,
      company_id: company.id,
      title,
      description: 'QA fixture. Created and deleted by the live suite.',
      type: 'service',
      category: 'sedan',
      price: opts?.ratePerKm ?? 9.99,
      status: 'active',
      kind: 'wheel',
      delivery_type: 'digital',
    })
    .select('id')
    .single();
  if (pErr || !product) throw new Error(`[fixtures] could not create ${title}: ${pErr?.message}`);

  const { error: dErr } = await client.from('wheel_seed_details').insert({
    product_id: product.id,
    vehicle_type: 'sedan',
    use_tags: ['parcels'],
    driver_included: true,
    rate_per_km: opts?.ratePerKm ?? 9.99,
    currency: 'ZAR',
    base_location: opts?.town ?? 'Bethlehem, Free State',
    base_lat: opts?.lat ?? -28.2308,
    base_lng: opts?.lng ?? 28.3089,
    availability: true,
    operator_confirmed_licensed: true,
    operator_confirmed_at: new Date().toISOString(),
  });
  if (dErr) throw new Error(`[fixtures] could not detail ${title}: ${dErr.message}`);

  console.log(`[SETUP] wheel fixture ${title} -> ${product.id}`);
  return product.id as string;
}

export interface Hotspot { [k: string]: unknown; label?: string; kind?: string }

/** Read a stall's hotspots array, for a beforeAll snapshot. */
export async function readHotspots(client: SupabaseClient, stallId: string): Promise<Hotspot[]> {
  const { data, error } = await client.from('stalls').select('hotspots').eq('id', stallId).single();
  if (error) throw new Error(`[fixtures] could not read hotspots: ${error.message}`);
  return (data?.hotspots ?? []) as Hotspot[];
}

/**
 * Append one hotspot this run owns, so a spec that tests deletion has
 * something of its own to delete.
 *
 * stall-hotspot-editor used to delete the OWNER's mugs shelf and publish,
 * with no restore anywhere in the file -- its header claimed "the caller
 * restores the row afterwards" and there was no caller. On 2026-09-22 it
 * took his hotspots from 11 to 10, and the box it removed was one he had
 * renamed, moved and resized himself.
 */
export async function addHotspot(
  client: SupabaseClient, stallId: string, entry: Hotspot,
): Promise<Hotspot[]> {
  const current = await readHotspots(client, stallId);
  const next = [...current, entry];
  const { error } = await client.from('stalls').update({ hotspots: next }).eq('id', stallId);
  if (error) throw new Error(`[fixtures] could not add hotspot: ${error.message}`);
  console.log(`[SETUP] hotspot "${entry.label}" added (${current.length} -> ${next.length})`);
  return next;
}

/**
 * Put the array back exactly as snapshotted, and PROVE it took.
 *
 * Restores unconditionally rather than "if it looks wrong": the previous
 * safety net in my-listings checked for a condition first, found none,
 * and silently did nothing while the damage stood.
 */
export async function restoreHotspots(
  client: SupabaseClient, stallId: string, snapshot: Hotspot[],
): Promise<void> {
  const { error } = await client.from('stalls').update({ hotspots: snapshot }).eq('id', stallId);
  if (error) throw new Error(`[fixtures] restoring hotspots errored: ${error.message}`);
  const after = await readHotspots(client, stallId);
  if (after.length !== snapshot.length) {
    throw new Error(
      `[fixtures] hotspot restore FAILED: expected ${snapshot.length} entries, found ${after.length}`,
    );
  }
  console.log(`[TEARDOWN] hotspots restored to ${snapshot.length} entries`);
}
