import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, Eye, Flag, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

interface ContentData {
  id: string;
  title: string;
  content_type: string;
  status: 'pending' | 'approved' | 'rejected';
  flagged: boolean;
  reports_count: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export const contentModerationColumns: ColumnDef<ContentData>[] = [
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => {
      const content = row.original;
      return (
        <div>
          <div className="font-medium max-w-[200px] truncate">
            {content.title}
          </div>
          <div className="text-sm text-muted-foreground">
            {content.content_type}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      const variant = status === 'approved' ? 'default' : 
                    status === 'pending' ? 'secondary' : 'destructive';
      return (
        <Badge variant={variant}>
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'flagged',
    header: 'Flagged',
    cell: ({ row }) => {
      const flagged = row.original.flagged;
      return (
        <div className="flex items-center gap-2">
          {flagged && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <Flag className="h-3 w-3" />
              Flagged
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'reports_count',
    header: 'Reports',
    cell: ({ row }) => {
      const count = row.original.reports_count || 0;
      return (
        <div className="text-center">
          {count > 0 ? (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
              {count}
            </Badge>
          ) : (
            <span className="text-muted-foreground">0</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) => {
      const date = new Date(row.original.created_at);
      return (
        <div className="text-sm">
          {format(date, 'MMM dd, yyyy')}
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row, table }) => {
      const content = row.original;
      const { onApprove, onReject } = (table.options.meta as any) || {};
      
      return (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title="View details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          
          {content.status === 'pending' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                onClick={() => onApprove?.(content.id)}
                title="Approve"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                onClick={() => onReject?.(content.id)}
                title="Reject"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-7 w-7 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(content.id)}>
                Copy content ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>View full content</DropdownMenuItem>
              <DropdownMenuItem>View reports</DropdownMenuItem>
              <DropdownMenuSeparator />
              {content.status !== 'approved' && (
                <DropdownMenuItem onClick={() => onApprove?.(content.id)}>
                  <Check className="mr-2 h-4 w-4" />
                  Approve
                </DropdownMenuItem>
              )}
              {content.status !== 'rejected' && (
                <DropdownMenuItem 
                  onClick={() => onReject?.(content.id)}
                  className="text-destructive"
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];