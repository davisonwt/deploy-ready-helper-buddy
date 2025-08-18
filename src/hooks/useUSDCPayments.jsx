// Temporarily disabled to fix React issues - will re-enable after Buffer polyfill is fixed
import { useState } from 'react';

export function useUSDCPayments() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  return {
    loading,
    error,
    checkSufficientBalance: () => false,
    processBestowPart: async () => ({ success: false, error: 'Temporarily disabled' }),
    getTransactionHistory: async () => ({ success: false, error: 'Temporarily disabled' }),
    formatUSDC: (amount) => `$${amount?.toFixed(2) || '0.00'}`,
    isWalletReady: false,
  };
}