import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Check, X, Clock, User, Wallet, LinkIcon } from 'lucide-react';

interface WhispererProfile {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  specialties: string[] | null;
  portfolio_links: string[] | null;
  wallet_address: string | null;
  is_verified: boolean;
  status: string;
  created_at: string;
}

export function WhispererApplicationsDashboard() {
  const [profiles, setProfiles] = useState<WhispererProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const fetchProfiles = async () => {
    setLoading(true);
    let query = (supabase as any)
      .from('whisperers')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching whisperer profiles:', error);
      toast.error('Failed to load whisperer profiles');
    } else {
      setProfiles((data as any[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, [filter]);

  const updateStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('whisperers')
      .update({ status: newStatus, is_verified: newStatus === 'approved' } as any)
      .eq('id', id);

    if (error) {
      toast.error('Failed to update whisperer status');
      return;
    }

    toast.success(`Whisperer ${newStatus}`);
    fetchProfiles();
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
      <div className="flex gap-2 flex-wrap">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)} className="capitalize">
            {f}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading whisperer profiles...</div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No {filter !== 'all' ? filter : ''} whisperer profiles found.</div>
      ) : (
        <div className="grid gap-4">
          {profiles.map((profile) => (
            <Card key={profile.id} className="border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {profile.display_name}
                  </CardTitle>
                  {statusBadge(profile.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile.bio && (
                  <p className="text-sm text-muted-foreground">{profile.bio}</p>
                )}

                {profile.specialties && profile.specialties.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {profile.specialties.map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                )}

                {profile.wallet_address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Wallet className="h-3.5 w-3.5" />
                    <span className="truncate max-w-[200px]">{profile.wallet_address}</span>
                  </div>
                )}

                {profile.portfolio_links && profile.portfolio_links.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {profile.portfolio_links.map((link, i) => (
                      <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                        <LinkIcon className="h-3 w-3" /> Portfolio {i + 1}
                      </a>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Registered: {new Date(profile.created_at).toLocaleDateString()}
                  </span>

                  {profile.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950" onClick={() => updateStatus(profile.id, 'rejected')}>
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => updateStatus(profile.id, 'approved')}>
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
