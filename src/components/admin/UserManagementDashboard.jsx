import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Shield, 
  Crown, 
  User, 
  Search,
  Settings,
  MoreHorizontal,
  Eye,
  UserCheck,
  UserX,
  Ban,
  Activity,
  Calendar,
  Mail,
  Phone,
  Wallet,
  Award,
  Megaphone,
  Car,
  Wrench
} from 'lucide-react';
import { toast } from 'sonner';
import { useRoles } from '@/hooks/useRoles';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function UserManagementDashboard() {
  const { user } = useAuth();
  const { isAdminOrGosat, fetchAllUsers, grantRole, revokeRole } = useRoles();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isUserDetailOpen, setIsUserDetailOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [walletData, setWalletData] = useState({});
  const [communityRoles, setCommunityRoles] = useState({});
  const [balanceData, setBalanceData] = useState({});
  const [userStats, setUserStats] = useState({
    total: 0,
    active: 0,
    admins: 0,
    gosats: 0
  });

  const USERS_PER_PAGE = 10;

  useEffect(() => {
    loadUsers();
    loadUserStats();
    loadWalletData();
    loadCommunityRoles();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await fetchAllUsers();
      if (result.success) {
        setUsers(result.data);
      } else {
        toast.error('Failed to load users');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    try {
      // Get user activity statistics
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: activeUsers, error } = await supabase
        .from('profiles')
        .select('user_id, last_login')
        .gte('last_login', thirtyDaysAgo.toISOString());

      if (!error) {
        setUserStats(prev => ({
          ...prev,
          active: activeUsers?.length || 0
        }));
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadWalletData = async () => {
    try {
      // Load user wallets
      const { data: wallets, error: walletsError } = await supabase
        .from('user_wallets')
        .select('user_id, wallet_type, wallet_address, is_active');

      if (!walletsError && wallets) {
        const walletMap = {};
        wallets.forEach(w => {
          if (!walletMap[w.user_id]) walletMap[w.user_id] = [];
          walletMap[w.user_id].push(w);
        });
        setWalletData(walletMap);
      }

      // Load sower balances (payout wallets)
      const { data: balances, error: balancesError } = await supabase
        .from('sower_balances')
        .select('user_id, wallet_address, wallet_type, available_balance, pending_balance, total_earned');

      if (!balancesError && balances) {
        const balanceMap = {};
        balances.forEach(b => {
          balanceMap[b.user_id] = b;
        });
        setBalanceData(balanceMap);
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
    }
  };

  const loadCommunityRoles = async () => {
    try {
      const [ambassadorRes, whispererRes, driverRes, serviceRes] = await Promise.all([
        supabase.from('ambassador_applications').select('user_id, status').eq('status', 'approved'),
        supabase.from('whisperers').select('user_id, is_active'),
        supabase.from('community_drivers').select('user_id, status').eq('status', 'approved'),
        supabase.from('service_providers').select('user_id, status').eq('status', 'approved'),
      ]);

      const roleMap = {};
      const addRole = (data, roleName) => {
        (data || []).forEach(item => {
          if (!item.user_id) return;
          if (!roleMap[item.user_id]) roleMap[item.user_id] = [];
          roleMap[item.user_id].push(roleName);
        });
      };

      addRole(ambassadorRes.data, 'Ambassador');
      addRole(whispererRes.data, 'Whisperer');
      addRole(driverRes.data, 'Driver');
      addRole(serviceRes.data, 'Service Provider');

      setCommunityRoles(roleMap);
    } catch (error) {
      console.error('Error loading community roles:', error);
    }
  };

  const getWalletBadge = (userId) => {
    const wallets = walletData[userId] || [];
    const balance = balanceData[userId];
    const hasPayoutWallet = balance?.wallet_address;
    const activeWallets = wallets.filter(w => w.is_active);

    if (!hasPayoutWallet && activeWallets.length === 0) {
      return <Badge variant="secondary" className="text-xs">Not Set Up</Badge>;
    }

    const providers = [];
    if (hasPayoutWallet) {
      providers.push(balance.wallet_type || 'crypto');
    }
    activeWallets.forEach(w => {
      const type = w.wallet_type || 'unknown';
      if (!providers.includes(type)) providers.push(type);
    });

    return (
      <div className="flex flex-wrap gap-1">
        {providers.map(p => (
          <Badge key={p} variant="default" className="text-xs bg-green-100 text-green-800">
            <Wallet className="h-3 w-3 mr-1" />
            {p}
          </Badge>
        ))}
      </div>
    );
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || 
      user.user_roles?.some(role => role.role === roleFilter);

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && user.email_confirmed_at) ||
      (statusFilter === 'inactive' && !user.email_confirmed_at);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * USERS_PER_PAGE,
    currentPage * USERS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setIsUserDetailOpen(true);
  };

  const handleRoleChange = async (userId, role, action) => {
    try {
      if (action === 'grant') {
        await grantRole(userId, role);
        toast.success(`Successfully granted ${role} role`);
      } else {
        await revokeRole(userId, role);
        toast.success(`Successfully revoked ${role} role`);
      }
      await loadUsers();
    } catch (error) {
      toast.error(`Failed to ${action} role`);
    }
  };

  const handleSuspendUser = async (userId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ suspended: true })
        .eq('user_id', userId);
      
      if (error) throw error;
      toast.success('User suspended successfully');
      await loadUsers();
    } catch (error) {
      console.error('Error suspending user:', error);
      toast.error('Failed to suspend user');
    }
  };

  const handleUnsuspendUser = async (userId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ suspended: false })
        .eq('user_id', userId);
      
      if (error) throw error;
      toast.success('User unsuspended successfully');
      await loadUsers();
    } catch (error) {
      console.error('Error unsuspending user:', error);
      toast.error('Failed to unsuspend user');
    }
  };

  const getRoleBadge = (roles) => {
    if (!roles || roles.length === 0) return <Badge variant="secondary">User</Badge>;
    
    return roles.map(role => (
      <Badge
        key={role.role}
        variant={role.role === 'admin' ? 'destructive' : role.role === 'gosat' ? 'default' : 'secondary'}
        className="mr-1"
      >
        {role.role === 'admin' && <Crown className="h-3 w-3 mr-1" />}
        {role.role === 'gosat' && <Shield className="h-3 w-3 mr-1" />}
        {role.role}
      </Badge>
    ));
  };

  const getStatusBadge = (user) => {
    if (user.email_confirmed_at) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
    }
    return <Badge variant="secondary">Inactive</Badge>;
  };

  if (!isAdminOrGosat) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Shield className="h-16 w-16 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Admin privileges required</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
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
                <p className="text-2xl font-bold text-green-600">{userStats.active}</p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Admins</p>
                <p className="text-2xl font-bold text-red-600">
                  {users.filter(u => u.user_roles?.some(r => r.role === 'admin')).length}
                </p>
              </div>
              <Crown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Gosats</p>
                <p className="text-2xl font-bold text-blue-600">
                  {users.filter(u => u.user_roles?.some(r => r.role === 'gosat')).length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="gosat">Gosat</SelectItem>
                <SelectItem value="radio_admin">Radio Admin</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Wallet</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Community</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Anonymous'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{user.email || 'No email'}</span>
                          {user.phone && <span className="text-xs text-muted-foreground">{user.phone}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getWalletBadge(user.user_id)}
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(user.user_roles)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(communityRoles[user.user_id] || []).length > 0 ? (
                            communityRoles[user.user_id].map(role => {
                              const config = {
                                'Ambassador': { icon: Award, color: 'bg-yellow-100 text-yellow-800' },
                                'Whisperer': { icon: Megaphone, color: 'bg-pink-100 text-pink-800' },
                                'Driver': { icon: Car, color: 'bg-cyan-100 text-cyan-800' },
                                'Service Provider': { icon: Wrench, color: 'bg-teal-100 text-teal-800' },
                              }[role] || { icon: User, color: 'bg-gray-100 text-gray-800' };
                              const Icon = config.icon;
                              return (
                                <Badge key={role} variant="outline" className={`text-xs ${config.color}`}>
                                  <Icon className="h-3 w-3 mr-1" />
                                  {role}
                                </Badge>
                              );
                            })
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.suspended ? (
                          <Badge variant="destructive">Suspended</Badge>
                        ) : user.verification_status === 'verified' ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">Verified</Badge>
                        ) : (
                          <Badge variant="secondary">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewUser(user)}
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {user.suspended ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnsuspendUser(user.user_id)}
                              title="Unsuspend user"
                              className="text-green-600 hover:text-green-700"
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSuspendUser(user.user_id)}
                              title="Suspend user"
                              className="text-destructive hover:text-destructive/80"
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * USERS_PER_PAGE) + 1} to {Math.min(currentPage * USERS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length} users
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Detail Dialog */}
      <Dialog open={isUserDetailOpen} onOpenChange={setIsUserDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">
                    {selectedUser.display_name || `${selectedUser.first_name} ${selectedUser.last_name}` || 'Anonymous'}
                  </h3>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    {getRoleBadge(selectedUser.user_roles)}
                    {getStatusBadge(selectedUser)}
                  </div>
                </div>
              </div>

              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="roles">Manage Roles</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">User ID</label>
                      <p className="font-mono text-sm">{selectedUser.user_id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Joined</label>
                      <p className="text-sm">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone</label>
                      <p className="text-sm">{selectedUser.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Location</label>
                      <p className="text-sm">{selectedUser.location || 'Not provided'}</p>
                    </div>
                    </div>
                    
                    {/* Wallet Info */}
                    <div className="mt-4 border-t pt-4">
                      <label className="text-sm font-medium flex items-center gap-1 mb-2">
                        <Wallet className="h-4 w-4" /> Wallet / Payment Setup
                      </label>
                      <div className="space-y-2">
                        {(() => {
                          const wallets = walletData[selectedUser.user_id] || [];
                          const balance = balanceData[selectedUser.user_id];
                          const activeWallets = wallets.filter(w => w.is_active);
                          
                          if (!balance?.wallet_address && activeWallets.length === 0) {
                            return <p className="text-sm text-muted-foreground">No wallet configured</p>;
                          }

                          return (
                            <div className="space-y-2">
                              {balance?.wallet_address && (
                                <div className="bg-muted rounded-lg p-3 text-sm">
                                  <p className="font-medium">Payout Wallet ({balance.wallet_type || 'crypto'})</p>
                                  <p className="font-mono text-xs text-muted-foreground truncate">{balance.wallet_address}</p>
                                  <div className="flex gap-4 mt-1 text-xs">
                                    <span>Available: ${parseFloat(balance.available_balance || 0).toFixed(2)}</span>
                                    <span>Pending: ${parseFloat(balance.pending_balance || 0).toFixed(2)}</span>
                                    <span>Total Earned: ${parseFloat(balance.total_earned || 0).toFixed(2)}</span>
                                  </div>
                                </div>
                              )}
                              {activeWallets.map(w => (
                                <div key={w.wallet_type} className="bg-muted rounded-lg p-3 text-sm">
                                  <p className="font-medium">{w.wallet_type}</p>
                                  <p className="font-mono text-xs text-muted-foreground truncate">{w.wallet_address || 'No address'}</p>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  {selectedUser.bio && (
                    <div>
                      <label className="text-sm font-medium">Bio</label>
                      <p className="text-sm text-muted-foreground">{selectedUser.bio}</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="activity" className="space-y-4">
                  <p className="text-sm text-muted-foreground">User activity details would be shown here...</p>
                </TabsContent>
                
                <TabsContent value="roles" className="space-y-4">
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Current Roles</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.user_roles?.map(role => (
                        <div key={role.role} className="flex items-center space-x-2">
                          {getRoleBadge([role])}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRoleChange(selectedUser.user_id, role.role, 'revoke')}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Grant New Role</h4>
                      <div className="flex space-x-2">
                        <Select onValueChange={(role) => handleRoleChange(selectedUser.user_id, role, 'grant')}>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select role to grant" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="gosat">Gosat</SelectItem>
                            <SelectItem value="radio_admin">Radio Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}