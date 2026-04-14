import React from 'react';
import { Shield } from 'lucide-react';

interface AmbassadorSealProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AmbassadorSeal: React.FC<AmbassadorSealProps> = ({ size = 'md', className = '' }) => {
  const dims = { sm: 'w-8 h-8', md: 'w-14 h-14', lg: 'w-24 h-24' };
  const iconDims = { sm: 'w-4 h-4', md: 'w-7 h-7', lg: 'w-12 h-12' };

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full ${dims[size]} ${className}`}
      style={{
        background: 'linear-gradient(135deg, #0d9488, #f59e0b)',
        boxShadow: '0 0 20px rgba(13,148,136,0.5), 0 0 40px rgba(245,158,11,0.3)',
      }}
    >
      <div className="absolute inset-[2px] rounded-full bg-[#0a0a0f] flex items-center justify-center">
        <Shield className={`${iconDims[size]} text-amber-400`} />
      </div>
      <div className="absolute inset-0 rounded-full animate-pulse opacity-30"
        style={{ background: 'linear-gradient(135deg, #0d9488, #f59e0b)' }}
      />
    </div>
  );
};
