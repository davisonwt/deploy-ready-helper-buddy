import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "@/hooks/use-toast"

// Safe hook wrapper to prevent dispatcher null errors
function useSafeAuth() {
  try {
    return useAuth()
  } catch (error) {
    console.warn('useAuth failed (dispatcher null):', error)
    return { user: null }
  }
}

interface Achievement {
  id: string
  achievement_type: string
  title: string
  description: string
  points_awarded: number
  icon?: string
  unlocked_at: string
}

interface UserPoints {
  total_points: number
  level: number
  points_to_next_level: number
}

interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  action_url?: string
  created_at: string
}

export function useGamification() {
  const { user } = useSafeAuth()
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAchievements = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false })

      if (error) throw error
      setAchievements(data || [])
    } catch (error) {
      console.error('Error fetching achievements:', error)
    }
  }

  const fetchUserPoints = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      
      if (!data) {
        // Initialize user points if they don't exist
        const { data: newUserPoints, error: insertError } = await supabase
          .from('user_points')
          .insert({ user_id: user.id })
          .select()
          .single()

        if (insertError) throw insertError
        setUserPoints(newUserPoints)
      } else {
        setUserPoints(data)
      }
    } catch (error) {
      console.error('Error fetching user points:', error)
    }
  }

  const fetchNotifications = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const createNotification = async (
    type: string,
    title: string,
    message: string,
    actionUrl?: string
  ) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('user_notifications')
        .insert({
          user_id: user.id,
          type,
          title,
          message,
          action_url: actionUrl
        })

      if (error) throw error
      
      // Refresh notifications
      await fetchNotifications()
      
      toast({
        title,
        description: message,
      })
    } catch (error) {
      console.error('Error creating notification:', error)
    }
  }

  useEffect(() => {
    if (user) {
      fetchAchievements()
      fetchUserPoints()
      fetchNotifications()
    }
  }, [user])

  return {
    achievements,
    userPoints,
    notifications,
    loading,
    fetchAchievements,
    fetchUserPoints,
    fetchNotifications,
    markNotificationAsRead,
    createNotification
  }
}