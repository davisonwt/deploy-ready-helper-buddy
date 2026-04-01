import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sprout, ArrowRight } from 'lucide-react';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { EscrowBadge } from '@/components/provider/EscrowBadge';

import farmerImg from '/images/providers/farmer.jpg';
import homesteaderImg from '/images/providers/homesteader.jpg';
import manufacturerImg from '/images/providers/manufacturer.jpg';

const SUBTYPES = [
  { key: 'farmer', icon: '🌾', label: 'Farmer', desc: 'Grow & sell produce', img: farmerImg },
  { key: 'homesteader', icon: '🏡', label: 'Homesteader', desc: 'Handmade goods', img: homesteaderImg },
  { key: 'manufacturer', icon: '🏭', label: 'Manufacturer', desc: 'Produce at scale', img: manufacturerImg },
];

interface ProviderActionCardProps {
  theme?: DashboardTheme;
}

export const ProviderActionCard: React.FC<ProviderActionCardProps> = ({ theme }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div
          className="p-2 rounded-xl"
          style={{ background: theme?.secondaryButton ?? 'hsl(var(--muted))' }}
        >
          <Sprout className="w-5 h-5" style={{ color: theme?.accent ?? 'hsl(var(--primary))' }} />
        </div>
        <div>
          <h2
            className="text-base font-extrabold tracking-tight"
            style={{ color: theme?.textPrimary ?? 'hsl(var(--foreground))' }}
          >
            Providers
          </h2>
          <p
            className="text-[10px]"
            style={{ color: theme?.textSecondary ?? 'hsl(var(--muted-foreground))' }}
          >
            Sell directly to the community
          </p>
        </div>
      </div>

      {/* Register-as row */}
      <div>
        <p
          className="text-[11px] font-semibold mb-2 uppercase tracking-wider"
          style={{ color: theme?.textSecondary ?? 'hsl(var(--muted-foreground))' }}
        >
          🌿 Register as
        </p>
        <div className="grid grid-cols-3 gap-2">
          {SUBTYPES.map((s) => (
            <button
              key={s.key}
              onClick={() => navigate(`/register-provider?type=${s.key}`)}
              className="block rounded-2xl overflow-hidden transition-all shadow-md text-left hover:scale-[1.02] active:scale-[0.98] relative h-[100px]"
            >
              <img
                src={s.img}
                alt={s.label}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
              <div className="relative h-full flex flex-col justify-between p-3">
                <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-sm">{s.icon}</span>
                </div>
                <div>
                  <h3 className="font-bold text-white text-xs">{s.label}</h3>
                  <p className="text-[9px] text-white/80">{s.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <Button
          size="lg"
          onClick={() => navigate('/register-provider')}
          className="w-full h-12 text-base font-semibold"
        >
          <Sprout className="w-5 h-5 mr-2" />
          Register as Provider
        </Button>
        <Button
          variant="outline"
          size="default"
          onClick={() => navigate('/providers')}
          className="w-full h-11"
        >
          Browse All Providers
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Escrow badge */}
      <EscrowBadge size="sm" />
    </div>
  );
};
