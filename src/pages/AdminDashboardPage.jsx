import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'
import { useRoles } from '../hooks/useRoles'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { useNavigate } from 'react-router-dom'

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const { isAdmin, isAdminOrGosat, fetchAllUsers, grantRole, revokeRole } = useRoles()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [seeds, setSeeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [seedsLoading, setSeedsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState('')

  useEffect(() => {
    loadUsers()
    if (isAdminOrGosat()) {
      loadSeeds()
    }
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const result = await fetchAllUsers()
      if (result.success) {
        setUsers(result.data)
      } else {
        toast.error(result.error || 'Failed to load users')
      }
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const loadSeeds = async () => {
    try {
      setSeedsLoading(true)
      const { data, error } = await supabase
        .from('seeds')
        .select(`
          *,
          profiles!seeds_gifter_id_fkey (
            display_name,
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSeeds(data || [])
    } catch (error) {
      console.error('Error loading seeds:', error)
      toast.error('Failed to load seeds')
    } finally {
      setSeedsLoading(false)
    }
  }

  const convertSeedToOrchard = (seedId) => {
    // Navigate to create orchard page with seed data
    navigate(`/create-orchard?from_seed=${seedId}`)
  }

  const handleGrantRole = async () => {
    if (!selectedUser || !selectedRole) return

    try {
      const result = await grantRole(selectedUser.user_id, selectedRole)
      if (result.success) {
        toast.success(`Successfully granted ${selectedRole} role to ${selectedUser.display_name}`)
        loadUsers()
        setIsRoleDialogOpen(false)
        setSelectedUser(null)
        setSelectedRole('')
      } else {
        toast.error(result.error || 'Failed to grant role')
      }
    } catch (error) {
      console.error('Error granting role:', error)
      toast.error('Failed to grant role')
    }
  }

  const handleRevokeRole = async (userId, role, userName) => {
    if (!window.confirm(`Are you sure you want to revoke ${role} role from ${userName}?`)) {
      return
    }

    try {
      const result = await revokeRole(userId, role)
      if (result.success) {
        toast.success(`Successfully revoked ${role} role from ${userName}`)
        loadUsers()
      } else {
        toast.error(result.error || 'Failed to revoke role')
      }
    } catch (error) {
      console.error('Error revoking role:', error)
      toast.error('Failed to revoke role')
    }
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4" />
      case 'gosat': return <Shield className="h-4 w-4" />
      default: return <User className="h-4 w-4" />
    }
  }

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'admin': return 'destructive'
      case 'gosat': return 'default'
      default: return 'secondary'
    }
  }

  const filteredUsers = users.filter(user =>
    user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isAdminOrGosat()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-destructive/10 via-background to-destructive/10 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="max-w-4xl mx-auto p-8 rounded-2xl border shadow-2xl mb-8 bg-white/90">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-primary/20 rounded-full">
                <Settings className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-primary mb-2">Gosat's Dashboard</h1>
            <p className="text-muted-foreground">Manage user roles and permissions</p>
          </div>
        </div>

        {/* Search and Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                  <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold text-foreground">{users.length}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
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

        {/* Role Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Grant User Roles</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Grant Role to User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Grant Role to User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Select User</Label>
                    <Popover open={isUserDropdownOpen} onOpenChange={setIsUserDropdownOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isUserDropdownOpen}
                          className="w-full justify-between bg-background"
                        >
                          {selectedUser 
                            ? (selectedUser.display_name || `${selectedUser.first_name} ${selectedUser.last_name}`)
                            : "Search users by name or ID..."
                          }
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput 
                            placeholder="Search users..." 
                            value={userSearchTerm}
                            onValueChange={setUserSearchTerm}
                          />
                          <CommandList>
                            <CommandEmpty>No users found.</CommandEmpty>
                            <CommandGroup>
                              {users
                                .filter(user => 
                                  user.display_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                                  user.first_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                                  user.last_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                                  user.user_id?.toLowerCase().includes(userSearchTerm.toLowerCase())
                                )
                                .slice(0, 10)
                                .map((user) => (
                                  <CommandItem
                                    key={user.user_id}
                                    value={user.user_id}
                                    onSelect={() => {
                                      setSelectedUser(user)
                                      setIsUserDropdownOpen(false)
                                      setUserSearchTerm('')
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <div className="flex flex-col space-y-1 w-full">
                                      <span className="font-medium">
                                        {user.display_name || `${user.first_name} ${user.last_name}`}
                                      </span>
                                      <span className="text-sm text-muted-foreground">
                                        ID: {user.user_id?.slice(0, 8)}...
                                      </span>
                                      {user.user_roles?.length > 0 && (
                                        <div className="flex space-x-1">
                                          {user.user_roles.map((role) => (
                                            <Badge key={role.role} variant="outline" className="text-xs">
                                              {role.role}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Select Role</Label>
                    <Select onValueChange={setSelectedRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose role..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gosat">Gosat (Manager)</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleGrantRole} className="w-full" disabled={!selectedUser || !selectedRole}>
                    Grant Role
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Seeds Management Section - Only for Gosats/Admins */}
        {isAdminOrGosat() && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sprout className="h-5 w-5 text-success" />
                <span>Seeds Management</span>
                <Badge variant="secondary">{seeds.length} seeds</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {seedsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : seeds.length === 0 ? (
                <div className="text-center py-8">
                  <Sprout className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No seeds submitted yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {seeds.map((seed) => (
                    <Card key={seed.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Seed Image */}
                          {seed.images && seed.images.length > 0 && (
                            <div className="w-full h-32 rounded-lg overflow-hidden bg-gray-100">
                              <img 
                                src={seed.images[0]} 
                                alt={seed.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          
                          {/* Seed Info */}
                          <div>
                            <h3 className="font-semibold text-sm mb-1 line-clamp-2">{seed.title}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{seed.description}</p>
                            <Badge variant="outline" className="text-xs">{seed.category}</Badge>
                          </div>
                          
                          {/* Gifter Info */}
                          <div className="text-xs text-muted-foreground">
                            <p>Gifted by: {seed.profiles?.display_name || `${seed.profiles?.first_name} ${seed.profiles?.last_name}` || 'Unknown'}</p>
                            <p>Date: {new Date(seed.created_at).toLocaleDateString()}</p>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              className="flex-1"
                              onClick={() => convertSeedToOrchard(seed.id)}
                            >
                              <TreePine className="h-3 w-3 mr-1" />
                              Convert to Orchard
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => window.open(`/seed/${seed.id}`, '_blank')}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}