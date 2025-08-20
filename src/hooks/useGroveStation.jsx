import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export function useGroveStation() {
  const [stationConfig, setStationConfig] = useState(null)
  const [currentShow, setCurrentShow] = useState(null)
  const [schedule, setSchedule] = useState([])
  const [djs, setDJs] = useState([])
  const [userDJProfile, setUserDJProfile] = useState(null)
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { user } = useAuth()
  const { toast } = useToast()

  // Fetch station configuration
  const fetchStationConfig = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('radio_station_config')
        .select('*')
        .single()

      if (error) throw error
      setStationConfig(data)
    } catch (err) {
      console.error('Error fetching station config:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch current show
  const fetchCurrentShow = async () => {
    try {
      const { data, error } = await supabase.rpc('get_current_radio_show')
      if (error) throw error
      setCurrentShow(data)
    } catch (err) {
      console.error('Error fetching current show:', err)
    }
  }

  // Fetch schedule for a specific date
  const fetchSchedule = async (date = new Date().toISOString().split('T')[0]) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_radio_schedule_for_date', {
        target_date: date
      })
      if (error) throw error
      setSchedule(data || [])
    } catch (err) {
      console.error('Error fetching schedule:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch all DJs
  const fetchDJs = async () => {
    try {
      const { data, error } = await supabase
        .from('radio_djs')
        .select('*')
        .eq('is_active', true)
        .order('dj_name')

      if (error) throw error
      setDJs(data || [])
    } catch (err) {
      console.error('Error fetching DJs:', err)
    }
  }

  // Fetch user's DJ profile
  const fetchUserDJProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('radio_djs')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setUserDJProfile(data)
    } catch (err) {
      console.error('Error fetching user DJ profile:', err)
    }
  }

  // Create DJ profile
  const createDJProfile = async (profileData) => {
    if (!user) return { success: false, error: 'Not authenticated' }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('radio_djs')
        .insert([{
          user_id: user.id,
          ...profileData
        }])
        .select()
        .single()

      if (error) throw error

      setUserDJProfile(data)
      toast({
        title: "DJ Profile Created!",
        description: `Welcome to Grove Station, ${data.dj_name}!`,
      })

      return { success: true, data }
    } catch (err) {
      console.error('Error creating DJ profile:', err)
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      })
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  // Update DJ profile
  const updateDJProfile = async (profileData) => {
    if (!userDJProfile) return { success: false, error: 'No DJ profile found' }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('radio_djs')
        .update(profileData)
        .eq('id', userDJProfile.id)
        .select()
        .single()

      if (error) throw error

      setUserDJProfile(data)
      toast({
        title: "Profile Updated",
        description: "Your DJ profile has been updated successfully!",
      })

      return { success: true, data }
    } catch (err) {
      console.error('Error updating DJ profile:', err)
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      })
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  // Create show
  const createShow = async (showData) => {
    if (!userDJProfile) return { success: false, error: 'DJ profile required' }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('radio_shows')
        .insert([{
          dj_id: userDJProfile.id,
          ...showData
        }])
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Show Created!",
        description: `"${data.show_name}" has been created successfully!`,
      })

      return { success: true, data }
    } catch (err) {
      console.error('Error creating show:', err)
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      })
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  // Schedule show
  const scheduleShow = async (scheduleData) => {
    if (!userDJProfile) return { success: false, error: 'DJ profile required' }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('radio_schedule')
        .insert([{
          dj_id: userDJProfile.id,
          ...scheduleData
        }])
        .select()
        .single()

      if (error) throw error

      // Refresh schedule
      await fetchSchedule()

      toast({
        title: "Show Scheduled!",
        description: "Your time slot has been booked successfully!",
      })

      return { success: true, data }
    } catch (err) {
      console.error('Error scheduling show:', err)
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      })
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  // Update show status (go live, end show, etc.)
  const updateShowStatus = async (scheduleId, status) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('radio_schedule')
        .update({ 
          status,
          listener_count: status === 'live' ? 1 : 0 
        })
        .eq('id', scheduleId)
        .select()
        .single()

      if (error) throw error

      // Refresh current show and schedule
      await Promise.all([fetchCurrentShow(), fetchSchedule()])

      const statusText = status === 'live' ? 'on air' : status
      toast({
        title: "Status Updated",
        description: `Show is now ${statusText}!`,
      })

      return { success: true, data }
    } catch (err) {
      console.error('Error updating show status:', err)
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      })
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  // Submit feedback
  const submitFeedback = async (scheduleId, feedbackData) => {
    try {
      const { data, error } = await supabase
        .from('radio_feedback')
        .insert([{
          schedule_id: scheduleId,
          listener_user_id: user?.id,
          ...feedbackData
        }])
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback!",
      })

      return { success: true, data }
    } catch (err) {
      console.error('Error submitting feedback:', err)
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      })
      return { success: false, error: err.message }
    }
  }

  // Fetch station stats
  const fetchStats = async (days = 7) => {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      const { data, error } = await supabase
        .from('radio_stats')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false })

      if (error) throw error
      setStats(data || [])
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  // Real-time subscriptions
  useEffect(() => {
    // Subscribe to station config changes
    const configSubscription = supabase
      .channel('station-config')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'radio_station_config' },
        () => fetchStationConfig()
      )
      .subscribe()

    // Subscribe to schedule changes
    const scheduleSubscription = supabase
      .channel('schedule-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'radio_schedule' },
        () => {
          fetchCurrentShow()
          fetchSchedule()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(configSubscription)
      supabase.removeChannel(scheduleSubscription)
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    fetchStationConfig()
    fetchCurrentShow()
    fetchSchedule()
    fetchDJs()
    if (user) {
      fetchUserDJProfile()
    }
  }, [user])

  return {
    // State
    stationConfig,
    currentShow,
    schedule,
    djs,
    userDJProfile,
    stats,
    loading,
    error,

    // Actions
    createDJProfile,
    updateDJProfile,
    createShow,
    scheduleShow,
    updateShowStatus,
    submitFeedback,
    fetchSchedule,
    fetchStats,
    fetchCurrentShow,

    // Computed
    isDJ: !!userDJProfile,
    canGoLive: userDJProfile && schedule.some(slot => 
      slot.dj_name === userDJProfile.dj_name && 
      slot.status === 'scheduled' &&
      new Date().getHours() === slot.hour_slot
    )
  }
}