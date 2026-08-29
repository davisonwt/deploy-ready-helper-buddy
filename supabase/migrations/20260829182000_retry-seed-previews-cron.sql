-- Every 15 minutes: retry preview generation for music products whose
-- preview_url is still null despite having a real file in premium-room
-- (the preview_upload_failed / "any other error after a successful main
-- upload" case that no longer blocks Plant -- see SowMusicPage.tsx /
-- SeedDropZone.tsx). Same invoke_money_job/CRON_SECRET pattern as
-- reconcile-paypal-orders.
SELECT cron.schedule(
  'retry-seed-previews',
  '*/15 * * * *',
  $$ SELECT public.invoke_money_job('retry-seed-previews'); $$
);
