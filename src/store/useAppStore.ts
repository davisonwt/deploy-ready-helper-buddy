import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  compactView: boolean;
}

interface AppState {
  // Notifications
  notifications: Notification[];
  addNotification: (message: string, type?: Notification['type']) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // User Preferences
  userPreferences: UserPreferences;
  setPreferences: (prefs: Partial<UserPreferences>) => void;
  setTheme: (theme: UserPreferences['theme']) => void;

  // UI State
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Active filters (for various pages)
  activeFilters: Record<string, any>;
  setFilter: (page: string, filters: any) => void;
  clearFilters: (page: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Notifications
      notifications: [],
      addNotification: (message, type = 'info') => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        set({
          notifications: [
            ...get().notifications,
            { id, message, type, timestamp: Date.now() }
          ]
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
          get().removeNotification(id);
        }, 5000);
      },
      removeNotification: (id) =>
        set({
          notifications: get().notifications.filter((n) => n.id !== id)
        }),
      clearNotifications: () => set({ notifications: [] }),

      // User Preferences
      userPreferences: {
        theme: 'system',
        language: 'en',
        emailNotifications: true,
        pushNotifications: true,
        compactView: false
      },
      setPreferences: (prefs) =>
        set({
          userPreferences: { ...get().userPreferences, ...prefs }
        }),
      setTheme: (theme) =>
        set({
          userPreferences: { ...get().userPreferences, theme }
        }),

      // UI State
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setSidebarCollapsed: (collapsed) =>
        set({ sidebarCollapsed: collapsed }),

      // Active Filters
      activeFilters: {},
      setFilter: (page, filters) =>
        set({
          activeFilters: { ...get().activeFilters, [page]: filters }
        }),
      clearFilters: (page) => {
        const { [page]: _, ...rest } = get().activeFilters;
        set({ activeFilters: rest });
      }
    }),
    {
      name: 'sow2grow-app-storage',
      partialize: (state) => ({
        userPreferences: state.userPreferences,
        sidebarCollapsed: state.sidebarCollapsed,
        activeFilters: state.activeFilters
      })
    }
  )
);

// Convenience hooks
export const useNotifications = () => {
  const notifications = useAppStore((state) => state.notifications);
  const addNotification = useAppStore((state) => state.addNotification);
  const removeNotification = useAppStore((state) => state.removeNotification);
  const clearNotifications = useAppStore((state) => state.clearNotifications);
  
  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications
  };
};

export const useUserPreferences = () => {
  const preferences = useAppStore((state) => state.userPreferences);
  const setPreferences = useAppStore((state) => state.setPreferences);
  const setTheme = useAppStore((state) => state.setTheme);
  
  return {
    preferences,
    setPreferences,
    setTheme
  };
};
