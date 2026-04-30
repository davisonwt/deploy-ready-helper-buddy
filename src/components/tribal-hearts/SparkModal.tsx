import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, X, Sparkles } from 'lucide-react';
import { TribalHeart } from './BondingAnimation';
import { TribalAudio } from '@/hooks/useTribalHeartsAudio';

interface SparkModalProps {
  open: boolean;
  recipientName?: string;
  recipientPhoto?: string;
  onClose: () => void;
  onSend: (message: string, voiceUrl?: string) => Promise<void> | void;
}

const PROMPTS = [
  'What moved me about you…',
  'I noticed we both love…',
  'Would love to know more about…',
  'Your spirit reminded me of…',
];

export const SparkModal: React.FC<SparkModalProps> = ({
  open,
  recipientName,
  recipientPhoto,
  onClose,
  onSend,
}) => {
  const [message, setMessage] = useState('');
  const [recording, setRecording] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [sending, setSending] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const promptIdx = useRef(Math.floor(Math.random() * PROMPTS.length));

  const startRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = () => {
        setVoiceBlob(new Blob(chunksRef.current, { type: 'audio/webm' }));
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
      // Auto-stop at 15s
      setTimeout(() => {
        if (recRef.current?.state === 'recording') {
          recRef.current.stop();
          setRecording(false);
        }
      }, 15000);
    } catch (e) {
      console.warn('mic denied', e);
    }
  };

  const stopRecord = () => {
    recRef.current?.stop();
    setRecording(false);
  };

  const handleSend = async () => {
    setSending(true);
    TribalAudio.playSparkSent();
    if (navigator.vibrate) navigator.vibrate([20, 40, 30]);
    try {
      // For now we don't upload voice (would need storage bucket).
      // Keeping the UX so it can be wired later.
      await onSend(message.trim(), undefined);
      setMessage('');
      setVoiceBlob(null);
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9000] flex items-end md:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            background:
              'radial-gradient(circle at center, hsl(20 30% 8% / 0.85) 0%, hsl(0 0% 0% / 0.92) 100%)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <motion.div
            className="relative w-full md:max-w-lg rounded-t-3xl md:rounded-3xl p-6 md:p-8"
            initial={{ y: 60, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background:
                'linear-gradient(180deg, hsl(25 30% 14%) 0%, hsl(20 25% 10%) 100%)',
              border: '1px solid hsl(25 40% 25%)',
              boxShadow:
                '0 -10px 60px hsl(15 80% 30% / 0.4), 0 0 0 1px hsl(38 60% 50% / 0.1)',
            }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full transition-colors"
              style={{ color: 'hsl(38 30% 70%)' }}
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center mb-6">
              <TribalHeart size={56} color="warm" pulse />
              <h2
                className="mt-4 text-2xl font-serif italic"
                style={{ color: 'hsl(38 95% 80%)' }}
              >
                Ignite the Spark
              </h2>
              {recipientName && (
                <p className="text-sm mt-1" style={{ color: 'hsl(38 30% 70%)' }}>
                  with {recipientName}
                </p>
              )}
            </div>

            <p
              className="text-sm italic mb-3"
              style={{ color: 'hsl(38 35% 65%)' }}
            >
              {PROMPTS[promptIdx.current]}
            </p>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 240))}
              placeholder="A few warm, genuine words…"
              rows={3}
              className="w-full rounded-2xl p-4 text-sm resize-none outline-none transition-all"
              style={{
                background: 'hsl(20 25% 8%)',
                border: '1px solid hsl(25 35% 22%)',
                color: 'hsl(38 50% 88%)',
              }}
            />
            <div
              className="text-xs mt-1 text-right"
              style={{ color: 'hsl(38 25% 55%)' }}
            >
              {message.length}/240
            </div>

            {/* Voice option */}
            <div className="mt-4 flex items-center justify-center gap-3">
              {!recording ? (
                <button
                  onClick={startRecord}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all hover:scale-105"
                  style={{
                    background: 'hsl(75 25% 18%)',
                    color: 'hsl(75 50% 75%)',
                    border: '1px solid hsl(75 30% 28%)',
                  }}
                >
                  <Mic size={16} />
                  {voiceBlob ? 'Re-record voice (15s)' : 'Or send a voice spark (15s)'}
                </button>
              ) : (
                <button
                  onClick={stopRecord}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm animate-pulse"
                  style={{
                    background: 'hsl(15 70% 35%)',
                    color: 'hsl(38 95% 88%)',
                  }}
                >
                  <Square size={16} fill="currentColor" />
                  Recording… tap to stop
                </button>
              )}
            </div>

            <button
              onClick={handleSend}
              disabled={sending || (!message.trim() && !voiceBlob)}
              className="mt-6 w-full py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:scale-[1.02]"
              style={{
                background:
                  'linear-gradient(135deg, hsl(15 85% 55%) 0%, hsl(25 95% 60%) 100%)',
                color: 'hsl(20 30% 12%)',
                boxShadow: '0 8px 30px hsl(15 80% 50% / 0.5)',
              }}
            >
              <Sparkles size={18} />
              {sending ? 'Sending…' : 'Send Spark'}
            </button>

            <p
              className="text-center text-xs mt-3 italic"
              style={{ color: 'hsl(38 25% 55%)' }}
            >
              Take your time. Real connections don't rush.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
