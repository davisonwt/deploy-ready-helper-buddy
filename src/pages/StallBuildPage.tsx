import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { WizardContainer } from '@/components/wizard/WizardContainer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Plus, Store } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import StallImageUpload, { type StallImageResult } from '@/components/stalls/StallImageUpload';
import {
  STALL_CATEGORIES,
  TILE_KINDS,
  TILE_KIND_DEFAULT_TARGET,
  MIN_TILES,
  MAX_TILES,
  type StallCategory,
  type StallTile,
  type StallTemplate,
  type StallTemplatesByCategory,
} from '@/lib/stalls/stallTypes';

interface TileDraft {
  label: string;
  kind: StallTile['kind'];
  image: StallImageResult | null;
  customTarget: string;
}

function emptyTile(): TileDraft {
  return { label: '', kind: 'products', image: null, customTarget: '' };
}

function tileTarget(t: TileDraft): string {
  return t.kind === 'custom' ? t.customTarget.trim() : TILE_KIND_DEFAULT_TARGET[t.kind];
}

/**
 * "Build your stall" wizard (Farm-Stalls batch 1, item 3) --
 * category+name+tagline -> front image -> interior image -> 3-5 tiles ->
 * preview + publish. One stall per member (stalls.user_id UNIQUE) --
 * loads any existing row on mount so re-opening this page edits in place
 * rather than blocking on "you already have a stall".
 */
export default function StallBuildPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stallId, setStallId] = useState<string | null>(null);

  const [category, setCategory] = useState<StallCategory>('books_writing');
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [story, setStory] = useState('');
  const [front, setFront] = useState<StallImageResult | null>(null);
  const [interior, setInterior] = useState<StallImageResult | null>(null);
  const [tiles, setTiles] = useState<TileDraft[]>([emptyTile(), emptyTile(), emptyTile()]);

  const [templates, setTemplates] = useState<StallTemplatesByCategory | null>(null);

  useEffect(() => {
    fetch('/stalls/templates/templates.json')
      .then((r) => r.json())
      .then(setTemplates)
      .catch(() => setTemplates(null));
  }, []);

  const categoryTemplates: StallTemplate[] = templates?.[category] ?? [];

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('stalls').select('*').eq('user_id', user.id).maybeSingle();
      if (data) {
        setStallId(data.id);
        setCategory(data.category);
        setName(data.name ?? '');
        setTagline(data.tagline ?? '');
        setStory(data.story ?? '');
        if (data.front_image_path) setFront({ url: data.front_image_path, storagePath: null });
        if (data.interior_image_path) setInterior({ url: data.interior_image_path, storagePath: null });
        const savedTiles = Array.isArray(data.tiles) ? data.tiles : [];
        if (savedTiles.length > 0) {
          setTiles(savedTiles.map((t: StallTile) => ({
            label: t.label ?? '',
            kind: t.kind ?? 'products',
            image: t.image_path ? { url: t.image_path, storagePath: null } : null,
            customTarget: t.kind === 'custom' ? (t.link_target ?? '') : '',
          })));
        }
      }
      setLoading(false);
    })();
  }, [user]);

  const pathPrefix = user ? `${user.id}` : '';

  const addTile = () => setTiles((t) => (t.length >= MAX_TILES ? t : [...t, emptyTile()]));
  const removeTile = (i: number) => setTiles((t) => (t.length <= MIN_TILES ? t : t.filter((_, idx) => idx !== i)));
  const updateTile = (i: number, patch: Partial<TileDraft>) =>
    setTiles((t) => t.map((tile, idx) => (idx === i ? { ...tile, ...patch } : tile)));

  const validTiles = tiles.filter((t) => t.label.trim().length > 0 && tileTarget(t).length > 0);

  const canGoNext = useMemo(() => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return !!front;
    if (step === 2) return !!interior;
    if (step === 3) return validTiles.length >= MIN_TILES;
    return true;
  }, [step, name, front, interior, validTiles.length]);

  const handlePublish = async () => {
    if (!user) return;
    if (!front || !interior) { toast.error('Add both a front and interior image first.'); return; }
    if (validTiles.length < MIN_TILES) { toast.error(`Add at least ${MIN_TILES} tiles.`); return; }

    setSubmitting(true);
    try {
      const tilesPayload: StallTile[] = validTiles.map((t) => ({
        label: t.label.trim(),
        kind: t.kind,
        image_path: t.image?.url ?? null,
        link_target: tileTarget(t),
      }));

      const { error } = await supabase.from('stalls').upsert(
        {
          user_id: user.id,
          category,
          name: name.trim(),
          tagline: tagline.trim() || null,
          story: story.trim() || null,
          front_image_path: front.url,
          interior_image_path: interior.url,
          tiles: tilesPayload,
          published: true,
        },
        { onConflict: 'user_id' },
      );
      if (error) throw error;

      toast.success('Your stall is open for business!');
      navigate('/cockpit');
    } catch (err) {
      console.error('stall publish failed', err);
      toast.error(err instanceof Error ? err.message : 'Could not publish your stall. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  const steps = [
    { title: 'Your stall', description: 'What kind of stall is this?' },
    { title: 'Shop front', description: 'The image visitors tap to walk in.' },
    { title: 'Interior', description: 'What they see once inside.' },
    { title: 'Tiles', description: `3-${MAX_TILES} buttons leading to your products.` },
    { title: 'Preview & publish', description: 'One last look before it goes live.' },
  ];

  return (
    <WizardContainer
      steps={steps}
      currentStep={step}
      onStepChange={setStep}
      title={stallId ? 'Edit your stall' : 'Build your stall'}
      description="A shop-front for your seeds, sower or whisperer — visitors tap in to browse."
      onCancel={() => navigate('/cockpit')}
      onSubmit={handlePublish}
      isSubmitting={submitting}
      canGoNext={canGoNext}
      submitLabel={stallId ? 'Save & publish' : 'Publish'}
    >
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STALL_CATEGORIES.map((c) => (
                <Button
                  key={c.id}
                  type="button"
                  variant={category === c.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategory(c.id)}
                >
                  {c.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Stall name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Davison — Lyricist and Writer" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Tagline (optional)</label>
            <Textarea value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={160} rows={2} placeholder="Words that heal, songs that awaken." />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">My Story (optional)</label>
            <p className="text-xs text-muted-foreground mb-1.5">
              Shown under the MY STORY button inside your stall. Blank lines start a new paragraph.
              Type a line in ALL CAPS to make it a heading — everything renders exactly as typed, so write it the way you want it read.
            </p>
            <Textarea
              value={story}
              onChange={(e) => setStory(e.target.value)}
              maxLength={4000}
              rows={8}
              placeholder={"MY JOURNEY\n\nit started with a single song..."}
            />
          </div>
        </div>
      )}

      {step === 1 && (
        <StallImageUpload
          pathPrefix={pathPrefix}
          mode="square"
          maxSize={1200}
          value={front}
          onChange={setFront}
          templates={categoryTemplates}
          templateField="front"
          label="Shop-front image"
          aspectClassName="aspect-square max-w-sm mx-auto"
        />
      )}

      {step === 2 && (
        <StallImageUpload
          pathPrefix={pathPrefix}
          mode="width"
          maxSize={1920}
          value={interior}
          onChange={setInterior}
          templates={categoryTemplates}
          templateField="interior"
          label="Interior image"
          aspectClassName="aspect-video"
        />
      )}

      {step === 3 && (
        <div className="space-y-4">
          {tiles.map((tile, i) => (
            <Card key={i}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Tile {i + 1}</span>
                  {tiles.length > MIN_TILES && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeTile(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <Input
                  placeholder="Label (e.g. My Books)"
                  value={tile.label}
                  onChange={(e) => updateTile(i, { label: e.target.value })}
                  maxLength={40}
                />
                <div className="flex flex-wrap gap-2">
                  {TILE_KINDS.map((k) => (
                    <Button
                      key={k.id}
                      type="button"
                      size="sm"
                      variant={tile.kind === k.id ? 'default' : 'outline'}
                      onClick={() => updateTile(i, { kind: k.id })}
                    >
                      {k.label}
                    </Button>
                  ))}
                </div>
                {tile.kind === 'custom' && (
                  <Input
                    placeholder="/some/in-app/path"
                    value={tile.customTarget}
                    onChange={(e) => updateTile(i, { customTarget: e.target.value })}
                  />
                )}
                <StallImageUpload
                  pathPrefix={pathPrefix}
                  mode="square"
                  maxSize={600}
                  value={tile.image}
                  onChange={(img) => updateTile(i, { image: img })}
                  templateField="front"
                  label="Tile image (optional)"
                  aspectClassName="aspect-square max-w-[8rem]"
                />
              </CardContent>
            </Card>
          ))}
          {tiles.length < MAX_TILES && (
            <Button type="button" variant="outline" onClick={addTile} className="w-full gap-2">
              <Plus className="h-4 w-4" /> Add another tile
            </Button>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="rounded-xl border overflow-hidden">
            {front && <img src={front.url} alt={name} className="w-full aspect-square object-cover" />}
            <div className="p-4">
              <h3 className="font-bold text-lg flex items-center gap-2"><Store className="h-4 w-4" />{name}</h3>
              {tagline && <p className="text-sm text-muted-foreground mt-1">{tagline}</p>}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Tiles ({validTiles.length})</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {validTiles.map((t, i) => (
                <div key={i} className="rounded-lg border p-2 text-center text-sm">{t.label}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </WizardContainer>
  );
}
