/**
 * Show a browser notification for an incoming call.
 * Returns the Notification instance so the caller can close it later.
 */
export function showCallNotification(callerName: string, callType: string = 'audio'): Notification | null {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return null;
  }

  const title = `📞 Incoming ${callType === 'video' ? 'Video' : ''} Call`;
  const notification = new Notification(title, {
    body: `${callerName} is calling you`,
    icon: '/placeholder.svg',
    badge: '/placeholder.svg',
    tag: 'incoming-call', // replaces previous call notification
    requireInteraction: true, // stays until user interacts
    vibrate: [200, 100, 200, 100, 200],
  } as NotificationOptions);

  // Clicking the notification focuses the app window
  notification.onclick = () => {
    window.focus();
    notification.close();
  };

  return notification;
}

/**
 * Close a previously shown call notification.
 */
export function closeCallNotification(notification: Notification | null) {
  try {
    notification?.close();
  } catch { /* may already be closed */ }
}
