import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Car, ArrowRight } from 'lucide-react';

export const DriverPromoCard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl overflow-hidden bg-card border border-border/30 shadow-md">
      <video
        src="/videos/register_vehicle.mp4"
        controls
        playsInline
        preload="metadata"
        className="w-full aspect-video object-cover"
      />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Car className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-sm">Become a Community Driver</h3>
            <p className="text-xs text-muted-foreground">Register your vehicle & serve the tribe</p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => navigate('/register-vehicle')}
          className="w-full"
        >
          Register Your Vehicle
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
};
