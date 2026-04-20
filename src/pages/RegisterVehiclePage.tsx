import React from 'react';
import { Car, MapPin, DollarSign, Sparkles } from 'lucide-react';
import VehicleRegistrationForm from '@/components/drivers/VehicleRegistrationForm';
import { FormShell } from '@/components/forms';

const RegisterVehiclePage: React.FC = () => {
  return (
    <FormShell
      icon={Car}
      eyebrow="join the wandering wheel"
      title="Help Grow Our Community"
      subtitle="Offer your vehicle for deliveries, transport, or hauling and connect with fellow sowers who need your help."
      backTo="/dashboard"
      backLabel="Back to dashboard"
      size="lg"
      benefits={[
        { icon: DollarSign, label: 'Earn on every trip' },
        { icon: MapPin, label: 'Serve your local tribe' },
        { icon: Sparkles, label: '60-second sign-up' },
      ]}
      heroSlot={
        <div className="overflow-hidden rounded-2xl border border-amber-400/20 bg-card/40 shadow-[0_18px_50px_-20px_hsl(var(--amber-500)/0.45)] backdrop-blur-md">
          <video
            src="/videos/banners/wandering-wheel.mp4"
            controls
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="aspect-video w-full object-cover"
          />
          <div className="bg-card/60 p-3 text-center text-xs text-muted-foreground backdrop-blur-md">
            🌱 See how easy it is to register your vehicle and start serving the community
          </div>
        </div>
      }
    >
      <VehicleRegistrationForm />
    </FormShell>
  );
};

export default RegisterVehiclePage;
