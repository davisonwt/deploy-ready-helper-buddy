import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, X, ArrowRightLeft } from 'lucide-react';
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

export function CircleMembersList({ circleId, onStartChat, circles = [], onMemberRemoved }: CircleMembersListProps) {
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

  const handleMoveToCircle = async (memberId: string, memberName: string, newCircleId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Remove from current circle
      const { error: removeError } = await supabase
        .from('circle_members')
        .delete()
        .eq('circle_id', circleId)
        .eq('user_id', memberId);

      if (removeError) throw removeError;

      // Add to new circle
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
        title: 'Moved!',
        description: `${memberName} moved to ${newCircleName}`,
      });
    } catch (error) {
      console.error('Error moving member:', error);
      toast({
        title: 'Error',
        description: 'Failed to move member to new circle',
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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
            <Card className="overflow-hidden hover:shadow-xl transition-all border-2 hover:border-primary/30">
              <CardContent className="p-4">
                {/* Avatar with glow */}
                <div className="flex justify-center mb-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-md" />
                    <Avatar className="h-20 w-20 border-4 border-primary/10 relative z-10">
                      <AvatarImage src={member.avatar_url} />
                      <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/50 to-primary/20">
                        {(member.full_name || member.display_name || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>

                {/* Name */}
                <h3 className="font-bold text-center mb-1 line-clamp-1">
                  {member.full_name || member.display_name || 'User'}
                </h3>

                {/* Bio */}
                {member.bio && (
                  <p className="text-xs text-muted-foreground text-center mb-2 line-clamp-2">
                    {member.bio}
                  </p>
                )}

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center mb-3">
                    {tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {onStartChat && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onStartChat(member.user_id)}
                      className="flex-1"
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Chat
                    </Button>
                  )}
                  
                  {circles.length > 1 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline">
                          <ArrowRightLeft className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {circles
                          .filter(c => c.id !== circleId)
                          .map(circle => (
                            <DropdownMenuItem
                              key={circle.id}
                              onClick={() => handleMoveToCircle(member.user_id, member.full_name || 'User', circle.id)}
                            >
                              {circle.emoji} {circle.name}
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveMember(member.user_id, member.full_name || 'User')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
