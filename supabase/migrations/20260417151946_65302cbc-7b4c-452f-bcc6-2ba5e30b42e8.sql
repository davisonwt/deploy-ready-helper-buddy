
-- 1. video_credits on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS video_credits INTEGER NOT NULL DEFAULT 3;

-- 2. video_jobs table
CREATE TABLE IF NOT EXISTS public.video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table TEXT NOT NULL CHECK (source_table IN ('seeds','orchards')),
  source_id UUID NOT NULL,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','generating','complete','failed')),
  prompt_used TEXT,
  negative_prompt TEXT,
  video_url TEXT,
  comfyui_job_id TEXT,
  workflow_tier TEXT NOT NULL DEFAULT '5b' CHECK (workflow_tier IN ('5b','14b')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotency: only one non-failed job per source row
CREATE UNIQUE INDEX IF NOT EXISTS video_jobs_unique_active
  ON public.video_jobs(source_table, source_id)
  WHERE status <> 'failed';

CREATE INDEX IF NOT EXISTS video_jobs_status_idx ON public.video_jobs(status);
CREATE INDEX IF NOT EXISTS video_jobs_user_idx ON public.video_jobs(user_id);

ALTER TABLE public.video_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own video jobs" ON public.video_jobs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users update own video jobs" ON public.video_jobs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Service role bypasses RLS automatically; no INSERT policy needed for users
-- (jobs are created by edge function via service role)

-- updated_at trigger
CREATE TRIGGER video_jobs_updated_at
  BEFORE UPDATE ON public.video_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-videos','product-videos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read product videos" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-videos');

CREATE POLICY "Users upload own product videos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own product videos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own product videos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 4. Trigger function: fire edge function via pg_net on new seeds/orchards
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.trigger_video_agent_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_source_table TEXT := TG_TABLE_NAME;
BEGIN
  -- Resolve user_id (seeds uses gifter_id, orchards uses user_id)
  IF v_source_table = 'seeds' THEN
    v_user_id := NEW.gifter_id;
  ELSE
    v_user_id := NEW.user_id;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://zuwkgasbkpjlxzsjzumu.supabase.co/functions/v1/trigger-video-agent',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object(
      'source_table', v_source_table,
      'source_id', NEW.id,
      'user_id', v_user_id
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the insert if the webhook fails
  RAISE WARNING 'Video agent trigger failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seeds_video_agent_trigger ON public.seeds;
CREATE TRIGGER seeds_video_agent_trigger
  AFTER INSERT ON public.seeds
  FOR EACH ROW EXECUTE FUNCTION public.trigger_video_agent_on_insert();

DROP TRIGGER IF EXISTS orchards_video_agent_trigger ON public.orchards;
CREATE TRIGGER orchards_video_agent_trigger
  AFTER INSERT ON public.orchards
  FOR EACH ROW EXECUTE FUNCTION public.trigger_video_agent_on_insert();

-- 5. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_jobs;
