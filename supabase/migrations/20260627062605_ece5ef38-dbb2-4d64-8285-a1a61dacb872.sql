-- Finding #2: drop the broad authenticated SELECT on registered_agents.
-- No frontend code reads this table; admins retain access via agents_admin_read_all.
DROP POLICY IF EXISTS "agents_authenticated_read" ON public.registered_agents;