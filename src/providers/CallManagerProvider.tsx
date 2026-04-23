import { PropsWithChildren } from 'react';
import { CallManagerContext } from '@/contexts/CallManagerContext';
import { useCallManagerInternal } from '@/hooks/useCallManager';

export const CallManagerProvider = ({ children }: PropsWithChildren) => {
  // Create the call manager value via the hook
  const value = useCallManagerInternal();
  return (
    <CallManagerContext.Provider value={value}>
      {children}
    </CallManagerContext.Provider>
  );
};
