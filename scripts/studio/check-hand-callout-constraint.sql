-- Does hand_at_least_one_rate still reject a listing priced ONLY as a
-- call-out fee, now that rate_callout and rate_per_km exist?
--
-- Self-cleaning: it creates one throwaway product, tries both inserts
-- inside exception blocks so neither aborts the script, then deletes
-- everything it made. It never touches a real listing.

create temp table if not exists _callout_check(step text, result text);
truncate _callout_check;

insert into public.products (id, sower_id, company_id, title, kind, type, status, price, description)
values ('00000000-dead-beef-0000-00000000c0de',
        '3bd04287-03e2-4d26-bfb4-9ab7ec8318e9',
        'dd069637-bd58-408c-8cac-447e990676e2',
        'QACHECK constraint probe', 'hand', 'service', 'draft', 0, 'temporary, deleted below');

do $$
begin
  -- 1. Call-out fee only. Must be rejected.
  begin
    insert into public.hand_seed_details
      (product_id, service_category, years_experience, currency, base_location,
       qualification, rate_callout, rate_per_km, availability, operator_confirmed_legal)
    values ('00000000-dead-beef-0000-00000000c0de', 'electrician', 5, 'ZAR', 'Nowhere',
            'probe', 500, 8, true, true);
    insert into _callout_check values ('callout only', 'ACCEPTED -- THE CHECK DID NOT BITE');
  exception
    when check_violation then
      insert into _callout_check values ('callout only', 'rejected: ' || SQLERRM);
    when others then
      insert into _callout_check values ('callout only', 'other ' || SQLSTATE || ': ' || SQLERRM);
  end;

  -- 2. A real work rate plus both travel charges. Must be accepted.
  begin
    insert into public.hand_seed_details
      (product_id, service_category, years_experience, currency, base_location,
       qualification, rate_hourly, rate_callout, rate_per_km, availability, operator_confirmed_legal)
    values ('00000000-dead-beef-0000-00000000c0de', 'electrician', 5, 'ZAR', 'Nowhere',
            'probe', 450, 500, 8, true, true);
    insert into _callout_check values ('hourly + callout + per km', 'accepted');
  exception
    when others then
      insert into _callout_check values ('hourly + callout + per km',
        'REJECTED ' || SQLSTATE || ': ' || SQLERRM);
  end;

  -- 3. A negative travel charge. Must be rejected by the widened CHECK.
  declare touched integer;
  begin
    update public.hand_seed_details set rate_per_km = -1
    where product_id = '00000000-dead-beef-0000-00000000c0de';
    get diagnostics touched = row_count;
    insert into _callout_check values ('negative per km',
      case when touched = 0
        then 'INCONCLUSIVE -- no row to update'
        else 'ACCEPTED -- THE CHECK DID NOT BITE' end);
  exception
    when check_violation then
      insert into _callout_check values ('negative per km', 'rejected: ' || SQLERRM);
  end;
end $$;

-- Clean up BEFORE reporting, so the findings are the last result set the
-- Management API returns and nothing is left behind if reading stops here.
delete from public.hand_seed_details where product_id = '00000000-dead-beef-0000-00000000c0de';
delete from public.products where id = '00000000-dead-beef-0000-00000000c0de';

insert into _callout_check
select 'zz cleanup', 'leftover probe rows: ' || count(*)::text
from public.products where id = '00000000-dead-beef-0000-00000000c0de';

select * from _callout_check order by step;
