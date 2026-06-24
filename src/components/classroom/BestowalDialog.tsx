import { useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useLiveBestowal } from '@/hooks/useLiveBestowal';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sowerId: string;
  bestowerId: string;
  sessionId: string;
  sessionKind?: string;
  hostName?: string | null;
}

const PRESETS = [1, 3, 5, 10, 25];

export function BestowalDialog({ open, onOpenChange, sowerId, bestowerId, sessionId, sessionKind = 'classroom', hostName }: Props) {
  const { sendBestowal, loading } = useLiveBestowal();
  const [amount, setAmount] = useState('5');
  const [note, setNote] = useState('');

  const submit = async () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return;
    const res = await sendBestowal({ sowerId, bestowerId, amount: n, sessionKind, sessionId, note });
    if (res.success) {
      onOpenChange(false);
      setNote('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#1a1430] border-[#8B5CF6]/40 text-[#E8D9B5]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-spectral text-2xl">
            <Heart className="h-5 w-5 text-[#F0B23F]" /> Free-will bestowal
          </DialogTitle>
          <DialogDescription className="text-[#E8D9B5]/70">
            Send a gift to {hostName || 'the host'} for this live session.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setAmount(String(p))}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold border transition ${
                  Number(amount) === p
                    ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                    : 'border-[#8B5CF6]/40 text-[#E8D9B5] hover:bg-[#8B5CF6]/10'
                }`}
              >
                ${p}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-[#E8D9B5]/60">Amount (USDT)</label>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              className="mt-1 bg-[#14101F] border-[#8B5CF6]/40 text-[#E8D9B5]"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-[#E8D9B5]/60">Note (optional)</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="A blessing or thank-you"
              className="mt-1 bg-[#14101F] border-[#8B5CF6]/40 text-[#E8D9B5]"
            />
          </div>

          <p className="text-[11px] text-[#E8D9B5]/50">
            10% tithing + 5% admin fee are applied automatically. An invoice is sent to your ChatApp inbox.
          </p>

          <Button
            onClick={submit}
            disabled={loading || !(Number(amount) > 0)}
            className="w-full h-12 bg-gradient-to-r from-[#8B5CF6] to-[#F0B23F] hover:opacity-90 text-white font-bold"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Heart className="h-4 w-4 mr-2" />}
            Bestow ${Number(amount || 0).toFixed(2)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
