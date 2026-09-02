import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CATEGORIES = ['Software', 'Travel', 'Meals', 'Office', 'Marketing', 'Payroll', 'Other'];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"]!;
    const serviceKey = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"]!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const businessId = String(body?.business_id ?? '');
    const filePath = String(body?.file_path ?? '');
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuid.test(businessId)) return json({ error: 'Invalid business_id' }, 400);
    if (!filePath || !filePath.startsWith(`${businessId}/`) || filePath.includes('..')) {
      return json({ error: 'Invalid file_path' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Ownership: the caller must own this business.
    const { data: company } = await admin
      .from('companies')
      .select('id')
      .eq('id', businessId)
      .eq('owner_user_id', userId)
      .maybeSingle();
    if (!company) return json({ error: 'Forbidden' }, 403);

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return json({ error: 'Receipt scanning is not configured' }, 503);

    const { data: file, error: dlErr } = await admin.storage.from('books-docs').download(filePath);
    if (dlErr || !file) return json({ error: 'Receipt not found' }, 404);

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength > 8 * 1024 * 1024) return json({ error: 'Receipt image too large' }, 413);

    const magic = [...bytes.subarray(0, 4)].map((b) => b.toString(16).padStart(2, '0')).join('');
    let mediaType = '';
    if (magic.startsWith('ffd8ff')) mediaType = 'image/jpeg';
    else if (magic.startsWith('89504e47')) mediaType = 'image/png';
    else if (magic.startsWith('52494646')) mediaType = 'image/webp';
    else return json({ error: 'Only JPEG, PNG or WebP receipt photos are supported' }, 400);

    const prompt = `Read this South African receipt and return ONLY JSON:
{"merchant":string,"amount":number,"date":"YYYY-MM-DD","description":string,"category":one of ${JSON.stringify(CATEGORIES)}}
Amount is the total paid in ZAR as a plain number. If a field is unreadable use null.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: toBase64(bytes) } },
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('anthropic error', res.status, detail);
      return json({ error: 'Receipt scan failed' }, 502);
    }

    const payload = await res.json();
    const text: string = payload?.content?.[0]?.text ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return json({ error: 'Could not read that receipt' }, 422);

    const parsed = JSON.parse(match[0]);
    const amount = Number(parsed.amount);
    const category = CATEGORIES.includes(parsed.category) ? parsed.category : 'Other';

    return json({
      receipt: {
        merchant: parsed.merchant ?? null,
        amount: Number.isFinite(amount) ? amount : null,
        date: typeof parsed.date === 'string' ? parsed.date.slice(0, 10) : null,
        description: parsed.description ?? parsed.merchant ?? 'Scanned receipt',
        category,
      },
    });
  } catch (e) {
    console.error('scan-receipt error', e);
    return json({ error: 'Unexpected error' }, 500);
  }
});
