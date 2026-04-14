import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ParticleBackground } from './ParticleBackground';
import { AmbassadorSeal } from './AmbassadorSeal';
import { Crown, Zap } from 'lucide-react';

export const AmbassadorHero: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at center, #0f1419 0%, #0a0a0f 70%)' }}
    >
      <ParticleBackground />
      <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
        <AmbassadorSeal size="lg" className="mx-auto mb-8" />

        <h1 className="text-4xl sm:text-6xl font-extrabold mb-4 leading-tight">
          <span className="bg-gradient-to-r from-teal-400 via-emerald-300 to-amber-400 bg-clip-text text-transparent">
            Claim Your Throne.
          </span>
          <br />
          <span className="text-white">Unleash Your AI Legion.</span>
        </h1>

        <p className="text-lg sm:text-xl text-white/60 mb-3 max-w-xl mx-auto">
          Your personal AI marketing army that turns your business into a growth machine — running 24/7 while you sleep.
        </p>

        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-8"
          style={{
            background: 'linear-gradient(135deg, rgba(13,148,136,0.15), rgba(245,158,11,0.15))',
            border: '1px solid rgba(245,158,11,0.3)',
          }}
        >
          <Crown className="w-4 h-4 text-amber-400" />
          <span className="text-amber-300 font-bold text-lg">$5/month</span>
          <span className="text-white/50 text-sm">— cheaper than one coffee</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => {
              const el = document.getElementById('ambassador-value-stack');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-8 py-4 rounded-2xl text-lg font-bold text-white transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #0d9488, #14b8a6)',
              boxShadow: '0 0 30px rgba(13,148,136,0.4)',
            }}
          >
            <Zap className="w-5 h-5 inline mr-2" />
            Become a Tribe Ambassador
          </button>
        </div>
      </div>
    </section>
  );
};
