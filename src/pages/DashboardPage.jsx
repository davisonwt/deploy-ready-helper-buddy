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
import { MyApprovedSlots } from '@/components/radio/MyApprovedSlots'
import { LiveSessionsWidget } from '@/components/dashboard/LiveSessionsWidget'
import { CoHostInvites } from '@/components/radio/CoHostInvites'
import { MyPremiumRooms } from '@/components/dashboard/MyPremiumRooms'
import TrafficOverview from '@/components/analytics/TrafficOverview'
import { LeaderboardWidget } from '@/components/dashboard/LeaderboardWidget'


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
            console.error('❌ Dashboard: Error fetching profile:', error)
            setError('Failed to load profile')
          } else {
            setProfile(data)
            console.log('✅ Dashboard: Profile loaded')
          }
        } catch (error) {
          console.error('❌ Dashboard: Error fetching profile:', error)
          setError('Failed to load profile')
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

  const getCompletionPercentage = (orchard) => {
    const totalPockets = (orchard.intended_pockets && orchard.intended_pockets > 1) ? orchard.intended_pockets : orchard.total_pockets || 1;
    if (!totalPockets) return 0
    return Math.round((orchard.filled_pockets / totalPockets) * 100)
  }

  // Show loading screen while auth is loading or data is loading
  if (authLoading || orchardsLoading || bestowalsLoading) {
    console.log('🔄 Dashboard: Loading state - auth:', authLoading, 'orchards:', orchardsLoading, 'bestowals:', bestowalsLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: '#001f3f' }}>
      
      {/* Solid dark overlay for better readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/70 to-black/80"></div>
      
      {/* Content wrapper */}
      <div className="relative z-10">
        {/* Welcome Section with Profile Picture - Mobile Responsive */}
        <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border shadow-xl sm:shadow-2xl mb-4 sm:mb-6 md:mb-8 mt-2 sm:mt-4 bg-card">
        <div className="flex items-center gap-3 sm:gap-4 md:space-x-6">
          <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 sm:border-3 md:border-4 border-nav-dashboard shadow-md sm:shadow-lg flex-shrink-0">
            {user?.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-nav-dashboard to-nav-dashboard/80 flex items-center justify-center">
                <User className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-heading-primary" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold py-2 sm:py-3 md:py-4 rounded-lg text-heading-primary truncate">
              Welcome back, {profile?.first_name || profile?.display_name || 'Friend'}!
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-heading-primary">
              Ready to grow your orchard today?
            </p>
            <p className="text-xs sm:text-sm mt-1 text-heading-primary">
              Payment Method: USDC (USD Coin)
            </p>
          </div>
        </div>
      </div>

        {/* Real Traffic Overview (Lovable Analytics) */}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
          <TrafficOverview />
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
          {/* Stats Grid - Mobile Responsive */}
          <div className="w-full p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border shadow-xl sm:shadow-2xl mb-4 sm:mb-6 md:mb-8 bg-card stats-tour">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-3 w-full">
              <Card className="bg-card border-border hover:shadow-lg sm:hover:shadow-xl transition-all duration-300 hover:scale-105 my-orchards-stat-tour">
              <CardContent className="p-4 sm:p-5 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-heading-primary">My Orchards</p>
                    <p className="text-xl sm:text-2xl font-bold text-heading-primary">{stats.totalOrchards}</p>
                  </div>
                  <TreePine className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-heading-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover:shadow-lg sm:hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-4 sm:p-5 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-heading-primary">Total Raised</p>
                    <p className="text-xl sm:text-2xl font-bold text-heading-primary">{formatCurrency(stats.totalRaised)}</p>
                  </div>
                  <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-heading-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="flex-1 bg-card border-border hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-heading-primary">Active Users</p>
                    <p className="text-2xl font-bold text-heading-primary">{activeUsers}</p>
                    <p className="text-xs text-heading-primary mt-1">Last 30 days</p>
                  </div>
                  <Users className="h-8 w-8 text-heading-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover:shadow-lg sm:hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-4 sm:p-5 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-heading-primary">My Bestowals</p>
                    <p className="text-xl sm:text-2xl font-bold text-heading-primary">{stats.totalBestowals}</p>
                  </div>
                  <Heart className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-heading-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover:shadow-lg sm:hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-4 sm:p-5 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-heading-primary">Total Supported</p>
                    <p className="text-xl sm:text-2xl font-bold text-heading-primary">{formatCurrency(stats.totalSupported)}</p>
                  </div>
                  <DollarSign className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-heading-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover:shadow-lg sm:hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-4 sm:p-5 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-heading-primary">My Followers</p>
                    <p className="text-xl sm:text-2xl font-bold text-heading-primary">{stats.totalFollowers}</p>
                    <p className="text-[10px] sm:text-xs text-heading-primary mt-1">+{stats.newFollowers} this week</p>
                  </div>
                  <Users className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-heading-primary" />
                </div>
              </CardContent>
            </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
            <BinanceWalletManager className="lg:col-span-1 bg-card border-border shadow-xl wallet-tour" />

            {/* Global Timezone Support */}
            <Card className="lg:col-span-1 bg-card border-border shadow-xl timezone-tour">
              <CardHeader className="p-4 sm:p-5 md:p-6">
                <CardTitle className="flex items-center text-heading-primary text-base sm:text-lg">
                  <Globe className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-600" />
                  Global Time Zones
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 md:p-6 pt-0">
                <LiveTimezoneDisplay />
                <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-gray-200">
                  <Link to="/grove-station">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full text-sm sm:text-base text-blue-600 border-blue-200 hover:bg-blue-100"
                    >
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                      View Radio Schedule
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Sessions - Show what's happening now */}
          <div className="mt-4 sm:mt-6 md:mt-8">
            <LiveSessionsWidget />
          </div>

          {/* My Radio Slots and Co-Host Invitations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mt-4 sm:mt-6 md:mt-8">
            <div className="lg:col-span-1">
              <MyApprovedSlots />
            </div>
            <div className="lg:col-span-1">
              <CoHostInvites />
            </div>
          </div>

          {/* My Premium Rooms */}
          <div className="mt-4 sm:mt-6 md:mt-8">
            <MyPremiumRooms />
          </div>

          {/* My Orchards and Recent Bestowals */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mt-4 sm:mt-6 md:mt-8">
            {/* My Orchards */}
            <Card className="lg:col-span-1 bg-card border-border shadow-xl my-orchards-section-tour">
            <CardHeader className="p-4 sm:p-5 md:p-6">
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <span className="flex items-center" style={{ 
                  color: 'hsl(120, 100%, 40%)', 
                  textShadow: '1px 1px 2px rgba(0,0,0,0.2)' 
                }}>
                  <Sprout className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-green-600" />
                  My Orchards
                </span>
                <Link to="/my-orchards">
                  <Button variant="outline" size="sm" className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3">View All</Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 md:p-6 pt-0">
              {userOrchards.length === 0 ? (
                <div className="bg-card rounded-lg p-4 sm:p-6 md:p-8">
                  <div className="text-center">
                    <TreePine className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-400 mb-3 sm:mb-4" />
                    <p className="mb-4 sm:mb-6 font-medium text-heading-primary text-sm sm:text-base">You haven't planted any seeds yet</p>
                    <Link to="/create-orchard">
                      <Button 
                        className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 font-medium mb-4 text-sm sm:text-base h-9 sm:h-10"
                        style={{
                          backgroundColor: '#fdffb6',
                          color: '#a16207'
                        }}
                      >
                        Plant Your First Seed
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {userOrchards.slice(0, 3).map((orchard) => (
                    <div key={orchard.id} className="flex items-center justify-between p-3 sm:p-4 bg-card/60 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-heading-primary mb-1 text-sm sm:text-base truncate">{orchard.title}</h3>
                        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-heading-primary flex-wrap">
                          <span className="flex items-center">
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            {orchard.views || 0} views
                          </span>
                          <span className="flex items-center">
                            <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            {orchard.supporters || 0} supporters
                          </span>
                        </div>
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs sm:text-sm text-heading-primary">Progress</span>
                            <span className="text-xs sm:text-sm font-medium text-heading-primary">{getCompletionPercentage(orchard)}%</span>
                          </div>
                          <Progress value={getCompletionPercentage(orchard)} className="h-1.5 sm:h-2" />
                        </div>
                      </div>
                      <div className="ml-2 sm:ml-4 flex-shrink-0">
                        <Badge variant={orchard.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {orchard.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

            {/* Recent Bestowals */}
            <Card className="lg:col-span-1 bg-card border-border shadow-xl bestowals-tour">
            <CardHeader className="p-4 sm:p-5 md:p-6">
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <span className="flex items-center text-heading-primary">
                  <Heart className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-red-500" />
                  Recent Bestowals
                </span>
                <Link to="/browse-orchards">
                  <Button variant="outline" size="sm" className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3">Explore More</Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 md:p-6 pt-0">
              {userBestowals.length === 0 ? (
                <div className="bg-card rounded-lg p-4 sm:p-6 md:p-8">
                  <div className="text-center">
                    <Heart className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-400 mb-3 sm:mb-4" />
                    <p className="mb-4 sm:mb-6 font-medium text-heading-primary text-sm sm:text-base">You haven't made any bestowals yet</p>
                    <Link to="/browse-orchards">
                      <Button 
                        className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 font-medium mb-4 text-sm sm:text-base h-9 sm:h-10"
                        style={{
                          backgroundColor: '#caffbf',
                          color: '#166534'
                        }}
                      >
                        Discover Orchards
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {userBestowals.slice(0, 3).map((bestowal) => (
                    <div key={bestowal.id} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 mb-1 text-sm sm:text-base truncate">
                          {bestowal.orchards?.title || 'Unknown Orchard'}
                        </h3>
                        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 flex-wrap">
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            {new Date(bestowal.created_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center">
                            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            {formatCurrency(bestowal.amount)}
                          </span>
                        </div>
                      </div>
                      <Badge variant={bestowal.payment_status === 'completed' ? 'default' : 'secondary'} className="text-xs ml-2 flex-shrink-0">
                        {bestowal.payment_status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

          {/* Leaderboard Widget */}
          <div className="mt-4 sm:mt-6 md:mt-8">
            <LeaderboardWidget />
          </div>

          {/* Quick Actions */}
          <Card className="mt-4 sm:mt-6 md:mt-8 bg-card border-border shadow-xl quick-actions-tour">
          <CardHeader className="p-4 sm:p-5 md:p-6">
            <CardTitle className="text-heading-primary text-base sm:text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 md:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <Link to="/create-orchard">
                <Button 
                  className="w-full h-16 sm:h-20 bg-card border-border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-medium text-heading-primary"
                >
                  <div className="text-center">
                    <Plus className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-1 sm:mb-2" />
                    <span className="text-sm sm:text-base">Plant New Seed</span>
                  </div>
                </Button>
              </Link>
              
              <div
                className="w-full bg-card border-border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 rounded-lg p-3 sm:p-4 pb-4 sm:pb-6 cursor-pointer font-medium overflow-visible"
              >
                <div className="text-center mb-2 sm:mb-3">
                  <TreePine className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-1 sm:mb-2 text-heading-primary" />
                  <span className="font-medium text-heading-primary text-sm sm:text-base">Browse Orchards</span>
                </div>
                	<div className="flex justify-center space-x-2 sm:space-x-3 mt-3 sm:mt-4">
                  	<Link to="/browse-orchards">
                    	<div 
                      className="group w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-border bg-card flex items-center justify-center hover:scale-110 hover:-translate-y-1 hover:bg-primary hover:border-primary transition-all duration-300"
                    	>
                      	<Users className="h-4 w-4 sm:h-5 sm:w-5 text-heading-primary group-hover:text-primary-foreground transition-colors" />
                    	</div>
                  	</Link>
                  	<Link to="/my-orchards">
                    	<div 
                      className="group w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-border bg-card flex items-center justify-center hover:scale-110 hover:-translate-y-1 hover:bg-primary hover:border-primary transition-all duration-300"
                    	>
                      	<User className="h-4 w-4 sm:h-5 sm:w-5 text-heading-primary group-hover:text-primary-foreground transition-colors" />
                    	</div>
                  	</Link>
                  	<Link 
                    to="/364yhvh-orchards"
                    onClick={(e) => {
                      console.log('🔗 Navigating to 364yhvh-orchards page');
                    }}
                  	>
                    	<div 
                      className="group w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-border bg-card flex items-center justify-center hover:scale-110 hover:-translate-y-1 hover:bg-primary hover:border-primary transition-all duration-300 cursor-pointer"
                    	>
                      	<Heart className="h-4 w-4 sm:h-5 sm:w-5 text-heading-primary group-hover:text-primary-foreground transition-colors" />
                    	</div>
                  	</Link>
                	</div>
              </div>
              
              <Link to="/profile">
                <Button 
                  className="w-full h-16 sm:h-20 bg-card border-border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-medium text-heading-primary"
                >
                  <div className="text-center">
                    {user?.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt="Profile" 
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded-full mx-auto mb-1 sm:mb-2 border-2"
                        style={{ borderColor: '#9a3412' }}
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