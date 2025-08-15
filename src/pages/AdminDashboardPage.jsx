import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  Settings
} from 'lucide-react'
import { toast } from 'sonner'
import { useRoles } from '../hooks/useRoles'
import { useAuth } from '../hooks/useAuth'

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const { isAdmin, fetchAllUsers, grantRole, revokeRole } = useRoles()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState('')

  useEffect(() => {
    loadUsers()
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

  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-destructive/10 via-background to-destructive/10 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-16 w-16 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You need admin privileges to access this page.</p>
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

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>User Management</span>
              <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Grant Role
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Grant Role to User</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Select User</Label>
                      <Select onValueChange={(value) => {
                        const user = users.find(u => u.user_id === value)
                        setSelectedUser(user)
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose user..." />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.user_id} value={user.user_id}>
                              {user.display_name || `${user.first_name} ${user.last_name}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.user_id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-border">
                      {user.avatar_url ? (
                        <img 
                          src={user.avatar_url} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {user.display_name || `${user.first_name} ${user.last_name}`}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {user.user_roles?.map((userRole) => (
                      <div key={userRole.role} className="flex items-center space-x-1">
                        <Badge variant={getRoleBadgeVariant(userRole.role)} className="flex items-center space-x-1">
                          {getRoleIcon(userRole.role)}
                          <span>{userRole.role}</span>
                        </Badge>
                        {userRole.role !== 'user' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRevokeRole(
                              user.user_id, 
                              userRole.role, 
                              user.display_name || `${user.first_name} ${user.last_name}`
                            )}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {!user.user_roles?.length && (
                      <Badge variant="secondary" className="flex items-center space-x-1">
                        {getRoleIcon('user')}
                        <span>user</span>
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}