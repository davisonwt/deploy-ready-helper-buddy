import React, { createContext, useContext } from 'react';
import { useSabbath } from '@/hooks/useSabbath';

interface SabbathContextType {
  isSabbath: boolean;
  loading: boolean;
  sacredDayNumber: number;
  nextSabbathIn: number;
}

const SabbathContext = createContext<SabbathContextType>({
  isSabbath: false,
  loading: true,
  sacredDayNumber: 0,
  nextSabbathIn: 0,
});

export const SabbathProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const sabbath = useSabbath();

  // Temporary test override via URL param: ?sabbath_test=true
  const urlParams = new URLSearchParams(window.location.search);
  const testOverride = urlParams.get('sabbath_test') === 'true';

  const value = testOverride
    ? { ...sabbath, isSabbath: true, loading: false }
    : sabbath;

  return (
    <SabbathContext.Provider value={value}>
      {children}
    </SabbathContext.Provider>
  );
};

export const useSabbathContext = () => useContext(SabbathContext);
