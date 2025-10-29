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
import { useWallet } from '@/hooks/useWallet'
import { ethers } from 'ethers'
import { USDC_ADDRESS, USDC_ABI, CRONOS_RPC_URL, formatUSDC } from '@/lib/cronos'
import { MyApprovedSlots } from '@/components/radio/MyApprovedSlots'
import { LiveSessionsWidget } from '@/components/dashboard/LiveSessionsWidget'
import { CoHostInvites } from '@/components/radio/CoHostInvites'
import { MyPremiumRooms } from '@/components/dashboard/MyPremiumRooms'
import TrafficOverview from '@/components/analytics/TrafficOverview'


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
    totalSupported: 0
  })
  const [activeUsers, setActiveUsers] = useState(0)
  const [error, setError] = useState(null)
  const [userRoles, setUserRoles] = useState([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const isAdminOrGosat = userRoles.includes('admin') || userRoles.includes('gosat')

  // Wallet visibility (connected or saved wallet)
  const { connected, walletAddress: connectedAddress, balance: hookBalance, connectWallet } = useWallet()
  const [walletAddress, setWalletAddress] = useState(null)
  const [walletBalance, setWalletBalance] = useState('0')
  const [walletLoading, setWalletLoading] = useState(false)

  const fetchBalanceForAddress = async (addr) => {
    try {
      setWalletLoading(true)
      const provider = new ethers.JsonRpcProvider(CRONOS_RPC_URL)
      const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider)
      const bal = await usdc.balanceOf(addr)
      setWalletBalance(ethers.formatUnits(bal, 6))
    } catch (e) {
      console.error('Dashboard: balance fetch error', e)
    } finally {
      setWalletLoading(false)
    }
  }

  const loadWalletInfo = async () => {
    try {
      if (connected && connectedAddress) {
        setWalletAddress(connectedAddress)
        setWalletBalance(hookBalance || '0')
        return
      }
      if (!user?.id) return
      const { data, error } = await supabase
        .from('user_wallets')
        .select('wallet_address')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()
      if (error) {
        console.warn('Dashboard: user_wallets lookup error', error)
      }
      const addr = data?.wallet_address
      if (addr) {
        setWalletAddress(addr)
        await fetchBalanceForAddress(addr)
      }
    } catch (e) {
      console.error('Dashboard: loadWalletInfo error', e)
    }
  }

  useEffect(() => {
    loadWalletInfo()
  }, [connected, connectedAddress, hookBalance, user?.id])

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
        fetchUserBestowals()
      ]).catch(err => {
        console.error('❌ Dashboard: Error in data fetching:', err)
        setError('Failed to load dashboard data')
      })
    }
  }, [user, authLoading])

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
      sum + (orchard.filled_pockets * orchard.pocket_value || 0), 0
    )

    setStats({
      totalOrchards: userCreatedOrchards.length,
      totalBestowals: userBestowals.length,
      totalRaised: totalRaised,
      totalSupported: userBestowals.reduce((sum, bestowal) => 
        sum + (bestowal.amount || 0), 0
      )
    })
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
    <div className="min-h-screen relative">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => {
          console.error('Video failed to load:', e);
          e.target.style.display = 'none';
        }}
      >
        <source
          src="https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/orchard-videos/my%20orchards%201280x720%20mp4.mp4"
          type="video/mp4"
        />
      </video>
      
      {/* Solid dark overlay for better readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/70 to-black/80"></div>
      
      {/* Content wrapper */}
      <div className="relative z-10">
        {/* Welcome Section with Profile Picture */}
        <div className="max-w-4xl mx-auto p-8 rounded-2xl border shadow-2xl mb-8 mt-4 bg-white/90">
        <div className="flex items-center space-x-6">
          <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-nav-dashboard shadow-lg">
            {user?.profile_picture ? (
              <img 
                src={user.profile_picture} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-nav-dashboard to-nav-dashboard/80 flex items-center justify-center">
                <User className="h-10 w-10 text-slate-700" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold px-8 py-4 rounded-lg" style={{ 
              color: '#9bf6ff', 
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
              WebkitTextStroke: '1px rgba(0,0,0,0.5)'
            }}>
              Welcome back, {profile?.first_name || profile?.display_name || 'Friend'}!
            </h1>
            <p className="text-lg" style={{ color: 'hsl(220, 100%, 50%)' }}>
              Ready to grow your orchard today?
            </p>
            <p className="text-sm mt-1" style={{ color: 'hsl(220, 100%, 50%)' }}>
              Payment Method: USDC (USD Coin)
            </p>
          </div>
        </div>
      </div>

        <div className="max-w-4xl mx-auto px-4">
          <Card className="mb-6 border-primary/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Quick access</p>
                  <h3 className="text-lg font-semibold text-foreground">Wallet Settings for Payments</h3>
                  <p className="text-sm text-muted-foreground mt-1">Manage your organization's payment wallet</p>
                </div>
                <Link to="/wallet-settings">
                  <Button className="ml-4">Open Wallet Settings</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Real Traffic Overview (Lovable Analytics) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <TrafficOverview />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Grid */}
          <div className="w-full p-8 rounded-2xl border shadow-2xl mb-8 bg-white/90 stats-tour">
            <div className="flex flex-row flex-nowrap gap-3 w-full">
              <Card className="flex-1 bg-white/80 border-white/40 hover:shadow-xl transition-all duration-300 hover:scale-105 my-orchards-stat-tour">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">My Orchards</p>
                    <p className="text-2xl font-bold text-slate-700">{stats.totalOrchards}</p>
                  </div>
                  <TreePine className="h-8 w-8 text-slate-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="flex-1 bg-white/80 border-white/40 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Raised</p>
                    <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalRaised)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-emerald-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="flex-1 bg-white/80 border-white/40 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Active Users</p>
                    <p className="text-2xl font-bold text-blue-600">{activeUsers}</p>
                    <p className="text-xs text-slate-500 mt-1">Last 30 days</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="flex-1 bg-white/80 border-white/40 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">My Bestowals</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.totalBestowals}</p>
                  </div>
                  <Heart className="h-8 w-8 text-rose-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="flex-1 bg-white/80 border-white/40 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Supported</p>
                    <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalSupported)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-amber-600" />
                </div>
              </CardContent>
            </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Wallet Settings Link */}
            <Card className="lg:col-span-1 bg-white/80 border-white/40 shadow-xl wallet-tour">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Wallet Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground" style={{ textShadow: '0 0 2px white, 0 0 2px white' }}>
                    Configure your wallet and view your USDC balance.
                  </p>

                  <div className="rounded-lg border border-border p-4 bg-card/50">
                    <div className="text-xs text-muted-foreground" style={{ textShadow: '0 0 2px white, 0 0 2px white' }}>Address</div>
                    <div className="font-mono text-sm text-foreground break-all">
                      {walletAddress ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}` : 'Not connected'}
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground" style={{ textShadow: '0 0 2px white, 0 0 2px white' }}>Balance (USDC)</div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-semibold text-foreground">
                        {walletLoading ? '...' : `${formatUSDC(walletBalance)} USDC`}
                      </span>
                      <Button variant="outline" size="sm" onClick={loadWalletInfo} disabled={walletLoading}>
                        {walletLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Link to="/wallet-settings">
                      <Button className="w-full">Manage Wallet</Button>
                    </Link>
                    {!connected && (
                      <Button variant="secondary" className="w-full" onClick={connectWallet}>
                        Connect Wallet
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Global Timezone Support */}
            <Card className="lg:col-span-1 bg-white/80 border-white/40 shadow-xl timezone-tour">
              <CardHeader>
                <CardTitle className="flex items-center" style={{ 
                  color: 'hsl(200, 100%, 40%)', 
                  textShadow: '1px 1px 2px rgba(0,0,0,0.2)' 
                }}>
                  <Globe className="h-5 w-5 mr-2 text-blue-600" />
                  Global Time Zones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LiveTimezoneDisplay />
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <Link to="/grove-station">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full text-blue-600 border-blue-200 hover:bg-blue-100"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      View Radio Schedule
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Sessions - Show what's happening now */}
          <div className="mt-8">
            <LiveSessionsWidget />
          </div>

          {/* My Radio Slots and Co-Host Invitations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            <div className="lg:col-span-1">
              <MyApprovedSlots />
            </div>
            <div className="lg:col-span-1">
              <CoHostInvites />
            </div>
          </div>

          {/* My Premium Rooms */}
          <div className="mt-8">
            <MyPremiumRooms />
          </div>

          {/* My Orchards and Recent Bestowals */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            {/* My Orchards */}
            <Card className="lg:col-span-1 bg-white/80 border-white/40 shadow-xl my-orchards-section-tour">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center" style={{ 
                  color: 'hsl(120, 100%, 40%)', 
                  textShadow: '1px 1px 2px rgba(0,0,0,0.2)' 
                }}>
                  <Sprout className="h-5 w-5 mr-2 text-green-600" />
                  My Orchards
                </span>
                <Link to="/my-orchards">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userOrchards.length === 0 ? (
                <div className="bg-white/95 rounded-lg mx-4 p-8">
                  <div className="text-center">
                    <TreePine className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-700 mb-6 font-medium" style={{ textShadow: '0 0 2px white, 0 0 2px white' }}>You haven't planted any seeds yet</p>
                    <Link to="/create-orchard">
                      <Button 
                        className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 font-medium mb-4"
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
                <div className="space-y-4">
                  {userOrchards.slice(0, 3).map((orchard) => (
                    <div key={orchard.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">{orchard.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Eye className="h-4 w-4 mr-1" />
                            {orchard.views || 0} views
                          </span>
                          <span className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {orchard.supporters || 0} supporters
                          </span>
                        </div>
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-600">Progress</span>
                            <span className="text-sm font-medium">{getCompletionPercentage(orchard)}%</span>
                          </div>
                          <Progress value={getCompletionPercentage(orchard)} className="h-2" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <Badge variant={orchard.status === 'active' ? 'default' : 'secondary'}>
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
            <Card className="lg:col-span-1 bg-white/80 border-white/40 shadow-xl bestowals-tour">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center" style={{ 
                  color: 'hsl(0, 100%, 60%)', 
                  textShadow: '1px 1px 2px rgba(0,0,0,0.2)' 
                }}>
                  <Heart className="h-5 w-5 mr-2 text-red-500" />
                  Recent Bestowals
                </span>
                <Link to="/browse-orchards">
                  <Button variant="outline" size="sm">Explore More</Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userBestowals.length === 0 ? (
                <div className="bg-white/95 rounded-lg mx-4 p-8">
                  <div className="text-center">
                    <Heart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-700 mb-6 font-medium" style={{ textShadow: '0 0 2px white, 0 0 2px white' }}>You haven't made any bestowals yet</p>
                    <Link to="/browse-orchards">
                      <Button 
                        className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 font-medium mb-4"
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
                <div className="space-y-4">
                  {userBestowals.slice(0, 3).map((bestowal) => (
                    <div key={bestowal.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">
                          {bestowal.orchards?.title || 'Unknown Orchard'}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(bestowal.created_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            {formatCurrency(bestowal.amount)}
                          </span>
                        </div>
                      </div>
                      <Badge variant={bestowal.payment_status === 'completed' ? 'default' : 'secondary'}>
                        {bestowal.payment_status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

          {/* Quick Actions */}
          <Card className="mt-8 bg-white/80 border-white/40 shadow-xl quick-actions-tour">
          <CardHeader>
            <CardTitle style={{ 
              color: 'hsl(280, 100%, 60%)', 
              textShadow: '1px 1px 2px rgba(0,0,0,0.2)' 
            }}>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link to="/create-orchard">
                <Button 
                  className="w-full h-20 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-medium"
                  style={{
                    backgroundColor: '#fdffb6',
                    color: '#a16207'
                  }}
                >
                  <div className="text-center">
                    <Plus className="h-6 w-6 mx-auto mb-2" />
                    <span>Plant New Seed</span>
                  </div>
                </Button>
              </Link>
              
              <div 
                className="w-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 rounded-lg p-4 pb-6 cursor-pointer font-medium overflow-visible"
                style={{
                  backgroundColor: '#166534'
                }}
              >
                <div className="text-center mb-3">
                  <TreePine className="h-6 w-6 mx-auto mb-2" style={{ color: '#86efac' }} />
                  <span className="font-medium" style={{ color: '#86efac' }}>Browse Orchards</span>
                </div>
                <div className="flex justify-center space-x-3 mt-4">
                  <Link to="/browse-orchards">
                    <div 
                      className="w-10 h-10 rounded-full border-2 flex items-center justify-center hover:scale-110 hover:-translate-y-1 transition-all duration-300"
                      style={{
                        backgroundColor: '#caffbf',
                        borderColor: '#166534'
                      }}
                    >
                      <Users className="h-5 w-5" style={{ color: '#166534' }} />
                    </div>
                  </Link>
                  <Link to="/my-orchards">
                    <div 
                      className="w-10 h-10 rounded-full border-2 flex items-center justify-center hover:scale-110 hover:-translate-y-1 transition-all duration-300"
                      style={{
                        backgroundColor: '#ffd6a5',
                        borderColor: '#9a3412'
                      }}
                    >
                      <User className="h-5 w-5" style={{ color: '#9a3412' }} />
                    </div>
                  </Link>
                  <Link 
                    to="/364yhvh-orchards"
                    onClick={(e) => {
                      console.log('🔗 Navigating to 364yhvh-orchards page');
                    }}
                  >
                    <div 
                      className="w-10 h-10 rounded-full border-2 flex items-center justify-center hover:scale-110 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                      style={{
                        backgroundColor: '#e9d5ff',
                        borderColor: '#7c3aed'
                      }}
                    >
                      <Heart className="h-5 w-5" style={{ color: '#7c3aed' }} />
                    </div>
                  </Link>
                </div>
              </div>
              
              <Link to="/profile">
                <Button 
                  className="w-full h-20 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-medium"
                  style={{
                    backgroundColor: '#ffd6a5',
                    color: '#9a3412'
                  }}
                >
                  <div className="text-center">
                    {user?.profile_picture ? (
                      <img 
                        src={user.profile_picture} 
                        alt="Profile" 
                        className="w-8 h-8 rounded-full mx-auto mb-2 border-2"
                        style={{ borderColor: '#9a3412' }}
                      />
                    ) : (
                      <User className="h-6 w-6 mx-auto mb-2" />
                    )}
                    <span>My Profile</span>
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