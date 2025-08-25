-- Add new columns to rooms table for clubhouse functionality
ALTER TABLE public.rooms 
ADD COLUMN type text DEFAULT 'chat',
ADD COLUMN session_type text DEFAULT 'free',
ADD COLUMN entry_fee numeric DEFAULT 0,
ADD COLUMN layout text DEFAULT 'standard',
ADD COLUMN host_user jsonb,
ADD COLUMN co_host_users jsonb DEFAULT '[]'::jsonb,
ADD COLUMN invite_slots jsonb DEFAULT '[]'::jsonb;

-- Add comment to describe the new columns
COMMENT ON COLUMN public.rooms.type IS 'Type of room: chat, clubhouse, etc.';
COMMENT ON COLUMN public.rooms.session_type IS 'Session type: free or paid';
COMMENT ON COLUMN public.rooms.entry_fee IS 'Entry fee for paid sessions';
COMMENT ON COLUMN public.rooms.layout IS 'Layout configuration: standard, panel, interview, townhall, intimate, large';
COMMENT ON COLUMN public.rooms.host_user IS 'Host user data as JSON';
COMMENT ON COLUMN public.rooms.co_host_users IS 'Array of co-host user data as JSON';
COMMENT ON COLUMN public.rooms.invite_slots IS 'Array of invite slot data as JSON';