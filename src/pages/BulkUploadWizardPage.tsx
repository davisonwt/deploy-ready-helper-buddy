import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { insertProduct } from '@/api/products';
import { getDefaultCompanyId } from '@/lib/products/getDefaultCompanyId';
import { useExchangeRates, convertBetween } from '@/lib/currency/rates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, FileText, AlertCircle, CheckCircle2, ArrowLeft, Sprout, ImagePlus, X, Star, GripVertical, ChevronRight, Images, FolderArchive, Download, Film } from 'lucide-react';
import SignedImg from '@/components/media/SignedImg';
import { isZipFile, openZipBundle, ZIP_LIMITS, type ZipBundle } from '@/lib/bulk/zipBundle';
import { attachBundleMedia, type BundleIssue } from '@/lib/bulk/attachBundleMedia';
import { buildTemplateZip, downloadTemplateZip } from '@/lib/bulk/templateZip';

// Pre-existing bug found live 2026-09-15 while verifying dropship support:
// this page was the only caller in the codebase using
// VITE_SUPABASE_PROJECT_ID, which nothing in the build ever defines --
// every other edge-function caller (src/lib/payments/invokeFunction.ts,
// src/integrations/supabase/client.ts) uses VITE_SUPABASE_URL with this
// same hardcoded fallback. Broke the entire bulk-upload wizard in
// production (every parse request went to https://undefined.supabase.co),
// unrelated to dropship -- fixed here since it blocked verifying step 5.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://zuwkgasbkpjlxzsjzumu.supabase.co';

type ProductImage = { url: string; path: string };

type ParsedRow = {
  idx: number;
  raw: Record<string, unknown>;
  normalized: {
    name?: string;
    description?: string;
    price?: number;
    /** Raw, not-yet-converted source-currency price (e.g. price_zar) --
     * cleared once converted to USD in `price` above. Kept only so the
     * conversion step can tell "already USD" apart from "needs converting". */
    price_zar?: number;
    variant?: string;
    commission_pct?: number;
    commission_fixed?: number;
    category?: string;
    sku?: string;
    stock_qty?: number;
    /** CSV-supplied filename to match against uploaded images by name in
     * the Images step -- never sent to insertProduct itself. */
    image_filename?: string;
    /** Optional factory-sower column -- true marks the row "ships direct
     * from supplier"; defaults to false when absent for normal sowers. */
    dropship?: boolean;
  };
  issues: string[];
  images?: ProductImage[];
  /** From a ZIP's audio_file / book_file column, already uploaded and moderated. */
  fileUrl?: string;
  /** From the video_url column. A link, never an uploaded file -- see templateZip.ts. */
  videoUrl?: string;
};

type Summary = { total: number; valid: number; with_issues: number; lower_accuracy: boolean };

const ACCEPT = '.zip,.csv,.xlsx,.xls,.txt,.pdf,.docx';
const MAX_IMAGES = 5;
const IMG_BUCKET = 'orchard-images';

const mb = (bytes: number) => `${Math.round(bytes / 1024 / 1024)}MB`;

/**
 * What the ZIP must look like, stated on the page itself.
 *
 * Deliberately short and concrete: the folder tree, the columns, the limits,
 * and the two rules people get wrong (video is a link; a missing file does not
 * fail the run). The template below it is the same thing, already built.
 */
function BundleInstructions() {
  const { toast } = useToast();
  const [building, setBuilding] = useState(false);

  const download = async () => {
    setBuilding(true);
    try {
      downloadTemplateZip(await buildTemplateZip());
    } catch (e) {
      toast({ title: 'Could not build the template', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setBuilding(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FolderArchive className="h-4 w-4" /> What to put in the ZIP
        </CardTitle>
        <CardDescription>
          One zip: your spreadsheet, plus folders holding your photos and audio. Each row becomes its own seed card.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <pre className="rounded-md bg-muted p-3 text-xs leading-relaxed overflow-x-auto">{`my-seeds.zip
├── products.csv     ← one row per seed
├── images/
│   ├── clay-mug.jpg
│   └── wool-scarf.jpg
└── audio/
    └── morning-song.mp3`}</pre>

        <div className="space-y-1.5">
          <p className="font-medium">The columns</p>
          <p className="text-muted-foreground">
            <code>name</code>, <code>description</code>, <code>price</code>, <code>category</code>,{' '}
            <code>sku</code>, <code>stock_qty</code> — then{' '}
            <code>image_file</code>, <code>audio_file</code> and <code>book_file</code> to name your files.
            Upper or lower case doesn't matter, and a folder in front is fine:{' '}
            <code>images/Hat.JPG</code> and <code>hat.jpg</code> find the same file.
          </p>
        </div>

        <div className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
          <Film className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Video goes in as a link, not a file.</span> Put the
            YouTube or Vimeo address in a <code>video_url</code> column. A hundred marketing videos is tens of
            gigabytes and would never finish uploading from a phone.
          </p>
        </div>

        <div className="flex gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">A missing file never costs you the upload.</span> That
            row is imported anyway, and the report at the end names the row and the file it was looking for.
          </p>
        </div>

        <p className="text-muted-foreground">
          Limits: zip up to {mb(ZIP_LIMITS.MAX_ARCHIVE_BYTES)}, {ZIP_LIMITS.MAX_ENTRIES} files inside,
          each image up to {mb(ZIP_LIMITS.MAX_IMAGE_BYTES)}, each audio or book file up to {mb(ZIP_LIMITS.MAX_AUDIO_BYTES)}.
          No spreadsheet? A plain CSV or XLSX on its own still works exactly as before.
        </p>

        <Button variant="outline" onClick={download} disabled={building} className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          {building ? 'Building…' : 'Download the template ZIP'}
        </Button>
        <p className="text-xs text-muted-foreground">
          Columns already set up, one example row filled in, and a README inside explaining the layout.
        </p>
      </CardContent>
    </Card>
  );
}

/** The end-of-run report: which row, which file, what was wrong. */
function BundleReportCard({ report }: {
  report: {
    issues: BundleIssue[];
    warnings: string[];
    unusedFiles: string[];
    counts: { images: number; audio: number; books: number; videoUrls: number };
  };
}) {
  const { issues, warnings, unusedFiles, counts } = report;
  const clean = issues.length === 0 && warnings.length === 0 && unusedFiles.length === 0;

  return (
    <Card className={clean ? 'border-emerald-500/40' : 'border-amber-500/40'}>
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center gap-2">
          {clean
            ? <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Everything in your ZIP was attached</>
            : <><AlertCircle className="h-4 w-4 text-amber-600" /> Your ZIP: {issues.length} thing{issues.length === 1 ? '' : 's'} to look at</>}
        </CardTitle>
        <CardDescription>
          Attached {counts.images} image{counts.images === 1 ? '' : 's'},{' '}
          {counts.audio} audio file{counts.audio === 1 ? '' : 's'},{' '}
          {counts.books} book file{counts.books === 1 ? '' : 's'} and{' '}
          {counts.videoUrls} video link{counts.videoUrls === 1 ? '' : 's'}.
          {issues.length > 0 && ' Every row below was still imported.'}
        </CardDescription>
      </CardHeader>
      {!clean && (
        <CardContent className="space-y-3 text-sm">
          {issues.length > 0 && (
            <div className="space-y-1.5">
              {issues.map((it, i) => (
                <div key={i} className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2">
                  <span className="font-medium">Row {it.row}</span>
                  <span className="text-muted-foreground"> · {it.name}</span>
                  {it.file && <span className="text-muted-foreground"> · <code>{it.file}</code></span>}
                  <div className="text-muted-foreground">{it.problem}</div>
                </div>
              ))}
            </div>
          )}
          {unusedFiles.length > 0 && (
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">{unusedFiles.length} file{unusedFiles.length === 1 ? '' : 's'} in the ZIP no row asked for:</span>{' '}
              {unusedFiles.slice(0, 8).join(', ')}{unusedFiles.length > 8 ? `, and ${unusedFiles.length - 8} more` : ''}.
              Check the spelling in your <code>image_file</code> column.
            </p>
          )}
          {warnings.map((w, i) => <p key={i} className="text-muted-foreground">{w}</p>)}
        </CardContent>
      )}
    </Card>
  );
}

export default function BulkUploadWizardPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [sowerId, setSowerId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [publishedCount, setPublishedCount] = useState(0);
  const { rates, loading: ratesLoading } = useExchangeRates();
  /** Everything the ZIP run has to tell the member afterwards. */
  const [bundleReport, setBundleReport] = useState<{
    issues: BundleIssue[];
    warnings: string[];
    unusedFiles: string[];
    counts: { images: number; audio: number; books: number; videoUrls: number };
  } | null>(null);
  const [attachStatus, setAttachStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('sowers').select('id').eq('user_id', user.id).maybeSingle();
      if (data) setSowerId(data.id);
    })();
  }, []);

  const handleFile = useCallback(async (f: File) => {
    // A ZIP is unpacked in the browser first; the spreadsheet inside is what
    // goes to the parser, so a plain spreadsheet with no ZIP keeps working
    // exactly as it did.
    let bundle: ZipBundle | null = null;
    let toParse = f;
    if (isZipFile(f)) {
      setFile(f);
      setParsing(true);
      setProgress(8);
      setBundleReport(null);
      setAttachStatus('Opening the ZIP…');
      try {
        bundle = await openZipBundle(f);
        toParse = bundle.spreadsheet!;
        setAttachStatus(`Found ${bundle.spreadsheet!.name} and ${bundle.media.size} media file${bundle.media.size === 1 ? '' : 's'}.`);
      } catch (e) {
        toast({ title: 'Could not open that ZIP', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
        setFile(null);
        setParsing(false);
        setAttachStatus(null);
        setProgress(0);
        return;
      }
    } else if (f.size > 50 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum 50MB.', variant: 'destructive' });
      return;
    }
    setFile(f);
    setParsing(true);
    setProgress(15);

    const tick = setInterval(() => setProgress((p) => (p < 85 ? p + 5 : p)), 250);
    try {
      const fd = new FormData();
      fd.append('file', toParse);
      if (sowerId) fd.append('sower_id', sowerId);

      const { data: { session } } = await supabase.auth.getSession();
      const url = `${SUPABASE_URL}/functions/v1/bulk-parse-products`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: fd,
      });
      const json = await res.json();
      clearInterval(tick);
      setProgress(100);
      if (!res.ok) throw new Error(json.error || 'Parse failed');
      let parsedRows: ParsedRow[] = json.rows ?? [];

      // price_zar (or any recognized non-USD price column) -- convert to
      // USD here, once, via the same live exchange_rates table every other
      // money display in this app uses (src/lib/currency/rates.ts), never
      // stored as the raw source-currency number. Surfaced in a toast
      // (not silent) with the exact rate used, and left fully editable in
      // the review table below like any other field.
      let zarConverted = 0;
      let zarRate: number | null = null;
      parsedRows = parsedRows.map((r) => {
        const n = r.normalized;
        if (n.price === undefined && n.price_zar !== undefined) {
          const usd = convertBetween(n.price_zar, 'ZAR', 'USD', rates);
          if (usd !== null) {
            zarConverted++;
            zarRate = rates.ZAR ?? zarRate;
            const nextIssues = r.issues.filter((i) => i !== 'Missing price');
            return { ...r, normalized: { ...n, price: Math.round(usd * 100) / 100 }, issues: nextIssues };
          }
          const nextIssues = r.issues.includes('Exchange rate unavailable for ZAR')
            ? r.issues
            : [...r.issues, 'Exchange rate unavailable for ZAR'];
          return { ...r, issues: nextIssues };
        }
        return r;
      });

      // Attach whatever the ZIP carried, BEFORE the review step, so the member
      // reviews rows that already show their photo. A row whose file is
      // missing is imported anyway and named in the report -- never a failure
      // of the whole run.
      if (bundle && json.job_id && sowerId) {
        const jid = json.job_id as string;
        setAttachStatus('Uploading and checking your files…');
        const result = await attachBundleMedia(
          parsedRows.map((r) => ({
            idx: r.idx,
            displayRow: r.idx + 1,
            name: r.normalized.name ?? `Row ${r.idx + 1}`,
            raw: r.raw as Record<string, unknown>,
          })),
          bundle.media,
          { sowerId, jobId: jid },
          (doneCount, total) => setAttachStatus(`Uploading and checking your files… ${doneCount} of ${total} rows`),
        );
        parsedRows = parsedRows.map((r) => {
          const got = result.attached.get(r.idx);
          if (!got) return r;
          return {
            ...r,
            images: got.imageUrl && got.imagePath ? [{ url: got.imageUrl, path: got.imagePath }] : r.images,
            fileUrl: got.fileUrl ?? r.fileUrl,
            videoUrl: got.videoUrl ?? r.videoUrl,
          };
        });
        setBundleReport({
          issues: result.issues,
          warnings: bundle.warnings,
          unusedFiles: result.unusedFiles,
          counts: result.counts,
        });
        setAttachStatus(null);
      } else if (bundle) {
        setBundleReport({
          issues: [],
          warnings: [
            ...bundle.warnings,
            'Your files could not be attached because this account has no sower profile yet. The rows were still imported.',
          ],
          unusedFiles: [],
          counts: { images: 0, audio: 0, books: 0, videoUrls: 0 },
        });
        setAttachStatus(null);
      }

      setRows(parsedRows);
      setSummary(json.summary ?? null);
      setJobId(json.job_id ?? null);
      setStep(2);
      toast({ title: 'Seeds parsed', description: `${json.summary?.total ?? 0} rows ready for review.` });
      if (zarConverted > 0) {
        toast({
          title: `Converted ${zarConverted} price${zarConverted === 1 ? '' : 's'} from ZAR`,
          description: zarRate ? `Rate used: 1 USD = R${zarRate.toFixed(2)}. Review the converted prices below before publishing.` : undefined,
        });
      }
    } catch (e) {
      clearInterval(tick);
      toast({ title: 'Could not parse file', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
      setFile(null);
    } finally {
      setParsing(false);
      setAttachStatus(null);
      setTimeout(() => setProgress(0), 800);
    }
  }, [sowerId, toast, rates]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const updateRow = (idx: number, field: keyof ParsedRow['normalized'], value: string) => {
    setRows((prev) => prev.map((r) => {
      if (r.idx !== idx) return r;
      const v: any = ['price', 'commission_pct', 'commission_fixed', 'stock_qty'].includes(field)
        ? (value === '' ? undefined : Number(value))
        : value;
      const normalized = { ...r.normalized, [field]: v };
      const issues: string[] = [];
      if (!normalized.name) issues.push('Missing product name');
      if (normalized.price === undefined) issues.push('Missing price');
      else if (normalized.price < 0) issues.push('Price cannot be negative');
      if (normalized.commission_pct !== undefined && (normalized.commission_pct < 0 || normalized.commission_pct > 100))
        issues.push('Commission % must be 0-100');
      return { ...r, normalized, issues };
    }));
  };

  // ---------- Step 1: Drop zone ----------
  if (step === 1) {
    return (
      <div className="container max-w-3xl py-10 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
          </Button>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Bulk Plant Your Seeds</h1>
          <p className="text-muted-foreground">
            Sow 10–1000 seeds at once. Send a ZIP with your photos in it, or just a spreadsheet on its own.
          </p>
        </div>

        {/* The shape a member needs, in plain words, BEFORE they pick a file.
            Behind a link is the same as not there: someone who lays the ZIP
            out wrong gets a report full of failures and gives up. */}
        <BundleInstructions />

        <Card
          className={`border-2 border-dashed transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-muted'}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <CardContent className="py-16 flex flex-col items-center justify-center text-center space-y-4">
            {parsing ? (
              <>
                <Sprout className="h-12 w-12 text-primary animate-pulse" />
                <div className="space-y-2 w-full max-w-md">
                  <p className="font-medium">Planting your seeds…</p>
                  <Progress value={progress} />
                  <p className="text-xs text-muted-foreground">{attachStatus ?? file?.name}</p>
                </div>
              </>
            ) : (
              <>
                <Upload className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="font-medium">Drop your file here</p>
                  <p className="text-sm text-muted-foreground">or click to choose</p>
                </div>
                <Input
                  type="file"
                  accept={ACCEPT}
                  className="max-w-xs"
                  disabled={ratesLoading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  {['CSV', 'XLSX', 'TXT', 'PDF', 'DOCX'].map((t) => (
                    <Badge key={t} variant="secondary">{t}</Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground pt-2">
                  {ratesLoading ? 'Loading exchange rates…' : 'Max 50MB · PDF/DOCX flagged for review'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expected columns (any order, flexible names)</CardTitle>
            <CardDescription>
              name (or product_name) · variant (folded into name) · description · price (or price_zar,
              auto-converted to USD) · commission · category · sku · stock · image_filename (matched to
              uploaded images by name in the next step)
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // ---------- Step 3: Images ----------
  if (step === 3) {
    return (
      <ImagesStep
        rows={rows}
        sowerId={sowerId}
        jobId={jobId}
        onBack={() => setStep(2)}
        onContinue={() => setStep(4)}
        onUpdate={(idx, images) => setRows((prev) => prev.map((r) => r.idx === idx ? { ...r, images } : r))}
      />
    );
  }

  // ---------- Step 4: Review & publish ----------
  if (step === 4) {
    return (
      <PublishStep
        rows={rows}
        sowerId={sowerId}
        jobId={jobId}
        onBack={() => setStep(3)}
        onPublished={(count) => { setPublishedCount(count); setStep(5); }}
      />
    );
  }

  // ---------- Step 5: Success ----------
  if (step === 5) {
    return <SuccessStep count={publishedCount} sowerId={sowerId} onDone={() => navigate('/dashboard')} />;
  }

  // ---------- Step 2: Review table ----------
  return (
    <div className="container max-w-7xl py-8 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => { setStep(1); setRows([]); setSummary(null); setFile(null); }}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Start over
        </Button>
        <div className="text-xs text-muted-foreground">Job: {jobId?.slice(0, 8)}</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-bold">{summary?.total ?? 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Ready</div><div className="text-2xl font-bold text-primary">{rows.filter(r => r.issues.length === 0).length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Needs review</div><div className="text-2xl font-bold text-amber-600">{rows.filter(r => r.issues.length > 0).length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Source</div><div className="text-sm font-medium flex items-center gap-1 mt-2"><FileSpreadsheet className="h-4 w-4" /> {file?.name}</div></CardContent></Card>
      </div>

      {summary?.lower_accuracy && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-3 flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            Parsed from {file?.name.split('.').pop()?.toUpperCase()} — please review every row before publishing.
          </CardContent>
        </Card>
      )}

      {bundleReport && <BundleReportCard report={bundleReport} />}

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Review &amp; edit your seeds</CardTitle>
          <CardDescription>Click any cell to edit. Fix issues before continuing.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide">
              <tr>
                <th className="p-2 text-left w-10">#</th>
                <th className="p-2 text-left w-10"></th>
                <th className="p-2 text-left min-w-[180px]">Name</th>
                <th className="p-2 text-left min-w-[220px]">Description</th>
                <th className="p-2 text-left w-24">Price</th>
                <th className="p-2 text-left w-20">Comm %</th>
                <th className="p-2 text-left w-28">Category</th>
                <th className="p-2 text-left w-24">SKU</th>
                <th className="p-2 text-left w-20">Stock</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.idx} className={`border-t ${r.issues.length ? 'bg-amber-500/5' : ''}`}>
                  <td className="p-2 text-muted-foreground">{r.idx + 1}</td>
                  <td className="p-2">
                    {r.issues.length === 0
                      ? <CheckCircle2 className="h-4 w-4 text-primary" />
                      : <span title={r.issues.join('; ')}><AlertCircle className="h-4 w-4 text-amber-600" /></span>}
                  </td>
                  {(['name', 'description', 'price', 'commission_pct', 'category', 'sku', 'stock_qty'] as const).map((field) => (
                    <td key={field} className="p-1">
                      <Input
                        value={r.normalized[field] ?? '' as any}
                        onChange={(e) => updateRow(r.idx, field, e.target.value)}
                        className="h-8 text-sm border-transparent hover:border-input focus:border-input"
                      />
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No rows parsed.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center sticky bottom-4 bg-background/80 backdrop-blur p-3 rounded-lg border">
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {rows.filter(r => r.issues.length === 0).length} of {rows.length} ready to plant
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled>Save as draft</Button>
          <Button onClick={() => setStep(3)} disabled={rows.length === 0}>
            Continue → Images <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );

  // ----- end render guard (TS exhaustiveness) -----
}

// =============================================================
// Step 3 — Images per row
// =============================================================
function ImagesStep({
  rows, sowerId, jobId, onBack, onContinue, onUpdate,
}: {
  rows: ParsedRow[];
  sowerId: string | null;
  jobId: string | null;
  onBack: () => void;
  onContinue: () => void;
  onUpdate: (idx: number, images: ProductImage[]) => void;
}) {
  const { toast } = useToast();
  const [activeIdx, setActiveIdx] = useState<number>(rows[0]?.idx ?? 0);
  const [uploading, setUploading] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  const active = rows.find((r) => r.idx === activeIdx) ?? rows[0];
  const images = active?.images ?? [];

  const uploadFiles = async (files: FileList | File[]) => {
    if (!sowerId || !jobId || !active) {
      toast({ title: 'Missing sower or job', variant: 'destructive' });
      return;
    }
    const remaining = MAX_IMAGES - images.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (!toUpload.length) return;
    setUploading(true);
    const next: ProductImage[] = [...images];
    try {
      for (const f of toUpload) {
        if (!f.type.startsWith('image/')) continue;
        if (f.size > 5 * 1024 * 1024) {
          toast({ title: `${f.name} skipped`, description: 'Max 5MB per image.', variant: 'destructive' });
          continue;
        }
        const ext = f.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `products/${sowerId}/${jobId}_${active.idx}/${Date.now()}_${next.length}.${ext}`;
        const { error } = await supabase.storage.from(IMG_BUCKET).upload(path, f, { upsert: false, contentType: f.type });
        if (error) throw error;
        const { data: pub } = supabase.storage.from(IMG_BUCKET).getPublicUrl(path);
        next.push({ url: pub.publicUrl, path });
      }
      onUpdate(active.idx, next);
    } catch (e) {
      toast({ title: 'Upload failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (i: number) => {
    if (!active) return;
    const img = images[i];
    const next = images.filter((_, j) => j !== i);
    onUpdate(active.idx, next);
    if (img?.path) await supabase.storage.from(IMG_BUCKET).remove([img.path]);
  };

  const moveImage = (from: number, to: number) => {
    if (!active || from === to) return;
    const next = [...images];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onUpdate(active.idx, next);
  };

  const totalWithImages = rows.filter((r) => (r.images?.length ?? 0) > 0).length;

  // ---- Batch matching: select every image at once (a folder, or every
  // file extracted from a zip), matched to rows by the CSV's
  // image_filename column comparing against each selected file's own
  // name -- the per-row drag-and-drop above still works as a fallback/
  // correction for anything left unmatched. ----
  const [matching, setMatching] = useState(false);
  const [matchReport, setMatchReport] = useState<{ matched: number; unmatchedFiles: string[]; rowsWithoutMatch: number } | null>(null);

  const normalizeFilename = (name: string) => name.trim().toLowerCase().replace(/\.[a-z0-9]+$/i, '');

  const matchAndUploadFiles = async (files: FileList | File[]) => {
    if (!sowerId || !jobId) {
      toast({ title: 'Missing sower or job', variant: 'destructive' });
      return;
    }
    const fileList = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!fileList.length) return;
    setMatching(true);

    // Build filename -> file lookup once; only rows that don't already
    // have an image get auto-matched, so a manual assignment already made
    // is never silently overwritten.
    const byNormalizedName = new Map<string, File>();
    for (const f of fileList) byNormalizedName.set(normalizeFilename(f.name), f);

    const usedFilenames = new Set<string>();
    let matched = 0;
    let rowsWithoutMatch = 0;

    try {
      for (const r of rows) {
        if ((r.images?.length ?? 0) > 0) continue; // don't overwrite an existing manual assignment
        const wanted = r.normalized.image_filename;
        if (!wanted) { rowsWithoutMatch++; continue; }
        const file = byNormalizedName.get(normalizeFilename(wanted));
        if (!file) { rowsWithoutMatch++; continue; }

        if (file.size > 5 * 1024 * 1024) {
          toast({ title: `${file.name} skipped`, description: 'Max 5MB per image.', variant: 'destructive' });
          continue;
        }
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `products/${sowerId}/${jobId}_${r.idx}/${Date.now()}_0.${ext}`;
        const { error } = await supabase.storage.from(IMG_BUCKET).upload(path, file, { upsert: false, contentType: file.type });
        if (error) { toast({ title: `Upload failed for ${file.name}`, description: error.message, variant: 'destructive' }); continue; }
        const { data: pub } = supabase.storage.from(IMG_BUCKET).getPublicUrl(path);
        onUpdate(r.idx, [{ url: pub.publicUrl, path }]);
        usedFilenames.add(normalizeFilename(wanted));
        matched++;
      }
      const unmatchedFiles = fileList
        .filter((f) => !usedFilenames.has(normalizeFilename(f.name)))
        .map((f) => f.name);
      setMatchReport({ matched, unmatchedFiles, rowsWithoutMatch });
      toast({
        title: `Matched ${matched} image${matched === 1 ? '' : 's'}`,
        description: unmatchedFiles.length || rowsWithoutMatch
          ? `${unmatchedFiles.length} uploaded file(s) didn't match any row; ${rowsWithoutMatch} row(s) still need an image. Assign the rest manually below.`
          : 'Every product with an image_filename got matched.',
      });
    } finally {
      setMatching(false);
    }
  };

  return (
    <div className="container max-w-7xl py-8 space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to review
        </Button>
        <div className="text-sm text-muted-foreground">
          {totalWithImages} / {rows.length} products with images
        </div>
      </div>

      <Card className="border-dashed">
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2"><Images className="h-4 w-4" /> Match all images at once</CardTitle>
          <CardDescription>
            Select every image file (or the whole extracted folder) at once — each one is matched to a
            product by comparing its filename against the CSV's <code>image_filename</code> column. Rows
            that already have an image, or that don't match anything, are left for the manual assignment
            below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input
            type="file"
            accept="image/*"
            multiple
            // @ts-expect-error -- non-standard but widely supported attribute for "pick a whole folder"
            webkitdirectory=""
            disabled={matching}
            onChange={(e) => { if (e.target.files?.length) matchAndUploadFiles(e.target.files); e.target.value = ''; }}
          />
          <p className="text-xs text-muted-foreground">Or select the individual image files directly (folder-picker not supported in every browser).</p>
          {matching && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sprout className="h-4 w-4 animate-pulse text-primary" /> Matching &amp; uploading…
            </div>
          )}
          {matchReport && !matching && (
            <p className="text-xs text-muted-foreground">
              Last run: matched {matchReport.matched}
              {(matchReport.unmatchedFiles.length > 0 || matchReport.rowsWithoutMatch > 0) &&
                ` · ${matchReport.unmatchedFiles.length} file(s) unmatched · ${matchReport.rowsWithoutMatch} row(s) still need an image`}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
        {/* Row list */}
        <Card className="max-h-[70vh] overflow-y-auto">
          <CardHeader className="py-3 sticky top-0 bg-card z-10 border-b">
            <CardTitle className="text-sm">Products ({rows.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {rows.map((r) => {
              const count = r.images?.length ?? 0;
              const isActive = r.idx === activeIdx;
              return (
                <button
                  key={r.idx}
                  onClick={() => setActiveIdx(r.idx)}
                  className={`w-full text-left px-3 py-2 border-b flex items-center gap-2 hover:bg-muted/50 transition ${isActive ? 'bg-primary/10' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium">{r.normalized.name || `Row ${r.idx + 1}`}</div>
                    <div className="text-xs text-muted-foreground">
                      {count > 0 ? `${count}/${MAX_IMAGES} images` : 'No images'}
                    </div>
                  </div>
                  {count > 0 && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Active product images */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">{active?.normalized.name || `Row ${(active?.idx ?? 0) + 1}`}</CardTitle>
            <CardDescription>Up to {MAX_IMAGES} images. First image is the primary. Drag to reorder.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {Array.from({ length: MAX_IMAGES }).map((_, i) => {
                const img = images[i];
                if (img) {
                  return (
                    <div
                      key={i}
                      draggable
                      onDragStart={() => setDragFrom(i)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => { if (dragFrom !== null) moveImage(dragFrom, i); setDragFrom(null); }}
                      className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
                    >
                      <SignedImg src={img.url} alt="" className="w-full h-full object-cover" />
                      {i === 0 && (
                        <Badge className="absolute top-1 left-1 gap-1"><Star className="h-3 w-3" /> Primary</Badge>
                      )}
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 bg-background/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                        aria-label="Remove"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="absolute bottom-1 right-1 bg-background/80 rounded p-0.5 opacity-0 group-hover:opacity-100">
                        <GripVertical className="h-3 w-3" />
                      </div>
                    </div>
                  );
                }
                return (
                  <label
                    key={i}
                    className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary hover:bg-primary/5 transition"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); uploadFiles(e.dataTransfer.files); }}
                  >
                    <ImagePlus className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Slot {i + 1}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); e.target.value = ''; }}
                    />
                  </label>
                );
              })}
            </div>

            {uploading && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Sprout className="h-4 w-4 animate-pulse text-primary" /> Uploading…
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Max 5MB per image. JPG / PNG / WEBP.</p>
              <Button
                variant="outline"
                size="sm"
                disabled={!active || rows.findIndex(r => r.idx === activeIdx) >= rows.length - 1}
                onClick={() => {
                  const i = rows.findIndex(r => r.idx === activeIdx);
                  if (i >= 0 && i < rows.length - 1) setActiveIdx(rows[i + 1].idx);
                }}
              >
                Next product <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center sticky bottom-4 bg-background/80 backdrop-blur p-3 rounded-lg border">
        <div className="text-sm text-muted-foreground">{totalWithImages} / {rows.length} have images</div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button onClick={onContinue}>
            Continue → Review &amp; publish <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================================
// Step 4 — Review & publish
// =============================================================
function PublishStep({
  rows, sowerId, jobId, onBack, onPublished,
}: {
  rows: ParsedRow[];
  sowerId: string | null;
  jobId: string | null;
  onBack: () => void;
  onPublished: (count: number) => void;
}) {
  const { toast } = useToast();
  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scheduleAt, setScheduleAt] = useState<string>('');

  const validRows = rows.filter((r) => r.issues.length === 0);
  const totalImages = rows.reduce((s, r) => s + (r.images?.length ?? 0), 0);
  const avgPrice = validRows.length
    ? validRows.reduce((s, r) => s + (r.normalized.price ?? 0), 0) / validRows.length : 0;
  const avgCommission = (() => {
    const arr = validRows.filter(r => r.normalized.commission_pct !== undefined);
    if (!arr.length) return null;
    return arr.reduce((s, r) => s + (r.normalized.commission_pct ?? 0), 0) / arr.length;
  })();

  const publish = async (asDraft: boolean) => {
    if (!sowerId || !jobId) {
      toast({ title: 'Missing sower or job', variant: 'destructive' });
      return;
    }
    if (validRows.length === 0) {
      toast({ title: 'Nothing to publish', description: 'Fix issues in step 2 first.', variant: 'destructive' });
      return;
    }
    setPublishing(true);
    setProgress(5);

    let published = 0;
    try {
      const companyId = await getDefaultCompanyId(sowerId);
      const status = asDraft ? 'draft' : (scheduleAt ? 'draft' : 'active');
      for (let i = 0; i < validRows.length; i++) {
        const r = validRows[i];
        const n = r.normalized;
        const productPayload: Record<string, unknown> = {
          sower_id: sowerId,
          company_id: companyId,
          title: n.name!,
          description: n.description ?? null,
          price: n.price ?? 0,
          category: n.category ?? null,
          sku: n.sku ?? null,
          stock: n.stock_qty ?? null,
          whisperer_commission_percent: n.commission_pct ?? null,
          commission_fixed: n.commission_fixed ?? null,
          bulk_upload_id: jobId,
          status,
          delivery_type: 'physical',
          // No column default on either -- confirmed against a real,
          // working physical-product row (kind='product', type='product')
          // that this same standard SeedCard/basket/bestow/bookkeeping
          // path already renders correctly; left unset here before, so a
          // bulk-imported row never actually matched that convention.
          kind: 'product',
          type: 'product',
          // From a ZIP's audio_file/book_file column when there was one --
          // same column a single sow writes, so the card plays/downloads
          // exactly as a one-at-a-time seed does.
          file_url: r.fileUrl ?? '',
          image_urls: (r.images ?? []).map((im) => im.url),
          cover_image_url: r.images?.[0]?.url ?? null,
          is_dropship: n.dropship ?? false,
          // video_url is a LINK, and products has no column for one, so it
          // rides in metadata rather than inventing a schema change.
          ...(r.videoUrl ? { metadata: { video_url: r.videoUrl } } : {}),
        };
        const prod = await insertProduct(productPayload);

        if (r.images?.length) {
          const imgRows = r.images.map((im, idx) => ({
            product_id: prod.id,
            url: im.url,
            sort_order: idx,
            is_primary: idx === 0,
          }));
          const { error: iErr } = await supabase.from('product_images').insert(imgRows);
          if (iErr) throw iErr;
        }
        published++;
        setProgress(5 + Math.floor((published / validRows.length) * 90));
      }

      await supabase.from('bulk_upload_jobs').update({
        status: scheduleAt ? 'draft' : 'published',
        published_count: published,
        scheduled_at: scheduleAt ? new Date(scheduleAt).toISOString() : null,
      }).eq('id', jobId);

      setProgress(100);
      onPublished(published);
    } catch (e) {
      toast({
        title: 'Publish failed',
        description: e instanceof Error ? e.message : String(e),
        variant: 'destructive',
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="container max-w-5xl py-8 space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={publishing}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to images
        </Button>
      </div>

      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold">Almost ready to plant</h1>
        <p className="text-muted-foreground text-sm">Review the totals below and plant your seeds when you're happy.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Products to plant</div>
          <div className="text-2xl font-bold text-primary">{validRows.length}</div>
          <div className="text-xs text-muted-foreground">of {rows.length} parsed</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Images attached</div>
          <div className="text-2xl font-bold">{totalImages}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Avg price</div>
          <div className="text-2xl font-bold">${avgPrice.toFixed(2)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Avg whisperer %</div>
          <div className="text-2xl font-bold">{avgCommission !== null ? `${avgCommission.toFixed(1)}%` : '—'}</div>
        </CardContent></Card>
      </div>

      {rows.length - validRows.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-3 flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            {rows.length - validRows.length} row(s) with issues will be skipped. Go back to step 2 to fix them.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Preview (first 8)</CardTitle>
          <CardDescription>This is what will go live on your sower page.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {validRows.slice(0, 8).map((r) => (
            <div key={r.idx} className="rounded-lg border overflow-hidden">
              <div className="aspect-square bg-muted">
                {r.images?.[0]?.url
                  ? <SignedImg src={r.images[0].url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ImagePlus className="h-6 w-6" /></div>}
              </div>
              <div className="p-2">
                <div className="text-sm font-medium truncate">{r.normalized.name}</div>
                <div className="text-xs text-muted-foreground">${(r.normalized.price ?? 0).toFixed(2)}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Schedule (optional)</CardTitle>
          <CardDescription>Leave empty to publish immediately.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className="max-w-xs" />
        </CardContent>
      </Card>

      {publishing && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Sprout className="h-4 w-4 animate-pulse text-primary" />
              Planting your seeds…
            </div>
            <Progress value={progress} />
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center sticky bottom-4 bg-background/80 backdrop-blur p-3 rounded-lg border">
        <Button variant="ghost" onClick={onBack} disabled={publishing}>Back</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => publish(true)} disabled={publishing}>Save as draft</Button>
          <Button onClick={() => publish(false)} disabled={publishing || validRows.length === 0}>
            {scheduleAt ? 'Schedule planting' : 'Plant your products'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================================
// Step 5 — Success
// =============================================================
function SuccessStep({
  count, sowerId, onDone,
}: {
  count: number;
  sowerId: string | null;
  onDone: () => void;
}) {
  const navigate = useNavigate();
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!sowerId) return;
    supabase.from('sowers').select('slug').eq('id', sowerId).maybeSingle()
      .then(({ data }) => setSlug(data?.slug ?? null));
  }, [sowerId]);

  return (
    <div className="container max-w-2xl py-16 text-center space-y-6">
      <div className="flex justify-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div className="relative bg-primary text-primary-foreground rounded-full p-6">
            <Sprout className="h-12 w-12" />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Your seeds are live!</h1>
        <p className="text-muted-foreground">
          {count} product{count === 1 ? '' : 's'} planted successfully.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {slug && (
          <>
            <Button onClick={() => navigate(`/bulk/sower/${slug}`)}>View your brand page</Button>
            <Button variant="outline" onClick={() => navigate(`/bulk/sower/${slug}/feed`)}>Open seed feed</Button>
          </>
        )}
        <Button variant="ghost" onClick={onDone}>Back to dashboard</Button>
      </div>
    </div>
  );
}

