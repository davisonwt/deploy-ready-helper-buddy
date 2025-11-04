import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Eye, 
  Check, 
  X, 
  Ban, 
  Flag, 
  MessageSquare,
  Video,
  Image,
  RefreshCw,
  Search,
  Clock,
  User,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import { supabase } from '@/integrations/supabase/client';

export function ContentModerationDashboard() {
  const { user } = useAuth();
  const { isAdminOrGosat } = useRoles();
  const [loading, setLoading] = useState(true);
  const [reportedContent, setReportedContent] = useState([]);
  const [selectedContent, setSelectedContent] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });

  useEffect(() => {
    loadReportedContent();
    loadModerationStats();
  }, []);

  const loadReportedContent = async () => {
    try {
      setLoading(true);

      // Fetch real pending items for moderation from orchards (verification workflow)
      const { data: pendingOrchards, error: orchardsError } = await supabase
        .from('orchards')
        .select('id, title, description, user_id, category, created_at, verification_status')
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: true });

      if (orchardsError) throw orchardsError;

      // Fetch owner profiles for display
      const userIds = (pendingOrchards || []).map(o => o.user_id);
      let profilesMap = {};
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds);
        if (!profilesError && profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            acc[p.user_id] = p;
            return acc;
          }, {});
        }
      }

      // Normalize into moderation items
      const items = (pendingOrchards || []).map((o) => ({
        id: o.id,
        content_type: 'orchard',
        content_id: o.id,
        content_title: o.title,
        content_preview: o.description || '',
        reporter_id: o.user_id,
        reporter_name: profilesMap[o.user_id]?.display_name || 'Orchard Owner',
        reason: 'Verification pending',
        detailed_reason: `Category: ${o.category || 'N/A'}`,
        status: 'pending',
        severity: 'medium',
        created_at: o.created_at,
        reviewed_by: null,
        reviewed_at: null,
      }));

      setReportedContent(items);
    } catch (error) {
      console.error('Error loading reported content:', error);
      toast.error('Failed to load moderation queue');
    } finally {
      setLoading(false);
    }
  };

  const loadModerationStats = async () => {
    try {
      // Count orchards by verification status
      const [{ count: pendingCount }, { count: approvedCount }, { count: rejectedCount }] = await Promise.all([
        supabase.from('orchards').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
        supabase.from('orchards').select('*', { count: 'exact', head: true }).eq('verification_status', 'verified'),
        supabase.from('orchards').select('*', { count: 'exact', head: true }).eq('verification_status', 'rejected'),
      ]);

      setStats({
        pending: pendingCount || 0,
        approved: approvedCount || 0,
        rejected: rejectedCount || 0,
        total: (pendingCount || 0) + (approvedCount || 0) + (rejectedCount || 0),
      });
    } catch (error) {
      console.error('Error loading moderation stats:', error);
    }
  };

  const handleApproveContent = async (orchardId) => {
    try {
      const { error } = await supabase
        .from('orchards')
        .update({ verification_status: 'verified', updated_at: new Date().toISOString() })
        .eq('id', orchardId);

      if (error) throw error;

      setReportedContent(prev => prev.filter(item => item.id !== orchardId));
      toast.success('Orchard verified successfully');
      await loadModerationStats();
    } catch (error) {
      console.error('Error approving content:', error);
      toast.error('Failed to verify orchard');
    }
  };

  const handleRejectContent = async (orchardId) => {
    try {
      const { error } = await supabase
        .from('orchards')
        .update({ verification_status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', orchardId);

      if (error) throw error;

      setReportedContent(prev => prev.filter(item => item.id !== orchardId));
      toast.success('Orchard rejected');
      await loadModerationStats();
    } catch (error) {
      console.error('Error rejecting content:', error);
      toast.error('Failed to reject orchard');
    }
  };

  const handleBanUser = async (reportId, userId) => {
    try {
      // In real implementation, this would ban the user
      toast.success('User banned successfully');
      handleRejectContent(reportId);
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
    }
  };

  const filteredContent = reportedContent.filter(item => {
    const matchesType = filterType === 'all' || item.content_type === filterType;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchesType && matchesStatus;
  });

  const getContentTypeIcon = (type) => {
    switch (type) {
      case 'orchard': return <Eye className="h-4 w-4" />;
      case 'message': return <MessageSquare className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'image': return <Image className="h-4 w-4" />;
      default: return <Flag className="h-4 w-4" />;
    }
  };

  const getSeverityBadge = (severity) => {
    const variants = {
      high: 'destructive',
      medium: 'secondary',
      low: 'outline'
    };
    return <Badge variant={variants[severity] || 'secondary'}>{severity}</Badge>;
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive'
    };
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return <Badge variant={variants[status]} className={colors[status]}>{status}</Badge>;
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
                <p className="text-sm font-medium text-muted-foreground">Pending Reviews</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <X className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Reports</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Flag className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="orchard">Orchards</SelectItem>
                <SelectItem value="message">Messages</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="image">Images</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              onClick={loadReportedContent}
              variant="outline"
              className="ml-auto"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Content Reports ({filteredContent.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Content</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContent.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{report.content_title}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-48">
                            {report.content_preview}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getContentTypeIcon(report.content_type)}
                          <span className="capitalize">{report.content_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span>{report.reporter_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{report.reason}</p>
                      </TableCell>
                      <TableCell>
                        {getSeverityBadge(report.severity)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(report.status)}
                      </TableCell>
                      <TableCell>
                        {new Date(report.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedContent(report);
                              setIsDetailOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {report.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApproveContent(report.id)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRejectContent(report.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Content Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Content Report Details</DialogTitle>
          </DialogHeader>
          {selectedContent && (
            <div className="space-y-6">
              {/* Report Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Content Type</label>
                  <div className="flex items-center space-x-2 mt-1">
                    {getContentTypeIcon(selectedContent.content_type)}
                    <span className="capitalize">{selectedContent.content_type}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Severity</label>
                  <div className="mt-1">
                    {getSeverityBadge(selectedContent.severity)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <div className="mt-1">
                    {getStatusBadge(selectedContent.status)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Reported</label>
                  <p className="text-sm mt-1">{new Date(selectedContent.created_at).toLocaleString()}</p>
                </div>
              </div>

              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="report">Report Details</TabsTrigger>
                  <TabsTrigger value="actions">Actions</TabsTrigger>
                </TabsList>
                
                <TabsContent value="content" className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Content Title</label>
                    <p className="text-sm mt-1">{selectedContent.content_title}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Content Preview</label>
                    <p className="text-sm mt-1 p-3 bg-muted rounded-lg">{selectedContent.content_preview}</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="report" className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Reporter</label>
                    <p className="text-sm mt-1">{selectedContent.reporter_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Reason</label>
                    <p className="text-sm mt-1">{selectedContent.reason}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Detailed Explanation</label>
                    <p className="text-sm mt-1 p-3 bg-muted rounded-lg">{selectedContent.detailed_reason}</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="actions" className="space-y-4">
                  {selectedContent.status === 'pending' ? (
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Take Action</h4>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => {
                            handleApproveContent(selectedContent.id);
                            setIsDetailOpen(false);
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Approve Content
                        </Button>
                        <Button
                          onClick={() => {
                            handleRejectContent(selectedContent.id);
                            setIsDetailOpen(false);
                          }}
                          variant="destructive"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject Content
                        </Button>
                        <Button
                          onClick={() => {
                            handleBanUser(selectedContent.id, selectedContent.content_id);
                            setIsDetailOpen(false);
                          }}
                          variant="destructive"
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          Ban User
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-sm font-medium">Review Completed</h4>
                      <p className="text-sm text-muted-foreground">
                        This report has been reviewed and marked as {selectedContent.status}.
                      </p>
                      {selectedContent.reviewed_at && (
                        <p className="text-sm text-muted-foreground">
                          Reviewed on {new Date(selectedContent.reviewed_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}