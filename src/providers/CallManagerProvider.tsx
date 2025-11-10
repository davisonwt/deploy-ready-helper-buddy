import { PropsWithChildren } from 'react';
import { CallManagerContext } from '@/contexts/CallManagerContext';
import { useCallManager } from '@/hooks/useCallManager';

export const CallManagerProvider = ({ children }: PropsWithChildren) => {
  // Create the call manager value via the hook
  const value = useCallManager();
  return (
    <CallManagerContext.Provider value={value}>
      {children}
    </CallManagerContext.Provider>
  );
};
