import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Camera, Loader2, Plus, Receipt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatZAR, BOOKS_CURRENCY } from '@/lib/books/format';
import { EXPENSE_CATEGORIES, autoCategorize, normalizeCategory, type ExpenseCategory } from '@/lib/books/categorize';
import type { ExpenseRow } from '@/hooks/useBooksData';

interface Props {
  businessId: string;
  expenses: ExpenseRow[];
  onChanged: () => void;
}

export default function ExpensesTab({ businessId, expenses, onChanged }: Props) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [spentOn, setSpentOn] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Other');
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [receiptPath, setReceiptPath] = useState<string | null>(null);

  const onDescription = (value: string) => {
    setDescription(value);
    if (!categoryTouched) setCategory(autoCategorize(`${value} ${merchant}`));
  };

  const reset = () => {
    setDescription('');
    setAmount('');
    setMerchant('');
    setSpentOn('');
    setCategory('Other');
    setCategoryTouched(false);
    setReceiptPath(null);
  };

  const save = async () => {
    const value = Number(amount);
    if (!description.trim()) return toast.error('Description is required');
    if (!Number.isFinite(value) || value <= 0) return toast.error('Enter a valid amount');
    setSaving(true);
    const { error } = await supabase.from('expenses' as any).insert({
      business_id: businessId,
      description: description.trim(),
      amount: value,
      currency: BOOKS_CURRENCY,
      category,
      merchant: merchant.trim() || null,
      spent_on: spentOn || null,
      receipt_image_path: receiptPath,
      source: receiptPath ? 'receipt_scan' : 'manual',
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Expense recorded');
    reset();
    onChanged();
  };

  const scanReceipt = async (file: File) => {
    setScanning(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${businessId}/receipts/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('books-docs').upload(path, file, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      });
      if (upErr) throw upErr;
      setReceiptPath(path);

      const { data, error } = await supabase.functions.invoke('scan-receipt', {
        body: { business_id: businessId, file_path: path },
      });
      if (error) throw error;

      const parsed = (data as any)?.receipt ?? {};
      const parsedAmount = Number(parsed.amount);
      if (parsed.merchant) setMerchant(String(parsed.merchant));
      if (Number.isFinite(parsedAmount) && parsedAmount > 0) setAmount(String(parsedAmount));
      if (parsed.date) setSpentOn(String(parsed.date).slice(0, 10));
      setDescription(String(parsed.description || parsed.merchant || 'Scanned receipt'));
      setCategory(normalizeCategory(parsed.category));
      setCategoryTouched(true);
      toast.success('Receipt scanned — check the details, then add the expense');
    } catch (e: any) {
      toast.error(e?.message || 'Could not read that receipt');
    } finally {
      setScanning(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Add an expense</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5 lg:col-span-2">
              <Label htmlFor="exp-desc">Description</Label>
              <Input id="exp-desc" value={description} onChange={(e) => onDescription(e.target.value)} placeholder="e.g. Adobe subscription" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-amount">Amount (ZAR)</Label>
              <Input id="exp-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-date">Date</Label>
              <Input id="exp-date" type="date" value={spentOn} onChange={(e) => setSpentOn(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-merchant">Merchant</Label>
              <Input id="exp-merchant" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(v) => {
                  setCategory(v as ExpenseCategory);
                  setCategoryTouched(true);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!categoryTouched && (
                <p className="text-[11px] text-muted-foreground">Auto-categorised from the description.</p>
              )}
            </div>
          </div>

          {receiptPath && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Receipt className="h-3.5 w-3.5" /> Receipt attached
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add expense
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={scanning}>
              {scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
              Scan a receipt
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) scanReceipt(f);
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Expenses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {expenses.length === 0 && <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>}
          {expenses.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/40 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{e.description}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(e.spent_on ?? e.created_at).toLocaleDateString('en-ZA')}
                  {e.merchant ? ` · ${e.merchant}` : ''}
                  {e.source === 'receipt_scan' ? ' · scanned' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="uppercase">{e.category}</Badge>
                <span className="text-sm text-orange-400">{formatZAR(e.amount)}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
