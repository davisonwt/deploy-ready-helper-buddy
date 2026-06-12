import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, FileText, AlertCircle, CheckCircle2, ArrowLeft, Sprout, ImagePlus, X, Star, GripVertical, ChevronRight } from 'lucide-react';

type ProductImage = { url: string; path: string };

type ParsedRow = {
  idx: number;
  raw: Record<string, unknown>;
  normalized: {
    name?: string;
    description?: string;
    price?: number;
    commission_pct?: number;
    commission_fixed?: number;
    category?: string;
    sku?: string;
    stock_qty?: number;
  };
  issues: string[];
  images?: ProductImage[];
};

type Summary = { total: number; valid: number; with_issues: number; lower_accuracy: boolean };

const ACCEPT = '.csv,.xlsx,.xls,.txt,.pdf,.docx';
const MAX_IMAGES = 5;
const IMG_BUCKET = 'orchard-images';

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

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('sowers').select('id').eq('user_id', user.id).maybeSingle();
      if (data) setSowerId(data.id);
    })();
  }, []);

  const handleFile = useCallback(async (f: File) => {
    if (f.size > 20 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum 20MB.', variant: 'destructive' });
      return;
    }
    setFile(f);
    setParsing(true);
    setProgress(15);

    const tick = setInterval(() => setProgress((p) => (p < 85 ? p + 5 : p)), 250);
    try {
      const fd = new FormData();
      fd.append('file', f);
      if (sowerId) fd.append('sower_id', sowerId);

      const { data: { session } } = await supabase.auth.getSession();
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/bulk-parse-products`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: fd,
      });
      const json = await res.json();
      clearInterval(tick);
      setProgress(100);
      if (!res.ok) throw new Error(json.error || 'Parse failed');
      setRows(json.rows ?? []);
      setSummary(json.summary ?? null);
      setJobId(json.job_id ?? null);
      setStep(2);
      toast({ title: 'Seeds parsed', description: `${json.summary?.total ?? 0} rows ready for review.` });
    } catch (e) {
      clearInterval(tick);
      toast({ title: 'Could not parse file', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
      setFile(null);
    } finally {
      setParsing(false);
      setTimeout(() => setProgress(0), 800);
    }
  }, [sowerId, toast]);

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
          <p className="text-muted-foreground">Upload 10–1000 products at once. CSV, XLSX, TXT, PDF, or DOCX.</p>
        </div>

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
                  <p className="text-xs text-muted-foreground">{file?.name}</p>
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
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  {['CSV', 'XLSX', 'TXT', 'PDF', 'DOCX'].map((t) => (
                    <Badge key={t} variant="secondary">{t}</Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground pt-2">Max 20MB · PDF/DOCX flagged for review</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expected columns (any order, flexible names)</CardTitle>
            <CardDescription>name · description · price · commission · category · sku · stock</CardDescription>
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
  rows, sowerId, jobId, onBack, onUpdate,
}: {
  rows: ParsedRow[];
  sowerId: string | null;
  jobId: string | null;
  onBack: () => void;
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
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
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
          <Button disabled title="Review &amp; publish — coming in next step">
            Continue → Review &amp; publish <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

