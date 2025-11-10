import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  initializePushNotifications, 
  sendLocalNotification,
  NotificationPayload 
} from '@/lib/pushNotifications';

export const useNotifications = () => {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // Initialize push notifications
  const initializeNotifications = async () => {
    if (!user?.id || isInitializing) return;

    setIsInitializing(true);
    try {
      const result = await initializePushNotifications(user.id);
      
      if (result) {
        // Store subscription in database for server-side push
        const subscriptionData = result.subscription.toJSON();
        
        await supabase
          .from('push_subscriptions')
          .upsert([{
            user_id: user.id,
            subscription: JSON.parse(JSON.stringify(subscriptionData)),
            is_active: true
          }], {
            onConflict: 'user_id'
          });

        setIsEnabled(true);
      }
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  // Listen for real-time notifications
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const notification = payload.new as NotificationPayload & { id: string };
          
          // Show local notification
          sendLocalNotification(notification.title, {
            body: notification.body,
            tag: notification.id,
            data: notification.data,
            requireInteraction: notification.type === 'incoming_call'
          });

          // Play sound for calls
          if (notification.type === 'incoming_call') {
            const audio = new Audio('/notification-sound.mp3');
            audio.play().catch(err => console.log('Could not play sound:', err));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  return {
    isEnabled,
    isInitializing,
    initializeNotifications
  };
};
