-- Free-access list for S2G Agents (Davison, Ed, Amber, Ezra)
CREATE TABLE IF NOT EXISTS public.s2g_agent_free_access (
  user_id uuid PRIMARY KEY,
  granted_by text NOT NULL DEFAULT 'founders',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.s2g_agent_free_access ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated may read their own row (so the UI can show "Free founder access")
DROP POLICY IF EXISTS "users read own free access" ON public.s2g_agent_free_access;
CREATE POLICY "users read own free access"
  ON public.s2g_agent_free_access FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Server-side helper used by edge functions / RLS gates
CREATE OR REPLACE FUNCTION public.has_free_agent_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.s2g_agent_free_access WHERE user_id = _user_id
  );
$$;

-- Seed the four named members
INSERT INTO public.s2g_agent_free_access (user_id, note) VALUES
  ('04754d57-d41d-4ea7-93df-542047a6785b', 'Davison Taljaard — founder'),
  ('9cb1b19c-08dc-4586-95dd-23bb5f022428', 'Davison (sow2grow.online) — founder'),
  ('0a24d607-1859-4e56-a4bd-c09af4697f16', 'Ezra Taljaard'),
  ('69fabacd-950e-4d5a-b300-f9c6b175295b', 'Ed (taljaard.abiyah1) — founder'),
  ('432df4a7-07f1-4a5e-835c-a3c2806ce6c5', 'Amber Wheeles'),
  ('c34c0eba-0010-480b-8326-7063cd7221ae', 'Amber Wheeles (alt)')
ON CONFLICT (user_id) DO NOTHING;