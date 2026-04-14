import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export const FloatingAmbassadorOrb: React.FC = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/tribe-ambassador')}
      className="fixed top-20 right-4 z-40 group"
      aria-label="Become a Tribe Ambassador"
    >
      <div className="relative w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
        style={{
          background: 'linear-gradient(135deg, #0d9488, #f59e0b)',
          boxShadow: '0 0 20px rgba(13,148,136,0.6), 0 0 40px rgba(245,158,11,0.3)',
        }}
      >
        <Sparkles className="w-6 h-6 text-white" />
        <div className="absolute inset-0 rounded-full animate-ping opacity-20"
          style={{ background: 'linear-gradient(135deg, #0d9488, #f59e0b)' }}
        />
      </div>
      <div className="absolute top-full right-0 mt-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 text-white text-xs px-3 py-1.5 rounded-lg border border-white/10">
        Join the Tribe — Become an Ambassador
      </div>
    </button>
  );
};
