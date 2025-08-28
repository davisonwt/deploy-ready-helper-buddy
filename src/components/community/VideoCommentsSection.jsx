import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageCircle, Send, Clock } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useCommunityVideos } from '@/hooks/useCommunityVideos'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { formatDistanceToNow } from 'date-fns'

export default function VideoCommentsSection({ video }) {
  const { user } = useAuth()
  const { addComment } = useCommunityVideos()
  const { toast } = useToast()
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [open, setOpen] = useState(false)

  // Fetch comments for this video
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

  useEffect(() => {
    if (open) {
      fetchComments()
    }
  }, [video?.id, open])

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if (!user || !newComment.trim()) {
      toast({
        title: "Cannot post comment",
        description: user ? "Please enter a comment" : "Please log in to comment",
        variant: "destructive"
      })
      return
    }

    setSubmitting(true)
    try {
      const result = await addComment(video.id, newComment.trim())
      
      if (result.success) {
        setNewComment('')
        fetchComments() // Refresh comments
        toast({
          title: "Comment posted!",
          description: "Your comment has been added to the video"
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "Failed to post comment",
        description: error.message || "Please try again",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const formatCommentTime = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    } catch {
      return 'Recently'
    }
  }

  const getCommenterName = (profiles) => {
    if (!profiles) return 'Anonymous'
    return profiles.display_name || 
           `${profiles.first_name || ''} ${profiles.last_name || ''}`.trim() || 
           'Anonymous'
  }

  const getCommenterInitials = (profiles) => {
    const name = getCommenterName(profiles)
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
          onClick={(e) => e.stopPropagation()}
        >
          <MessageCircle className="h-4 w-4 mr-1" />
          Comments ({video.comment_count || 0})
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-purple-600" />
            Comments for "{video.title}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {/* Add Comment Form */}
          {user ? (
            <form onSubmit={handleSubmitComment} className="space-y-3">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts about this video..."
                className="min-h-20"
                maxLength={500}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {newComment.length}/500 characters
                </span>
                <Button
                  type="submit"
                  disabled={submitting || !newComment.trim()}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? 'Posting...' : 'Post Comment'}
                </Button>
              </div>
            </form>
          ) : (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4 text-center">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 text-amber-600" />
                <p className="text-amber-800 mb-3">Sign in to join the conversation</p>
                <Button 
                  variant="outline" 
                  className="border-amber-600 text-amber-600"
                  onClick={() => window.location.href = '/login'}
                >
                  Sign In
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Comments List */}
          <div className="space-y-4 border-t pt-4">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-8 h-8 bg-muted rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/4" />
                      <div className="h-4 bg-muted rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No comments yet</p>
                <p className="text-sm">Be the first to share your thoughts!</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={comment.profiles?.avatar_url} />
                    <AvatarFallback className="text-xs bg-purple-100 text-purple-700">
                      {getCommenterInitials(comment.profiles)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {getCommenterName(comment.profiles)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatCommentTime(comment.created_at)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}