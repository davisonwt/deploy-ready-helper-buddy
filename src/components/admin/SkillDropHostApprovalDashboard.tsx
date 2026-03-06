import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Check, X, GraduationCap, Clock, User } from 'lucide-react';

export const SkillDropHostApprovalDashboard: React.FC = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; appId: string | null }>({ open: false, appId: null });
  const [rejectionReason, setRejectionReason] = useState('');

  const loadApplications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('skilldrop_host_applications' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setApplications((data as any[]) || []);
    } catch (err) {
      console.error('Error loading host applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadApplications(); }, []);

  const handleApprove = async (appId: string) => {
    try {
      const { error } = await supabase
        .from('skilldrop_host_applications' as any)
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', appId);
      if (error) throw error;
      toast.success('Host application approved!');
      loadApplications();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.appId) return;
    try {
      const { error } = await supabase
        .from('skilldrop_host_applications' as any)
        .update({
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason || 'Application not approved at this time.',
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', rejectDialog.appId);
      if (error) throw error;
      toast.success('Application rejected');
      setRejectDialog({ open: false, appId: null });
      setRejectionReason('');
      loadApplications();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const pending = applications.filter(a => a.status === 'pending');
  const approved = applications.filter(a => a.status === 'approved');
  const rejected = applications.filter(a => a.status === 'rejected');

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="text-amber-600 border-amber-400"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved': return <Badge className="bg-emerald-600"><Check className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected': return <Badge variant="destructive"><X className="w-3 h-3 mr-1" />Rejected</Badge>;
      default: return null;
    }
  };

  const roleLabel = (type: string) => {
    const map: Record<string, string> = {
      sower: 'Sower', grower: 'Grower', driver: 'Driver',
      whisperer: 'Whisperer', service_provider: 'Service Provider',
    };
    return map[type] || type;
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-amber-500">{pending.length}</p><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-emerald-500">{approved.length}</p><p className="text-xs text-muted-foreground">Approved</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-destructive">{rejected.length}</p><p className="text-xs text-muted-foreground">Rejected</p></CardContent></Card>
      </div>

      {/* Applications list */}
      {applications.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No host applications yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {applications.map(app => (
            <Card key={app.id} className={`border-l-4 ${app.status === 'pending' ? 'border-l-amber-500' : app.status === 'approved' ? 'border-l-emerald-500' : 'border-l-destructive'}`}>
              <CardContent className="pt-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold">{app.full_name}</span>
                      {statusBadge(app.status)}
                    </div>
                    <p className="text-sm"><span className="text-muted-foreground">Role:</span> {roleLabel(app.role_type)}</p>
                    <p className="text-sm"><span className="text-muted-foreground">Expertise:</span> {app.expertise_area}</p>
                    {app.description && <p className="text-sm text-muted-foreground mt-1">{app.description}</p>}
                    {app.experience_summary && <p className="text-xs text-muted-foreground italic">{app.experience_summary}</p>}
                    <p className="text-xs text-muted-foreground">Applied: {new Date(app.created_at).toLocaleDateString()}</p>
                  </div>
                  {app.status === 'pending' && (
                    <div className="flex gap-2 ml-4">
                      <Button size="sm" onClick={() => handleApprove(app.id)} className="bg-emerald-600 hover:bg-emerald-700">
                        <Check className="w-3 h-3 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setRejectDialog({ open: true, appId: app.id })}>
                        <X className="w-3 h-3 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={open => setRejectDialog({ open, appId: open ? rejectDialog.appId : null })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Application</DialogTitle></DialogHeader>
          <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Reason for rejection (optional)..." rows={3} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRejectDialog({ open: false, appId: null })}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Confirm Rejection</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
