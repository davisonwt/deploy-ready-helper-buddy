import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useOrchards } from '../hooks/useOrchards'
import { useBestowals } from '../hooks/useBestowals.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Link } from 'react-router-dom'
import { 
  Sprout, 
  TreePine, 
  Heart, 
  TrendingUp, 
  Users, 
  DollarSign,
  Plus,
  Calendar,
  User,
  Globe,
  Clock,
  MessageSquare,
  BarChart3,
  Trophy,
  Shield,
  Loader2,
  Music,
  Megaphone,
  Car,
  Wrench,
  BookOpen
} from 'lucide-react'
import { formatCurrency } from '../utils/formatters'
import LiveTimezoneDisplay from '@/components/dashboard/LiveTimezoneDisplay'
import { supabase } from "@/integrations/supabase/client"
import LiveActivityWidget from '@/components/LiveActivityWidget'
import { GamificationHUD } from '@/components/gamification/GamificationHUD'
import { SecurityAlertsPanel } from '@/components/security/SecurityAlertsPanel'
import { getCreatorTime } from '@/utils/customTime'
import { getCreatorDateSync } from '@/utils/customCalendar'
import { getDayInfo } from '@/utils/sacredCalendar'
import { getCurrentTheme } from '@/utils/dashboardThemes'
import { AmbassadorThumbnail } from '@/components/marketing/AmbassadorThumbnail'
import { GoSatGhostAccessThumbnail } from '@/components/marketing/GoSatGhostAccessThumbnail'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { StatsFloatingButton } from '@/components/dashboard/StatsFloatingButton'
import { TopSowersTeaser } from '@/components/dashboard/TopSowersTeaser'
import { WalletSetupPrompt } from '@/components/wallet/WalletSetupPrompt'
import { SowerBalanceCard } from '@/components/wallet/SowerBalanceCard'
import SecurityQuestionsAlert from '@/components/auth/SecurityQuestionsAlert'


export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  // Replaced useOrchards hook to avoid hook dispatcher bug
  const [orchards, setOrchards] = useState([])
  const [orchardsLoading, setOrchardsLoading] = useState(false)
  const fetchOrchards = async (filters = {}) => {
    try {
      setOrchardsLoading(true)
      let query = supabase
        .from('orchards')
        .select(`*`)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category)
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }
      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError
      setOrchards(data || [])
    } catch (err) {
      console.error('Dashboard: Error fetching orchards:', err)
    } finally {
      setOrchardsLoading(false)
    }
  }
  const { getUserBestowals, loading: bestowalsLoading } = useBestowals()
  const [userOrchards, setUserOrchards] = useState([])
  const [userBestowals, setUserBestowals] = useState([])
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({
    totalOrchards: 0,
    totalBestowals: 0,
    totalRaised: 0,
    totalSupported: 0,
    totalFollowers: 0,
    newFollowers: 0
  })
  const [activeUsers, setActiveUsers] = useState(0)
  const [error, setError] = useState(null)
  const [userRoles, setUserRoles] = useState([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const isAdminOrGosat = userRoles.includes('admin') || userRoles.includes('gosat')
  
  // Custom time state for display
  const [currentTime, setCurrentTime] = useState(new Date())
  const [userLat, setUserLat] = useState(-26.2) // Default: South Africa
  const [userLon, setUserLon] = useState(28.0) // Default: South Africa
  const [customDate, setCustomDate] = useState(null)
  const [calendarData, setCalendarData] = useState(null)
  
  // Helper function to get sunrise/sunset times (using user-provided times)
  const getSunriseSunsetTimes = (date) => {
    // Create new date objects to avoid mutating the original
    const sunrise = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 5, 13, 0, 0)
    const sunset = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 19, 26, 0, 0)
    
    return { sunrise, sunset }
  }

  // Calculate calendar data directly (without CalendarWheel component)
  useEffect(() => {
    const updateCalendarData = () => {
      // Get current LOCAL time - no internet, no UTC conversion, just local time
      const now = new Date()
      const localYear = now.getFullYear()
      const localMonth = now.getMonth()
      const localDate = now.getDate()
      const localHour = now.getHours()
      const localMinute = now.getMinutes()
      
      // IMPORTANT: Day starts at sunrise (05:13), not midnight!
      // Compare current LOCAL time with sunrise time (05:13)
      const currentTimeMinutes = localHour * 60 + localMinute
      const sunriseTimeMinutes = 5 * 60 + 13 // 05:13 = 313 minutes
      
      const isBeforeSunrise = currentTimeMinutes < sunriseTimeMinutes
      
      // Debug logs only in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Dashboard] ===== SUNRISE CHECK =====`)
        console.log(`[Dashboard] Current LOCAL time: ${localHour}:${localMinute.toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`)
        console.log(`[Dashboard] Sunrise time: 05:13 (313 minutes)`)
        console.log(`[Dashboard] Current time in minutes: ${currentTimeMinutes}`)
        console.log(`[Dashboard] Is before sunrise? ${isBeforeSunrise}`)
        console.log(`[Dashboard] Current Gregorian date: ${localYear}-${localMonth + 1}-${localDate}`)
      }
      
      // If current time is before sunrise, we're still on the previous calendar day
      let effectiveYear = localYear
      let effectiveMonth = localMonth
      let effectiveDate = localDate
      
      if (isBeforeSunrise) {
        // Still on previous day - go back one day using date arithmetic
        const prevDayDate = new Date(localYear, localMonth, localDate)
        prevDayDate.setDate(prevDayDate.getDate() - 1)
        effectiveYear = prevDayDate.getFullYear()
        effectiveMonth = prevDayDate.getMonth()
        effectiveDate = prevDayDate.getDate()
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Dashboard] ⚠️ BEFORE SUNRISE - Using PREVIOUS day: ${effectiveYear}-${effectiveMonth + 1}-${effectiveDate}`)
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Dashboard] ✅ AFTER SUNRISE - Using CURRENT day: ${effectiveYear}-${effectiveMonth + 1}-${effectiveDate}`)
        }
      }
      
      // Calculate Creator date using PURE LOCAL date arithmetic (NO UTC, NO getTime())
      // Epoch: March 20, 2025 = Year 6028, Month 1, Day 1 (LOCAL time)
      const epochYear = 2025
      const epochMonth = 2 // March (0-indexed)
      const epochDate = 20
      
      // Calculate days difference using PURE date arithmetic (no milliseconds, no UTC)
      let totalDays = 0
      
      // Count days from epoch to effective date using local date components only
      let currentYear = epochYear
      let currentMonth = epochMonth
      let currentDate = epochDate
      
      const gregorianDaysPerMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
      
      // Check for leap years
      const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
      
      while (currentYear < effectiveYear || 
             (currentYear === effectiveYear && currentMonth < effectiveMonth) ||
             (currentYear === effectiveYear && currentMonth === effectiveMonth && currentDate < effectiveDate)) {
        totalDays++
        currentDate++
        
        let daysInCurrentMonth = gregorianDaysPerMonth[currentMonth]
        if (currentMonth === 1 && isLeapYear(currentYear)) {
          daysInCurrentMonth = 29 // February in leap year
        }
        
        if (currentDate > daysInCurrentMonth) {
          currentDate = 1
          currentMonth++
          if (currentMonth > 11) {
            currentMonth = 0
            currentYear++
          }
        }
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Dashboard] Effective LOCAL: ${effectiveYear}-${effectiveMonth + 1}-${effectiveDate}`)
        console.log(`[Dashboard] Epoch LOCAL: ${epochYear}-${epochMonth + 1}-${epochDate}`)
        console.log(`[Dashboard] Days since epoch (PURE LOCAL): ${totalDays}`)
      }
      
      // Calculate Creator calendar date
      const daysPerMonth = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31]
      let year = 6028
      let remainingDays = totalDays
      
      // Calculate year
      while (remainingDays >= 365) {
        remainingDays -= 365
        year++
      }
      
      // Calculate month and day
      let month = 1
      let day = remainingDays + 1
      
      while (day > daysPerMonth[month - 1]) {
        day -= daysPerMonth[month - 1]
        month++
        if (month > 12) {
          month = 1
          year++
        }
      }
      
      // Weekday: Year starts on "Day 4" (weekday 4)
      const weekDay = ((totalDays % 7) + 4) % 7 || 7
      
      const creatorDate = { year, month, day, weekDay }
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Dashboard] Creator date result: Year ${creatorDate.year}, Month ${creatorDate.month}, Day ${creatorDate.day}, Weekday ${creatorDate.weekDay}`)
      }
      const creatorTime = getCreatorTime(now, userLat, userLon) // Use current time for time parts
      
      // Calculate day of year
      const monthDays = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31]
      let dayOfYear = 0
      for (let i = 0; i < creatorDate.month - 1; i++) {
        dayOfYear += monthDays[i]
      }
      dayOfYear += creatorDate.day
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Dashboard] Day of year calculated: ${dayOfYear}`)
      }
      
      const dayInfo = getDayInfo(dayOfYear)
      
      // Create timestamp string in LOCAL time (not UTC)
      // Format: YYYY-MM-DDTHH:mm:ss (local time, no timezone)
      const localTimestamp = `${localYear}-${String(localMonth + 1).padStart(2, '0')}-${String(localDate).padStart(2, '0')}T${String(localHour).padStart(2, '0')}:${String(localMinute).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      
      const newCalendarData = {
        year: creatorDate.year,
        month: creatorDate.month,
        dayOfMonth: creatorDate.day,
        weekday: creatorDate.weekDay,
        part: creatorTime.part,
        dayOfYear: dayOfYear,
        season: dayInfo.isFeast ? dayInfo.feastName || 'Feast Day' : (creatorDate.weekDay === 7 ? 'Sabbath Day' : 'Regular Day'),
        timestamp: localTimestamp // Use LOCAL time string, not UTC ISO string
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Dashboard] Setting calendar data:`, newCalendarData)
      }
      setCalendarData(newCalendarData)
    }
    
    // Run immediately and update every minute
    updateCalendarData()
    const interval = setInterval(updateCalendarData, 60000) // Update every minute
    
    return () => clearInterval(interval)
  }, [userLat, userLon])
  
  // Theme system - rotates every 2 hours
  const [currentTheme, setCurrentTheme] = useState(getCurrentTheme())
  
  // Update theme every hour to check for 2-hour rotation
  useEffect(() => {
    const updateTheme = () => {
      setCurrentTheme(getCurrentTheme())
    }
    updateTheme() // Initial set
    const interval = setInterval(updateTheme, 60 * 60 * 1000) // Check every hour
    return () => clearInterval(interval)
  }, [])

  // NOWPayments - no wallet state needed
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
    
    // Initialize custom date (with sunrise-based calculation)
    const now = new Date()
    const localYear = now.getFullYear()
    const localMonth = now.getMonth()
    const localDate = now.getDate()
    const localHour = now.getHours()
    const localMinute = now.getMinutes()
    
    const currentTimeMinutes = localHour * 60 + localMinute
    const sunriseTimeMinutes = 5 * 60 + 13 // 05:13
    
    let effectiveYear = localYear
    let effectiveMonth = localMonth
    let effectiveDate = localDate
    
    if (currentTimeMinutes < sunriseTimeMinutes) {
      const prevDay = new Date(localYear, localMonth, localDate - 1)
      effectiveYear = prevDay.getFullYear()
      effectiveMonth = prevDay.getMonth()
      effectiveDate = prevDay.getDate()
    }
    
    const normalizedDate = new Date(effectiveYear, effectiveMonth, effectiveDate, 12, 0, 0, 0)
    setCustomDate(getCreatorDateSync(normalizedDate))
  }, [])

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      setCurrentTime(now)
      
      // Use sunrise-based day calculation - LOCAL time only
      const localYear = now.getFullYear()
      const localMonth = now.getMonth()
      const localDate = now.getDate()
      const localHour = now.getHours()
      const localMinute = now.getMinutes()
      
      const currentTimeMinutes = localHour * 60 + localMinute
      const sunriseTimeMinutes = 5 * 60 + 13 // 05:13
      
      let effectiveYear = localYear
      let effectiveMonth = localMonth
      let effectiveDate = localDate
      
      if (currentTimeMinutes < sunriseTimeMinutes) {
        const prevDay = new Date(localYear, localMonth, localDate - 1)
        effectiveYear = prevDay.getFullYear()
        effectiveMonth = prevDay.getMonth()
        effectiveDate = prevDay.getDate()
      }
      
      const normalizedDate = new Date(effectiveYear, effectiveMonth, effectiveDate, 12, 0, 0, 0)
      setCustomDate(getCreatorDateSync(normalizedDate))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (user && !authLoading) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Dashboard: Starting data fetch for user:', user.id)
      }
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
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ Dashboard: Profile loaded', data ? 'with data' : 'no profile found')
            }
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
      
      // Fetch all orchards first (the hook doesn't support user filtering)
      const fetchData = async () => {
        try {
          await fetchOrchards()
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Dashboard: Orchards fetched successfully')
          }
        } catch (error) {
          console.error('❌ Dashboard: Error fetching orchards:', error)
          setError('Failed to load orchards')
        }
      }
      
      // Fetch user's bestowals
      const fetchUserBestowals = async () => {
        try {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 Dashboard: Fetching user bestowals...')
          }
          const result = await getUserBestowals()
          if (result.success) {
            setUserBestowals(result.data)
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ Dashboard: Bestowals fetched successfully:', result.data.length)
            }
          } else {
            console.error('❌ Dashboard: Failed to fetch bestowals:', result.error)
            setUserBestowals([])
          }
        } catch (error) {
          console.error('❌ Dashboard: Error fetching bestowals:', error)
          setUserBestowals([])
        }
      }
      
      // Execute all data fetching
      Promise.all([
        fetchProfile(),
        fetchData(),
        fetchActiveUsers(),
        fetchUserBestowals(),
        fetchFollowerStats()
      ]).catch(err => {
        console.error('❌ Dashboard: Error in data fetching:', err)
        setError('Failed to load dashboard data')
      })
    }
  }, [user, authLoading])

  const fetchFollowerStats = async () => {
    if (!user?.id) return
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Dashboard: Fetching follower stats...')
      }
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      // Get total followers
      const { data: followers, error: followersError } = await supabase
        .from('followers')
        .select('id')
        .eq('following_id', user.id)

      // Get new followers (last 7 days)
      const { data: newFollowers, error: newFollowersError } = await supabase
        .from('followers')
        .select('id')
        .eq('following_id', user.id)
        .gte('created_at', sevenDaysAgo.toISOString())

      if (followersError) throw followersError
      if (newFollowersError) throw newFollowersError

      setStats(prev => ({
        ...prev,
        totalFollowers: followers?.length || 0,
        newFollowers: newFollowers?.length || 0
      }))

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Dashboard: Followers:', followers?.length || 0, 'New:', newFollowers?.length || 0)
      }
    } catch (error) {
      console.error('❌ Dashboard: Error fetching follower stats:', error)
    }
  }

  const fetchActiveUsers = async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Dashboard: Fetching active users...')
      }
      // Get active users (users who have been active in the last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      if (process.env.NODE_ENV === 'development') {
        console.log('📅 Dashboard: Looking for activity since:', thirtyDaysAgo.toISOString())
      }

      // Get users who created orchards in last 30 days
      const { data: orchardUsers, error: orchardError } = await supabase
        .from('orchards')
        .select('user_id')
        .gte('created_at', thirtyDaysAgo.toISOString())

      if (process.env.NODE_ENV === 'development') {
        console.log('🌳 Dashboard: Orchard users:', orchardUsers?.length || 0, orchardError)
      }

      // Get users who made bestowals in last 30 days
      const { data: bestowalUsers, error: bestowalError } = await supabase
        .from('bestowals')
        .select('bestower_id')
        .gte('created_at', thirtyDaysAgo.toISOString())

      if (process.env.NODE_ENV === 'development') {
        console.log('💝 Dashboard: Bestowal users:', bestowalUsers?.length || 0, bestowalError)
      }

      // Get users who sent messages in last 30 days
      const { data: messageUsers, error: messageError } = await supabase
        .from('chat_messages')
        .select('sender_id')
        .gte('created_at', thirtyDaysAgo.toISOString())

      if (process.env.NODE_ENV === 'development') {
        console.log('💬 Dashboard: Message users:', messageUsers?.length || 0, messageError)
      }

      // Combine all unique user IDs
      const activeUserIds = new Set([
        ...(orchardUsers?.map(u => u.user_id) || []),
        ...(bestowalUsers?.map(u => u.bestower_id) || []),
        ...(messageUsers?.map(u => u.sender_id) || [])
      ])

      if (process.env.NODE_ENV === 'development') {
        console.log('👥 Dashboard: Total active users:', activeUserIds.size)
      }
      setActiveUsers(activeUserIds.size)
    } catch (error) {
      console.error('❌ Dashboard: Error fetching active users:', error)
    }
  }

  useEffect(() => {
    // Filter user's orchards
    const userCreatedOrchards = orchards.filter(orchard => orchard.user_id === user?.id)
    setUserOrchards(userCreatedOrchards)

    // Calculate stats
    const totalRaised = userCreatedOrchards.reduce((sum, orchard) => 
      sum + (orchard.filled_pockets * orchard.pocket_price || 0), 0
    )

    setStats(prev => ({
      ...prev,
      totalOrchards: userCreatedOrchards.length,
      totalBestowals: userBestowals.length,
      totalRaised: totalRaised,
      totalSupported: userBestowals.reduce((sum, bestowal) => 
        sum + (bestowal.amount || 0), 0
      )
    }))
  }, [orchards, userBestowals, user])


  // Show loading screen while auth is loading or data is loading
  if (authLoading || orchardsLoading || bestowalsLoading) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Dashboard: Loading state - auth:', authLoading, 'orchards:', orchardsLoading, 'bestowals:', bestowalsLoading)
    }
    const theme = getCurrentTheme()
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.background }}>
        <div className="text-center backdrop-blur-xl rounded-2xl p-8 border" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: theme.accent }}></div>
          <p style={{ color: theme.textPrimary }}>Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // Show error state if there's an error
  if (error) {
    const theme = getCurrentTheme()
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.background }}>
        <div className="text-center backdrop-blur-xl rounded-2xl p-8 border" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}>
          <p className="mb-4" style={{ color: theme.textPrimary }}>{error}</p>
          <Button 
            onClick={() => window.location.reload()}
            style={{
              background: theme.primaryButton,
              color: theme.textPrimary,
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative" style={{ background: currentTheme.background }}>
      {/* Content wrapper */}
      <div className="relative z-10">
        {/* Security Questions Alert */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 pt-4">
          <SecurityQuestionsAlert />
        </div>
        
        {/* Welcome Section with Profile Picture - Mobile Responsive */}
        <div 
          className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border shadow-xl sm:shadow-2xl mb-4 sm:mb-6 md:mb-8 mt-2 sm:mt-4 backdrop-blur-xl"
          style={{
            backgroundColor: currentTheme.cardBg,
            borderColor: currentTheme.cardBorder,
            boxShadow: `0 20px 25px -5px ${currentTheme.shadow}, 0 10px 10px -5px ${currentTheme.shadow}`,
            position: 'relative',
            zIndex: 1
          }}
        >
          {/* User Icon and Info - Side by Side */}
          <div className="flex flex-col gap-4 w-full">
            {/* Top Section: User Icon and Welcome Info */}
            <div className="flex items-center gap-4 sm:gap-6">
              {/* User Icon */}
              <div 
                className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 sm:border-3 md:border-4 shadow-md sm:shadow-lg flex-shrink-0"
                style={{ borderColor: currentTheme.accent }}
              >
                {user?.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div 
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: currentTheme.primaryButton }}
                  >
                    <User className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10" style={{ color: currentTheme.textPrimary }} />
                  </div>
                )}
              </div>
              
              {/* Welcome Message - Next to Icon */}
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold truncate" style={{ color: currentTheme.textPrimary }}>
                  Welcome back, {profile?.first_name || profile?.display_name || 'Friend'}!
                </h1>
                <p className="text-sm sm:text-base md:text-lg" style={{ color: currentTheme.textSecondary }}>
                  Ready to grow your orchard today?
                </p>
                <p className="text-xs sm:text-sm mt-1" style={{ color: currentTheme.textSecondary }}>
                  Payment Method: USDC (USD Coin)
                </p>
              </div>
            </div>

            {/* Divider Line */}
            <div className="w-full border-t my-4" style={{ borderColor: currentTheme.textSecondary + '40' }}></div>

            {/* Calendar Info Text - Centered */}
            {calendarData && (
              <div className="w-full space-y-2 text-center" style={{ color: '#b48f50' }}>
                <div className="text-base sm:text-lg font-bold">
                  Year {calendarData.year} • Month {calendarData.month} • Day {calendarData.dayOfMonth}
                </div>
                <div className="text-sm sm:text-base">
                  Weekday {calendarData.weekday} • Part {calendarData.part}/18
                </div>
                <div className="text-xs sm:text-sm opacity-80">
                  Day {calendarData.dayOfYear} of 364 • {calendarData.season}
                </div>
                <div className="text-xs font-mono opacity-60">
                  {/* Display current LOCAL time - each user sees their own timezone */}
                  {currentTime.toLocaleString(undefined, { 
                    // Use user's LOCAL timezone - no hardcoded timezone!
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </div>
                <div className="text-xs opacity-50 italic mt-2">
                  Creator's wheels never lie • forever in sync
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Wallet Setup Prompt Banner */}
        <div className="mb-6">
          <WalletSetupPrompt variant="card" />
        </div>

        {/* My Earnings Balance Card */}
        <div className="mb-6">
          <SowerBalanceCard compact />
        </div>

        {/* Addictive Stats Cards */}
        <div className="mb-6">
          <StatsCards />
        </div>

        {/* Top Sowers Teaser */}
        <div className="mb-6">
          <TopSowersTeaser />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">

          {/* Global Timezone Support */}
          <Card 
            className="lg:col-span-1 border shadow-xl timezone-tour backdrop-blur-xl"
            style={{
              backgroundColor: currentTheme.cardBg,
              borderColor: currentTheme.cardBorder,
            }}
          >
            <CardHeader className="p-4 sm:p-5 md:p-6">
              <CardTitle className="flex items-center text-base sm:text-lg" style={{ color: currentTheme.textPrimary }}>
                <Globe className="h-4 w-4 sm:h-5 sm:w-5 mr-2" style={{ color: currentTheme.accent }} />
                Global Time Zones
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 md:p-6 pt-0">
              <LiveTimezoneDisplay />
              <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t" style={{ borderColor: currentTheme.cardBorder }}>
                <Link to="/grove-station">
                  <button 
                    className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-full border-2 px-4 py-2 text-sm sm:text-base font-medium transition-all duration-200 shadow-sm disabled:pointer-events-none disabled:opacity-50"
                    style={{
                      color: currentTheme.textPrimary,
                      borderColor: currentTheme.accent,
                      backgroundColor: currentTheme.secondaryButton,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = currentTheme.accent;
                      e.currentTarget.style.borderColor = currentTheme.accent;
                      e.currentTarget.style.color = currentTheme.textPrimary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
                      e.currentTarget.style.borderColor = currentTheme.accent;
                      e.currentTarget.style.color = currentTheme.textPrimary;
                    }}
                  >
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    View Radio Schedule
                  </button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>


        {/* Marketing Thumbnails Section */}
        <div className="mt-4 sm:mt-6 md:mt-8 space-y-4 sm:space-y-6">
          <Card 
            className="border shadow-xl backdrop-blur-xl overflow-hidden"
            style={{
              backgroundColor: currentTheme.cardBg,
              borderColor: currentTheme.cardBorder,
            }}
          >
            <CardContent className="p-0">
              <div className="aspect-video w-full">
                <AmbassadorThumbnail />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="border shadow-xl backdrop-blur-xl overflow-hidden"
            style={{
              backgroundColor: currentTheme.cardBg,
              borderColor: currentTheme.cardBorder,
            }}
          >
            <CardContent className="p-0">
              <div className="aspect-video w-full">
                <GoSatGhostAccessThumbnail />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card 
          className="mt-4 sm:mt-6 md:mt-8 border shadow-xl quick-actions-tour backdrop-blur-xl"
          style={{
            backgroundColor: currentTheme.cardBg,
            borderColor: currentTheme.cardBorder,
          }}
        >
          <CardHeader className="p-4 sm:p-5 md:p-6">
            <CardTitle className="text-base sm:text-lg" style={{ color: currentTheme.textPrimary }}>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 md:p-6 pt-0 space-y-6">
            
            {/* CREATE & MANAGE Section */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: currentTheme.textSecondary }}>
                <span className="w-6 h-0.5 rounded" style={{ backgroundColor: currentTheme.accent }}></span>
                Create & Manage
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <Link to="/create-orchard">
                <Button 
                  className="w-full h-16 sm:h-20 border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-medium"
                  style={{
                    background: currentTheme.primaryButton,
                    color: currentTheme.textPrimary,
                    borderColor: currentTheme.accent,
                  }}
                >
                  <div className="text-center">
                    <Plus className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-1 sm:mb-2" />
                    <span className="text-sm sm:text-base">Plant New Seed</span>
                  </div>
                </Button>
              </Link>
              
              <div
                className="w-full border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 rounded-lg p-3 sm:p-4 pb-4 sm:pb-6 cursor-pointer font-medium overflow-visible backdrop-blur-md"
                style={{
                  backgroundColor: currentTheme.cardBg,
                  borderColor: currentTheme.cardBorder,
                }}
              >
                <div className="text-center mb-2 sm:mb-3">
                  <TreePine className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-1 sm:mb-2" style={{ color: currentTheme.textPrimary }} />
                  <span className="font-medium text-sm sm:text-base" style={{ color: currentTheme.textPrimary }}>Browse Orchards</span>
                </div>
                <div className="flex justify-center space-x-2 sm:space-x-3 mt-3 sm:mt-4">
                  <Link to="/browse-orchards">
                    <div 
                      className="group w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center hover:scale-110 hover:-translate-y-1 transition-all duration-300"
                      style={{
                        borderColor: currentTheme.accent,
                        backgroundColor: currentTheme.cardBg,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = currentTheme.accent;
                        e.currentTarget.style.borderColor = currentTheme.accent;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = currentTheme.cardBg;
                        e.currentTarget.style.borderColor = currentTheme.accent;
                      }}
                    >
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 transition-colors" style={{ color: currentTheme.textPrimary }} />
                    </div>
                  </Link>
                  <Link to="/my-orchards">
                    <div 
                      className="group w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center hover:scale-110 hover:-translate-y-1 transition-all duration-300"
                      style={{
                        borderColor: currentTheme.accent,
                        backgroundColor: currentTheme.cardBg,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = currentTheme.accent;
                        e.currentTarget.style.borderColor = currentTheme.accent;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = currentTheme.cardBg;
                        e.currentTarget.style.borderColor = currentTheme.accent;
                      }}
                    >
                      <User className="h-4 w-4 sm:h-5 sm:w-5 transition-colors" style={{ color: currentTheme.textPrimary }} />
                    </div>
                  </Link>
                  <Link 
                    to="/364yhvh-orchards"
                    onClick={(e) => {
                      console.log('🔗 Navigating to 364yhvh-orchards page');
                    }}
                  >
                    <div 
                      className="group w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center hover:scale-110 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                      style={{
                        borderColor: currentTheme.accent,
                        backgroundColor: currentTheme.cardBg,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = currentTheme.accent;
                        e.currentTarget.style.borderColor = currentTheme.accent;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = currentTheme.cardBg;
                        e.currentTarget.style.borderColor = currentTheme.accent;
                      }}
                    >
                      <Heart className="h-4 w-4 sm:h-5 sm:w-5 transition-colors" style={{ color: currentTheme.textPrimary }} />
                    </div>
                  </Link>
                </div>
              </div>
              
              <Link to="/profile">
                <Button 
                  className="w-full h-16 sm:h-20 border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-medium"
                  style={{
                    background: currentTheme.primaryButton,
                    color: currentTheme.textPrimary,
                    borderColor: currentTheme.accent,
                  }}
                >
                  <div className="text-center">
                    {user?.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt="Profile" 
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded-full mx-auto mb-1 sm:mb-2 border-2"
                        style={{ borderColor: currentTheme.accent }}
                      />
                    ) : (
                      <User className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-1 sm:mb-2" />
                    )}
                    <span className="text-sm sm:text-base">My Profile</span>
                  </div>
                </Button>
              </Link>

              </div>
            </div>

            {/* EXPLORE Section */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: currentTheme.textSecondary }}>
                <span className="w-6 h-0.5 rounded" style={{ backgroundColor: currentTheme.accent }}></span>
                Explore
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* 364ttt - Torah Top Ten */}
                <Link to="/364ttt">
                  <Button 
                    className="w-full h-16 sm:h-20 border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-medium"
                    style={{
                      background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                      color: '#fff',
                      borderColor: '#8b5cf6',
                    }}
                  >
                    <div className="text-center">
                      <Music className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-1 sm:mb-2" />
                      <span className="text-sm sm:text-base">364ttt</span>
                    </div>
                  </Button>
                </Link>

                {/* Journal & Calendar */}
                <Link to="/profile?tab=journal">
                  <Button 
                    className="w-full h-16 sm:h-20 border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-medium"
                    style={{
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      borderColor: '#0A1931',
                      color: 'white'
                    }}
                  >
                    <div className="text-center">
                      <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-1 sm:mb-2" />
                      <span className="text-sm sm:text-base">Journal & Calendar</span>
                    </div>
                  </Button>
                </Link>
              </div>
            </div>

            {/* JOIN OUR TEAM Section */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: currentTheme.textSecondary }}>
                <span className="w-6 h-0.5 rounded" style={{ backgroundColor: currentTheme.accent }}></span>
                Join Our Team
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {/* Become a Whisperer */}
                <Link to="/become-whisperer">
                  <Button 
                    className="w-full h-16 sm:h-20 border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-medium"
                    style={{
                      background: currentTheme.primaryButton,
                      color: currentTheme.textPrimary,
                      borderColor: currentTheme.accent,
                    }}
                  >
                    <div className="text-center">
                      <Megaphone className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-1 sm:mb-2" />
                      <span className="text-sm sm:text-base">Become a Whisperer</span>
                    </div>
                  </Button>
                </Link>

                {/* Become a S2G Driver */}
                <Link to="/register-vehicle">
                  <Button 
                    className="w-full h-16 sm:h-20 border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-medium"
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      borderColor: '#10b981',
                    }}
                  >
                    <div className="text-center">
                      <Car className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-1 sm:mb-2" />
                      <span className="text-sm sm:text-base">Become a S2G Driver</span>
                    </div>
                  </Button>
                </Link>

                {/* Become a S2G Service Provider */}
                <Link to="/register-services">
                  <Button 
                    className="w-full h-16 sm:h-20 border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-medium"
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: '#fff',
                      borderColor: '#f59e0b',
                    }}
                  >
                    <div className="text-center">
                      <Wrench className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-1 sm:mb-2" />
                      <span className="text-sm sm:text-base">Become a S2G Service Provider</span>
                    </div>
                  </Button>
                </Link>
              </div>
            </div>

              {/* Become a Whisperer */}
              <Link to="/become-whisperer">
                <Button 
                  className="w-full h-16 sm:h-20 border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-medium"
                  style={{
                    background: currentTheme.primaryButton,
                    color: currentTheme.textPrimary,
                    borderColor: currentTheme.accent,
                  }}
                >
                  <div className="text-center">
                    <Megaphone className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-1 sm:mb-2" />
                    <span className="text-sm sm:text-base">Become a Whisperer</span>
                  </div>
                </Button>
              </Link>

              {/* Become a S2G Driver */}
              <Link to="/register-vehicle">
                <Button 
                  className="w-full h-16 sm:h-20 border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-medium"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    borderColor: '#10b981',
                  }}
                >
                  <div className="text-center">
                    <Car className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-1 sm:mb-2" />
                    <span className="text-sm sm:text-base">Become a S2G Driver</span>
                  </div>
                </Button>
              </Link>

              {/* Become a S2G Service Provider */}
              <Link to="/register-services">
                <Button 
                  className="w-full h-16 sm:h-20 border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-medium"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#fff',
                    borderColor: '#f59e0b',
                  }}
                >
                  <div className="text-center">
                    <Wrench className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-1 sm:mb-2" />
                    <span className="text-sm sm:text-base">Become a S2G Service Provider</span>
                  </div>
                </Button>
              </Link>
              </div>
            </div>

          </CardContent>
        </Card>
      </div>
      
      {/* Floating Stats Button */}
      <StatsFloatingButton />
    </div>
  )
}