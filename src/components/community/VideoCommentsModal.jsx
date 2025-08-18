import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageCircle, Send } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useCommunityVideos } from '@/hooks/useCommunityVideos.jsx'
import { useAuth } from '@/hooks/useAuth.jsx'
import { formatDistanceToNow } from 'date-fns'

export default function VideoCommentsModal({ video, isOpen, onClose }) {
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const { addComment } = useCommunityVideos()
  const { user } = useAuth()

  // Fetch comments
  const fetchComments = async () => {
    if (!video?.id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('video_comments')
        .select(`
          *,
          profiles!video_comments_commenter_profile_id_fkey (
            display_name,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('video_id', video.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setComments(data || [])
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setLoading(false)
    }
  }

  // Submit comment
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newComment.trim() || !user) return

    const result = await addComment(video.id, newComment)
    if (result.success) {
      setNewComment('')
      // Add comment to local state for immediate UI update
      setComments([result.data, ...comments])
    }
  }

  // Load comments when modal opens
  useEffect(() => {
    if (isOpen && video?.id) {
      fetchComments()
    }
  }, [isOpen, video?.id])

  const getCommenterName = (comment) => {
    const profile = comment.profiles
    if (profile?.display_name) return profile.display_name
    if (profile?.first_name) {
      return profile.last_name 
        ? `${profile.first_name} ${profile.last_name}`
        : profile.first_name
    }
    return 'Anonymous'
  }

  const getCommenterInitials = (comment) => {
    const name = getCommenterName(comment)
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Comments ({comments.length})
          </DialogTitle>
        </DialogHeader>

        {/* Comments List */}
        <ScrollArea className="flex-1 -mx-6">
          <div className="px-6 space-y-4">
            {loading ? (
              <div className="text-center text-muted-foreground py-8">
                Loading comments...
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No comments yet. Be the first to comment!
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={comment.profiles?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {getCommenterInitials(comment)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {getCommenterName(comment)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Comment Form */}
        {user ? (
          <form onSubmit={handleSubmit} className="space-y-3 pt-4 border-t">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
              maxLength={500}
              className="resize-none"
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                {newComment.length}/500
              </span>
              <Button
                type="submit"
                size="sm"
                disabled={!newComment.trim()}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Post
              </Button>
            </div>
          </form>
        ) : (
          <div className="text-center text-muted-foreground py-4 border-t">
            Please log in to comment
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}