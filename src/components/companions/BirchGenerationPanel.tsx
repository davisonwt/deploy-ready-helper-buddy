import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, Image as ImageIcon, Film, Mic, Send, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGenerationPolling } from "@/hooks/useGenerationPolling";
import { postArtifactToGrove } from "@/lib/companions/postToGrove";
import { shareArtifact } from "@/lib/share/nativeShare";

export interface ReelPlan {
  scenes?: Array<{ shot?: string; duration_s?: number; image_prompt?: string }>;
  voiceover_script?: string;
  voice?: string;
  music_mood?: string;
  caption?: string;
}

/** Parses the first ```json block from a markdown string and returns its
 *  `reel_plan` field if present. */
export function parseReelPlan(markdown: string): ReelPlan | null {
  if (!markdown) return null;
  const match = markdown.match(/```json\s*([\s\S]*?)```/i);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[1]);
    if (obj && typeof obj === "object" && obj.reel_plan) return obj.reel_plan as ReelPlan;
  } catch {
    return null;
  }
  return null;
}

interface Props {
  plan: ReelPlan;
  onArtifact: (text: string, attachment?: { image?: string; video?: string; audio?: string }) => void;
}

/** Action bar for Birch: image → video → voiceover, all explicit-click. */
export default function BirchGenerationPanel({ plan, onArtifact }: Props) {
  const { toast } = useToast();
  const firstScene = plan.scenes?.[0];
  const imagePrompt = firstScene?.image_prompt ?? plan.caption ?? "";
  const shotPrompt = firstScene?.shot ?? plan.caption ?? "";
  const script = plan.voiceover_script ?? "";

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [busyImg, setBusyImg] = useState(false);
  const [busyVid, setBusyVid] = useState(false);
  const [busyVoice, setBusyVoice] = useState(false);
  const [videoGenId, setVideoGenId] = useState<string | null>(null);
  const [lastArtifact, setLastArtifact] = useState<
    { url: string; type: "image" | "video"; thumbnail?: string } | null
  >(null);
  const [busyPost, setBusyPost] = useState(false);
  const [busyShare, setBusyShare] = useState(false);

  const caption = plan.caption ?? plan.voiceover_script?.slice(0, 180) ?? "";

  const videoState = useGenerationPolling(videoGenId);
  useMemo(() => {
    if (videoState.status === "completed" && videoState.videoUrl) {
      onArtifact("Here's your reel:", { video: videoState.videoUrl });
      setLastArtifact({
        url: videoState.videoUrl,
        type: "video",
        thumbnail: coverUrl ?? undefined,
      });
      setBusyVid(false);
      setVideoGenId(null);
    } else if (videoState.status === "failed") {
      toast({
        title: "Video failed",
        description: videoState.error ?? "Generation failed",
        variant: "destructive",
      });
      setBusyVid(false);
      setVideoGenId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoState.status]);

  const generateCover = async () => {
    if (!imagePrompt) return;
    setBusyImg(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-thumbnail", {
        body: {
          customPrompt: imagePrompt,
          productDescription: plan.caption ?? "reel cover",
          style: "warm cinematic",
          aspectRatio: "9:16",
          confirmed: true,
        },
      });
      if (error) throw error;
      const url = (data as any)?.imageUrl;
      if (!url) throw new Error("No image returned");
      setCoverUrl(url);
      setLastArtifact({ url, type: "image" });
      onArtifact("Cover image ready.", { image: url });
    } catch (e: any) {
      toast({ title: "Cover image failed", description: e?.message ?? "Try again", variant: "destructive" });
    } finally {
      setBusyImg(false);
    }
  };

  const generateVideo = async () => {
    if (!shotPrompt) return;
    setBusyVid(true);
    try {
      // 1) pre-create the ai_creations row so polling has a target
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in first");
      const { data: row, error: insErr } = await supabase
        .from("ai_creations")
        .insert({
          user_id: user.id,
          content_type: "voice_over", // existing enum used for video rows
          title: (plan.caption ?? shotPrompt).slice(0, 60),
          custom_prompt: shotPrompt,
          metadata: { status: "pending", type: "video", started_at: new Date().toISOString() },
        })
        .select("id")
        .single();
      if (insErr || !row) throw insErr ?? new Error("Could not create generation");

      const { error: invErr } = await supabase.functions.invoke("generate-video", {
        body: {
          generation_id: row.id,
          prompt: shotPrompt,
          image_url: coverUrl ?? undefined,
          resolution: "480p",
        },
      });
      if (invErr) throw invErr;
      setVideoGenId(row.id);
    } catch (e: any) {
      toast({ title: "Video failed to start", description: e?.message ?? "Try again", variant: "destructive" });
      setBusyVid(false);
    }
  };

  const generateVoice = async () => {
    if (!script) return;
    setBusyVoice(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-voiceover", {
        body: { text: script, voice: plan.voice ?? "af_bella" },
      });
      if (error) throw error;
      const url = (data as any)?.audio_url;
      if (!url) throw new Error("No audio returned");
      onArtifact("Voiceover ready.", { audio: url });
    } catch (e: any) {
      toast({ title: "Voiceover failed", description: e?.message ?? "Try again", variant: "destructive" });
    } finally {
      setBusyVoice(false);
    }
  };

  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
      <div className="text-xs font-medium text-foreground">Ready to make it real?</div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={busyImg || !imagePrompt}
          onClick={generateCover}
        >
          {busyImg ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ImageIcon className="h-3 w-3 mr-1" />}
          Cover image
          <span className="ml-1 text-[10px] text-muted-foreground">~$0.003</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busyVid || !shotPrompt}
          onClick={generateVideo}
        >
          {busyVid ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Film className="h-3 w-3 mr-1" />}
          {coverUrl ? "5s reel (from cover)" : "5s reel (text-only)"}
          <span className="ml-1 text-[10px] text-muted-foreground">~${coverUrl ? "0.08" : "0.10"}</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busyVoice || !script}
          onClick={generateVoice}
        >
          {busyVoice ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Mic className="h-3 w-3 mr-1" />}
          Voiceover
          <span className="ml-1 text-[10px] text-muted-foreground">~$0.01</span>
        </Button>
      </div>
      {coverUrl && <img src={coverUrl} alt="cover" className="rounded max-w-[160px]" />}
      {busyVid && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Rendering reel… ~60–90s
        </div>
      )}
    </div>
  );
}
