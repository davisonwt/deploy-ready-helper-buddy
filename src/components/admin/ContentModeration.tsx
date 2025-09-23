import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/ui/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Flag, CheckCircle, XCircle } from 'lucide-react';
import { contentModerationColumns } from './columns/content-moderation-columns';
import { useToast } from '@/hooks/use-toast';

export default function ContentModeration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: contentItems, isLoading } = useQuery({
    queryKey: ['flagged-content'],
    queryFn: async () => {
      // Get community videos that need moderation
      const { data: videos, error } = await supabase
        .from('community_videos')
        .select('*')
        .in('status', ['pending', 'rejected'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform to match our interface
      return videos?.map(video => ({
        id: video.id,
        title: video.title,
        content_type: 'video',
        status: video.status as 'pending' | 'approved' | 'rejected',
        flagged: false, // videos don't have flagged field
        reports_count: 0, // videos don't have reports_count
        user_id: video.uploader_id,
        created_at: video.created_at,
        updated_at: video.updated_at
      })) || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('community_videos')
        .update({ status: 'approved' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flagged-content'] });
      toast({
        title: 'Content approved',
        description: 'Content has been approved and is now visible'
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

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('community_videos')
        .update({ status: 'rejected' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flagged-content'] });
      toast({
        title: 'Content rejected',
        description: 'Content has been rejected'
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

  const pendingCount = contentItems?.filter(c => c.status === 'pending').length || 0;
  const rejectedCount = contentItems?.filter(c => c.status === 'rejected').length || 0;
  const flaggedCount = contentItems?.filter(c => c.flagged).length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Content Moderation</h2>
        <p className="text-muted-foreground">Review and moderate platform content</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Items awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged Content</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{flaggedCount}</div>
            <p className="text-xs text-muted-foreground">User-reported content</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected Items</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedCount}</div>
            <p className="text-xs text-muted-foreground">Previously rejected</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Table */}
      <Card>
        <CardHeader>
          <CardTitle>Content Items ({contentItems?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={contentModerationColumns}
            data={contentItems || []}
            searchKey="content"
            onApprove={approveMutation.mutate}
            onReject={rejectMutation.mutate}
          />
        </CardContent>
      </Card>
    </div>
  );
}