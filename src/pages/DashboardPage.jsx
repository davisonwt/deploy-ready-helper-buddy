import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useOrchards } from '../hooks/useOrchards'
import { useBestowals } from '../hooks/useBestowals.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Link } from 'react-router-dom'
import { 
  Sprout, 
  TreePine, 
  Heart, 
  TrendingUp, 
  Users, 
  DollarSign,
  Plus,
  Eye,
  Calendar,
  User,
  Globe,
  Clock,
  MessageSquare,
  BarChart3,
  Trophy,
  Shield,
  Loader2
} from 'lucide-react'
import { formatCurrency } from '../utils/formatters'
import LiveTimezoneDisplay from '@/components/dashboard/LiveTimezoneDisplay'
import { supabase } from "@/integrations/supabase/client"
import LiveActivityWidget from '@/components/LiveActivityWidget'
import { GamificationHUD } from '@/components/gamification/GamificationHUD'
import { GamificationFloatingButton } from '@/components/gamification/GamificationFloatingButton'
import { SecurityAlertsPanel } from '@/components/security/SecurityAlertsPanel'
// Binance Pay - no wallet connection needed
import { BinanceWalletManager } from '@/components/wallet/BinanceWalletManager'
import TrafficOverview from '@/components/analytics/TrafficOverview'
import { LeaderboardWidget } from '@/components/dashboard/LeaderboardWidget'
import { CustomWatch } from '@/components/watch/CustomWatch'
import { getCreatorTime } from '@/utils/customTime'
import { getCreatorDate } from '@/utils/customCalendar'
import { getCurrentTheme } from '@/utils/dashboardThemes'
import { AmbassadorThumbnail } from '@/components/marketing/AmbassadorThumbnail'
import { GoSatGhostAccessThumbnail } from '@/components/marketing/GoSatGhostAccessThumbnail'


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
      
      // Fetch all orchards first (the hook doesn't support user filtering)
      const fetchData = async () => {
        try {
          await fetchOrchards()
          console.log('✅ Dashboard: Orchards fetched successfully')
        } catch (error) {
          console.error('❌ Dashboard: Error fetching orchards:', error)
          setError('Failed to load orchards')
        }
      }
      
      // Fetch user's bestowals
      const fetchUserBestowals = async () => {
        try {
          console.log('🔍 Dashboard: Fetching user bestowals...')
          const result = await getUserBestowals()
          if (result.success) {
            setUserBestowals(result.data)
            console.log('✅ Dashboard: Bestowals fetched successfully:', result.data.length)
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
      console.log('🔍 Dashboard: Fetching follower stats...')
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

      console.log('✅ Dashboard: Followers:', followers?.length || 0, 'New:', newFollowers?.length || 0)
    } catch (error) {
      console.error('❌ Dashboard: Error fetching follower stats:', error)
    }
  }

  const fetchActiveUsers = async () => {
    try {
      console.log('🔍 Dashboard: Fetching active users...')
      // Get active users (users who have been active in the last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      console.log('📅 Dashboard: Looking for activity since:', thirtyDaysAgo.toISOString())

      // Get users who created orchards in last 30 days
      const { data: orchardUsers, error: orchardError } = await supabase
        .from('orchards')
        .select('user_id')
        .gte('created_at', thirtyDaysAgo.toISOString())

      console.log('🌳 Dashboard: Orchard users:', orchardUsers?.length || 0, orchardError)

      // Get users who made bestowals in last 30 days
      const { data: bestowalUsers, error: bestowalError } = await supabase
        .from('bestowals')
        .select('bestower_id')
        .gte('created_at', thirtyDaysAgo.toISOString())

      console.log('💝 Dashboard: Bestowal users:', bestowalUsers?.length || 0, bestowalError)

      // Get users who sent messages in last 30 days
      const { data: messageUsers, error: messageError } = await supabase
        .from('chat_messages')
        .select('sender_id')
        .gte('created_at', thirtyDaysAgo.toISOString())

      console.log('💬 Dashboard: Message users:', messageUsers?.length || 0, messageError)

      // Combine all unique user IDs
      const activeUserIds = new Set([
        ...(orchardUsers?.map(u => u.user_id) || []),
        ...(bestowalUsers?.map(u => u.bestower_id) || []),
        ...(messageUsers?.map(u => u.sender_id) || [])
      ])

      console.log('👥 Dashboard: Total active users:', activeUserIds.size)
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
    console.log('🔄 Dashboard: Loading state - auth:', authLoading, 'orchards:', orchardsLoading, 'bestowals:', bestowalsLoading)
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
        {/* Welcome Section with Profile Picture and Custom Watch - Mobile Responsive */}
        <div 
          className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border shadow-xl sm:shadow-2xl mb-4 sm:mb-6 md:mb-8 mt-2 sm:mt-4 backdrop-blur-xl"
          style={{
            backgroundColor: currentTheme.cardBg,
            borderColor: currentTheme.cardBorder,
            boxShadow: `0 20px 25px -5px ${currentTheme.shadow}, 0 10px 10px -5px ${currentTheme.shadow}`
          }}
        >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-4 md:space-x-6 flex-1 min-w-0">
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
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold py-2 sm:py-3 md:py-4 rounded-lg truncate" style={{ color: currentTheme.textPrimary }}>
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
          {/* Custom Watch */}
          <div className="flex-shrink-0">
            <CustomWatch compact={false} />
          </div>
        </div>
        {/* Custom Time Display - Bottom of welcome section */}
        {customDate && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: currentTheme.cardBorder }}>
            <div className="text-center">
              {/* Custom Date - Above custom time */}
              <div className="text-base sm:text-lg md:text-xl font-semibold mb-1" style={{ color: currentTheme.textPrimary }}>
                Year {customDate.year} · Month {customDate.month} · Day {customDate.day} · {customDate.weekDay === 7 ? 'Sabbath' : `Week Day ${customDate.weekDay}`}
              </div>
              {/* Custom Time - Larger font */}
              <div className="text-lg sm:text-xl md:text-2xl font-bold mb-2" style={{ color: currentTheme.textPrimary }}>
                {(() => {
                  const creatorTime = getCreatorTime(currentTime, userLat, userLon);
                  // Calculate seconds within current custom minute (0-79)
                  const sunriseMinutes = creatorTime.sunriseMinutes;
                  const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes() + currentTime.getSeconds() / 60 + currentTime.getMilliseconds() / 60000;
                  let elapsed = nowMinutes - sunriseMinutes;
                  if (elapsed < 0) elapsed += 1440;
                  const secondsInMinute = Math.floor((elapsed % 1) * 80);
                  return `${creatorTime.displayText} ${secondsInMinute}${secondsInMinute === 1 ? 'st' : secondsInMinute === 2 ? 'nd' : secondsInMinute === 3 ? 'rd' : 'th'} sec`;
                })()}
              </div>
              {/* Gregorian Time - Smaller font */}
              <div className="text-xs sm:text-sm font-mono flex items-center justify-center gap-2 flex-wrap" style={{ color: currentTheme.textSecondary }}>
                <span>{currentTime.getFullYear()}/{String(currentTime.getMonth() + 1).padStart(2, '0')}/{String(currentTime.getDate()).padStart(2, '0')}</span>
                <span>{currentTime.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
              </div>
            </div>
          </div>
        )}
      </div>

        {/* Real Traffic Overview (Lovable Analytics) */}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
          <TrafficOverview />
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
          {/* Stats Grid - Mobile Responsive */}
          <div 
            className="w-full p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border shadow-xl sm:shadow-2xl mb-4 sm:mb-6 md:mb-8 backdrop-blur-xl stats-tour"
            style={{
              backgroundColor: currentTheme.cardBg,
              borderColor: currentTheme.cardBorder,
              boxShadow: `0 20px 25px -5px ${currentTheme.shadow}, 0 10px 10px -5px ${currentTheme.shadow}`
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-3 w-full">
              <Card 
                className="border hover:shadow-lg sm:hover:shadow-xl transition-all duration-300 hover:scale-105 my-orchards-stat-tour backdrop-blur-md"
                style={{
                  backgroundColor: currentTheme.cardBg,
                  borderColor: currentTheme.cardBorder,
                }}
              >
              <CardContent className="p-4 sm:p-5 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium" style={{ color: currentTheme.textSecondary }}>My Orchards</p>
                    <p className="text-xl sm:text-2xl font-bold" style={{ color: currentTheme.textPrimary }}>{stats.totalOrchards}</p>
                  </div>
                  <TreePine className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" style={{ color: currentTheme.accent }} />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="border hover:shadow-lg sm:hover:shadow-xl transition-all duration-300 hover:scale-105 backdrop-blur-md"
              style={{
                backgroundColor: currentTheme.cardBg,
                borderColor: currentTheme.cardBorder,
              }}
            >
              <CardContent className="p-4 sm:p-5 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium" style={{ color: currentTheme.textSecondary }}>Total Raised</p>
                    <p className="text-xl sm:text-2xl font-bold" style={{ color: currentTheme.textPrimary }}>{formatCurrency(stats.totalRaised)}</p>
                  </div>
                  <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" style={{ color: currentTheme.accent }} />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="flex-1 border hover:shadow-xl transition-all duration-300 hover:scale-105 backdrop-blur-md"
              style={{
                backgroundColor: currentTheme.cardBg,
                borderColor: currentTheme.cardBorder,
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: currentTheme.textSecondary }}>Active Users</p>
                    <p className="text-2xl font-bold" style={{ color: currentTheme.textPrimary }}>{activeUsers}</p>
                    <p className="text-xs mt-1" style={{ color: currentTheme.textSecondary }}>Last 30 days</p>
                  </div>
                  <Users className="h-8 w-8" style={{ color: currentTheme.accent }} />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="border hover:shadow-lg sm:hover:shadow-xl transition-all duration-300 hover:scale-105 backdrop-blur-md"
              style={{
                backgroundColor: currentTheme.cardBg,
                borderColor: currentTheme.cardBorder,
              }}
            >
              <CardContent className="p-4 sm:p-5 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium" style={{ color: currentTheme.textSecondary }}>My Bestowals</p>
                    <p className="text-xl sm:text-2xl font-bold" style={{ color: currentTheme.textPrimary }}>{stats.totalBestowals}</p>
                  </div>
                  <Heart className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" style={{ color: currentTheme.accent }} />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="border hover:shadow-lg sm:hover:shadow-xl transition-all duration-300 hover:scale-105 backdrop-blur-md"
              style={{
                backgroundColor: currentTheme.cardBg,
                borderColor: currentTheme.cardBorder,
              }}
            >
              <CardContent className="p-4 sm:p-5 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium" style={{ color: currentTheme.textSecondary }}>Total Supported</p>
                    <p className="text-xl sm:text-2xl font-bold" style={{ color: currentTheme.textPrimary }}>{formatCurrency(stats.totalSupported)}</p>
                  </div>
                  <DollarSign className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" style={{ color: currentTheme.accent }} />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="border hover:shadow-lg sm:hover:shadow-xl transition-all duration-300 hover:scale-105 backdrop-blur-md"
              style={{
                backgroundColor: currentTheme.cardBg,
                borderColor: currentTheme.cardBorder,
              }}
            >
              <CardContent className="p-4 sm:p-5 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium" style={{ color: currentTheme.textSecondary }}>My Followers</p>
                    <p className="text-xl sm:text-2xl font-bold" style={{ color: currentTheme.textPrimary }}>{stats.totalFollowers}</p>
                    <p className="text-[10px] sm:text-xs mt-1" style={{ color: currentTheme.textSecondary }}>+{stats.newFollowers} this week</p>
                  </div>
                  <Users className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" style={{ color: currentTheme.accent }} />
                </div>
              </CardContent>
            </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
            <div className="lg:col-span-1 wallet-tour">
              <BinanceWalletManager 
                className="shadow-xl backdrop-blur-xl"
                style={{
                  backgroundColor: currentTheme.cardBg,
                  borderColor: currentTheme.cardBorder,
                }}
              />
            </div>

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
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full text-sm sm:text-base transition-all hover:scale-105"
                      style={{
                        color: currentTheme.accent,
                        borderColor: currentTheme.accent,
                        backgroundColor: 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                      View Radio Schedule
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>


          {/* Leaderboard Widget */}
          <div className="mt-4 sm:mt-6 md:mt-8">
            <LeaderboardWidget />
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
              <CardHeader className="p-4 sm:p-5 md:p-6">
                <CardTitle className="text-base sm:text-lg" style={{ color: currentTheme.textPrimary }}>
                  Become a 2SG Ambassador
                </CardTitle>
              </CardHeader>
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
              <CardHeader className="p-4 sm:p-5 md:p-6">
                <CardTitle className="text-base sm:text-lg" style={{ color: currentTheme.textPrimary }}>
                  GoSat's Ghost Access – Real-Time Community Oversight
                </CardTitle>
              </CardHeader>
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
          <CardContent className="p-4 sm:p-5 md:p-6 pt-0">
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
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}