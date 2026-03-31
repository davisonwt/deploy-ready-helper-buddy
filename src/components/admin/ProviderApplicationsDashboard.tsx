import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, MapPin, Mail, Phone } from 'lucide-react';

const SUBTYPE_ICONS: Record<string, string> = {
  farmer: '🌾',
  homesteader: '🏡',
  manufacturer: '🏭',
};

export function ProviderApplicationsDashboard() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const { data: providers, isLoading } = useQuery({
    queryKey: ['admin-providers', filter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('status', filter)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, userId }: { id: string; status: string; userId: string }) => {
      // Update provider status
      const updates: any = { status };
      if (status === 'approved') updates.approved_at = new Date().toISOString();
      
      const { error } = await supabase
        .from('providers')
        .update(updates)
        .eq('id', id);
      if (error) throw error;

      // If approved, add provider role
      if (status === 'approved') {
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({ user_id: userId, role: 'provider' }, { onConflict: 'user_id,role' });
        if (roleError) console.error('Role assignment error:', roleError);
      }
    },
    onSuccess: (_, vars) => {
      toast({ title: `Provider ${vars.status}`, description: `Application has been ${vars.status}.` });
      queryClient.invalidateQueries({ queryKey: ['admin-providers'] });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {(['pending', 'approved', 'rejected'] as const).map(s => (
          <Button
            key={s}
            variant={filter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      {isLoading && <p className="text-muted-foreground text-center py-8">Loading...</p>}

      {!isLoading && (!providers || providers.length === 0) && (
        <p className="text-muted-foreground text-center py-8">No {filter} provider applications.</p>
      )}

      <div className="space-y-4">
        {providers?.map((p: any) => (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {p.logo_url && (
                    <img src={p.logo_url} alt={p.business_name} className="w-12 h-12 rounded-xl object-cover border border-border" />
                  )}
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {SUBTYPE_ICONS[p.subtype] || '📦'} {p.business_name}
                    </CardTitle>
                    <Badge variant="outline" className="mt-1 capitalize">{p.subtype}</Badge>
                  </div>
                </div>
                <Badge variant={p.status === 'approved' ? 'default' : p.status === 'rejected' ? 'destructive' : 'secondary'}>
                  {p.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {p.bio && <p className="text-sm text-muted-foreground">{p.bio}</p>}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {p.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.city}, {p.country}</span>}
                {p.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{p.email}</span>}
                {p.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{p.phone}</span>}
              </div>
              {p.photos && p.photos.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {p.photos.slice(0, 4).map((url: string, i: number) => (
                    <img key={i} src={url} alt="" className="w-16 h-16 rounded-lg object-cover border border-border" />
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Applied: {new Date(p.created_at).toLocaleDateString()}</p>

              {filter === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => updateStatus.mutate({ id: p.id, status: 'approved', userId: p.user_id })}
                    disabled={updateStatus.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => updateStatus.mutate({ id: p.id, status: 'rejected', userId: p.user_id })}
                    disabled={updateStatus.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-1" /> Reject
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
