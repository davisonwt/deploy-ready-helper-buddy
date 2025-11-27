import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  User
} from 'lucide-react'
import { supabase } from "@/integrations/supabase/client"
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { CustomWatch } from '@/components/watch/CustomWatch'
import { getCreatorTime } from '@/utils/customTime'
import { getCreatorDate } from '@/utils/customCalendar'


export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState(null)
  const [userRoles, setUserRoles] = useState([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const isAdminOrGosat = userRoles.includes('admin') || userRoles.includes('gosat')
  
  // Custom time state for display
  const [currentTime, setCurrentTime] = useState(new Date())
  const [userLat, setUserLat] = useState(-26.2) // Default: South Africa
  const [userLon, setUserLon] = useState(28.0) // Default: South Africa
  const [customDate, setCustomDate] = useState(getCreatorDate(new Date()))

  // Binance Pay - no wallet state needed

  useEffect(() => {
    let mounted = true
    const loadRoles = async () => {
      if (!user?.id) { setUserRoles([]); return }
      try {
        setRolesLoading(true)
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
        if (error) throw error
        if (!mounted) return
        setUserRoles((data || []).map(r => r.role))
      } catch (e) {
        if (mounted) setUserRoles([])
      } finally {
        if (mounted) setRolesLoading(false)
      }
    }
    loadRoles()
    return () => { mounted = false }
  }, [user?.id])

  // Get user location and update custom time
  useEffect(() => {
    // Try to get user's location from browser
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLat(position.coords.latitude)
          setUserLon(position.coords.longitude)
        },
        () => {
          // Fallback to default if geolocation fails
          console.log('Using default location (South Africa: -26.2°N, 28.0°E)')
        }
      )
    }
    
    // Initialize custom date
    const now = new Date()
    setCustomDate(getCreatorDate(now))
  }, [])

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      setCurrentTime(now)
      setCustomDate(getCreatorDate(now))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (user && !authLoading) {
      console.log('🔍 Dashboard: Starting data fetch for user:', user.id)
      setError(null)
      
      // Fetch user profile
      const fetchProfile = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*') // User can see their own complete profile
            .eq('user_id', user.id)
            .maybeSingle()
          
          if (error && error.code !== 'PGRST116') { // Ignore "no rows returned" error
            const errorMessage = error.message || error.details || error.hint || JSON.stringify(error) || 'Unknown error'
            console.error('❌ Dashboard: Error fetching profile:', {
              message: errorMessage,
              code: error.code,
              details: error.details,
              hint: error.hint,
              fullError: error
            })
            setError(`Failed to load profile: ${errorMessage}`)
          } else {
            setProfile(data)
            console.log('✅ Dashboard: Profile loaded', data ? 'with data' : 'no profile found')
          }
        } catch (error) {
          const errorMessage = error?.message || error?.toString() || JSON.stringify(error) || 'Unknown error'
          console.error('❌ Dashboard: Error fetching profile:', {
            message: errorMessage,
            error: error,
            stack: error?.stack
          })
          setError(`Failed to load profile: ${errorMessage}`)
        }
      }
      
      // Execute all data fetching
      Promise.all([
        fetchProfile()
      ]).catch(err => {
        console.error('❌ Dashboard: Error in data fetching:', err)
        setError('Failed to load dashboard data')
      })
    }
  }, [user, authLoading])


  // Show loading screen while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 dark:from-gray-900 dark:via-orange-950 dark:to-amber-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 dark:from-gray-900 dark:via-orange-950 dark:to-amber-900">
        <Card className="rounded-2xl bg-white/70 dark:bg-black/30 backdrop-blur-md border border-white/20 shadow-lg shadow-amber-500/10 p-8">
        <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 dark:from-gray-900 dark:via-orange-950 dark:to-amber-900">
      
      {/* Content wrapper */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Welcome Section with Profile Picture and Custom Watch - Mobile Responsive */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 rounded-2xl bg-white/70 dark:bg-black/30 backdrop-blur-md border border-white/20 shadow-lg shadow-amber-500/10 mb-6"
        >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-4 md:space-x-6 flex-1 min-w-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 sm:border-3 md:border-4 border-nav-dashboard shadow-md sm:shadow-lg flex-shrink-0">
              {user?.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-nav-dashboard to-nav-dashboard/80 flex items-center justify-center">
                  <User className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-card-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold py-2 sm:py-3 md:py-4 rounded-lg text-card-foreground truncate">
                Welcome back, {profile?.first_name || profile?.display_name || 'Friend'}!
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-card-foreground">
                Ready to grow your orchard today?
              </p>
              <p className="text-xs sm:text-sm mt-1 text-muted-foreground">
                Payment Method: USDC (USD Coin)
              </p>
            </div>
          </div>
          {/* Custom Watch */}
          <div className="flex-shrink-0">
            <CustomWatch compact={false} />
          </div>
        </div>
        {/* Custom Time Display - Bottom of welcome section */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-center">
            {/* Custom Date - Above custom time */}
            {customDate && (
              <div className="text-base sm:text-lg md:text-xl font-semibold text-card-foreground mb-1">
                Year {customDate.year} · Month {customDate.month} · Day {customDate.day} · {customDate.weekDay === 7 ? 'Sabbath' : `Week Day ${customDate.weekDay}`}
              </div>
            )}
            {/* Custom Time - Larger font */}
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-card-foreground mb-2">
              {getCreatorTime(currentTime, userLat, userLon).displayText}
            </div>
            {/* Gregorian Time - Smaller font */}
            <div className="text-xs sm:text-sm text-muted-foreground font-mono flex items-center justify-center gap-2 flex-wrap">
              <span>{currentTime.getFullYear()}/{String(currentTime.getMonth() + 1).padStart(2, '0')}/{String(currentTime.getDate()).padStart(2, '0')}</span>
              <span>{currentTime.toLocaleDateString('en-US', { weekday: 'long' })}</span>
              <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
            </div>
          </div>
        </div>
        </motion.div>

        {/* Dashboard Stats - New isolated component */}
        <DashboardStats />
      </div>
    </div>
  )
}