import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, UserPlus, Phone, Video, GraduationCap, Radio, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
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

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, first_name, last_name, avatar_url, bio')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

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

      const { error: addError } = await supabase
        .from('circle_members')
        .insert({
          circle_id: newCircleId,
          user_id: memberId,
          added_by: user.id,
        });

      if (addError) throw addError;

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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 justify-items-center">
      {members.map((member) => {
        const tags = [];
        if (member.is_sower) tags.push('Sower');
        if (member.is_bestower) tags.push('Bestower');
        if (member.is_gosat) tags.push('Gosat');

        return (
          <DropdownMenu key={member.user_id}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="cursor-pointer focus:outline-none w-36 h-36 relative"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full h-full"
                >
                  <Card className="overflow-hidden hover:shadow-xl transition-all glass-card border-2 border-primary/30 hover:border-primary/50 rounded-full w-full h-full bg-transparent">
                    <CardContent className="p-3 flex flex-col items-center justify-center h-full">
                      <div className="mb-1 flex-shrink-0">
                        <Avatar className="h-12 w-12 border-2 border-primary/10">
                          <AvatarImage src={member.avatar_url} />
                          <AvatarFallback className="text-lg bg-gradient-to-br from-primary/50 to-primary/20">
                            {(member.full_name || member.display_name || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <h3 className="font-bold text-[10px] text-center mb-1 line-clamp-1 px-1 text-foreground flex-shrink-0">
                        {member.full_name || member.display_name || 'User'}
                      </h3>

                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 justify-center flex-shrink-0">
                          {tags.map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-[8px] px-1 py-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent 
              className="w-56 bg-background/95 backdrop-blur-xl border-primary/30 z-[9999]"
              align="center"
              sideOffset={8}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-2 border-b border-primary/20">
                <p className="font-semibold text-sm text-foreground">{member.full_name || member.display_name}</p>
                {tags.length > 0 && (
                  <p className="text-xs text-muted-foreground">{tags.join(' • ')}</p>
                )}
              </div>
              
              {onStartChat && (
                <DropdownMenuItem 
                  onClick={() => onStartChat(member.user_id)}
                  className="cursor-pointer"
                >
                  <MessageCircle className="h-4 w-4 mr-2 text-blue-500" />
                  Send Message
                </DropdownMenuItem>
              )}
              
              {onStartCall && (
                <>
                  <DropdownMenuItem 
                    onClick={() => onStartCall(member.user_id, 'audio')}
                    className="cursor-pointer"
                  >
                    <Phone className="h-4 w-4 mr-2 text-green-500" />
                    Voice Call
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onStartCall(member.user_id, 'video')}
                    className="cursor-pointer"
                  >
                    <Video className="h-4 w-4 mr-2 text-purple-500" />
                    Video Call
                  </DropdownMenuItem>
                </>
              )}
              
              {onNavigateToTraining && (
                <DropdownMenuItem 
                  onClick={() => onNavigateToTraining(member.user_id)}
                  className="cursor-pointer"
                >
                  <GraduationCap className="h-4 w-4 mr-2 text-amber-500" />
                  Training
                </DropdownMenuItem>
              )}
              
              {onNavigateToRadio && (
                <DropdownMenuItem 
                  onClick={() => onNavigateToRadio(member.user_id)}
                  className="cursor-pointer"
                >
                  <Radio className="h-4 w-4 mr-2 text-orange-500" />
                  Radio
                </DropdownMenuItem>
              )}
              
              {circles.length > 1 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer">
                    <UserPlus className="h-4 w-4 mr-2 text-indigo-500" />
                    Add to Another Circle
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="bg-background/95 backdrop-blur-xl border-primary/30 z-[10000]">
                    {circles
                      .filter(c => c.id !== circleId)
                      .map(circle => (
                        <DropdownMenuItem
                          key={circle.id}
                          onClick={() => handleAddToCircle(member.user_id, member.full_name || 'User', circle.id)}
                          className="cursor-pointer"
                        >
                          {circle.emoji} {circle.name}
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => handleRemoveMember(member.user_id, member.full_name || 'User')}
                className="cursor-pointer text-red-500 focus:text-red-500"
              >
                <X className="h-4 w-4 mr-2" />
                Remove from Circle
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </div>
  );
}
