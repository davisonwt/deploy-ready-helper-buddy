import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, Users, UserCheck } from 'lucide-react';
import { userManagementColumns } from './columns/user-management-columns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';

export default function UserManagement() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { fetchAllUsers } = useRoles();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter],
    queryFn: async () => {
      const result = await fetchAllUsers();
      if (result.success) {
        let filteredUsers = result.data;
        
        if (search) {
          filteredUsers = filteredUsers.filter((u: any) =>
            u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
            u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
            u.last_name?.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase())
          );
        }
        
        if (roleFilter !== 'all') {
          filteredUsers = filteredUsers.filter((u: any) =>
            u.user_roles?.some((r: any) => r.role === roleFilter)
          );
        }
        
        return filteredUsers;
      }
      return [];
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async (userId: string) => {
      // For now, we'll use verification_status as a proxy for suspension
      const { error } = await supabase
        .from('profiles')
        .update({ verification_status: 'rejected' })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'User suspended',
        description: 'User has been suspended successfully'
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    }
  });

  const activateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ verification_status: 'verified' })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'User activated',
        description: 'User has been activated successfully'
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Note: In production, you might want to soft delete instead
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'User deleted',
        description: 'User has been deleted successfully'
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <div className="flex space-x-2">
              <Input 
                placeholder="Search users..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="max-w-sm" 
              />
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="gosat">Gosat</SelectItem>
                  <SelectItem value="radio_admin">Radio Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DataTable
            columns={userManagementColumns}
            data={users || []}
            searchKey="users"
            onSuspend={suspendMutation.mutate}
            onActivate={activateMutation.mutate}
            onDelete={deleteMutation.mutate}
          />
        </CardContent>
      </Card>
    </div>
  );
}