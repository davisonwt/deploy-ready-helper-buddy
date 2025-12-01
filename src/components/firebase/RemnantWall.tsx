/**
 * Remnant Wall Component
 * Public feed showing posts from the Remnant community
 * Organized by YHWH calendar dates
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Heart,
  Image as ImageIcon,
  Mic,
  Video,
  Globe,
  User,
  MapPin,
  Share2,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import {
  getRemnantWallPosts,
  getRemnantWallPostsByDate,
  toggleLikeRemnantPost,
  deleteRemnantPost,
} from "@/integrations/firebase/firestore";
import { calculateCreatorDate } from "@/utils/dashboardCalendar";
import { useToast } from "@/hooks/use-toast";

export default function RemnantWall({ selectedYhwhDate = null }) {
  const { user, isAuthenticated } = useFirebaseAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterByDate, setFilterByDate] = useState(selectedYhwhDate);

  useEffect(() => {
    loadPosts();
  }, [filterByDate]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      let result;
      if (filterByDate) {
        const yhwhDateStr = `Month ${filterByDate.month} Day ${filterByDate.day}`;
        result = await getRemnantWallPostsByDate(yhwhDateStr);
      } else {
        result = await getRemnantWallPosts(50);
      }

      if (result.success) {
        setPosts(result.data || []);
      } else {
        toast({
          title: "Error",
          description: "Failed to load Remnant Wall posts",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading posts:", error);
      toast({
        title: "Error",
        description: "Failed to load Remnant Wall posts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId) => {
    if (!isAuthenticated) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to like posts",
      });
      return;
    }

    const result = await toggleLikeRemnantPost(postId, user.uid);
    if (result.success) {
      // Update local state
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id === postId) {
            const currentLikes = post.likes || [];
            const isLiked = currentLikes.includes(user.uid);
            return {
              ...post,
              likes: isLiked
                ? currentLikes.filter((uid) => uid !== user.uid)
                : [...currentLikes, user.uid],
            };
          }
          return post;
        })
      );
    }
  };

  const handleDelete = async (postId) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    const result = await deleteRemnantPost(postId);
    if (result.success) {
      setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId));
      toast({
        title: "Success",
        description: "Post deleted",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      });
    }
  };

  const getPostTypeBadge = (type) => {
    const badges = {
      tequvah: { label: "Tequvah", className: "bg-amber-500/20 text-amber-700" },
      pesach: { label: "Pesach", className: "bg-red-500/20 text-red-700" },
      shabbat: { label: "Shabbat", className: "bg-yellow-500/20 text-yellow-700" },
      birth: { label: "Birth", className: "bg-green-500/20 text-green-700" },
      answeredPrayer: { label: "Answered Prayer", className: "bg-blue-500/20 text-blue-700" },
      default: { label: type, className: "bg-muted" },
    };
    return badges[type] || badges.default;
  };

  const getAuthorDisplay = (post) => {
    if (post.anonymityLevel === 0) {
      return "Anonymous";
    }
    if (post.anonymityLevel === 1) {
      return `${post.authorDisplayName || "User"} • ${post.authorCountry || ""}`;
    }
    return post.authorDisplayName || "User";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading Remnant Wall...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Remnant Wall
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {filterByDate
              ? `Posts for Month ${filterByDate.month} Day ${filterByDate.day}`
              : "Latest posts from the Remnant community"}
          </p>
        </div>
        {filterByDate && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterByDate(null)}
          >
            Show All Posts
          </Button>
        )}
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {filterByDate
                  ? "No posts for this date yet. Be the first to share!"
                  : "No posts yet. Be the first to share on the Remnant Wall!"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        posts.map((post) => {
          const isLiked = isAuthenticated && (post.likes || []).includes(user?.uid);
          const isAuthor = isAuthenticated && post.authorUID === user?.uid;
          const typeBadge = getPostTypeBadge(post.type);

          return (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={typeBadge.className}>
                            {typeBadge.label}
                          </Badge>
                          <span className="text-sm font-semibold text-foreground">
                            {post.yhwhDate}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>{getAuthorDisplay(post)}</span>
                          {post.authorCountry && post.anonymityLevel > 0 && (
                            <>
                              <MapPin className="h-4 w-4 ml-2" />
                              <span>{post.authorCountry}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {isAuthor && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(post.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Content */}
                    {post.text && (
                      <p className="text-foreground whitespace-pre-wrap">{post.text}</p>
                    )}

                    {/* Media */}
                    {post.photoURLs && post.photoURLs.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {post.photoURLs.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`Post image ${idx + 1}`}
                            className="rounded-lg w-full h-48 object-cover"
                          />
                        ))}
                      </div>
                    )}

                    {post.voiceNoteURL && (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <Mic className="h-5 w-5 text-primary" />
                        <audio controls src={post.voiceNoteURL} className="flex-1" />
                      </div>
                    )}

                    {post.videoURL && (
                      <div className="rounded-lg overflow-hidden">
                        <video controls src={post.videoURL} className="w-full" />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-4 pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(post.id)}
                        className={isLiked ? "text-yellow-600" : ""}
                        disabled={!isAuthenticated}
                      >
                        <Heart
                          className={`h-4 w-4 mr-2 ${isLiked ? "fill-current" : ""}`}
                        />
                        {isLiked ? "Liked" : "Like"}
                        {(post.likes || []).length > 0 && (
                          <span className="ml-2 text-xs">
                            {(post.likes || []).length}
                          </span>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          toast({
                            title: "Copied",
                            description: "Link copied to clipboard",
                          });
                        }}
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })
      )}
    </div>
  );
}

