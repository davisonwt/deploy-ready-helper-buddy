create or replace function public.invoke_money_job(_fn text)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  _secret text;
  _req_id bigint;
begin
  if _fn !~ '^[a-z0-9-]+$' then
    raise exception 'invalid function name';
  end if;

  select decrypted_secret into _secret
  from vault.decrypted_secrets
  where name = 'CRON_SECRET'
  limit 1;

  if _secret is null or length(_secret) < 16 then
    raise exception 'CRON_SECRET not configured in vault';
  end if;

  select net.http_post(
    url := 'https://zuwkgasbkpjlxzsjzumu.supabase.co/functions/v1/' || _fn,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _secret
    ),
    body := jsonb_build_object('trigger', 'cron', 'at', now())
  ) into _req_id;

  return _req_id;
end;
$$;

revoke all on function public.invoke_money_job(text) from public, anon, authenticated;
grant execute on function public.invoke_money_job(text) to postgres, service_role;