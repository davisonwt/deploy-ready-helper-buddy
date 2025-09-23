import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MoreHorizontal, 
  Edit, 
  UserCheck, 
  UserX, 
  Trash2, 
  Crown,
  Shield,
  User as UserIcon,
  Radio
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

interface UserData {
  user_id: string;
  display_name: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string;
  created_at: string;
  last_login: string;
  suspended: boolean;
  user_roles: Array<{ role: string }>;
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'admin': return <Crown className="h-3 w-3" />;
    case 'gosat': return <Shield className="h-3 w-3" />;
    case 'radio_admin': return <Radio className="h-3 w-3" />;
    default: return <UserIcon className="h-3 w-3" />;
  }
};

const getRoleBadgeVariant = (role: string): "default" | "destructive" | "outline" | "secondary" => {
  switch (role) {
    case 'admin': return 'destructive';
    case 'gosat': return 'default';
    case 'radio_admin': return 'outline';
    default: return 'secondary';
  }
};

export const userManagementColumns: ColumnDef<UserData>[] = [
  {
    accessorKey: 'display_name',
    header: 'User',
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback>
              {(user.display_name || user.first_name || 'U')[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">
              {user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Anonymous'}
            </div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'user_roles',
    header: 'Roles',
    cell: ({ row }) => {
      const roles = row.original.user_roles || [];
      return (
        <div className="flex gap-1 flex-wrap">
          {roles.length === 0 ? (
            <Badge variant="secondary">User</Badge>
          ) : (
            roles.map((roleObj, index) => (
              <Badge key={index} variant={getRoleBadgeVariant(roleObj.role)} className="flex items-center gap-1">
                {getRoleIcon(roleObj.role)}
                {roleObj.role}
              </Badge>
            ))
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'suspended',
    header: 'Status',
    cell: ({ row }) => {
      const suspended = row.original.suspended;
      return (
        <Badge variant={suspended ? 'destructive' : 'default'}>
          {suspended ? 'Suspended' : 'Active'}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Joined',
    cell: ({ row }) => {
      const date = new Date(row.original.created_at);
      return (
        <div className="text-sm">
          {formatDistanceToNow(date, { addSuffix: true })}
        </div>
      );
    },
  },
  {
    accessorKey: 'last_login',
    header: 'Last Login',
    cell: ({ row }) => {
      const lastLogin = row.original.last_login;
      if (!lastLogin) return <span className="text-muted-foreground">Never</span>;
      return (
        <div className="text-sm">
          {formatDistanceToNow(new Date(lastLogin), { addSuffix: true })}
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row, table }) => {
      const user = row.original;
      const { onSuspend, onActivate, onDelete } = (table.options.meta as any) || {};

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.user_id)}>
              Copy user ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Edit user
            </DropdownMenuItem>
            {user.suspended ? (
              <DropdownMenuItem onClick={() => onActivate?.(user.user_id)}>
                <UserCheck className="mr-2 h-4 w-4" />
                Activate user
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onSuspend?.(user.user_id)}>
                <UserX className="mr-2 h-4 w-4" />
                Suspend user
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete?.(user.user_id)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete user
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];