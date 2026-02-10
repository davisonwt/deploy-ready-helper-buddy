import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Check, X, Clock, Mail, User, Globe } from 'lucide-react';

interface Application {
  id: string;
  user_id: string | null;
  full_name: string;
  current_role: string;
  username: string;
  email: string;
  platforms: string[];
  brand_name: string | null;
  why_represent: string;
  status: string;
  created_at: string;
}

export function AmbassadorApplicationsDashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const fetchApplications = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('ambassador_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      console.log('📋 Ambassador applications query result:', { data, error, filter });

      if (error) {
        console.error('Error fetching applications:', error);
        toast.error('Failed to load applications: ' + error.message);
      } else {
        setApplications(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Unexpected error loading applications');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchApplications();
  }, [filter]);

  const updateStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
    const { error } = await (supabase as any)
      .from('ambassador_applications')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update application');
      return;
    }

    toast.success(`Application ${newStatus}`);
    fetchApplications();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400"><Check className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400"><X className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter buttons */}
      <div className="flex gap-2 flex-wrap">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading applications...</div>
      ) : applications.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No {filter !== 'all' ? filter : ''} applications found.</div>
      ) : (
        <div className="grid gap-4">
          {applications.map((app) => (
            <Card key={app.id} className="border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {app.full_name}
                  </CardTitle>
                  {statusBadge(app.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {app.email}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Globe className="h-3.5 w-3.5" />
                    @{app.username}
                  </div>
                  {app.current_role && (
                    <div className="text-muted-foreground">
                      <span className="font-medium">Role:</span> {app.current_role}
                    </div>
                  )}
                  {app.brand_name && (
                    <div className="text-muted-foreground">
                      <span className="font-medium">Brand:</span> {app.brand_name}
                    </div>
                  )}
                </div>

                {app.platforms?.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {app.platforms.map((p) => (
                      <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                    ))}
                  </div>
                )}

                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p className="font-medium mb-1">Why they want to represent S2G:</p>
                  <p className="text-muted-foreground">{app.why_represent}</p>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Applied: {new Date(app.created_at).toLocaleDateString()}
                  </span>

                  {app.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => updateStatus(app.id, 'rejected')}
                      >
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => updateStatus(app.id, 'approved')}
                      >
                        <Check className="h-4 w-4 mr-1" /> Approve
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
