import { createContext } from 'react';

export const CallManagerContext = createContext(null);

export const CallManagerProvider = ({ children, value }) => {
  return (
    <CallManagerContext.Provider value={value}>
      {children}
    </CallManagerContext.Provider>
  );
};
