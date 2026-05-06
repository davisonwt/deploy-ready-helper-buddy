DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'grove-flush-queue-every-minute') THEN
    PERFORM cron.schedule(
      'grove-flush-queue-every-minute',
      '* * * * *',
      $cron$
      SELECT net.http_post(
        url := 'https://zuwkgasbkpjlxzsjzumu.supabase.co/functions/v1/grove-flush-queue',
        headers := jsonb_build_object('Content-Type','application/json'),
        body := '{}'::jsonb
      );
      $cron$
    );
  END IF;
END $$;