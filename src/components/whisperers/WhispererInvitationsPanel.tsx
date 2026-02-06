import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Check, X, Clock, Loader2 } from 'lucide-react';
import { WhispererInvitationCard } from './WhispererInvitationCard';

interface WhispererInvitation {
  id: string;
  product_id: string | null;
  orchard_id: string | null;
  book_id: string | null;
  sower_id: string;
  proposed_commission_percent: number;
  status: string;
  message: string | null;
  expires_at: string;
  created_at: string;
  product?: { title: string; cover_image_url: string | null } | null;
  orchard?: { name: string; cover_image_url: string | null } | null;
  book?: { title: string; cover_image_url: string | null } | null;
  sower?: { display_name: string; profile?: { avatar_url: string | null } | null } | null;
}

export function WhispererInvitationsPanel() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<WhispererInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  const fetchInvitations = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // First get the whisperer ID for this user
      const { data: whispererData, error: whispererError } = await supabase
        .from('whisperers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (whispererError || !whispererData) {
        console.log('User is not a whisperer');
        setLoading(false);
        return;
      }

      // Fetch invitations for this whisperer
      const { data, error } = await supabase
        .from('whisperer_invitations')
        .select(`
          id,
          product_id,
          orchard_id,
          book_id,
          sower_id,
          proposed_commission_percent,
          status,
          message,
          expires_at,
          created_at,
          product:products(title, cover_image_url),
          orchard:orchards(name, cover_image_url),
          book:sower_books(title, cover_image_url)
        `)
        .eq('whisperer_id', whispererData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch sower info separately (to get display names)
      const sowerIds = [...new Set((data || []).map((inv: any) => inv.sower_id))];
      const { data: sowerData } = await supabase
        .from('sowers')
        .select('user_id, display_name')
        .in('user_id', sowerIds);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id, avatar_url')
        .in('user_id', sowerIds);

      const sowerMap = new Map();
      sowerData?.forEach((s: any) => {
        sowerMap.set(s.user_id, { display_name: s.display_name });
      });
      profileData?.forEach((p: any) => {
        const existing = sowerMap.get(p.user_id) || {};
        sowerMap.set(p.user_id, { ...existing, profile: { avatar_url: p.avatar_url } });
      });

      const transformedData = (data || []).map((inv: any) => ({
        ...inv,
        product: Array.isArray(inv.product) ? inv.product[0] : inv.product,
        orchard: Array.isArray(inv.orchard) ? inv.orchard[0] : inv.orchard,
        book: Array.isArray(inv.book) ? inv.book[0] : inv.book,
        sower: sowerMap.get(inv.sower_id) || null,
      }));

      setInvitations(transformedData);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, [user?.id]);

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');
  const acceptedInvitations = invitations.filter(inv => inv.status === 'accepted');
  const declinedInvitations = invitations.filter(inv => inv.status === 'declined');

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <CardTitle>Partnership Invitations</CardTitle>
          {pendingInvitations.length > 0 && (
            <Badge variant="destructive">{pendingInvitations.length}</Badge>
          )}
        </div>
        <CardDescription>
          Sowers have invited you to promote their products
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Pending
              {pendingInvitations.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {pendingInvitations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="accepted" className="flex items-center gap-1">
              <Check className="h-4 w-4" />
              Accepted
            </TabsTrigger>
            <TabsTrigger value="declined" className="flex items-center gap-1">
              <X className="h-4 w-4" />
              Declined
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <ScrollArea className="h-[400px] mt-4">
              {pendingInvitations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending invitations
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingInvitations.map((invitation) => (
                    <WhispererInvitationCard
                      key={invitation.id}
                      invitation={invitation}
                      onStatusChange={fetchInvitations}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="accepted">
            <ScrollArea className="h-[400px] mt-4">
              {acceptedInvitations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No accepted invitations yet
                </div>
              ) : (
                <div className="space-y-3">
                  {acceptedInvitations.map((invitation) => (
                    <WhispererInvitationCard
                      key={invitation.id}
                      invitation={invitation}
                      onStatusChange={fetchInvitations}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="declined">
            <ScrollArea className="h-[400px] mt-4">
              {declinedInvitations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No declined invitations
                </div>
              ) : (
                <div className="space-y-3">
                  {declinedInvitations.map((invitation) => (
                    <WhispererInvitationCard
                      key={invitation.id}
                      invitation={invitation}
                      onStatusChange={fetchInvitations}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
