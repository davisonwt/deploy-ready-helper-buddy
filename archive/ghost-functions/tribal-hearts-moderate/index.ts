// tribal-hearts-moderate — checks a chat message inside a hearts room for unsafe content (PII sharing, harassment).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PHONE_RE = /(\+?\d[\d\s\-().]{7,}\d)/;
const EMAIL_RE = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/;
const URL_RE = /\bhttps?:\/\/\S+/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { message_id, room_id, user_id, content } = await req.json();
    if (!content) return new Response(JSON.stringify({ flagged: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const flags: any[] = [];
    if (PHONE_RE.test(content)) flags.push({ category: 'phone_share', severity: 'high' });
    if (EMAIL_RE.test(content)) flags.push({ category: 'email_share', severity: 'high' });
    if (URL_RE.test(content)) flags.push({ category: 'external_link', severity: 'medium' });

    for (const f of flags) {
      await admin.from('tribal_hearts_safety_flags').insert({
        message_id, room_id, flagged_user_id: user_id,
        category: f.category, severity: f.severity,
        details: { snippet: content.slice(0, 200) },
      });
    }

    return new Response(JSON.stringify({ flagged: flags.length > 0, flags }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('hearts-moderate', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
