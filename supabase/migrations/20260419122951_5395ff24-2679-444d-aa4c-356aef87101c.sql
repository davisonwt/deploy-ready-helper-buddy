-- 1. Seed-upload greeting trigger: on new orchard insert, queue Gentoo welcome + content_pack suggestion
CREATE OR REPLACE FUNCTION public.linux_family_on_new_seed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure agent rows exist for this user
  PERFORM public.ensure_linux_family_agents(NEW.user_id);

  -- Log Gentoo's greeting
  INSERT INTO public.linux_family_activity_log (user_id, agent_name, activity_type, message, metadata, seed_id)
  VALUES (
    NEW.user_id, 'gentoo', 'seed_planted',
    '🐧 Your Seed "' || COALESCE(NEW.title, 'Untitled') || '" is planted! Shall the Linux Family start marketing it and generating bestowal reports?',
    jsonb_build_object('seed_id', NEW.id),
    NEW.id
  );

  -- Drop a launch suggestion the member can approve
  INSERT INTO public.linux_family_suggestions
    (user_id, agent_name, suggestion_type, seed_id, title, description, proposed_action, expires_at)
  VALUES (
    NEW.user_id, 'gentoo', 'full_launch', NEW.id,
    '🐧 Launch the whole Linux Family on "' || COALESCE(NEW.title, 'your Seed') || '"?',
    'Tux drafts posts → Ubuntu polishes → Kali generates banners → Fedora plans videos → Debian can broadcast to other bestowars.',
    jsonb_build_object('action', 'run_content_pack', 'platform', 'instagram', 'language', 'English'),
    now() + interval '7 days'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_linux_family_on_new_seed ON public.orchards;
CREATE TRIGGER trg_linux_family_on_new_seed
AFTER INSERT ON public.orchards
FOR EACH ROW
EXECUTE FUNCTION public.linux_family_on_new_seed();

-- 2. Hourly cron: invoke linux-family-cron edge function
SELECT cron.unschedule('linux-family-hourly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'linux-family-hourly');

SELECT cron.schedule(
  'linux-family-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://zuwkgasbkpjlxzsjzumu.supabase.co/functions/v1/linux-family-cron',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1d2tnYXNia3BqbHh6c2p6dW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDk4MjEsImV4cCI6MjA2ODQyNTgyMX0.ffH_7MzNCgyjXf8BFzGDCiVE7Qjptqb9qKBkq3gVbiU"}'::jsonb,
    body := jsonb_build_object('triggered_at', now())
  );
  $$
);