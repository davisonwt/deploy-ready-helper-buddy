import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Search, CheckCircle, Users, DollarSign, Send, X, ExternalLink, Clock } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

interface Whisperer {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  specialties: string[] | null;
  total_earnings: number;
  total_products_promoted: number;
  is_verified: boolean;
  portfolio_url?: string | null;
  profile?: {
    avatar_url: string | null;
  } | null;
}

export interface PendingInvitation {
  whisperer: Whisperer;
  commissionPercent: number;
  message: string;
}

interface WhispererSelectorProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  pendingInvitations: PendingInvitation[];
  onAddInvitation: (invitation: PendingInvitation) => void;
  onRemoveInvitation: (whispererId: string) => void;
  maxWhisperers?: number;
}

export function WhispererSelector({
  enabled,
  onEnabledChange,
  pendingInvitations,
  onAddInvitation,
  onRemoveInvitation,
  maxWhisperers = 3,
}: WhispererSelectorProps) {
  const { user } = useAuth();
  const [whisperers, setWhisperers] = useState<Whisperer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Invitation dialog state
  const [selectedForInvite, setSelectedForInvite] = useState<Whisperer | null>(null);
  const [inviteCommission, setInviteCommission] = useState(15);
  const [inviteMessage, setInviteMessage] = useState('');

  useEffect(() => {
    if (isDialogOpen) {
      fetchWhisperers();
    }
  }, [isDialogOpen]);

  const fetchWhisperers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('whisperers')
        .select(`
          id,
          user_id,
          display_name,
          bio,
          specialties,
          total_earnings,
          total_products_promoted,
          is_verified,
          portfolio_url,
          profile:profiles(avatar_url)
        `)
        .eq('is_active', true)
        .neq('user_id', user?.id || '') // Don't show current user
        .order('total_products_promoted', { ascending: false });

      if (error) throw error;
      
      // Transform the data to handle the profile join correctly
      const transformedData = (data || []).map((w: any) => ({
        ...w,
        profile: Array.isArray(w.profile) ? w.profile[0] : w.profile
      }));
      
      setWhisperers(transformedData);
    } catch (error) {
      console.error('Error fetching whisperers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter out already invited whisperers
  const invitedIds = pendingInvitations.map(inv => inv.whisperer.id);
  const availableWhisperers = whisperers.filter(w => !invitedIds.includes(w.id));

  const filteredWhisperers = availableWhisperers.filter(w =>
    w.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (w.bio?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (w.specialties?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const handleSelectWhisperer = (whisperer: Whisperer) => {
    setSelectedForInvite(whisperer);
    setInviteCommission(15);
    setInviteMessage('');
  };

  const handleConfirmInvitation = () => {
    if (!selectedForInvite) return;
    
    onAddInvitation({
      whisperer: selectedForInvite,
      commissionPercent: inviteCommission,
      message: inviteMessage,
    });
    
    setSelectedForInvite(null);
    setIsDialogOpen(false);
    toast.success(`Invitation prepared for ${selectedForInvite.display_name}`);
  };

  const sowerReceives = 85 - inviteCommission;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Invite Whisperers</CardTitle>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={onEnabledChange}
          />
        </div>
        <CardDescription className="text-sm">
          Invite marketing agents to promote your product (max {maxWhisperers})
        </CardDescription>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-4">
          {/* Pending Invitations List */}
          {pendingInvitations.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Invitations to send ({pendingInvitations.length}/{maxWhisperers})
              </Label>
              {pendingInvitations.map((inv) => (
                <div 
                  key={inv.whisperer.id} 
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={inv.whisperer.profile?.avatar_url || ''} />
                    <AvatarFallback>
                      {inv.whisperer.display_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {inv.whisperer.display_name}
                      </span>
                      {inv.whisperer.is_verified && (
                        <CheckCircle className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Pending • {inv.commissionPercent}% commission</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onRemoveInvitation(inv.whisperer.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add Whisperer Button */}
          {pendingInvitations.length < maxWhisperers && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Users className="mr-2 h-4 w-4" />
                  {pendingInvitations.length === 0 ? 'Browse & Invite Whisperers' : 'Add Another Whisperer'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                {!selectedForInvite ? (
                  <>
                    <DialogHeader>
                      <DialogTitle>Browse Whisperers</DialogTitle>
                      <DialogDescription>
                        Select a whisperer to invite. They must accept before promoting your product.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, bio, or specialty..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    <ScrollArea className="h-[300px] mt-2">
                      {loading ? (
                        <div className="text-center py-8 text-muted-foreground">
                          Loading whisperers...
                        </div>
                      ) : filteredWhisperers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          {availableWhisperers.length === 0 
                            ? 'No more whisperers available'
                            : 'No whisperers match your search'}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredWhisperers.map((whisperer) => (
                            <button
                              key={whisperer.id}
                              onClick={() => handleSelectWhisperer(whisperer)}
                              className="w-full flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors text-left"
                            >
                              <Avatar>
                                <AvatarImage src={whisperer.profile?.avatar_url || ''} />
                                <AvatarFallback>
                                  {whisperer.display_name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium truncate">
                                    {whisperer.display_name}
                                  </span>
                                  {whisperer.is_verified && (
                                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                                  )}
                                </div>
                                {whisperer.bio && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {whisperer.bio}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  {whisperer.specialties?.slice(0, 2).map((s) => (
                                    <Badge key={s} variant="secondary" className="text-xs">
                                      {s}
                                    </Badge>
                                  ))}
                                  {whisperer.portfolio_url && (
                                    <Badge variant="outline" className="text-xs">
                                      <ExternalLink className="h-3 w-3 mr-1" />
                                      Portfolio
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="text-right text-xs text-muted-foreground">
                                <div>{whisperer.total_products_promoted} products</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </>
                ) : (
                  <>
                    <DialogHeader>
                      <DialogTitle>Invite {selectedForInvite.display_name}</DialogTitle>
                      <DialogDescription>
                        Set your commission offer. The whisperer must accept before they can promote.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                      {/* Whisperer Preview */}
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Avatar>
                          <AvatarImage src={selectedForInvite.profile?.avatar_url || ''} />
                          <AvatarFallback>
                            {selectedForInvite.display_name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{selectedForInvite.display_name}</span>
                            {selectedForInvite.is_verified && (
                              <CheckCircle className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {selectedForInvite.total_products_promoted} products promoted
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedForInvite(null)}
                        >
                          Change
                        </Button>
                      </div>

                      {/* Commission Slider */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Commission Offer</Label>
                          <span className="text-sm font-medium">{inviteCommission}%</span>
                        </div>
                        
                        <Slider
                          value={[inviteCommission]}
                          onValueChange={([value]) => setInviteCommission(value)}
                          min={5}
                          max={50}
                          step={5}
                          className="w-full"
                        />

                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>5%</span>
                          <span>50%</span>
                        </div>

                        {/* Distribution Summary */}
                        <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded-lg text-sm">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-primary" />
                            <span>You receive:</span>
                          </div>
                          <div className="text-right font-medium text-primary">
                            {sowerReceives}%
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Megaphone className="h-4 w-4 text-accent-foreground" />
                            <span>Whisperer:</span>
                          </div>
                          <div className="text-right font-medium text-accent-foreground">
                            {inviteCommission}%
                          </div>

                          <div className="col-span-2 border-t pt-2 mt-1 text-xs text-muted-foreground">
                            Plus: 10% tithing + 5% admin (paid by bestower)
                          </div>
                        </div>
                      </div>

                      {/* Optional Message */}
                      <div className="space-y-2">
                        <Label htmlFor="invite-message">Message (optional)</Label>
                        <Textarea
                          id="invite-message"
                          placeholder="Add a personal message to your invitation..."
                          value={inviteMessage}
                          onChange={(e) => setInviteMessage(e.target.value)}
                          rows={2}
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setSelectedForInvite(null)}>
                        Back
                      </Button>
                      <Button onClick={handleConfirmInvitation}>
                        <Send className="h-4 w-4 mr-2" />
                        Add to Invitations
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          )}

          {/* Info about invitation flow */}
          {pendingInvitations.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Invitations will be sent when you upload. Whisperers must accept before they can promote.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
