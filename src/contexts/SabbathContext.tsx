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

  return (
    <SabbathContext.Provider value={sabbath}>
      {children}
    </SabbathContext.Provider>
  );
};

export const useSabbathContext = () => useContext(SabbathContext);
