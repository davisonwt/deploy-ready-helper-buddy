-- Rehearsal for 20260917090000_hand_household_needs_reference.sql.
--
-- Creates the trigger, proves it rejects a household listing with no
-- references and still accepts a professional one, then ROLLS BACK
-- everything: the triggers, the function and the throwaway rows. Production
-- is unchanged when this finishes. Run it to see the evidence; run the
-- migration itself to keep the rule.

begin;

create temp table _t(step text, result text) on commit drop;

create or replace function public.hand_household_requires_reference()
returns trigger language plpgsql as $$
declare
  v_product_id uuid; v_is_professional boolean; v_refs integer;
begin
  v_product_id := coalesce(new.product_id, old.product_id);
  select d.is_professional into v_is_professional
    from public.hand_seed_details d where d.product_id = v_product_id;
  if v_is_professional is null or v_is_professional then return null; end if;
  select count(*) into v_refs
    from public.hand_seed_references r where r.product_id = v_product_id;
  if v_refs = 0 then
    raise exception 'a household service must list at least one reference'
      using errcode = 'check_violation';
  end if;
  return null;
end; $$;

drop trigger if exists trg_hand_household_needs_reference on public.hand_seed_details;
create constraint trigger trg_hand_household_needs_reference
  after insert or update of service_category, is_professional
  on public.hand_seed_details
  deferrable initially deferred
  for each row execute function public.hand_household_requires_reference();

-- Two throwaway products to hang the detail rows on.
insert into public.products (id, sower_id, company_id, title, kind, type, status, price, description)
values
  ('0000dead-0000-0000-0000-00000000a001'::uuid,
   '3bd04287-03e2-4d26-bfb4-9ab7ec8318e9', 'dd069637-bd58-408c-8cac-447e990676e2',
   'QAREHEARSE household', 'hand', 'service', 'draft', 0, 'rolled back'),
  ('0000dead-0000-0000-0000-00000000a002'::uuid,
   '3bd04287-03e2-4d26-bfb4-9ab7ec8318e9', 'dd069637-bd58-408c-8cac-447e990676e2',
   'QAREHEARSE professional', 'hand', 'service', 'draft', 0, 'rolled back');

-- 1. Household, no references. The deferred trigger must reject it. Forcing
--    constraints immediate inside this subtransaction makes it fire here
--    rather than at COMMIT, so the rest of the script can continue.
do $$
begin
  begin
    set constraints trg_hand_household_needs_reference deferred;
    insert into public.hand_seed_details
      (product_id, service_category, years_experience, currency, base_location,
       rate_hourly, availability, operator_confirmed_legal)
    values ('0000dead-0000-0000-0000-00000000a001'::uuid, 'domestic_work', 3,
            'ZAR', 'Nowhere', 100, true, true);
    set constraints trg_hand_household_needs_reference immediate;
    insert into _t values ('household, no references', 'ACCEPTED -- THE TRIGGER DID NOT BITE');
  exception
    when check_violation then
      insert into _t values ('household, no references', 'rejected: ' || SQLERRM);
    when others then
      insert into _t values ('household, no references', 'other ' || SQLSTATE || ': ' || SQLERRM);
  end;
end $$;

-- 2. Professional, no references. Must still be accepted.
do $$
begin
  begin
    set constraints trg_hand_household_needs_reference deferred;
    insert into public.hand_seed_details
      (product_id, service_category, years_experience, currency, base_location,
       qualification, rate_hourly, availability, operator_confirmed_legal)
    values ('0000dead-0000-0000-0000-00000000a002'::uuid, 'electrician', 3,
            'ZAR', 'Nowhere', 'probe', 100, true, true);
    set constraints trg_hand_household_needs_reference immediate;
    insert into _t values ('professional, no references', 'accepted');
  exception
    when others then
      insert into _t values ('professional, no references',
        'REJECTED ' || SQLSTATE || ': ' || SQLERRM);
  end;
end $$;

-- 3. Household WITH a reference. Must be accepted.
do $$
begin
  begin
    set constraints trg_hand_household_needs_reference deferred;
    delete from public.hand_seed_details
     where product_id = '0000dead-0000-0000-0000-00000000a001'::uuid;
    insert into public.hand_seed_details
      (product_id, service_category, years_experience, currency, base_location,
       rate_hourly, availability, operator_confirmed_legal)
    values ('0000dead-0000-0000-0000-00000000a001'::uuid, 'domestic_work', 3,
            'ZAR', 'Nowhere', 100, true, true);
    insert into public.hand_seed_references (product_id, referee_name, relationship, contact)
    values ('0000dead-0000-0000-0000-00000000a001'::uuid, 'A Referee', 'former employer', '000');
    set constraints trg_hand_household_needs_reference immediate;
    insert into _t values ('household, one reference', 'accepted');
  exception
    when others then
      insert into _t values ('household, one reference',
        'REJECTED ' || SQLSTATE || ': ' || SQLERRM);
  end;
end $$;

select * from _t order by step;

rollback;
