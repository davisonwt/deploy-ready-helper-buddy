-- Add missing columns to whisperers table for portfolio and social links
ALTER TABLE public.whisperers 
ADD COLUMN IF NOT EXISTS portfolio_url TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;

-- Add comment for clarity
COMMENT ON COLUMN public.whisperers.portfolio_url IS 'URL to whisperer portfolio or showcase';
COMMENT ON COLUMN public.whisperers.social_links IS 'JSON object containing social media handles (twitter, instagram, youtube, website)';