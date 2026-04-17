import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VideoJobStatus = "pending" | "generating" | "complete" | "failed";

export interface VideoJob {
  id: string;
  source_table: "seeds" | "orchards";
  source_id: string;
  user_id: string;
  status: VideoJobStatus;
  prompt_used: string | null;
  video_url: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export function useVideoJob(sourceTable: "seeds" | "orchards", sourceId?: string) {
  const [job, setJob] = useState<VideoJob | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sourceId) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const fetchJob = async () => {
      const { data } = await supabase
        .from("video_jobs")
        .select("*")
        .eq("source_table", sourceTable)
        .eq("source_id", sourceId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (mounted) {
        setJob((data as VideoJob) ?? null);
        setLoading(false);
      }
    };

    fetchJob();

    const channel = supabase
      .channel(`video-job-${sourceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "video_jobs",
          filter: `source_id=eq.${sourceId}`,
        },
        (payload) => {
          if (mounted) setJob(payload.new as VideoJob);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [sourceTable, sourceId]);

  const retry = async () => {
    if (!job) return;
    await supabase.functions.invoke("trigger-video-agent", {
      body: {
        source_table: job.source_table,
        source_id: job.source_id,
        user_id: job.user_id,
      },
    });
  };

  return { job, loading, retry };
}

export function useVideoCredits() {
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("video_credits")
        .eq("user_id", user.id)
        .maybeSingle();
      if (mounted) setCredits(data?.video_credits ?? 0);
    };
    load();

    const channel = supabase
      .channel("video-credits")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload: any) => {
          if (mounted && typeof payload.new?.video_credits === "number") {
            setCredits(payload.new.video_credits);
          }
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return credits;
}
