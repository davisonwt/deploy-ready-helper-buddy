import { PropsWithChildren } from 'react';
import { CallManagerContext } from '@/contexts/CallManagerContext';
// Import the internal hook directly - only the provider should create the instance
import { useCallManagerInternal_PROVIDER_ONLY } from '@/hooks/useCallManager';

export const CallManagerProvider = ({ children }: PropsWithChildren) => {
  // Create the SINGLE call manager instance for the entire app
  const value = useCallManagerInternal_PROVIDER_ONLY();
  return (
    <CallManagerContext.Provider value={value}>
      {children}
    </CallManagerContext.Provider>
  );
};
