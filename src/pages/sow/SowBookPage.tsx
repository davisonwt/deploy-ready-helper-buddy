import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { insertProduct } from '@/api/products';
import { getDefaultCompanyId } from '@/lib/products/getDefaultCompanyId';
import { generatePdfPagePreviews } from '@/lib/media/generatePdfPreview';
import { priceBreakdown } from '@/lib/pricing/platformFee';
import { launchConfetti } from '@/utils/confetti';
import { toast } from 'sonner';

import SeedDropZone, { type SeedFileResult } from '@/components/sowing/SeedDropZone';
import CoverDropZone, { type CoverResult } from '@/components/sowing/CoverDropZone';
import PriceWithSplit from '@/components/sowing/PriceWithSplit';
import OnePicker, { type OnePickerOption } from '@/components/sowing/OnePicker';
import SeedPreviewCard from '@/components/sowing/SeedPreviewCard';
import PlantButton from '@/components/sowing/PlantButton';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, ChevronDown, Eye, Loader2 } from 'lucide-react';
import sowBookBanner from '@/assets/seeds-strip.jpg';

const CATEGORIES: OnePickerOption[] = [
  'Fiction', 'Non-fiction', 'Self-help', 'Business', 'Spiritual',
  "Children's", 'Poetry', 'Biography', 'Education', 'Reference', 'Other',
].map((c) => ({ value: c.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label: c }));

const DOCUMENT_ACCEPT = '.pdf,.epub';

// Willow would normally weave this per spec, but companion-invoke needs a
// real signed-in session and spends the user's own image-quota — not
// something to trigger from a build script. Same reasoning, same reused
// asset as /sow/art.
function SowBanner() {
  return (
    <div
      className="relative w-full h-32 md:h-44 lg:h-56 overflow-hidden rounded-2xl mb-6 border"
      style={{ borderColor: 'rgba(234,179,8,0.45)', boxShadow: '0 0 40px rgba(234,179,8,0.25)' }}
    >
      <img src={sowBookBanner} alt="" className="absolute inset-0 w-full h-full object-cover" loading="eager" />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(234,179,8,0.25) 60%, rgba(0,0,0,0.1))' }}
      />
      <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-6">
        <h1 className="text-white text-xl md:text-3xl font-black tracking-tight drop-shadow-lg">Sow your book</h1>
        <p className="text-white/85 text-sm md:text-base mt-1 max-w-2xl drop-shadow">
          Share a document or e-book with the tribe — planted in under two minutes.
        </p>
      </div>
    </div>
  );
}

export default function SowBookPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [seedFile, setSeedFile] = useState<SeedFileResult | null>(null);
  const [cover, setCover] = useState<CoverResult | null>(null);
  const [previewPages, setPreviewPages] = useState<string[]>([]);
  const [previewGenerating, setPreviewGenerating] = useState(false);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState<number | null>(null);
  const [isFree, setIsFree] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  // More options — none of these can block Plant seed.
  const [moreOpen, setMoreOpen] = useState(false);
  const [author, setAuthor] = useState('');
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [language, setLanguage] = useState('');
  const [isbn, setIsbn] = useState('');
  const [whispererPercent, setWhispererPercent] = useState<number | null>(null);
  const [tags, setTags] = useState('');
  const [explicit, setExplicit] = useState(false);

  // Books field (spec-books.md §4) — only shown once there's a real choice
  // to make; with one business it's silent and the default set is used.
  const [businesses, setBusinesses] = useState<{ id: string; name: string; is_default: boolean }[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('companies')
        .select('id, name, is_default')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: true });
      if (!alive) return;
      const list = (data as any) ?? [];
      setBusinesses(list);
      setSelectedCompanyId((list.find((b: any) => b.is_default) ?? list[0])?.id ?? null);
    })();
    return () => { alive = false; };
  }, [user]);

  // Preview: PDF renders its first 3 pages to 1200px JPEGs, no watermark
  // (client-side, pdf.js — spec-sowing-forms.md). EPUB has no page
  // preview at all; the cover stands in for it on the detail page
  // instead, so there's nothing to generate here. Eager, right after
  // upload finishes (mirrors /sow/art's watermark timing); a failure is
  // non-blocking, same reasoning as every other preview step in this
  // build — the real file already uploaded fine.
  useEffect(() => {
    let alive = true;
    if (!user || !seedFile || seedFile.previewStatus !== 'ready' || previewPages.length) return;
    const ext = seedFile.file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf') return;
    (async () => {
      setPreviewGenerating(true);
      try {
        const { pages, pageCount: realPageCount } = await generatePdfPagePreviews(seedFile.file);
        const folder = `previews/${user.id}/${Date.now()}`;
        const urls: string[] = [];
        for (let i = 0; i < pages.length; i++) {
          const path = `${folder}/page-${i + 1}.jpg`;
          const { error: uploadErr } = await supabase.storage.from('seed-previews').upload(path, pages[i], {
            cacheControl: '3600',
            upsert: false,
            contentType: 'image/jpeg',
          });
          if (uploadErr) throw uploadErr;
          const { data: pub } = supabase.storage.from('seed-previews').getPublicUrl(path);
          urls.push(pub.publicUrl);
        }
        if (!alive) return;
        setPreviewPages(urls);
        setPageCount((prev) => prev ?? realPageCount);
      } catch (err) {
        console.error('PDF preview generation failed (non-blocking):', err);
      } finally {
        if (alive) setPreviewGenerating(false);
      }
    })();
    return () => { alive = false; };
  }, [seedFile, previewPages, user]);

  const fileReady = !!seedFile && !!seedFile.fileUrl && seedFile.previewStatus === 'ready';
  const coverReady = !!cover;
  const titleReady = title.trim().length > 0;
  const priceReady = isFree || (price != null && price > 0);
  const categoryReady = !!category;
  const descriptionReady = description.trim().length > 0;

  const completed = [fileReady, coverReady, titleReady, priceReady, categoryReady, descriptionReady]
    .filter(Boolean).length;

  const missingReason = useMemo(() => {
    if (!fileReady) {
      if (seedFile?.fileUrl) return seedFile.previewMessage || 'This file needs a different format.';
      if (seedFile && ['reading', 'uploading'].includes(seedFile.previewStatus)) return 'Your file is uploading…';
      return 'Add your PDF or EPUB to continue.';
    }
    if (!coverReady) return 'Add a cover to continue.';
    if (!titleReady) return 'Give it a title.';
    if (!priceReady) return 'Set a price, or mark it free.';
    if (!categoryReady) return 'Pick a category.';
    if (!descriptionReady) return 'Add a short description.';
    return undefined;
  }, [fileReady, seedFile, coverReady, titleReady, priceReady, categoryReady, descriptionReady]);

  const handlePlant = async () => {
    if (!user) { toast.error('Please log in to sow.'); return; }
    if (completed < 6 || !seedFile || !cover) return;

    setSubmitting(true);
    try {
      // Same sower-row resolution as UploadForm.tsx / SowMusicPage.tsx —
      // get-or-create.
      const { data: sowerData } = await supabase.from('sowers').select('id').eq('user_id', user.id).single();
      let sowerId = sowerData?.id as string | undefined;
      if (!sowerId) {
        const { data: profile } = await supabase.from('profiles').select('display_name').eq('user_id', user.id).single();
        const { data: newSower, error: createErr } = await supabase
          .from('sowers')
          .insert({ user_id: user.id, display_name: profile?.display_name || user.email?.split('@')[0] || 'Anonymous' })
          .select()
          .single();
        if (createErr) throw createErr;
        sowerId = newSower.id;
      }

      const companyId = selectedCompanyId ?? (await getDefaultCompanyId(sowerId));

      const totalPrice = isFree ? 0 : priceBreakdown(price!).total;
      const metadata: Record<string, unknown> = {};
      if (author.trim()) metadata.author = author.trim();
      if (pageCount != null) metadata.page_count = pageCount;
      if (language.trim()) metadata.language = language.trim();
      if (isbn.trim()) metadata.isbn = isbn.trim();
      if (explicit) metadata.explicit = true;
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
      if (tagList.length) metadata.tags = tagList;
      if (previewPages.length) metadata.preview_pages = previewPages;

      // Cover always comes from the sower's own upload (required, like
      // music). preview_url is the PDF's first rendered page when one
      // exists; EPUB has none, so it stays null and the detail page falls
      // back to the cover it already shows. file_url (premium-room,
      // private) stays gated behind get-seed-file either way — only the
      // owner or a completed buyer ever reaches it.
      const inserted = await insertProduct({
        sower_id: sowerId,
        company_id: companyId,
        title: title.trim(),
        description: description.trim(),
        type: 'ebook',
        kind: 'ebook',
        category,
        license_type: isFree ? 'free' : 'bestowal',
        price: totalPrice,
        cover_image_url: cover.fileUrl,
        file_url: seedFile.fileUrl,
        preview_url: previewPages[0] ?? null,
        delivery_type: 'digital',
        has_whisperer: whispererPercent != null && whispererPercent > 0,
        whisperer_commission_percent: whispererPercent,
        metadata,
      });

      try { await (supabase.rpc as any)('add_xp_to_current_user', { amount: 100 }); } catch { /* best-effort */ }

      setCelebrate(true);
      launchConfetti();
      toast.success('Seed planted! 🌱');
      await new Promise((resolve) => setTimeout(resolve, 650));
      navigate(`/bulk/products/${inserted.id}`);
    } catch (e: any) {
      console.error('Plant seed error', e);
      toast.error(e?.message ?? 'Could not plant this seed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="container max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-muted-foreground">Please log in to sow your book.</p>
        <Button onClick={() => navigate('/login')}>Log in</Button>
      </div>
    );
  }

  const pathPrefix = `products/${user.id}`;

  const previewCard = (
    <SeedPreviewCard
      title={title}
      description={description}
      coverUrl={cover?.fileUrl ?? null}
      price={price}
      isFree={isFree}
      type="ebook"
      completedPieces={completed}
      celebrate={celebrate}
    />
  );

  return (
    <div className="container max-w-5xl mx-auto px-4 py-6 md:py-8 pb-28 md:pb-8">
      <Button variant="ghost" size="sm" onClick={() => navigate('/sow')} className="mb-4 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <SowBanner />

      <div className="grid md:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-5">
          <div className="flex items-start gap-4">
            <CoverDropZone bucket="premium-room" pathPrefix={`covers/${user.id}`} onChange={setCover} required />
            <div className="flex-1">
              <Label htmlFor="sow-title">Title</Label>
              <Input
                id="sow-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's it called?"
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">File</Label>
            <SeedDropZone
              kind="document"
              bucket="premium-room"
              pathPrefix={pathPrefix}
              accept={DOCUMENT_ACCEPT}
              allowedLabel="PDF or EPUB, up to 50 MB."
              onChange={(result) => { setSeedFile(result); setPreviewPages([]); }}
            />
            {previewGenerating && (
              <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Rendering your preview pages…
              </p>
            )}
          </div>

          <PriceWithSplit
            price={price}
            isFree={isFree}
            onChangePrice={setPrice}
            onChangeFree={setIsFree}
            label="Price"
          />

          <OnePicker
            label="Category"
            storageKey="sow:lastBookCategory"
            options={CATEGORIES}
            value={category}
            onChange={setCategory}
          />

          <div>
            <Label htmlFor="sow-description">Description</Label>
            <Textarea
              id="sow-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A couple of lines about the book — more if you like."
              className="mt-1.5"
            />
          </div>

          <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="px-0 text-muted-foreground">
                <ChevronDown className={`w-4 h-4 mr-1.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
                More options
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-3">
              <div>
                <Label htmlFor="sow-author">Author</Label>
                <Input
                  id="sow-author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Defaults to your sower name if left blank"
                  className="mt-1.5 max-w-xs"
                />
              </div>

              <div>
                <Label htmlFor="sow-pages">Page count</Label>
                <p className="text-xs text-muted-foreground mb-1.5">
                  Filled in automatically for a PDF once its preview renders. Edit if it's wrong, or set it yourself for an EPUB.
                </p>
                <Input
                  id="sow-pages"
                  type="number"
                  min="0"
                  value={pageCount ?? ''}
                  onChange={(e) => setPageCount(e.target.value === '' ? null : Number(e.target.value))}
                  className="max-w-xs"
                />
              </div>

              <div>
                <Label htmlFor="sow-language">Language</Label>
                <Input
                  id="sow-language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="e.g. English"
                  className="mt-1.5 max-w-xs"
                />
              </div>

              <div>
                <Label htmlFor="sow-isbn">ISBN</Label>
                <Input
                  id="sow-isbn"
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  placeholder="Optional"
                  className="mt-1.5 max-w-xs"
                />
              </div>

              {businesses.length > 1 && (
                <div>
                  <Label htmlFor="sow-books">Books</Label>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    Which of your businesses this seed's sales go into. Can be changed later, until its first sale.
                  </p>
                  <Select value={selectedCompanyId ?? undefined} onValueChange={setSelectedCompanyId}>
                    <SelectTrigger id="sow-books" className="max-w-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {businesses.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="sow-whisperer">Whisperer commission %</Label>
                <p className="text-xs text-muted-foreground mb-1.5">
                  Comes out of your share, never added on top of what the buyer pays. Leave blank for none.
                </p>
                <Input
                  id="sow-whisperer"
                  type="number"
                  min="0"
                  max="30"
                  step="1"
                  value={whispererPercent ?? ''}
                  onChange={(e) => setWhispererPercent(e.target.value === '' ? null : Number(e.target.value))}
                  className="max-w-xs"
                />
              </div>

              <div>
                <Label htmlFor="sow-tags">Tags</Label>
                <Input
                  id="sow-tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Comma-separated"
                  className="mt-1.5 max-w-xs"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sow-explicit" className="cursor-pointer">Explicit content</Label>
                  <p className="text-xs text-muted-foreground">Flags the book for readers who filter mature content.</p>
                </div>
                <Switch id="sow-explicit" checked={explicit} onCheckedChange={setExplicit} />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="hidden md:block pt-2">
            <PlantButton
              requiredCount={6}
              completedCount={completed}
              missingReason={missingReason}
              submitting={submitting}
              onClick={handlePlant}
            />
          </div>
        </div>

        {/* Desktop: sticky preview column */}
        <div className="hidden md:block">
          <div className="sticky top-6">{previewCard}</div>
        </div>
      </div>

      {/* Mobile: sticky bottom sheet + inline Plant */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-background border-t p-3 space-y-2">
        <Sheet>
          <SheetTrigger asChild>
            <button type="button" className="w-full flex items-center gap-2 text-xs text-muted-foreground">
              <Eye className="w-3.5 h-3.5" /> Preview how it will look
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
            {previewCard}
          </SheetContent>
        </Sheet>
        <PlantButton
          requiredCount={6}
          completedCount={completed}
          missingReason={missingReason}
          submitting={submitting}
          onClick={handlePlant}
        />
      </div>
    </div>
  );
}
