import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AmbassadorHero } from '@/components/ambassador/AmbassadorHero';
import { AmbassadorValueStack } from '@/components/ambassador/AmbassadorValueStack';
import { BackButton } from '@/components/navigation/BackButton';
import { Check, X, Crown, ArrowRight } from 'lucide-react';

const comparisons = [
  { without: 'Create content manually, hours per post', with: 'AI creates & publishes 24/7 on autopilot' },
  { without: 'Generic templates everyone uses', with: 'Custom branded assets fused with S2G seal' },
  { without: 'Guess what works, hope for the best', with: 'Analytics Oracle tracks everything, optimizes in real-time' },
  { without: 'One platform at a time', with: 'All 10+ platforms simultaneously' },
  { without: 'DIY brochures & funnels', with: 'AI-built funnels & landing pages in seconds' },
  { without: 'No community leverage', with: 'Private tribe network with group campaigns' },
];

export default function TribeAmbassadorPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
      <div className="absolute top-4 left-4 z-50">
        <BackButton className="text-white/60 hover:text-white" />
      </div>

      <AmbassadorHero />
      <AmbassadorValueStack />

      {/* Why Ambassadors Win */}
      <section className="py-20 px-6" style={{ background: 'linear-gradient(180deg, #0a0a0f, #0f1419)' }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-extrabold text-center mb-12">
            <span className="bg-gradient-to-r from-teal-400 to-amber-400 bg-clip-text text-transparent">
              Why Ambassadors Win
            </span>
          </h2>

          <div className="space-y-4">
            {comparisons.map((c, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <X className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <span className="text-white/50 text-sm">{c.without}</span>
                </div>
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.15)' }}>
                  <Check className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
                  <span className="text-white/70 text-sm font-medium">{c.with}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 text-center" style={{ background: '#0a0a0f' }}>
        <Crown className="w-10 h-10 text-amber-400 mx-auto mb-4" />
        <h2 className="text-3xl font-extrabold text-white mb-3">
          Ready to Join the Revolution?
        </h2>
        <p className="text-white/50 mb-8 max-w-md mx-auto">
          For the price of one coffee, get your own AI marketing army, exclusive branded assets, auto-publishing across 10+ platforms, and the prestige of being an official S2G Ambassador.
        </p>
        <button
          onClick={() => navigate('/ambassador-thumbnail')}
          className="px-8 py-4 rounded-2xl text-lg font-bold text-white transition-all hover:scale-105 inline-flex items-center gap-2"
          style={{
            background: 'linear-gradient(135deg, #0d9488, #f59e0b)',
            boxShadow: '0 0 30px rgba(13,148,136,0.4), 0 0 60px rgba(245,158,11,0.2)',
          }}
        >
          Become a Tribe Ambassador
          <ArrowRight className="w-5 h-5" />
        </button>
        <p className="text-white/30 text-xs mt-4">$5/month · Cancel anytime · Instant activation after approval</p>
      </section>
    </div>
  );
}
