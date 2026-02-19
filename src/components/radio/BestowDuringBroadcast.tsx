import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Gift, Sparkles, Loader2, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

interface BestowDuringBroadcastProps {
  djId: string;
  djName: string;
  currentTrackTitle?: string;
  scheduleId?: string;
}

const SEED_AMOUNTS = [5, 10, 25, 50, 100];

export const BestowDuringBroadcast: React.FC<BestowDuringBroadcastProps> = ({
  djId,
  djName,
  currentTrackTitle,
  scheduleId,
}) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const finalAmount = customAmount ? parseInt(customAmount) || 0 : amount;

  const handleBestow = async () => {
    if (!user || finalAmount <= 0) return;

    setSending(true);
    try {
      // Insert into clubhouse_gifts (reusing existing table for radio gifts)
      const { error } = await supabase.from('clubhouse_gifts').insert({
        giver_id: user.id,
        receiver_id: djId,
        room_id: scheduleId || 'radio-broadcast',
        amount: finalAmount,
        currency: 'seeds',
        message: message || null,
        payment_status: 'completed',
      });

      if (error) throw error;

      // Update bestow count on schedule
      if (scheduleId) {
        await supabase.rpc('increment_bestow_count' as any, { schedule_id: scheduleId });
      }

      // Celebration!
      setShowSuccess(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#f97316', '#eab308', '#10b981'],
      });

      toast.success(`🌱 ${finalAmount} Seeds bestowed to ${djName}!`);

      setTimeout(() => {
        setShowSuccess(false);
        setOpen(false);
        setMessage('');
        setCustomAmount('');
        setAmount(10);
      }, 2500);
    } catch (err: any) {
      console.error('Bestow error:', err);
      toast.error(err.message || 'Failed to bestow');
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          onClick={() => setOpen(true)}
          className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md"
          size="sm"
        >
          <Gift className="h-4 w-4" />
          Bestow Seeds
        </Button>
      </motion.div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <AnimatePresence mode="wait">
            {showSuccess ? (
              <motion.div
                key="success"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="py-10 text-center space-y-4"
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: 3, duration: 0.5 }}
                  className="text-6xl"
                >
                  🌱
                </motion.div>
                <h3 className="text-xl font-bold text-primary">Seeds Planted!</h3>
                <p className="text-muted-foreground">
                  {finalAmount} Seeds bestowed to {djName}
                </p>
                <div className="flex justify-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="text-2xl"
                    >
                      ✨
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    Bestow Seeds to {djName}
                  </DialogTitle>
                  <DialogDescription>
                    Show love for this broadcast! 85% goes to the creator.
                  </DialogDescription>
                </DialogHeader>

                {currentTrackTitle && (
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg mt-3">
                    <Music className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm truncate">Now Playing: {currentTrackTitle}</span>
                  </div>
                )}

                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Choose amount</Label>
                    <div className="flex flex-wrap gap-2">
                      {SEED_AMOUNTS.map((a) => (
                        <Button
                          key={a}
                          type="button"
                          variant={amount === a && !customAmount ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setAmount(a);
                            setCustomAmount('');
                          }}
                          className="gap-1"
                        >
                          🌱 {a}
                        </Button>
                      ))}
                    </div>
                    <div className="mt-2">
                      <Input
                        type="number"
                        placeholder="Custom amount..."
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        min={1}
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-1 block">Message (optional)</Label>
                    <Textarea
                      placeholder="Great show! 🎙️"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={2}
                      maxLength={200}
                    />
                  </div>

                  {/* Revenue breakdown */}
                  <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg space-y-1">
                    <div className="flex justify-between">
                      <span>Creator receives (85%)</span>
                      <span className="font-medium">{Math.floor(finalAmount * 0.85)} Seeds</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tithes (10%)</span>
                      <span>{Math.floor(finalAmount * 0.1)} Seeds</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform (5%)</span>
                      <span>{Math.floor(finalAmount * 0.05)} Seeds</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleBestow}
                    disabled={sending || finalAmount <= 0}
                    className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Gift className="h-4 w-4" />
                    )}
                    Bestow {finalAmount} Seeds
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
};
