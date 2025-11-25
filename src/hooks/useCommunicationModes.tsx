import { useState } from 'react';

export type CommunicationMode = 'chat' | 'community' | 'classroom' | 'lecture' | 'training' | 'radio';

interface UnreadCounts {
  chat: number;
  community: number;
  classroom: number;
  lecture: number;
  training: number;
  radio: number;
}

export const useCommunicationModes = () => {
  const [activeMode, setActiveMode] = useState<CommunicationMode>('chat');
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({
    chat: 0,
    community: 0,
    classroom: 0,
    lecture: 0,
    training: 0,
    radio: 0,
  });

  const clearUnread = (mode: CommunicationMode) => {
    setUnreadCounts(prev => ({
      ...prev,
      [mode]: 0,
    }));
  };

  return {
    activeMode,
    setActiveMode,
    unreadCounts,
    clearUnread,
  };
};
