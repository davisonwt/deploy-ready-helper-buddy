import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Globe2, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import ComplianceBanner from './ComplianceBanner';
import { COMMON_CURRENCIES } from '@/lib/books/currency';
import { COMMON_COUNTRIES, presetFor } from '@/lib/books/presets';
import type { StatutoryDeductionRow } from '@/hooks/useBooksData';
import type { BooksBusiness } from '@/hooks/useBooksBusiness';

interface Props {
  business: BooksBusiness;
  deductions: StatutoryDeductionRow[];
  saving: boolean;
  onUpdateBusiness: (patch: Partial<Pick<BooksBusiness, 'country' | 'currency' | 'books_enabled'>>) => Promise<unknown>;
  onApplyPreset: (country: string) => Promise<boolean>;
  onChanged: () => void;
}

type DraftRow = {
  id: string;
  label: string;
  employee_pct: string;
  employer_pct: string;
  wage_cap: string;
  applies: boolean;
  tax_code: string;
  isNew?: boolean;
};

const toDraft = (d: StatutoryDeductionRow): DraftRow => ({
  id: d.id,
  label: d.label,
  employee_pct: String(d.employee_pct ?? 0),
  employer_pct: String(d.employer_pct ?? 0),
  wage_cap: d.wage_cap == null ? '' : String(d.wage_cap),
  applies: d.applies,
  tax_code: d.tax_code ?? '',
});

export default function BooksSettingsTab({
  business, deductions, saving, onUpdateBusiness, onApplyPreset, onChanged,
}: Props) {
  const [country, setCountry] = useState(business.country ?? '');
  const [customCountry, setCustomCountry] = useState('');
  const [currency, setCurrency] = useState(business.currency || 'USD');
  const [rows, setRows] = useState<DraftRow[]>(deductions.map(toDraft));
  const [busy, setBusy] = useState(false);

  useEffect(() => setRows(deductions.map(toDraft)), [deductions]);

  const effectiveCountry = country === '__other' ? customCountry.trim() : country;

  const saveProfile = async () => {
    const c = effectiveCountry || null;
    await onUpdateBusiness({ country: c, currency: currency.toUpperCase() });
    if (c) {
      const applied = await onApplyPreset(c);
      if (applied) toast.success(`${c} preset applied — every rate is editable below`);
    }
    toast.success('Business profile saved');
    onChanged();
  };

  const addRow = () =>
    setRows((r) => [
      ...r,
      {
        id: `new-${crypto.randomUUID()}`,
        label: '',
        employee_pct: '0',
        employer_pct: '0',
        wage_cap: '',
        applies: true,
        tax_code: '',
        isNew: true,
      },
    ]);

  const patch = (id: string, p: Partial<DraftRow>) =>
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...p } : row)));

  const removeRow = async (row: DraftRow) => {
    if (row.isNew) return setRows((r) => r.filter((x) => x.id !== row.id));
    const { error } = await supabase.from('statutory_deductions' as any).delete().eq('id', row.id);
    if (error) return toast.error(error.message);
    toast.success(`${row.label || 'Deduction'} removed`);
    onChanged();
  };

  const saveDeductions = async () => {
    setBusy(true);
    try {
      const inserts = rows.filter((r) => r.isNew && r.label.trim());
      const updates = rows.filter((r) => !r.isNew);

      if (inserts.length) {
        const { error } = await supabase.from('statutory_deductions' as any).insert(
          inserts.map((r, i) => ({
            business_id: business.id,
            label: r.label.trim(),
            employee_pct: Number(r.employee_pct) || 0,
            employer_pct: Number(r.employer_pct) || 0,
            wage_cap: r.wage_cap.trim() === '' ? null : Number(r.wage_cap),
            applies: r.applies,
            tax_code: r.tax_code.trim() || null,
            sort_order: rows.length + i,
          })) as any
        );
        if (error) throw error;
      }

      for (const r of updates) {
        const { error } = await supabase
          .from('statutory_deductions' as any)
          .update({
            label: r.label.trim(),
            employee_pct: Number(r.employee_pct) || 0,
            employer_pct: Number(r.employer_pct) || 0,
            wage_cap: r.wage_cap.trim() === '' ? null : Number(r.wage_cap),
            applies: r.applies,
            tax_code: r.tax_code.trim() || null,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', r.id);
        if (error) throw error;
      }

      toast.success('Statutory deductions saved');
      onChanged();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save deductions');
    } finally {
      setBusy(false);
    }
  };

  const hasPreset = Boolean(presetFor(effectiveCountry));

  return (
    <div className="space-y-6">
      <ComplianceBanner />

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe2 className="h-4 w-4" /> Business profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger><SelectValue placeholder="Choose your country" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {COMMON_COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                  <SelectItem value="__other">Other (type it in)</SelectItem>
                </SelectContent>
              </Select>
              {country === '__other' && (
                <Input
                  className="mt-2"
                  placeholder="Your country"
                  value={customCountry}
                  onChange={(e) => setCustomCountry(e.target.value)}
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {Array.from(new Set([currency, ...COMMON_CURRENCIES])).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Every amount in Books — invoices, expenses, payroll, dashboard and reports — renders in this currency.
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {hasPreset
              ? 'A starter set of statutory deductions is available for this country and will be added once, only if your list is empty. Every rate stays editable.'
              : 'No built-in preset for this country — add the deductions your jurisdiction requires below.'}
          </p>
          <Button onClick={saveProfile} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save profile
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-base">Statutory deductions</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Add as many as your country requires — income tax withholding, social security, unemployment
            insurance, skills levies, anything else. Percentages apply to gross pay, up to the wage cap if you set one.
          </p>
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing configured yet.</p>
          )}
          {rows.map((r) => (
            <div key={r.id} className="grid gap-2 rounded-lg border border-border/50 bg-background/40 p-3 sm:grid-cols-12">
              <div className="space-y-1 sm:col-span-3">
                <Label className="text-xs">Label</Label>
                <Input value={r.label} placeholder="e.g. Income tax" onChange={(e) => patch(r.id, { label: e.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Employee %</Label>
                <Input inputMode="decimal" value={r.employee_pct} onChange={(e) => patch(r.id, { employee_pct: e.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Employer %</Label>
                <Input inputMode="decimal" value={r.employer_pct} onChange={(e) => patch(r.id, { employer_pct: e.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Wage cap</Label>
                <Input inputMode="decimal" placeholder="none" value={r.wage_cap} onChange={(e) => patch(r.id, { wage_cap: e.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Tax code</Label>
                <Input placeholder="optional" value={r.tax_code} onChange={(e) => patch(r.id, { tax_code: e.target.value })} />
              </div>
              <div className="flex items-end justify-between gap-2 sm:col-span-1">
                <Switch checked={r.applies} onCheckedChange={(v) => patch(r.id, { applies: v })} />
                <Button size="sm" variant="ghost" onClick={() => removeRow(r)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={addRow}><Plus className="mr-2 h-4 w-4" /> Add deduction</Button>
            <Button onClick={saveDeductions} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save deductions
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-base">Marketplace sync (Books add-on)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            With the add-on on, everything you list on Sow2Grow appears in your Books catalog automatically, and every
            completed sale or gift is written into your books with the platform fee posted as its own expense. With it
            off, your marketplace activity behaves exactly as it does today and nothing is written here.
          </p>
          <div className="flex items-center gap-3">
            <Switch
              id="books-addon"
              checked={business.books_enabled}
              onCheckedChange={async (v) => {
                await onUpdateBusiness({ books_enabled: v });
                toast.success(v ? 'Books add-on activated' : 'Books add-on switched off');
                onChanged();
              }}
            />
            <Label htmlFor="books-addon">
              {business.books_enabled ? 'Active' : 'Not active'}
            </Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
