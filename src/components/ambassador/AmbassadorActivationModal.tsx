import React, { useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AmbassadorSeal } from './AmbassadorSeal';
import { ParticleBackground } from './ParticleBackground';
import { useNavigate } from 'react-router-dom';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AmbassadorActivationModal: React.FC<Props> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (open && window.launchConfetti) {
      window.launchConfetti();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 border-0 overflow-hidden bg-transparent shadow-none">
        <div
          className="relative rounded-2xl p-8 text-center overflow-hidden"
          style={{ background: 'radial-gradient(ellipse at center, #0f1419, #0a0a0f)' }}
        >
          <ParticleBackground />
          <div className="relative z-10">
            <AmbassadorSeal size="lg" className="mx-auto mb-6" />
            <h2 className="text-2xl font-extrabold text-white mb-2">
              Welcome to the Inner Circle
            </h2>
            <p className="text-amber-300 font-bold text-lg mb-1">Your AI Empire Awaits</p>
            <p className="text-white/50 text-sm mb-6">
              Your personal AI marketing army has been activated. Your business will never be the same.
            </p>
            <button
              onClick={() => {
                onOpenChange(false);
                navigate('/ambassador-hub');
              }}
              className="w-full px-6 py-3 rounded-xl text-white font-bold transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #0d9488, #14b8a6)',
                boxShadow: '0 0 20px rgba(13,148,136,0.4)',
              }}
            >
              Enter Your Command Center →
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
