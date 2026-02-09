import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Check, 
  X, 
  Ban,
  Eye,
  Clock,
  User,
  MessageSquare,
  Image,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ContentFlag {
  id: string;
  content_type: string;
  content_id: string;
  user_id: string;
  violation_type: string;
  severity: string;
  detected_terms: string[];
  auto_action_taken: string;
  status: string;
  ai_confidence: number | null;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  user_profile?: {
    display_name: string;
    avatar_url: string | null;
  };
}

export function FlaggedContentTab() {
  const { user } = useAuth();
  const [flags, setFlags] = useState<ContentFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reviewed' | 'dismissed' | 'confirmed'>('pending');

  const fetchFlags = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('content_flags')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: flagsData, error } = await query;

      if (error) throw error;

      // Fetch user profiles for the flagged content
      if (flagsData && flagsData.length > 0) {
        const userIds = [...new Set(flagsData.map(f => f.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds);

        const flagsWithProfiles = flagsData.map(flag => ({
          ...flag,
          user_profile: profiles?.find(p => p.user_id === flag.user_id)
        }));

        setFlags(flagsWithProfiles);
      } else {
        setFlags([]);
      }

    } catch (error: any) {
      console.error('Error fetching flags:', error);
      toast.error('Failed to load flagged content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('flagged-content-monitor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_flags',
        },
        () => {
          fetchFlags();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter]);

  const handleDismiss = async (flagId: string) => {
    try {
      const { error } = await supabase
        .from('content_flags')
        .update({
          status: 'dismissed',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', flagId);

      if (error) throw error;
      toast.success('Flag dismissed');
      fetchFlags();

      // Mark related alert as read
      await supabase
        .from('gosat_alerts')
        .update({ is_read: true })
        .eq('flag_id', flagId);
    } catch (error: any) {
      toast.error('Failed to dismiss: ' + error.message);
    }
  };

  const handleConfirm = async (flagId: string) => {
    try {
      const { error } = await supabase
        .from('content_flags')
        .update({
          status: 'confirmed',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', flagId);

      if (error) throw error;
      toast.success('Violation confirmed');
      fetchFlags();

      // Mark related alert as read
      await supabase
        .from('gosat_alerts')
        .update({ is_read: true })
        .eq('flag_id', flagId);
    } catch (error: any) {
      toast.error('Failed to confirm: ' + error.message);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-amber-500 text-black';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getViolationIcon = (type: string) => {
    switch (type) {
      case 'profanity': return '🤬';
      case 'explicit': return '🔞';
      case 'gambling': return '🎰';
      case 'manipulation': return '🎭';
      default: return '⚠️';
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="w-4 h-4" />;
      case 'media': return <Image className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'reviewed', 'dismissed', 'confirmed'] as const).map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
            className="capitalize"
          >
            {status}
          </Button>
        ))}
      </div>

      {/* Flags List */}
      {flags.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <p className="text-muted-foreground">No flagged content to review</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flags.map((flag) => (
            <Card 
              key={flag.id} 
              className={`transition-all hover:shadow-lg ${
                flag.severity === 'critical' ? 'border-destructive bg-destructive/5' :
                flag.severity === 'high' ? 'border-orange-500 bg-orange-500/5' : ''
              }`}
            >
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getViolationIcon(flag.violation_type)}</span>
                    <div>
                      <Badge className={getSeverityColor(flag.severity)}>
                        {flag.severity.toUpperCase()}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1 capitalize">
                        {flag.violation_type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {getContentTypeIcon(flag.content_type)}
                    <span className="capitalize">{flag.content_type}</span>
                  </div>
                </div>

                {/* User Info */}
                <div className="flex items-center gap-2 mb-3 p-2 bg-muted/50 rounded">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {flag.user_profile?.display_name || 'Unknown User'}
                  </span>
                </div>

                {/* Detected Terms */}
                {flag.detected_terms && flag.detected_terms.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Detected Terms:</p>
                    <div className="flex flex-wrap gap-1">
                      {flag.detected_terms.slice(0, 5).map((term, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs bg-destructive/10 border-destructive/30">
                          {term}
                        </Badge>
                      ))}
                      {flag.detected_terms.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{flag.detected_terms.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* AI Confidence */}
                {flag.ai_confidence !== null && (
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">AI Confidence:</span>
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(flag.ai_confidence * 100)}%
                    </Badge>
                  </div>
                )}

                {/* Timestamp */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                  <Clock className="w-3 h-3" />
                  {new Date(flag.created_at).toLocaleString()}
                </div>

                {/* Auto Action */}
                {flag.auto_action_taken !== 'none' && (
                  <div className="mb-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs">
                    <strong>Auto-action:</strong> {flag.auto_action_taken}
                  </div>
                )}

                {/* Status Badge */}
                <div className="mb-3">
                  <Badge 
                    variant={
                      flag.status === 'pending' ? 'default' :
                      flag.status === 'confirmed' ? 'destructive' :
                      flag.status === 'dismissed' ? 'secondary' : 'outline'
                    }
                  >
                    {flag.status}
                  </Badge>
                </div>

                {/* Actions */}
                {flag.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => handleDismiss(flag.id)}
                    >
                      <X className="w-3 h-3 mr-1" />
                      Dismiss
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1 text-xs"
                      onClick={() => handleConfirm(flag.id)}
                    >
                      <Ban className="w-3 h-3 mr-1" />
                      Confirm
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
