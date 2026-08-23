// Manage the sower's brands / businesses / projects.
// A profile is the person; brands are the businesses or projects under it.
import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Plus, Star, Trash2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { uploadBrandLogo, type SowerBrand } from '@/api/sowerBrands';
import BrandIcon from './BrandIcon';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string | null;
  brands: SowerBrand[];
  onChanged: () => void;
}

export default function BrandManagerDialog({ open, onOpenChange, userId, brands, onChanged }: Props) {
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const pendingBrandId = useRef<string | null>(null);

  const createBrand = async () => {
    if (!userId) return;
    if (!name.trim()) { toast.error('Give your brand a name'); return; }
    setBusy(true);
    const { error } = await supabase.from('sower_brands').insert({
      user_id: userId,
      name: name.trim(),
      tagline: tagline.trim() || null,
      is_default: brands.length === 0,
    });
    setBusy(false);
    if (error) { toast.error(`Could not create brand: ${error.message}`); return; }
    setName(''); setTagline('');
    toast.success('Brand created');
    onChanged();
  };

  const pickLogo = (brandId: string) => {
    pendingBrandId.current = brandId;
    fileInput.current?.click();
  };

  const onLogoPicked = async (file?: File | null) => {
    const brandId = pendingBrandId.current;
    if (!file || !brandId || !userId) return;
    setUploadingFor(brandId);
    try {
      const url = await uploadBrandLogo(userId, file);
      const { error } = await supabase.from('sower_brands').update({ logo_url: url }).eq('id', brandId);
      if (error) throw error;
      toast.success('Logo updated');
      onChanged();
    } catch (e: any) {
      toast.error(`Logo upload failed: ${e.message}`);
    } finally {
      setUploadingFor(null);
      pendingBrandId.current = null;
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const makeDefault = async (brandId: string) => {
    if (!userId) return;
    await supabase.from('sower_brands').update({ is_default: false }).eq('user_id', userId);
    const { error } = await supabase.from('sower_brands').update({ is_default: true }).eq('id', brandId);
    if (error) { toast.error(error.message); return; }
    onChanged();
  };

  const removeBrand = async (brand: SowerBrand) => {
    if (!window.confirm(`Delete brand "${brand.name}"? Seeds using it will lose the badge.`)) return;
    const { error } = await supabase.from('sower_brands').delete().eq('id', brand.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Brand removed');
    onChanged();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>My brands &amp; businesses</DialogTitle>
          <DialogDescription>
            One profile, many brands. Each brand has its own logo, and that logo shows as an icon on
            every seed you assign to it.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onLogoPicked(e.target.files?.[0])}
        />

        <div className="space-y-3">
          {brands.length === 0 && (
            <p className="text-sm text-muted-foreground">No brands yet — create your first one below.</p>
          )}
          {brands.map((b) => (
            <div key={b.id} className="flex items-center gap-3 rounded-lg border border-border bg-card/60 p-3">
              <BrandIcon brand={b} size={28} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">
                  {b.name} {b.is_default && <span className="text-xs text-primary">· default</span>}
                </div>
                {b.tagline && <div className="truncate text-xs text-muted-foreground">{b.tagline}</div>}
              </div>
              <Button size="sm" variant="outline" onClick={() => pickLogo(b.id)} disabled={uploadingFor === b.id}>
                {uploadingFor === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </Button>
              {!b.is_default && (
                <Button size="sm" variant="outline" onClick={() => makeDefault(b.id)} title="Make default">
                  <Star className="h-4 w-4" />
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => removeBrand(b)} title="Delete brand">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <div className="space-y-3 rounded-lg border border-border p-3">
          <div className="space-y-1">
            <Label htmlFor="brand-name">Brand / business name</Label>
            <Input id="brand-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Taljaard Music" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="brand-tagline">Tagline (optional)</Label>
            <Input id="brand-tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="What this brand is about" />
          </div>
          <Button onClick={createBrand} disabled={busy} className="w-full">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Add brand
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
