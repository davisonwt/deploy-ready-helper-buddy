// F-3 / F-9: the server owns the prescription upload key.
// The browser never picks the storage path and can no longer write directly to
// the `prescriptions` bucket. It asks here for a short-lived signed upload URL;
// we validate the caller, the target pharmacy, the declared file type and size,
// choose the key ourselves ({patient_uid}/{sower_id}/{uuid}.{ext}) and record a
// pending upload token. Unconsumed/expired tokens are swept (orphan cleanup).
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MAX_BYTES = 15 * 1024 * 1024; // 15MB
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'application/pdf': 'pdf',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const sowerId = typeof body?.sower_id === 'string' ? body.sower_id : '';
    const mimeType = typeof body?.mime_type === 'string' ? body.mime_type.toLowerCase() : '';
    const fileName = typeof body?.file_name === 'string' ? body.file_name.slice(0, 255) : null;
    const size = Number(body?.size ?? 0);

    if (!/^[0-9a-f-]{36}$/i.test(sowerId)) return json({ error: 'sower_id is required' }, 400);
    if (!ALLOWED[mimeType]) {
      return json({ error: 'Unsupported file type. Allowed: JPEG, PNG, WebP, HEIC, PDF.' }, 400);
    }
    if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) {
      return json({ error: 'File must be between 1 byte and 15MB.' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: sower, error: sowerErr } = await admin
      .from('sowers')
      .select('id, user_id, seller_template')
      .eq('id', sowerId)
      .maybeSingle();
    if (sowerErr) throw sowerErr;
    if (!sower || sower.seller_template !== 'regulated_business') {
      return json({ error: 'This seller does not accept prescriptions' }, 400);
    }
    if (sower.user_id === user.id) {
      return json({ error: 'Cannot submit a prescription to your own sower' }, 400);
    }

    // F-9: sweep this caller's expired, unconsumed uploads before issuing a new one.
    const { data: stale } = await admin
      .from('prescription_upload_tokens')
      .select('id, object_path')
      .eq('user_id', user.id)
      .eq('consumed', false)
      .lt('expires_at', new Date().toISOString())
      .limit(50);
    if (stale?.length) {
      await admin.storage.from('prescriptions').remove(stale.map((s) => s.object_path));
      await admin
        .from('prescription_upload_tokens')
        .delete()
        .in('id', stale.map((s) => s.id));
    }

    const objectPath = `${user.id}/${sower.id}/${crypto.randomUUID()}.${ALLOWED[mimeType]}`;

    const { data: signed, error: signErr } = await admin.storage
      .from('prescriptions')
      .createSignedUploadUrl(objectPath);
    if (signErr) throw signErr;

    const { error: tokErr } = await admin.from('prescription_upload_tokens').insert({
      user_id: user.id,
      sower_id: sower.id,
      object_path: objectPath,
      file_name: fileName,
      mime_type: mimeType,
      declared_size: size,
    });
    if (tokErr) throw tokErr;

    return json({
      path: objectPath,
      token: signed.token,
      signed_url: signed.signedUrl,
    });
  } catch (e) {
    console.error('prescription-upload-url error:', e instanceof Error ? e.message : String(e));
    return json({ error: 'Could not prepare upload' }, 500);
  }
});
