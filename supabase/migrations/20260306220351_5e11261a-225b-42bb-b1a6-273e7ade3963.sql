
-- Add pricing model to classroom_sessions
ALTER TABLE public.classroom_sessions 
  ADD COLUMN IF NOT EXISTS pricing_type text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS session_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_free boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS host_approved boolean DEFAULT false;

-- Add pricing_type to skilldrop_sessions
ALTER TABLE public.skilldrop_sessions 
  ADD COLUMN IF NOT EXISTS pricing_type text NOT NULL DEFAULT 'monthly';

-- Add pricing_type to radio_schedule
ALTER TABLE public.radio_schedule 
  ADD COLUMN IF NOT EXISTS pricing_type text NOT NULL DEFAULT 'free';

-- Add pricing_type to premium_rooms 
ALTER TABLE public.premium_rooms 
  ADD COLUMN IF NOT EXISTS pricing_type text NOT NULL DEFAULT 'per_session';

-- Unified session subscriptions table for all session types (classroom, radio, skilldrop, premium_rooms)
-- The existing skilldrop_session_subscriptions handles SkillDrop specifically
-- This extends to cover all session types
ALTER TABLE public.skilldrop_session_subscriptions 
  ADD COLUMN IF NOT EXISTS session_type text NOT NULL DEFAULT 'skilldrop',
  ADD COLUMN IF NOT EXISTS session_id uuid;

COMMENT ON COLUMN public.classroom_sessions.pricing_type IS 'free, per_session, or monthly';
COMMENT ON COLUMN public.skilldrop_sessions.pricing_type IS 'free, per_session, or monthly';
COMMENT ON COLUMN public.radio_schedule.pricing_type IS 'free, per_session, or monthly';
