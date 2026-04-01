import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sprout, Home, Factory, ArrowRight } from 'lucide-react';

const SUBTYPES = [
  { key: 'farmer', icon: '🌾', label: 'Farmer', desc: 'Grow & sell fresh produce', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  { key: 'homesteader', icon: '🏡', label: 'Homesteader', desc: 'Handmade & homegrown goods', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  { key: 'manufacturer', icon: '🏭', label: 'Manufacturer', desc: 'Produce & distribute at scale', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
];

export const ProviderActionCard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl overflow-hidden bg-card border border-border/30 shadow-md flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 p-5 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <Badge className="bg-primary/20 text-primary text-xs font-semibold border-0">
            🌿 Providers
          </Badge>
        </div>
        <h3 className="text-xl font-bold text-foreground leading-tight">
          Become a Provider
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Sell directly to the community — fresh produce, handmade goods, or manufactured products.
        </p>
      </div>

      {/* Subtype cards */}
      <div className="p-4 space-y-2">
        {SUBTYPES.map((s) => (
          <div
            key={s.key}
            className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/20"
          >
            <span className="text-2xl">{s.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex flex-col gap-2">
        <Button
          size="lg"
          onClick={() => navigate('/register-provider')}
          className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
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

      {/* Escrow trust badge */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200/50 dark:border-green-800/30">
          <span className="text-base">🔒</span>
          <p className="text-xs text-green-700 dark:text-green-400 font-medium">
            All payments held in secure escrow until buyer confirms pickup
          </p>
        </div>
      </div>
    </div>
  );
};
