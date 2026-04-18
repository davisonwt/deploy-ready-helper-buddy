import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Car, Play, UserPlus, X } from 'lucide-react';

export const DriverPromoCard: React.FC = () => {
  const navigate = useNavigate();
  const [playing, setPlaying] = useState(false);
  const videoSrc = '/videos/banners/wandering-wheel.mp4';

  return (
    <div className="rounded-2xl overflow-hidden bg-card border border-border/30 shadow-md">
      <div className="relative aspect-video bg-black">
        {playing ? (
          <>
            <video
              src={videoSrc}
              autoPlay
              controls
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
            <button
              onClick={() => setPlaying(false)}
              className="absolute top-2 right-2 z-30 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center"
              aria-label="Close video"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <video
            src={videoSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
        )}
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Car className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-sm">Become a Wandering Wheel Provider</h3>
            <p className="text-xs text-muted-foreground">Register your vehicle & serve the tribe</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => setPlaying(true)}
            className="flex-1 h-9 font-semibold !text-white !border-0"
            style={{ backgroundImage: 'linear-gradient(135deg, #c026d3, #7c3aed)', backgroundColor: 'transparent' }}
          >
            <Play className="w-4 h-4 mr-1.5 fill-current" />
            Play
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/register-vehicle')}
            className="flex-1 h-9 font-semibold !text-white !border-0"
            style={{ backgroundImage: 'linear-gradient(135deg, #7c3aed, #a855f7)', backgroundColor: 'transparent' }}
          >
            <UserPlus className="w-4 h-4 mr-1.5" />
            Register
          </Button>
        </div>
      </div>
    </div>
  );
};
