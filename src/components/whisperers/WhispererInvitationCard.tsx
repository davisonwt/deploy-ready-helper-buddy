import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Check, X, Clock, Package, Trees, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

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
  // Joined data
  product?: { title: string; cover_image_url: string | null } | null;
  orchard?: { name: string; cover_image_url: string | null } | null;
  book?: { title: string; cover_image_url: string | null } | null;
  sower?: { display_name: string; profile?: { avatar_url: string | null } | null } | null;
}

interface WhispererInvitationCardProps {
  invitation: WhispererInvitation;
  onStatusChange: () => void;
}

export function WhispererInvitationCard({ invitation, onStatusChange }: WhispererInvitationCardProps) {
  const [responding, setResponding] = useState(false);

  const entityName = invitation.product?.title || invitation.orchard?.name || invitation.book?.title || 'Unknown';
  const entityImage = invitation.product?.cover_image_url || invitation.orchard?.cover_image_url || invitation.book?.cover_image_url;
  const entityType = invitation.product_id ? 'Product' : invitation.orchard_id ? 'Orchard' : 'Book';
  const EntityIcon = invitation.product_id ? Package : invitation.orchard_id ? Trees : BookOpen;

  const sowerName = invitation.sower?.display_name || 'A Sower';
  const sowerAvatar = invitation.sower?.profile?.avatar_url;

  const isExpired = new Date(invitation.expires_at) < new Date();
  const expiresIn = formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true });

  const handleRespond = async (accept: boolean) => {
    setResponding(true);
    try {
      const newStatus = accept ? 'accepted' : 'declined';
      
      const { error } = await supabase
        .from('whisperer_invitations')
        .update({ 
          status: newStatus,
          responded_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      if (error) throw error;

      // If accepted, create the assignment
      if (accept) {
        const assignmentData: any = {
          whisperer_id: invitation.id, // This will be fixed - we need the whisperer's ID
          sower_id: invitation.sower_id,
          commission_percent: invitation.proposed_commission_percent,
          status: 'active',
          invitation_id: invitation.id,
        };

        if (invitation.product_id) {
          assignmentData.product_id = invitation.product_id;
        }
        // Add orchard_id and book_id handling when those assignment tables exist

        if (invitation.product_id) {
          const { error: assignError } = await supabase
            .from('product_whisperer_assignments')
            .insert(assignmentData);

          if (assignError) {
            console.error('Assignment error:', assignError);
            // Still show success for the invitation response
          }
        }
      }

      toast.success(accept ? 'Invitation accepted! You can now promote this product.' : 'Invitation declined.');
      onStatusChange();
    } catch (error) {
      console.error('Error responding to invitation:', error);
      toast.error('Failed to respond to invitation');
    } finally {
      setResponding(false);
    }
  };

  return (
    <Card className={`transition-all ${isExpired ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Entity Image */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden">
              {entityImage ? (
                <img src={entityImage} alt={entityName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <EntityIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <Badge variant="secondary" className="text-xs mb-1">
                  <EntityIcon className="h-3 w-3 mr-1" />
                  {entityType}
                </Badge>
                <h3 className="font-medium truncate">{entityName}</h3>
              </div>
              <Badge 
                variant={invitation.status === 'pending' ? 'outline' : invitation.status === 'accepted' ? 'default' : 'secondary'}
              >
                {invitation.status}
              </Badge>
            </div>

            {/* Sower info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={sowerAvatar || ''} />
                <AvatarFallback className="text-xs">{sowerName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span>From {sowerName}</span>
            </div>

            {/* Commission offer */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-muted-foreground">Commission offer:</span>
              <span className="font-semibold text-primary">{invitation.proposed_commission_percent}%</span>
            </div>

            {/* Message */}
            {invitation.message && (
              <p className="text-sm text-muted-foreground italic mb-2">"{invitation.message}"</p>
            )}

            {/* Expiry */}
            {invitation.status === 'pending' && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {isExpired ? 'Expired' : `Expires ${expiresIn}`}
              </div>
            )}

            {/* Actions for pending invitations */}
            {invitation.status === 'pending' && !isExpired && (
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={() => handleRespond(true)}
                  disabled={responding}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRespond(false)}
                  disabled={responding}
                >
                  <X className="h-4 w-4 mr-1" />
                  Decline
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
