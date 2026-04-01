import React from 'react';
import { Shield } from 'lucide-react';

interface EscrowBadgeProps {
  size?: 'sm' | 'md';
}

export const EscrowBadge: React.FC<EscrowBadgeProps> = ({ size = 'sm' }) => {
  const isSmall = size === 'sm';
  return (
    <div className={`flex items-center gap-1.5 ${isSmall ? 'p-2' : 'p-3'} rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200/50 dark:border-green-800/30`}>
      <Shield className={`${isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-green-600 dark:text-green-400`} />
      <p className={`${isSmall ? 'text-[11px]' : 'text-xs'} text-green-700 dark:text-green-400 font-medium`}>
        Payment held in secure escrow until pickup confirmed
      </p>
    </div>
  );
};
