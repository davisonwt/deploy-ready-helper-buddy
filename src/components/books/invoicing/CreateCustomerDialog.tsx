import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import type { CustomerRow } from '@/hooks/useInvoicing';

interface Props {
  onCreate: (input: { name: string; email?: string | null; phone?: string | null; address?: string | null }) => Promise<CustomerRow>;
  onCreated: (customer: CustomerRow) => void;
  trigger?: React.ReactNode;
}

export default function CreateCustomerDialog({ onCreate, onCreated, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName('');
    setEmail('');
    setPhone('');
    setAddress('');
  };

  const save = async () => {
    if (!name.trim()) return toast.error('A name is required');
    setSaving(true);
    try {
      const customer = await onCreate({ name: name.trim(), email: email.trim() || null, phone: phone.trim() || null, address: address.trim() || null });
      toast.success('Customer added');
      onCreated(customer);
      reset();
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || 'Could not add that customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" /> New customer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a customer</DialogTitle>
          <DialogDescription>Any email — they don't need a Sow2Grow account to receive, accept or pay an invoice.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cust-name">Name</Label>
            <Input id="cust-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jane's Cafe" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cust-email">Email (optional)</Label>
            <Input id="cust-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cust-phone">Phone (optional)</Label>
            <Input id="cust-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cust-address">Address (optional)</Label>
            <Input id="cust-address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Add customer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
