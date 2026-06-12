// Bulk product parser — accepts a file (CSV / XLSX / TXT / PDF / DOCX),
// returns normalized rows + per-row validation, and persists to bulk_upload_jobs.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import Papa from 'npm:papaparse@5.4.1';
import * as XLSX from 'npm:xlsx@0.18.5';
import { extractText, getDocumentProxy } from 'npm:unpdf@0.12.1';
import JSZip from 'npm:jszip@3.10.1';

// ---------- column synonym map ----------
const SYN: Record<string, string> = {
  name: 'name', product: 'name', title: 'name', product_name: 'name', item: 'name',
  description: 'description', desc: 'description', details: 'description', summary: 'description',
  price: 'price', amount: 'price', cost: 'price', unit_price: 'price',
  commission: 'commission_pct', commission_pct: 'commission_pct', 'commission_%': 'commission_pct', whisperer_pct: 'commission_pct', whisperer: 'commission_pct',
  commission_fixed: 'commission_fixed', commission_amount: 'commission_fixed',
  category: 'category', cat: 'category',
  sku: 'sku', code: 'sku', product_code: 'sku',
  stock: 'stock_qty', qty: 'stock_qty', quantity: 'stock_qty', stock_qty: 'stock_qty', inventory: 'stock_qty',
};

const norm = (s: string) => s.toLowerCase().trim().replace(/[\s\-]+/g, '_').replace(/[^a-z0-9_%]/g, '');
const mapKey = (k: string) => SYN[norm(k)] ?? null;

type Normalized = {
  name?: string; description?: string; price?: number;
  commission_pct?: number; commission_fixed?: number;
  category?: string; sku?: string; stock_qty?: number;
};

function normalizeRow(raw: Record<string, unknown>): { normalized: Normalized; issues: string[] } {
  const out: Normalized = {};
  for (const [k, v] of Object.entries(raw)) {
    const mapped = mapKey(k);
    if (!mapped || v === null || v === undefined || v === '') continue;
    if (mapped === 'price' || mapped === 'commission_pct' || mapped === 'commission_fixed' || mapped === 'stock_qty') {
      const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
      if (!Number.isNaN(n)) (out as any)[mapped] = n;
    } else {
      (out as any)[mapped] = String(v).trim();
    }
  }
  const issues: string[] = [];
  if (!out.name) issues.push('Missing product name');
  if (out.price === undefined) issues.push('Missing price');
  else if (out.price < 0) issues.push('Price cannot be negative');
  if (out.commission_pct !== undefined && (out.commission_pct < 0 || out.commission_pct > 100))
    issues.push('Commission % must be 0-100');
  if (out.stock_qty !== undefined && out.stock_qty < 0) issues.push('Stock cannot be negative');
  return { normalized: out, issues };
}

// ---------- per-format parsers ----------
async function parseCSV(buf: ArrayBuffer): Promise<Record<string, unknown>[]> {
  const text = new TextDecoder().decode(buf);
  const res = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: false });
  return (res.data as Record<string, unknown>[]) ?? [];
}

async function parseXLSX(buf: ArrayBuffer): Promise<Record<string, unknown>[]> {
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[];
}

async function parseTXT(buf: ArrayBuffer): Promise<Record<string, unknown>[]> {
  const text = new TextDecoder().decode(buf);
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  const delim = lines[0].includes('\t') ? '\t' : lines[0].includes(',') ? ',' : lines[0].includes('|') ? '|' : '\t';
  const headers = lines[0].split(delim).map(h => h.trim());
  return lines.slice(1).map(line => {
    const cells = line.split(delim);
    const row: Record<string, unknown> = {};
    headers.forEach((h, i) => { row[h] = (cells[i] ?? '').trim(); });
    return row;
  });
}

async function parsePDF(buf: ArrayBuffer): Promise<Record<string, unknown>[]> {
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  const lines = (text as string).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  // best-effort: try delimited; otherwise dump each line as raw name
  if (lines.length && /\t|,|\|/.test(lines[0])) {
    return parseTXT(new TextEncoder().encode(lines.join('\n')).buffer);
  }
  return lines.map(l => ({ name: l }));
}

async function parseDOCX(buf: ArrayBuffer): Promise<Record<string, unknown>[]> {
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file('word/document.xml')?.async('string');
  if (!xml) return [];
  // try tables first: <w:tbl> ... <w:tr> ... <w:tc>
  const tables = [...xml.matchAll(/<w:tbl[\s>][\s\S]*?<\/w:tbl>/g)];
  if (tables.length) {
    const rows: string[][] = [];
    for (const t of tables) {
      const trs = [...t[0].matchAll(/<w:tr[\s>][\s\S]*?<\/w:tr>/g)];
      for (const tr of trs) {
        const tcs = [...tr[0].matchAll(/<w:tc[\s>][\s\S]*?<\/w:tc>/g)];
        const cells = tcs.map(tc => {
          const texts = [...tc[0].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m => m[1]);
          return texts.join('').trim();
        });
        if (cells.length) rows.push(cells);
      }
    }
    if (rows.length > 1) {
      const headers = rows[0];
      return rows.slice(1).map(r => {
        const o: Record<string, unknown> = {};
        headers.forEach((h, i) => { o[h] = r[i] ?? ''; });
        return o;
      });
    }
  }
  // fallback: paragraph per row
  const paras = [...xml.matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)];
  return paras.map(p => {
    const texts = [...p[0].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m => m[1]).join('').trim();
    return { name: texts };
  }).filter(r => r.name);
}

function detectType(name: string, mime: string): string {
  const n = name.toLowerCase();
  if (n.endsWith('.csv') || mime.includes('csv')) return 'csv';
  if (n.endsWith('.xlsx') || n.endsWith('.xls') || mime.includes('sheet') || mime.includes('excel')) return 'xlsx';
  if (n.endsWith('.pdf') || mime.includes('pdf')) return 'pdf';
  if (n.endsWith('.docx') || mime.includes('word')) return 'docx';
  if (n.endsWith('.txt') || mime.startsWith('text/')) return 'txt';
  return 'txt';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const admin = createClient(supabaseUrl, serviceKey);

    const form = await req.formData();
    const file = form.get('file') as File | null;
    const sowerId = form.get('sower_id') as string | null;
    if (!file) return new Response(JSON.stringify({ error: 'file is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (file.size > 20 * 1024 * 1024) return new Response(JSON.stringify({ error: 'File exceeds 20MB' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const fileType = detectType(file.name, file.type);
    const buf = await file.arrayBuffer();

    // create job row
    const { data: job, error: jobErr } = await admin.from('bulk_upload_jobs').insert({
      sower_id: sowerId, user_id: user.id,
      file_name: file.name, file_type: fileType, file_size_bytes: file.size,
      status: 'parsing',
    }).select().single();
    if (jobErr) throw jobErr;

    let rawRows: Record<string, unknown>[] = [];
    let parseError: string | null = null;
    const lowerAccuracy = fileType === 'pdf' || fileType === 'docx';

    try {
      if (fileType === 'csv') rawRows = await parseCSV(buf);
      else if (fileType === 'xlsx') rawRows = await parseXLSX(buf);
      else if (fileType === 'txt') rawRows = await parseTXT(buf);
      else if (fileType === 'pdf') rawRows = await parsePDF(buf);
      else if (fileType === 'docx') rawRows = await parseDOCX(buf);
    } catch (e) {
      parseError = e instanceof Error ? e.message : String(e);
    }

    if (parseError) {
      await admin.from('bulk_upload_jobs').update({ status: 'failed', parse_error: parseError }).eq('id', job.id);
      return new Response(JSON.stringify({ error: `Parse failed: ${parseError}`, job_id: job.id }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rows = rawRows.map((raw, idx) => {
      const { normalized, issues } = normalizeRow(raw);
      if (lowerAccuracy) issues.unshift('Needs review (parsed from ' + fileType.toUpperCase() + ')');
      return { idx, raw, normalized, issues };
    });

    const summary = {
      total: rows.length,
      valid: rows.filter(r => r.issues.length === 0).length,
      with_issues: rows.filter(r => r.issues.length > 0).length,
      lower_accuracy: lowerAccuracy,
    };

    await admin.from('bulk_upload_jobs').update({
      status: 'parsed',
      total_rows: summary.total,
      valid_rows: summary.valid,
      error_rows: summary.with_issues,
      parsed_rows: rows,
    }).eq('id', job.id);

    return new Response(JSON.stringify({ job_id: job.id, rows, summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
