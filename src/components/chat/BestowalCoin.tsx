import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useCryptomusPay } from '@/hooks/useCryptomusPay';
import { toast } from 'sonner';
import Confetti from 'react-confetti';
import { supabase } from '@/integrations/supabase/client';
import { launchConfetti } from '@/utils/confetti';

interface BestowalCoinProps {
  assetId: string;
  assetType: 'message' | 'file' | 'audio' | 'image';
  senderId: string;
  senderName?: string;
  amount?: number;
  onBestowalComplete?: (amount: number) => void;
  disabled?: boolean;
}

const EMOJI_RAIN = ['💰', '✨', '🎉', '💎', '⭐', '🌟', '💫', '🔥'];

export function BestowalCoin({
  assetId,
  assetType,
  senderId,
  senderName,
  amount: initialAmount,
  onBestowalComplete,
  disabled = false,
}: BestowalCoinProps) {
  const [showSlider, setShowSlider] = useState(false);
  const [sliderValue, setSliderValue] = useState([initialAmount || 0.5]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [emojiRain, setEmojiRain] = useState<Array<{ id: number; x: number; y: number; emoji: string }>>([]);
  const { initiateCryptomusPayment, processing } = useCryptomusPay();

  const handleCoinClick = () => {
    if (disabled) return;
    setShowSlider(true);
  };

  const handleSliderChange = (value: number[]) => {
    setSliderValue(value);
    
    // Create emoji rain effect
    const newEmojis = Array.from({ length: 3 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * window.innerWidth,
      y: -50,
      emoji: EMOJI_RAIN[Math.floor(Math.random() * EMOJI_RAIN.length)],
    }));
    
    setEmojiRain(prev => [...prev, ...newEmojis]);
    
    // Remove emojis after animation
    setTimeout(() => {
      setEmojiRain(prev => prev.filter(e => !newEmojis.includes(e)));
    }, 2000);
  };

  const handleBestowal = async () => {
    const amount = sliderValue[0];
    
    try {
      // Create bestowal record
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to bestow');
        return;
      }

      // Trigger payment directly
      const paymentResult = await initiateCryptomusPayment({
        orchardId: assetId,
        amount: amount,
        pocketsCount: 1,
        currency: 'USDC',
        network: 'TRC20',
      });

      if (paymentResult?.paymentUrl) {
        // Show confetti
        launchConfetti();
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);

        // Show thank you message
        toast.success(`Thank you! ${senderName || 'Sender'} will receive ${amount} USDC`);

        // Close slider
        setShowSlider(false);

        // Callback
        onBestowalComplete?.(amount);

        // Open payment page
        window.open(paymentResult.paymentUrl, '_blank');
      }
    } catch (error) {
      console.error('Bestowal error:', error);
      toast.error('Failed to process bestowal');
    }
  };

  return (
    <>
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={100}
        />
      )}

      {/* Emoji Rain */}
      <AnimatePresence>
        {emojiRain.map((emoji) => (
          <motion.div
            key={emoji.id}
            className="fixed pointer-events-none z-50 text-2xl"
            initial={{ y: emoji.y, x: emoji.x, opacity: 1, scale: 0 }}
            animate={{ y: emoji.y + 200, opacity: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: 'easeOut' }}
          >
            {emoji.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Coin Button */}
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="inline-block"
      >
        <Button
          onClick={handleCoinClick}
          disabled={disabled || processing}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-full relative"
        >
          <Coins className="h-4 w-4 text-yellow-500" />
          <motion.div
            className="absolute inset-0 rounded-full bg-yellow-500/20"
            animate={{
              opacity: [0.5, 1, 0.5],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </Button>
      </motion.div>

      {/* Slider Modal */}
      <AnimatePresence>
        {showSlider && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowSlider(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background rounded-lg p-6 max-w-sm w-full shadow-xl"
            >
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <h3 className="font-semibold">Bestow Appreciation</h3>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="text-lg font-bold text-primary">
                    {sliderValue[0].toFixed(2)} USDC
                  </span>
                </div>
                <Slider
                  value={sliderValue}
                  onValueChange={handleSliderChange}
                  min={0.5}
                  max={5}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0.50</span>
                  <span>5.00</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSlider(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBestowal}
                  disabled={processing}
                  className="flex-1 bg-primary"
                >
                  {processing ? 'Processing...' : 'Bestow'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

