// Cron-driven poller: completes mock jobs and polls real ComfyUI jobs
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const COMFYUI_API_URL = Deno.env.get("COMFYUI_API_URL");
const COMFYUI_API_KEY = Deno.env.get("COMFYUI_API_KEY");

const MOCK_PLACEHOLDER_VIDEO =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
const MOCK_DELAY_SECONDS = 20;
const TIMEOUT_MINUTES = 15;

async function notifyUser(supabase: any, job: any, success: boolean, title?: string) {
  try {
    await supabase.from("activity_feed").insert({
      user_id: job.user_id,
      actor_id: job.user_id,
      action_type: success ? "video_ready" : "video_failed",
      mode_type: "system",
      entity_type: "video_job",
      entity_id: job.id,
      content: success
        ? `Your product video for "${title || "your listing"}" is ready! 🎬`
        : `Video generation failed for "${title || "your listing"}"`,
    });
  } catch (e) {
    console.warn("notify failed", (e as Error).message);
  }
}

async function pollComfyUI(jobId: string) {
  if (!COMFYUI_API_URL) return null;
  try {
    const r = await fetch(`${COMFYUI_API_URL}/history/${jobId}`, {
      headers: COMFYUI_API_KEY ? { Authorization: `Bearer ${COMFYUI_API_KEY}` } : {},
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data; // expect { status, video_url }
  } catch (e) {
    console.warn("poll failed:", (e as Error).message);
    return null;
  }
}

async function downloadAndStore(
  supabase: any,
  url: string,
  user_id: string,
  source_id: string,
): Promise<string | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const blob = await r.blob();
    const path = `${user_id}/${source_id}.mp4`;
    const { error } = await supabase.storage
      .from("product-videos")
      .upload(path, blob, { contentType: "video/mp4", upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("product-videos").getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.warn("store failed:", (e as Error).message);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const isMockMode = !COMFYUI_API_URL;
  const results: any = { completed: 0, failed: 0, still_running: 0 };

  try {
    const { data: jobs } = await supabase
      .from("video_jobs")
      .select("*")
      .eq("status", "generating")
      .limit(50);

    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ ok: true, ...results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const job of jobs) {
      const startedAt = job.started_at ? new Date(job.started_at).getTime() : Date.now();
      const elapsedMs = Date.now() - startedAt;
      const elapsedMin = elapsedMs / 60000;

      // Timeout
      if (elapsedMin > TIMEOUT_MINUTES) {
        await supabase
          .from("video_jobs")
          .update({
            status: "failed",
            error_message: "Generation timed out after 15 minutes",
            completed_at: new Date().toISOString(),
          })
          .eq("id", job.id);
        await notifyUser(supabase, job, false);
        results.failed++;
        continue;
      }

      let videoUrl: string | null = null;

      if (isMockMode) {
        if (elapsedMs / 1000 >= MOCK_DELAY_SECONDS) {
          videoUrl = MOCK_PLACEHOLDER_VIDEO;
        }
      } else if (job.comfyui_job_id) {
        const status = await pollComfyUI(job.comfyui_job_id);
        if (status?.status === "complete" && status?.video_url) {
          videoUrl = await downloadAndStore(
            supabase,
            status.video_url,
            job.user_id,
            job.source_id,
          );
        }
      }

      if (videoUrl) {
        await supabase
          .from("video_jobs")
          .update({
            status: "complete",
            video_url: videoUrl,
            completed_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        // Update source row
        const { data: src } = await supabase
          .from(job.source_table)
          .update({ video_url: videoUrl })
          .eq("id", job.source_id)
          .select("title")
          .maybeSingle();

        await notifyUser(supabase, job, true, src?.title);
        results.completed++;
      } else {
        results.still_running++;
      }
    }

    return new Response(JSON.stringify({ ok: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("poll-video-jobs error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
