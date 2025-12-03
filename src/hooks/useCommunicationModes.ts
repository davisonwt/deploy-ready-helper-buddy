import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CommunicationMode = 
  | 'chatapp'
  | 'circles'
  | 'chat' 
  | 'community' 
  | 'classroom' 
  | 'lecture' 
  | 'training' 
  | 'radio';

interface CommunicationModeStore {
  activeMode: CommunicationMode;
  setActiveMode: (mode: CommunicationMode) => void;
  unreadCounts: Record<CommunicationMode, number>;
  incrementUnread: (mode: CommunicationMode) => void;
  clearUnread: (mode: CommunicationMode) => void;
  isTransitioning: boolean;
  setIsTransitioning: (value: boolean) => void;
}

export const useCommunicationModes = create<CommunicationModeStore>()(
  persist(
    (set) => ({
      activeMode: 'chatapp',
      setActiveMode: (mode) => set({ activeMode: mode, isTransitioning: true }),
      unreadCounts: {
        chatapp: 0,
        circles: 0,
        chat: 0,
        community: 0,
        classroom: 0,
        lecture: 0,
        training: 0,
        radio: 0,
      },
      incrementUnread: (mode) =>
        set((state) => ({
          unreadCounts: {
            ...state.unreadCounts,
            [mode]: state.unreadCounts[mode] + 1,
          },
        })),
      clearUnread: (mode) =>
        set((state) => ({
          unreadCounts: {
            ...state.unreadCounts,
            [mode]: 0,
          },
        })),
      isTransitioning: false,
      setIsTransitioning: (value) => set({ isTransitioning: value }),
    }),
    {
      name: 'communication-modes-storage',
    }
  )
);
