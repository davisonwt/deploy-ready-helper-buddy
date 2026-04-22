CREATE TABLE public.intelligent_listing_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  raw_description TEXT NOT NULL,
  parsed_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_stage TEXT NOT NULL DEFAULT 'intake',
  sage_pricing JSONB NOT NULL DEFAULT '{}'::jsonb,
  loaf_logistics JSONB NOT NULL DEFAULT '{}'::jsonb,
  debian_copy JSONB NOT NULL DEFAULT '{}'::jsonb,
  kali_media JSONB NOT NULL DEFAULT '{}'::jsonb,
  fedora_story JSONB NOT NULL DEFAULT '{}'::jsonb,
  mint_payment JSONB NOT NULL DEFAULT '{}'::jsonb,
  approvals JSONB NOT NULL DEFAULT '{}'::jsonb,
  analytics_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  final_product_id UUID NULL,
  published_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.intelligent_listing_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own intelligent listing sessions"
ON public.intelligent_listing_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own intelligent listing sessions"
ON public.intelligent_listing_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own intelligent listing sessions"
ON public.intelligent_listing_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own intelligent listing sessions"
ON public.intelligent_listing_sessions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_intelligent_listing_sessions_user_stage
ON public.intelligent_listing_sessions (user_id, current_stage, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_intelligent_listing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_intelligent_listing_sessions_updated_at
BEFORE UPDATE ON public.intelligent_listing_sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_intelligent_listing_updated_at();