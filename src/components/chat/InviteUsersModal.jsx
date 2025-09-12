import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, UserPlus, X, Send } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useSecureProfiles } from '@/hooks/useSecureProfiles'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

export default function InviteUsersModal({ isOpen, onClose, roomId, roomName }) {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [users, setUsers] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
    }
  }, [isOpen, searchTerm])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      
      // Search for users by display name
      let query = supabase
        .from('profiles')
        .select('id, user_id, display_name, avatar_url, first_name, last_name, verification_status') // Only safe fields
        .neq('user_id', user.id) // Exclude current user
        .limit(20)

      if (searchTerm.trim()) {
        query = query.or(`display_name.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
      }

      const { data: profilesData, error: profilesError } = await query

      if (profilesError) throw profilesError

      // Get existing participants to exclude them
      const { data: participantsData } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('room_id', roomId)
        .eq('is_active', true)

      const existingUserIds = new Set(participantsData?.map(p => p.user_id) || [])

      // Filter out existing participants
      const availableUsers = profilesData?.filter(profile => 
        !existingUserIds.has(profile.user_id)
      ) || []

      setUsers(availableUsers)
    } catch (err) {
      console.error('Error fetching users:', err)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleUserToggle = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleInviteUsers = async () => {
    if (selectedUsers.length === 0) return

    try {
      setInviting(true)

      // Add selected users as participants
      const participants = selectedUsers.map(userId => ({
        room_id: roomId,
        user_id: userId,
        is_active: true,
        is_moderator: false
      }))

      const { error } = await supabase
        .from('chat_participants')
        .insert(participants)

      if (error) throw error

      // Send notification to invited users (optional)
      const notifications = selectedUsers.map(userId => ({
        user_id: userId,
        type: 'chat_invite',
        title: 'Chat Room Invitation',
        message: `You've been invited to join "${roomName || 'a chat room'}"`,
        action_url: '/chatapp'
      }))

      await supabase
        .from('user_notifications')
        .insert(notifications)

      toast.success(`Successfully invited ${selectedUsers.length} user(s) to the chat room!`)
      setSelectedUsers([])
      onClose()
    } catch (err) {
      console.error('Error inviting users:', err)
      toast.error('Failed to invite users: ' + err.message)
    } finally {
      setInviting(false)
    }
  }

  const getUserDisplayName = (user) => {
    return user.display_name || 
           `${user.first_name || ''} ${user.last_name || ''}`.trim() || 
           'Unknown User'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Users to Chat
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Selected ({selectedUsers.length}):</div>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map(userId => {
                  const userData = users.find(u => u.user_id === userId)
                  return (
                    <Badge key={userId} variant="secondary" className="flex items-center gap-1">
                      {getUserDisplayName(userData)}
                      <button
                        onClick={() => handleUserToggle(userId)}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}

          {/* Users List */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Available Users:</div>
            <ScrollArea className="h-60 border rounded-md p-2">
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Searching users...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    {searchTerm ? 'No users found' : 'Start typing to search for users'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map((userData) => (
                    <div 
                      key={userData.user_id}
                      className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer"
                      onClick={() => handleUserToggle(userData.user_id)}
                    >
                      <Checkbox 
                        checked={selectedUsers.includes(userData.user_id)}
                        onChange={() => handleUserToggle(userData.user_id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={userData.avatar_url} />
                        <AvatarFallback>
                          {getUserDisplayName(userData).charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {getUserDisplayName(userData)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleInviteUsers} 
              disabled={selectedUsers.length === 0 || inviting}
              className="flex items-center gap-2"
            >
              {inviting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Send className="h-4 w-4" />
              )}
              Invite {selectedUsers.length > 0 && `(${selectedUsers.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}