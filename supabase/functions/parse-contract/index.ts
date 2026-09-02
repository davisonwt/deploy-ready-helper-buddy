import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

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
    const employeeId = String(body?.employee_id ?? '');
    const filePath = String(body?.file_path ?? '');
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuid.test(businessId) || !uuid.test(employeeId)) return json({ error: 'Invalid ids' }, 400);
    if (!filePath.startsWith(`${businessId}/`) || filePath.includes('..')) {
      return json({ error: 'Invalid file_path' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: company } = await admin
      .from('companies')
      .select('id')
      .eq('id', businessId)
      .eq('owner_user_id', userId)
      .maybeSingle();
    if (!company) return json({ error: 'Forbidden' }, 403);

    const { data: employee } = await admin
      .from('employees')
      .select('id')
      .eq('id', employeeId)
      .eq('business_id', businessId)
      .maybeSingle();
    if (!employee) return json({ error: 'Employee not found' }, 404);

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return json({ error: 'Contract parsing is not configured' }, 503);

    const { data: file, error: dlErr } = await admin.storage.from('books-docs').download(filePath);
    if (dlErr || !file) return json({ error: 'Contract not found' }, 404);

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength > 12 * 1024 * 1024) return json({ error: 'Contract file too large' }, 413);

    const magic = [...bytes.subarray(0, 4)].map((b) => b.toString(16).padStart(2, '0')).join('');
    let block: Record<string, unknown>;
    if (magic.startsWith('25504446')) {
      block = { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: toBase64(bytes) } };
    } else if (magic.startsWith('ffd8ff')) {
      block = { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: toBase64(bytes) } };
    } else if (magic.startsWith('89504e47')) {
      block = { type: 'image', source: { type: 'base64', media_type: 'image/png', data: toBase64(bytes) } };
    } else if (magic.startsWith('52494646')) {
      block = { type: 'image', source: { type: 'base64', media_type: 'image/webp', data: toBase64(bytes) } };
    } else {
      return json({ error: 'Upload a PDF or a JPEG/PNG/WebP photo of the contract' }, 400);
    }

    // Record the upload up-front so the UI can show a pending state.
    const { data: contractRow, error: insErr } = await admin
      .from('employee_contracts')
      .insert({
        business_id: businessId,
        employee_id: employeeId,
        file_path: filePath,
        parse_status: 'pending',
        parsed_terms: {},
      })
      .select('id')
      .single();
    if (insErr) {
      console.error('contract insert failed', insErr);
      return json({ error: 'Could not record contract' }, 500);
    }

    const prompt = `Extract the employment terms from this South African employment contract.
Return ONLY JSON:
{"job_title":string|null,"start_date":"YYYY-MM-DD"|null,"basic_salary":number|null,
 "allowances":[{"label":string,"amount":number,"sars_code":string|null}]}
basic_salary is the monthly basic salary in ZAR as a plain number (convert annual to monthly by dividing by 12).
Use SARS source codes where obvious: 3601 basic salary, 3701 travel allowance, 3713 other taxable allowance.
Use null or an empty array where the contract is silent.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        messages: [{ role: 'user', content: [block, { type: 'text', text: prompt }] }],
      }),
    });

    const contractId = (contractRow as { id: string }).id;

    if (!res.ok) {
      const detail = await res.text();
      console.error('anthropic error', res.status, detail);
      await admin.from('employee_contracts').update({ parse_status: 'failed' }).eq('id', contractId);
      return json({ error: 'Contract parsing failed' }, 502);
    }

    const payload = await res.json();
    const text: string = payload?.content?.[0]?.text ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      await admin.from('employee_contracts').update({ parse_status: 'failed' }).eq('id', contractId);
      return json({ error: 'Could not read that contract' }, 422);
    }

    const parsed = JSON.parse(match[0]);
    const basic = Number(parsed.basic_salary);
    const terms = {
      job_title: parsed.job_title ?? null,
      start_date: typeof parsed.start_date === 'string' ? parsed.start_date.slice(0, 10) : null,
      basic_salary: Number.isFinite(basic) ? basic : null,
      allowances: Array.isArray(parsed.allowances)
        ? parsed.allowances
            .map((a: any) => ({
              label: String(a?.label ?? 'Allowance'),
              amount: Number(a?.amount) || 0,
              sars_code: a?.sars_code ? String(a.sars_code) : '3713',
            }))
            .filter((a: any) => a.amount > 0)
        : [],
    };

    await admin
      .from('employee_contracts')
      .update({ parsed_terms: terms, parse_status: 'parsed' })
      .eq('id', contractId);

    return json({ contract_id: contractId, parsed_terms: terms });
  } catch (e) {
    console.error('parse-contract error', e);
    return json({ error: 'Unexpected error' }, 500);
  }
});
