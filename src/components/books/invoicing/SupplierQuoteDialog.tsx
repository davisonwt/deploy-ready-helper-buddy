import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { addSupplierQuote } from '@/hooks/useJobInvoicing';

interface Props {
  jobNotesId: string;
  onAdded: () => void;
}

export default function SupplierQuoteDialog({ jobNotesId, onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!supplierName.trim()) return toast.error('A supplier name is required');
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    setSaving(true);
    try {
      await addSupplierQuote(jobNotesId, supplierName.trim(), amt, notes.trim() || null);
      toast.success('Supplier quote added');
      setSupplierName(''); setAmount(''); setNotes('');
      setOpen(false);
      onAdded();
    } catch (e: any) {
      toast.error(e?.message || 'Could not add that quote');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Plus className="mr-2 h-4 w-4" /> Add supplier quote</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Attach a supplier quote</DialogTitle>
          <DialogDescription>Reference cost for building this job's estimate — not sent to the customer.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="sq-name">Supplier</Label>
            <Input id="sq-name" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="e.g. ABC Timber" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sq-amount">Amount (USD)</Label>
            <Input id="sq-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sq-notes">Notes (optional)</Label>
            <Textarea id="sq-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Add quote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
