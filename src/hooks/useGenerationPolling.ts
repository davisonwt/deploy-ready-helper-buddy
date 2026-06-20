import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type GenerationState = {
  status: "idle" | "processing" | "completed" | "failed";
  videoUrl?: string | null;
  audioUrl?: string | null;
  imageUrl?: string | null;
  error?: string | null;
  raw?: any;
};

/**
 * Polls `ai_creations.metadata.status` for a given generation row.
 * Stops on `completed` / `failed` / after `timeoutMs`.
 */
export function useGenerationPolling(
  generationId: string | null,
  opts: { intervalMs?: number; timeoutMs?: number } = {},
): GenerationState {
  const { intervalMs = 4000, timeoutMs = 8 * 60 * 1000 } = opts;
  const [state, setState] = useState<GenerationState>({ status: "idle" });

  useEffect(() => {
    if (!generationId) {
      setState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setState({ status: "processing" });
    const started = Date.now();

    const tick = async () => {
      if (cancelled) return;
      const { data, error } = await supabase
        .from("ai_creations")
        .select("metadata")
        .eq("id", generationId)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setState({ status: "failed", error: error.message });
        return;
      }

      const m = (data?.metadata ?? {}) as Record<string, any>;
      if (m.status === "completed") {
        setState({
          status: "completed",
          videoUrl: m.video_url ?? null,
          audioUrl: m.audio_url ?? null,
          imageUrl: m.image_url ?? null,
          raw: m,
        });
        return;
      }
      if (m.status === "failed") {
        setState({ status: "failed", error: m.error ?? "Generation failed", raw: m });
        return;
      }
      if (Date.now() - started > timeoutMs) {
        setState({ status: "failed", error: "Timed out waiting for generation" });
        return;
      }
      setTimeout(tick, intervalMs);
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, [generationId, intervalMs, timeoutMs]);

  return state;
}
