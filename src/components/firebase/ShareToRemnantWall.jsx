/**
 * Share to Remnant Wall Component
 * Allows users to share journal entries to the public Remnant Wall
 */

import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Share2, Image as ImageIcon, Mic, Video, Globe } from "lucide-react";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { postToRemnantWall } from "@/integrations/firebase/firestore";
import { uploadRemnantWallPhoto, uploadVoiceNote, uploadVideo } from "@/integrations/firebase/storage";
import { useToast } from "@/hooks/use-toast";
import { calculateCreatorDate } from "@/utils/dashboardCalendar";

export default function ShareToRemnantWall({ journalEntry, yhwhDate = null }) {
  const { user, isAuthenticated } = useFirebaseAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [type, setType] = useState("tequvah");
  const [anonymityLevel, setAnonymityLevel] = useState(1);
  const [photos, setPhotos] = useState([]);
  const [voiceNote, setVoiceNote] = useState(null);
  const [video, setVideo] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Pre-fill text if journal entry provided
  useEffect(() => {
    if (journalEntry?.content) {
      setText(journalEntry.content);
    }
  }, [journalEntry]);

  const handleFileSelect = (e, fileType) => {
    const files = Array.from(e.target.files);
    
    if (fileType === "photo") {
      setPhotos([...photos, ...files]);
    } else if (fileType === "voice") {
      if (files[0]) setVoiceNote(files[0]);
    } else if (fileType === "video") {
      if (files[0]) setVideo(files[0]);
    }
  };

  const handleShare = async () => {
    if (!isAuthenticated || !user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to share to Remnant Wall",
        variant: "destructive",
      });
      return;
    }

    if (!text.trim() && photos.length === 0 && !voiceNote && !video) {
      toast({
        title: "Content Required",
        description: "Please add text, photos, voice note, or video",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Get YHWH date
      const currentDate = yhwhDate || calculateCreatorDate(new Date());
      const yhwhDateStr = `Month ${currentDate.month} Day ${currentDate.day}`;

      // Upload media files
      const photoURLs = [];
      for (const photo of photos) {
        const result = await uploadRemnantWallPhoto(`temp_${Date.now()}`, photo);
        if (result.success) {
          photoURLs.push(result.url);
        }
      }

      let voiceNoteURL = null;
      if (voiceNote) {
        const result = await uploadVoiceNote(user.uid, voiceNote);
        if (result.success) {
          voiceNoteURL = result.url;
        }
      }

      let videoURL = null;
      if (video) {
        const result = await uploadVideo(user.uid, video);
        if (result.success) {
          videoURL = result.url;
        }
      }

      // Get user profile for display name and country
      const userProfile = user.displayName || user.email?.split("@")[0] || "Anonymous";

      // Create post
      const postData = {
        yhwhDate: yhwhDateStr,
        type,
        text: text.trim(),
        photoURLs,
        voiceNoteURL,
        videoURL,
        authorUID: user.uid,
        authorDisplayName: anonymityLevel > 0 ? userProfile : null,
        authorCountry: anonymityLevel > 0 ? null : null, // Can be added from user profile
        anonymityLevel,
      };

      const result = await postToRemnantWall(postData);

      if (result.success) {
        toast({
          title: "Success",
          description: "Shared to Remnant Wall!",
        });
        setOpen(false);
        setText("");
        setPhotos([]);
        setVoiceNote(null);
        setVideo(null);
      } else {
        throw new Error(result.error || "Failed to post");
      }
    } catch (error) {
      console.error("Error sharing to Remnant Wall:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to share to Remnant Wall",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Share2 className="h-4 w-4 mr-2" />
        Sign In to Share
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Share to Remnant Wall
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share to Remnant Wall</DialogTitle>
          <DialogDescription>
            Share your thoughts, photos, or voice notes with the Remnant community
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Post Type */}
          <div>
            <Label>Post Type</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {["tequvah", "pesach", "shabbat", "birth", "answeredPrayer"].map((t) => (
                <Button
                  key={t}
                  variant={type === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => setType(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Anonymity Level */}
          <div>
            <Label>Privacy Level</Label>
            <div className="flex gap-2 mt-2">
              <Button
                variant={anonymityLevel === 0 ? "default" : "outline"}
                size="sm"
                onClick={() => setAnonymityLevel(0)}
              >
                Anonymous
              </Button>
              <Button
                variant={anonymityLevel === 1 ? "default" : "outline"}
                size="sm"
                onClick={() => setAnonymityLevel(1)}
              >
                Name + Country
              </Button>
              <Button
                variant={anonymityLevel === 2 ? "default" : "outline"}
                size="sm"
                onClick={() => setAnonymityLevel(2)}
              >
                Full Public
              </Button>
            </div>
          </div>

          {/* Text Content */}
          <div>
            <Label htmlFor="text">Message</Label>
            <Textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share your thoughts..."
              rows={6}
              className="mt-2"
            />
          </div>

          {/* Photos */}
          <div>
            <Label>Photos</Label>
            <div className="mt-2 space-y-2">
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileSelect(e, "photo")}
                className="cursor-pointer"
              />
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-24 object-cover rounded"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Voice Note */}
          <div>
            <Label>Voice Note</Label>
            <Input
              type="file"
              accept="audio/*"
              onChange={(e) => handleFileSelect(e, "voice")}
              className="mt-2 cursor-pointer"
            />
            {voiceNote && (
              <div className="mt-2 p-2 bg-muted rounded flex items-center justify-between">
                <span className="text-sm">{voiceNote.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVoiceNote(null)}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>

          {/* Video */}
          <div>
            <Label>Video</Label>
            <Input
              type="file"
              accept="video/*"
              onChange={(e) => handleFileSelect(e, "video")}
              className="mt-2 cursor-pointer"
            />
            {video && (
              <div className="mt-2 p-2 bg-muted rounded flex items-center justify-between">
                <span className="text-sm">{video.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVideo(null)}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-2">
            <Button
              onClick={handleShare}
              disabled={uploading || (!text.trim() && photos.length === 0 && !voiceNote && !video)}
              className="flex-1"
            >
              {uploading ? "Sharing..." : "Share to Remnant Wall"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

