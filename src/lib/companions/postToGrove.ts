import { supabase } from "@/integrations/supabase/client";

export interface PostArtifactInput {
  mediaUrl: string;
  mediaType: "image" | "video";
  caption: string;
  thumbnailUrl?: string;
}

/**
 * Post a companion-generated artifact (image/video + caption) as a real
 * memry_posts row, so it surfaces in the existing SeedFlow tribal feed
 * (TribalAliveFeedPage). Same author, real post row — no parallel system.
 */
export async function postArtifactToGrove(
  input: PostArtifactInput
): Promise<{ postId: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to post to your grove.");
  if (!input.mediaUrl) throw new Error("No media to post.");

  const { data, error } = await supabase
    .from("memry_posts")
    .insert({
      user_id: user.id,
      content_type: input.mediaType,
      content_category: "companion_birch",
      media_url: input.mediaUrl,
      thumbnail_url: input.thumbnailUrl ?? null,
      caption: input.caption ?? null,
    })
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error("Could not post to grove.");
  return { postId: data.id };
}
