import { supabase } from "@/integrations/supabase/client"
import { useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "@/hooks/use-toast"

// Register service worker for push notifications
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Workers are not supported')
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    console.log('Service Worker registered:', registration)
    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    throw error
  }
}

// Request notification permission
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    throw new Error('Notifications are not supported')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission denied')
  }

  return permission
}

// Initialize push notifications
export async function initializePushNotifications(userId: string) {
  try {
    await requestNotificationPermission()
    const registration = await registerServiceWorker()
    const subscription = await subscribeToPush(userId)
    
    return {
      registration,
      subscription
    }
  } catch (error) {
    console.error('Failed to initialize push notifications:', error)
    return null
  }
}

// Send local browser notification
export function sendLocalNotification(title: string, options: NotificationOptions = {}) {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      badge: '/placeholder.svg',
      icon: '/placeholder.svg',
      ...options
    })
  }
}

// Notification types
export type NotificationType = 
  | 'incoming_call'
  | 'new_message'
  | 'new_orchard'
  | 'new_product'
  | 'orchard_update'
  | 'product_purchased';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
  data?: Record<string, unknown>;
}

// Subscribe to push notifications
export async function subscribeToPush(userId: string) {
  try {
    const registration = await navigator.serviceWorker.ready as any
    
    // Check if already subscribed
    const existingSubscription = await registration.pushManager.getSubscription()
    if (existingSubscription) {
      return existingSubscription
    }

    // Create new subscription
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        'BEl62iUYgUivxIkv69yViEuiBIa40HI80NM9HZfC_vASgF4AFf6KCPSH8nWzU8dPUE8Pp6Q6BWX1_7-ECp7LZ1A' // Replace with your VAPID public key
      )
    })

    // Save subscription to database
    await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        subscription: subscription.toJSON() as any,
        is_active: true
      })

    return subscription
  } catch (error) {
    console.error('Push subscription failed:', error)
    throw error
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(userId: string) {
  try {
    const registration = await navigator.serviceWorker.ready as any
    const subscription = await registration.pushManager.getSubscription()
    
    if (subscription) {
      await subscription.unsubscribe()
    }

    // Update database
    await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .eq('user_id', userId)

  } catch (error) {
    console.error('Push unsubscription failed:', error)
    throw error
  }
}

// Convert VAPID key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Hook for push notifications
export const usePushNotifications = () => {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    // Setup realtime notifications
    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const notification = payload.new
          
          // Show toast notification
          toast({
            title: notification.title,
            description: notification.message,
          })

          // Show browser notification if permission granted
          if (Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/placeholder.svg',
              badge: '/placeholder.svg'
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const enableNotifications = async () => {
    if (!user) return false

    try {
      await requestNotificationPermission()
      await registerServiceWorker()
      await subscribeToPush(user.id)
      
      toast({
        title: "Notifications enabled",
        description: "You'll now receive push notifications for important updates",
      })
      
      return true
    } catch (error) {
      console.error('Failed to enable notifications:', error)
      toast({
        title: "Failed to enable notifications",
        description: "Please check your browser settings and try again",
        variant: "destructive"
      })
      return false
    }
  }

  const disableNotifications = async () => {
    if (!user) return

    try {
      await unsubscribeFromPush(user.id)
      
      toast({
        title: "Notifications disabled",
        description: "You won't receive push notifications anymore",
      })
    } catch (error) {
      console.error('Failed to disable notifications:', error)
    }
  }

  return {
    enableNotifications,
    disableNotifications
  }
}