import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, X, UserPlus, Phone, Video, GraduationCap, Radio } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  
  const handleMouseEnter = (memberId: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredMemberId(memberId);
  };
  
  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredMemberId(null);
      hoverTimeoutRef.current = null;
    }, 200);
  };
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

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

  // Collect all available actions
  const getAvailableActions = (member: Member) => {
    const actions = [];
    if (onStartChat) actions.push({ 
      label: 'Send Message', 
      icon: MessageCircle, 
      onClick: () => onStartChat(member.user_id),
      color: 'text-blue-500'
    });
    if (onStartCall) {
      actions.push({ 
        label: 'Voice Call', 
        icon: Phone, 
        onClick: () => onStartCall(member.user_id, 'audio'),
        color: 'text-green-500'
      });
      actions.push({ 
        label: 'Video Call', 
        icon: Video, 
        onClick: () => onStartCall(member.user_id, 'video'),
        color: 'text-purple-500'
      });
    }
    if (onNavigateToTraining) actions.push({ 
      label: 'Training', 
      icon: GraduationCap, 
      onClick: () => onNavigateToTraining(member.user_id),
      color: 'text-amber-500'
    });
    if (onNavigateToRadio) actions.push({ 
      label: 'Radio', 
      icon: Radio, 
      onClick: () => onNavigateToRadio(member.user_id),
      color: 'text-orange-500'
    });
    if (circles.length > 1) {
      actions.push({ 
        label: 'Add to Another Circle', 
        icon: UserPlus, 
        onClick: null, // Handled by dropdown
        isDropdown: true,
        color: 'text-indigo-500'
      });
    }
    actions.push({ 
      label: 'Remove from Circle', 
      icon: X, 
      onClick: () => handleRemoveMember(member.user_id, member.full_name || 'User'),
      color: 'text-red-500'
    });
    return actions;
  };

  return (
    <div 
      className="flex flex-wrap gap-6 justify-center relative"
      onMouseLeave={(e) => {
        // Only clear hover if mouse leaves the entire container
        if (e.target === e.currentTarget) {
          handleMouseLeave();
        }
      }}
    >
      {members.map((member, index) => {
        const tags = [];
        if (member.is_sower) tags.push('Sower');
        if (member.is_bestower) tags.push('Bestower');
        if (member.is_gosat) tags.push('Gosat');

        const isHovered = hoveredMemberId === member.user_id;
        const actions = getAvailableActions(member);
        const hasMenu = isHovered && actions.length > 0;

        return (
          <motion.div
            key={member.user_id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ 
              opacity: isHovered ? 1 : hoveredMemberId ? 0.3 : 1,
              scale: isHovered ? 1.15 : hoveredMemberId ? 0.9 : 1,
              zIndex: isHovered ? 50 : 1
            }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onMouseEnter={() => handleMouseEnter(member.user_id)}
            onMouseLeave={handleMouseLeave}
            className="relative cursor-pointer"
            style={isHovered ? {
              position: 'fixed',
              top: '10%',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              pointerEvents: 'auto'
            } : {
              pointerEvents: hoveredMemberId && !isHovered ? 'none' : 'auto'
            }}
          >
            <Card className="overflow-visible hover:shadow-xl transition-all glass-card border-2 border-primary/30 hover:border-primary/50 rounded-full aspect-square w-48 h-48 bg-transparent relative">
              <CardContent className="p-4 flex flex-col items-center justify-center h-full relative">
                {/* Avatar */}
                <div className="mb-2 z-10 flex-shrink-0">
                  <Avatar className="h-16 w-16 border-2 border-primary/10">
                    <AvatarImage src={member.avatar_url} />
                    <AvatarFallback className="text-xl bg-gradient-to-br from-primary/50 to-primary/20">
                      {(member.full_name || member.display_name || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Name */}
                <h3 className="font-bold text-xs text-center mb-1 line-clamp-1 px-2 text-white z-10 flex-shrink-0">
                  {member.full_name || member.display_name || 'User'}
                </h3>

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center mb-2 z-10 flex-shrink-0">
                    {tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-[10px] px-1 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

              </CardContent>
            </Card>

          </motion.div>
        );
      })}
      
      {/* Render menu separately when a member is hovered */}
      {hoveredMemberId && (() => {
        const hoveredMember = members.find(m => m.user_id === hoveredMemberId);
        if (!hoveredMember) return null;
        const actions = getAvailableActions(hoveredMember);
        if (actions.length === 0) return null;
        
        return (
          <motion.div
            key={`menu-${hoveredMemberId}`}
            ref={menuRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
              }
            }}
            onMouseLeave={handleMouseLeave}
            className="fixed z-[1001] pointer-events-auto"
            style={{
              top: 'calc(10% + 165px)',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '220px',
              maxWidth: 'calc(100vw - 2rem)',
              maxHeight: 'calc(100vh - 10% - 165px - 2rem)',
              height: 'auto',
            }}
          >
                <Card className="glass-card border-2 border-primary/50 bg-background/95 backdrop-blur-xl shadow-2xl" style={{ maxHeight: 'calc(100vh - 10% - 165px - 2rem)', display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <CardContent className="p-4" style={{ display: 'flex', flexDirection: 'column', padding: '1rem', height: '100%', overflow: 'hidden' }}>
                    <h4 className="text-sm font-semibold text-white text-center mb-3 flex-shrink-0">
                      What do you want to do?
                    </h4>
                    <div style={{ 
                      flex: '1 1 auto',
                      overflowY: 'scroll',
                      overflowX: 'hidden',
                      height: 'calc(100% - 50px)',
                      WebkitOverflowScrolling: 'touch',
                      paddingRight: '8px'
                    }}>
                      <div className="space-y-1 pr-2">
                          {actions.map((action, idx) => {
                          const Icon = action.icon;
                          
                          if (action.isDropdown) {
                            return (
                              <DropdownMenu key={`action-${idx}`}>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="w-full justify-start hover:bg-primary/20 text-white text-xs"
                                    style={{ backgroundColor: 'transparent', fontSize: '0.75rem', padding: '0.5rem 0.75rem' }}
                                  >
                                    <Icon className={`h-3 w-3 mr-2 flex-shrink-0 ${action.color}`} />
                                    <span className="truncate">{action.label}</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-background z-[1001]">
                                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                    Also add to:
                                  </div>
                                  {circles
                                    .filter(c => c.id !== circleId)
                                    .map(circle => (
                                      <DropdownMenuItem
                                        key={circle.id}
                                        onClick={() => handleAddToCircle(hoveredMember.user_id, hoveredMember.full_name || 'User', circle.id)}
                                      >
                                        {circle.emoji} {circle.name}
                                      </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            );
                          }
                          
                          return (
                            <Button
                              key={`action-${idx}`}
                              variant="ghost"
                            onClick={() => {
                              action.onClick?.();
                              setHoveredMemberId(null);
                            }}
                              className="w-full justify-start hover:bg-primary/20 text-white text-xs"
                              style={{ backgroundColor: 'transparent', fontSize: '0.75rem', padding: '0.5rem 0.75rem' }}
                            >
                              <Icon className={`h-3 w-3 mr-2 flex-shrink-0 ${action.color}`} />
                              <span className="truncate">{action.label}</span>
                            </Button>
                          );
                          })}
                        </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })()}
    </div>
  );
}
