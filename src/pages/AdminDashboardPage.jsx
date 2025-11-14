import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { 
  Users, 
  Shield, 
  Crown, 
  User, 
  Plus, 
  Trash2,
  Search,
  Calendar,
  Settings,
  Sprout,
  TreePine,
  Eye,
  ArrowRight,
  Check,
  X,
  Radio
} from 'lucide-react'
import { toast } from 'sonner'
import { useRoles } from '../hooks/useRoles'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { useNavigate } from 'react-router-dom'
import AdminRadioManagement from '@/components/radio/AdminRadioManagement'
import { RadioSlotApprovalInterface } from '@/components/radio/RadioSlotApprovalInterface'
import { UserManagementDashboard } from '@/components/admin/UserManagementDashboard'
import { ContentModerationDashboard } from '@/components/admin/ContentModerationDashboard'
import { EnhancedAnalyticsDashboard } from '@/components/admin/EnhancedAnalyticsDashboard'
import { OrganizationWalletSetup } from '@/components/admin/OrganizationWalletSetup'
import { AdminPaymentDashboard } from '@/components/AdminPaymentDashboard'

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const { isAdmin, isAdminOrGosat, loading: rolesLoading, fetchAllUsers, grantRole, revokeRole } = useRoles()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [seeds, setSeeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [seedsLoading, setSeedsLoading] = useState(false)
  const [activeUsers, setActiveUsers] = useState(0)
  const [totalRegistered, setTotalRegistered] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState('')

  useEffect(() => {
    console.log('Component mounted, loading data...')
    console.log('isAdminOrGosat:', isAdminOrGosat)
    loadUsers()
    loadSeeds()
    loadUserStats()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      console.log('🔄 Loading users from AdminDashboard...')
      const result = await fetchAllUsers()
      if (result.success) {
        console.log('✅ AdminDashboard: Loaded users successfully:', result.data?.length || 0)
        console.log('👥 Users with roles:', result.data?.filter(u => u.user_roles?.length > 0).length || 0)
        setUsers(result.data)
        setTotalRegistered(result.data.length)
      } else {
        console.error('❌ AdminDashboard: Failed to load users:', result.error)
        toast.error(result.error || 'Failed to load users')
      }
    } catch (error) {
      console.error('❌ AdminDashboard: Error loading users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const loadUserStats = async () => {
    try {
      console.log('🔍 AdminDashboard: Fetching active users...')
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      console.log('📅 AdminDashboard: Looking for activity since:', thirtyDaysAgo.toISOString())

      const { data: orchardUsers, error: orchardError } = await supabase
        .from('orchards')
        .select('user_id')
        .gte('created_at', thirtyDaysAgo.toISOString())

      const { data: bestowalUsers, error: bestowalError } = await supabase
        .from('bestowals')
        .select('bestower_id')
        .gte('created_at', thirtyDaysAgo.toISOString())

      const { data: messageUsers, error: messageError } = await supabase
        .from('chat_messages')
        .select('sender_id')
        .gte('created_at', thirtyDaysAgo.toISOString())

      const activeUserIds = new Set([
        ...(orchardUsers?.map(u => u.user_id) || []),
        ...(bestowalUsers?.map(u => u.bestower_id) || []),
        ...(messageUsers?.map(u => u.sender_id) || [])
      ])

      console.log('👥 AdminDashboard: Total active users:', activeUserIds.size)
      setActiveUsers(activeUserIds.size)
    } catch (error) {
      console.error('❌ AdminDashboard: Error loading user stats:', error)
    }
  }

  const loadSeeds = async () => {
    try {
      setSeedsLoading(true)
      console.log('Loading seeds...')
      
      // First get all seeds
      const { data: seedsData, error: seedsError } = await supabase
        .from('seeds')
        .select('*')
        .order('created_at', { ascending: false })

      if (seedsError) {
        console.error('Seeds query error:', seedsError)
        throw seedsError
      }

      console.log('Seeds loaded:', seedsData?.length || 0)

      // Then get profiles for the gifters
      if (seedsData && seedsData.length > 0) {
        const gifterIds = seedsData.map(seed => seed.gifter_id).filter(Boolean)
        
        if (gifterIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, display_name')
            .in('user_id', gifterIds)

          if (profilesError) {
            console.error('Profiles query error:', profilesError)
          }

          const seedsWithProfiles = seedsData.map(seed => ({
            ...seed,
            profiles: profilesData?.find(profile => profile.user_id === seed.gifter_id) || null
          }))

          setSeeds(seedsWithProfiles)
        } else {
          setSeeds(seedsData)
        }
      } else {
        setSeeds([])
      }

      console.log('Seeds with profiles set successfully')
    } catch (error) {
      console.error('Error loading seeds:', error)
      toast.error('Failed to load seeds: ' + error.message)
    } finally {
      setSeedsLoading(false)
    }
  }

  const approveSeed = (seedId) => {
    navigate(`/create-orchard?from_seed=${seedId}&approve=true`)
  }

  const deleteSeed = async (seedId, seedTitle) => {
    if (!window.confirm(`Are you sure you want to delete the seed "${seedTitle}"? This action cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('seeds')
        .delete()
        .eq('id', seedId)

      if (error) throw error

      toast.success('Seed deleted successfully')
      loadSeeds()
    } catch (error) {
      console.error('Error deleting seed:', error)
      toast.error('Failed to delete seed')
    }
  }

  const convertSeedToOrchard = (seedId) => {
    navigate(`/create-orchard?from_seed=${seedId}`)
  }

  const handleGrantRole = async () => {
    if (!selectedUser || !selectedRole) return

    try {
      console.log('🔄 Granting role:', selectedRole, 'to user:', selectedUser.user_id)
      const result = await grantRole(selectedUser.user_id, selectedRole)
      if (result.success) {
        toast.success(`Successfully granted ${selectedRole} role to ${selectedUser.display_name}`)
        console.log('🔄 Reloading users immediately...')
        await loadUsers()
        setSelectedRole('')
        
        const updatedUsersList = await fetchAllUsers()
        if (updatedUsersList.success) {
          const updatedUser = updatedUsersList.data.find(u => u.user_id === selectedUser.user_id)
          if (updatedUser) {
            setSelectedUser(updatedUser)
            console.log('✅ Updated selectedUser with fresh roles:', updatedUser.user_roles)
          }
        }
      } else {
        console.error('❌ Failed to grant role:', result.error)
        toast.error(result.error || 'Failed to grant role')
      }
    } catch (error) {
      console.error('❌ Error granting role:', error)
      toast.error('Failed to grant role')
    }
  }

  const handleRevokeRole = async (userId, role, userName) => {
    if (!window.confirm(`Are you sure you want to revoke ${role} role from ${userName}?`)) {
      return
    }

    try {
      console.log('🔄 Revoking role:', role, 'from user:', userId)
      const result = await revokeRole(userId, role)
      if (result.success) {
        toast.success(`Successfully revoked ${role} role from ${userName}`)
        console.log('🔄 Reloading users immediately...')
        await loadUsers()
        
        if (selectedUser && selectedUser.user_id === userId) {
          const updatedUsersList = await fetchAllUsers()
          if (updatedUsersList.success) {
            const updatedUser = updatedUsersList.data.find(u => u.user_id === userId)
            if (updatedUser) {
              setSelectedUser(updatedUser)
              console.log('✅ Updated selectedUser after role revoke:', updatedUser.user_roles)
            }
          }
        }
      } else {
        console.error('❌ Failed to revoke role:', result.error)
        toast.error(result.error || 'Failed to revoke role')
      }
    } catch (error) {
      console.error('❌ Error revoking role:', error)
      toast.error('Failed to revoke role')
    }
  }

  const getRoleIcon = (role) => {
    const iconProps = { className: "h-4 w-4" }
    switch (role) {
      case 'admin': 
        return <Crown {...iconProps} />
      case 'gosat': 
        return <Shield {...iconProps} />
      case 'radio_admin': 
        return <Radio {...iconProps} />
      default: 
        return <User {...iconProps} />
    }
  }

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'admin': return 'destructive'
      case 'gosat': return 'default'
      case 'radio_admin': return 'outline'
      default: return 'secondary'
    }
  }

  const filteredUsers = users.filter(user =>
    user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Wait for roles to load before checking access
  if (rolesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading admin privileges...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isAdminOrGosat) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-16 w-16 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You need gosat or admin privileges to access this page.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="max-w-4xl mx-auto p-8 rounded-2xl border shadow-2xl mb-8 bg-card text-card-foreground">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-primary/20 rounded-full">
                <Settings className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-primary mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Comprehensive management hub</p>
          </div>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="analytics" className="space-y-6">
          <div className="flex justify-center mb-8">
            <TabsList className="bg-transparent p-0 h-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <TabsTrigger 
                value="analytics" 
                className="border-2 border-primary/20 rounded-xl px-6 py-4 font-semibold shadow-lg hover:shadow-xl hover:scale-105 hover:border-primary/40 transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-2xl data-[state=active]:scale-105 bg-background"
              >
                Analytics
              </TabsTrigger>
              <TabsTrigger 
                value="users" 
                className="border-2 border-blue-200 rounded-xl px-6 py-4 font-semibold shadow-lg hover:shadow-xl hover:scale-105 hover:border-blue-300 transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-500 data-[state=active]:shadow-2xl data-[state=active]:scale-105 bg-background"
              >
                Users
              </TabsTrigger>
              <TabsTrigger 
                value="payments" 
                className="border-2 border-green-200 rounded-xl px-6 py-4 font-semibold shadow-lg hover:shadow-xl hover:scale-105 hover:border-green-300 transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:border-green-500 data-[state=active]:shadow-2xl data-[state=active]:scale-105 bg-background"
              >
                Payments
              </TabsTrigger>
              <TabsTrigger 
                value="moderation" 
                className="border-2 border-orange-200 rounded-xl px-6 py-4 font-semibold shadow-lg hover:shadow-xl hover:scale-105 hover:border-orange-300 transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:border-orange-500 data-[state=active]:shadow-2xl data-[state=active]:scale-105 bg-background"
              >
                Moderation
              </TabsTrigger>
              <TabsTrigger 
                value="wallet" 
                className="border-2 border-purple-200 rounded-xl px-6 py-4 font-semibold shadow-lg hover:shadow-xl hover:scale-105 hover:border-purple-300 transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:border-purple-500 data-[state=active]:shadow-2xl data-[state=active]:scale-105 bg-background"
              >
                Wallet
              </TabsTrigger>
              <TabsTrigger 
                value="legacy" 
                className="border-2 border-slate-200 rounded-xl px-6 py-4 font-semibold shadow-lg hover:shadow-xl hover:scale-105 hover:border-slate-300 transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-slate-500 data-[state=active]:to-slate-600 data-[state=active]:text-white data-[state=active]:border-slate-500 data-[state=active]:shadow-2xl data-[state=active]:scale-105 bg-background"
              >
                Legacy
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="analytics">
            <EnhancedAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="users">
            <UserManagementDashboard />
          </TabsContent>

          <TabsContent value="payments">
            <div className="bg-white rounded-lg border">
              <AdminPaymentDashboard />
            </div>
          </TabsContent>

          <TabsContent value="moderation">
            <ContentModerationDashboard />
          </TabsContent>

          <TabsContent value="wallet" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Wallet Setup</CardTitle>
              </CardHeader>
              <CardContent>
                <OrganizationWalletSetup />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="legacy" className="space-y-6">
            {/* Legacy admin content - search, stats, role management, seeds */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
              <Card className="md:col-span-2">
                <CardContent className="pt-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Registered</p>
                      <p className="text-2xl font-bold text-foreground">{totalRegistered}</p>
                    </div>
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active (30d)</p>
                      <p className="text-2xl font-bold text-success">{activeUsers}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-success" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Gosats</p>
                      <p className="text-2xl font-bold text-foreground">
                        {users.filter(u => u.user_roles?.some(r => r.role === 'gosat')).length}
                      </p>
                    </div>
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Radio Management */}
            <div className="space-y-6">
              <AdminRadioManagement />
              <RadioSlotApprovalInterface />
            </div>

            {/* Seeds Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sprout className="h-5 w-5" />
                  <span>Seeds Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {seedsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {seeds.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No seeds found</p>
                    ) : (
                      seeds.map((seed) => (
                        <Card key={seed.id} className="border-l-4 border-l-primary">
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">{seed.title}</h3>
                                <p className="text-muted-foreground text-sm mt-1">
                                  {seed.description?.substring(0, 150)}...
                                </p>
                                <div className="flex items-center space-x-4 mt-3">
                                  <div className="flex items-center space-x-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">
                                      {seed.profiles?.display_name || 'Anonymous'}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">
                                      {new Date(seed.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col space-y-2 ml-4">
                                <div className="flex space-x-2">
                                  <Button 
                                    size="sm" 
                                    onClick={() => approveSeed(seed.id)}
                                    className="flex-1"
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    Approve
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => deleteSeed(seed.id, seed.title)}
                                    className="flex-1"
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                                <div className="flex space-x-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => convertSeedToOrchard(seed.id)}
                                  >
                                    <TreePine className="h-3 w-3 mr-1" />
                                    Convert
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}