import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, X, UserPlus, Phone, Video, GraduationCap, Radio } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CircleMembersListProps {
  circleId: string;
  onStartChat?: (userId: string) => void;
  onStartCall?: (userId: string, callType: 'audio' | 'video') => void;
  onNavigateToTraining?: (userId: string) => void;
  onNavigateToRadio?: (userId: string) => void;
  circles?: Array<{ id: string; name: string; emoji: string }>;
  onMemberRemoved?: () => void;
}

interface Member {
  id: string;
  user_id: string;
  full_name?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  is_sower?: boolean;
  is_bestower?: boolean;
  is_gosat?: boolean;
}

export function CircleMembersList({ circleId, onStartChat, onStartCall, onNavigateToTraining, onNavigateToRadio, circles = [], onMemberRemoved }: CircleMembersListProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadMembers();
  }, [circleId]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      
      // First get member user_ids from circle_members
      const { data: memberData, error: memberError } = await supabase
        .from('circle_members')
        .select('user_id')
        .eq('circle_id', circleId);

      if (memberError) throw memberError;

      const userIds = (memberData || []).map((m: any) => m.user_id);
      
      if (userIds.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      // Now get profiles for those users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, first_name, last_name, avatar_url, bio')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Get user roles
      const { data: sowersData } = await supabase
        .from('sowers')
        .select('user_id')
        .in('user_id', userIds);

      const { data: bestowalsData } = await supabase
        .from('product_bestowals')
        .select('bestower_id')
        .in('bestower_id', userIds);

      const { data: gosatData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'gosat')
        .in('user_id', userIds);

      const sowerIds = new Set((sowersData || []).map((s: any) => s.user_id));
      const bestowerIds = new Set((bestowalsData || []).map((b: any) => b.bestower_id));
      const gosatIds = new Set((gosatData || []).map((g: any) => g.user_id));

      const formattedMembers: Member[] = (profilesData || []).map((profile: any) => ({
        id: profile.id,
        user_id: profile.user_id,
        full_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.display_name || 'User',
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        is_sower: sowerIds.has(profile.user_id),
        is_bestower: bestowerIds.has(profile.user_id),
        is_gosat: gosatIds.has(profile.user_id),
      }));

      setMembers(formattedMembers);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCircle = async (memberId: string, memberName: string, newCircleId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if already in the target circle
      const { data: existing } = await supabase
        .from('circle_members')
        .select('id')
        .eq('circle_id', newCircleId)
        .eq('user_id', memberId)
        .maybeSingle();

      if (existing) {
        toast({
          title: 'Already added',
          description: `${memberName} is already in that circle`,
        });
        return;
      }

      // Add to new circle (without removing from current)
      const { error: addError } = await supabase
        .from('circle_members')
        .insert({
          circle_id: newCircleId,
          user_id: memberId,
          added_by: user.id,
        });

      if (addError) throw addError;

      // Refresh the list
      loadMembers();
      onMemberRemoved?.();

      const newCircleName = circles.find(c => c.id === newCircleId)?.name || 'circle';
      toast({
        title: 'Added!',
        description: `${memberName} also added to ${newCircleName}`,
      });
    } catch (error) {
      console.error('Error adding member:', error);
      toast({
        title: 'Error',
        description: 'Failed to add member to circle',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    try {
      const { error } = await supabase
        .from('circle_members')
        .delete()
        .eq('circle_id', circleId)
        .eq('user_id', memberId);

      if (error) throw error;

      toast({
        title: 'Removed',
        description: `${memberName} removed from circle`,
      });

      loadMembers();
      onMemberRemoved?.();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No members in this circle yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-6 justify-center">
      {members.map((member) => {
        const tags = [];
        if (member.is_sower) tags.push('Sower');
        if (member.is_bestower) tags.push('Bestower');
        if (member.is_gosat) tags.push('Gosat');

        return (
          <motion.div
            key={member.user_id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="overflow-visible hover:shadow-xl transition-all glass-card border-2 border-primary/30 hover:border-primary/50 rounded-full aspect-square w-48 h-48 bg-transparent relative">
              <CardContent className="p-4 flex flex-col items-center justify-center h-full relative">
                {/* Avatar */}
                <div className="mb-2 z-10">
                  <Avatar className="h-16 w-16 border-2 border-primary/10">
                    <AvatarImage src={member.avatar_url} />
                    <AvatarFallback className="text-xl bg-gradient-to-br from-primary/50 to-primary/20">
                      {(member.full_name || member.display_name || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Name */}
                <h3 className="font-bold text-xs text-center mb-1 line-clamp-1 px-2 text-white z-10">
                  {member.full_name || member.display_name || 'User'}
                </h3>

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center mb-2 z-10">
                    {tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-[10px] px-1 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Actions - Positioned around the circle edge */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Helper function to calculate button position */}
                  {(() => {
                    const radius = 68; // Distance from center to edge (96px center - 28px button offset)
                    const centerX = 96; // Half of 192px (w-48)
                    const centerY = 96;
                    
                    // Collect all buttons that should be displayed
                    const buttons = [];
                    
                    if (onStartChat) buttons.push({ type: 'chat', onClick: () => onStartChat(member.user_id) });
                    if (onStartCall) {
                      buttons.push({ type: 'voice', onClick: () => onStartCall(member.user_id, 'audio') });
                      buttons.push({ type: 'video', onClick: () => onStartCall(member.user_id, 'video') });
                    }
                    if (onNavigateToTraining) buttons.push({ type: 'training', onClick: () => onNavigateToTraining(member.user_id) });
                    if (onNavigateToRadio) buttons.push({ type: 'radio', onClick: () => onNavigateToRadio(member.user_id) });
                    if (circles.length > 1) buttons.push({ type: 'add', isDropdown: true });
                    buttons.push({ type: 'remove', onClick: () => handleRemoveMember(member.user_id, member.full_name || 'User') });
                    
                    const totalButtons = buttons.length;
                    const angleStep = (2 * Math.PI) / totalButtons;
                    
                    return buttons.map((btn, idx) => {
                      const angle = idx * angleStep - Math.PI / 2; // Start from top (-90 degrees)
                      const x = centerX + radius * Math.cos(angle) - 16; // -16 to center the 32px button
                      const y = centerY + radius * Math.sin(angle) - 16;
                      
                      const buttonStyle = {
                        position: 'absolute' as const,
                        left: `${x}px`,
                        top: `${y}px`,
                        backgroundColor: 'white',
                        color: '#0A1931',
                        border: '2px solid #0A1931',
                        pointerEvents: 'auto' as const,
                      };
                      
                      if (btn.isDropdown) {
                        return (
                          <DropdownMenu key={`btn-${idx}`}>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                size="sm" 
                                style={buttonStyle}
                                className="h-8 w-8 p-0 rounded-full hover:opacity-90 pointer-events-auto"
                                title="Also add to another circle"
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-background z-50">
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                Also add to:
                              </div>
                              {circles
                                .filter(c => c.id !== circleId)
                                .map(circle => (
                                  <DropdownMenuItem
                                    key={circle.id}
                                    onClick={() => handleAddToCircle(member.user_id, member.full_name || 'User', circle.id)}
                                  >
                                    {circle.emoji} {circle.name}
                                  </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        );
                      }
                      
                      let icon;
                      let title;
                      switch (btn.type) {
                        case 'chat':
                          icon = <MessageCircle className="h-4 w-4" />;
                          title = 'Send message';
                          break;
                        case 'voice':
                          icon = <Phone className="h-4 w-4" />;
                          title = 'Voice call';
                          break;
                        case 'video':
                          icon = <Video className="h-4 w-4" />;
                          title = 'Video call';
                          break;
                        case 'training':
                          icon = <GraduationCap className="h-4 w-4" />;
                          title = 'Training';
                          break;
                        case 'radio':
                          icon = <Radio className="h-4 w-4" />;
                          title = 'Radio';
                          break;
                        case 'remove':
                          icon = <X className="h-4 w-4" />;
                          title = 'Remove from circle';
                          break;
                        default:
                          return null;
                      }
                      
                      return (
                        <Button
                          key={`btn-${idx}`}
                          size="sm"
                          onClick={btn.onClick}
                          style={buttonStyle}
                          className="h-8 w-8 p-0 rounded-full hover:opacity-90 pointer-events-auto"
                          title={title}
                        >
                          {icon}
                        </Button>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
