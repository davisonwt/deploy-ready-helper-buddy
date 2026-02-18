import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'sow2grow-notification-prompted';

export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });
  const [hasBeenPrompted, setHasBeenPrompted] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  useEffect(() => {
    if (!('Notification' in window)) return;
    // Sync permission state (user may change in browser settings)
    setPermission(Notification.permission);
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported' as const;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      localStorage.setItem(STORAGE_KEY, 'true');
      setHasBeenPrompted(true);
      return result;
    } catch {
      return 'denied' as const;
    }
  }, []);

  const dismissPrompt = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setHasBeenPrompted(true);
  }, []);

  return {
    permission,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    isSupported: permission !== 'unsupported',
    hasBeenPrompted,
    requestPermission,
    dismissPrompt,
  };
}
