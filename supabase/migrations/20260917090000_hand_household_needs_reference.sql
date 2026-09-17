-- A household Hand listing must carry at least one reference, enforced by
-- the database rather than only by the form.
--
-- Today the rule lives in SowHandPage's `referencesReady` check. That gives
-- the friendly message and it stays, but it is client-side: a crafted
-- PostgREST call can insert a hand_seed_details row with a household
-- category and no hand_seed_references rows at all. References are the one
-- safeguard a member has when letting a stranger into their home, so the
-- rule belongs where it cannot be skipped.
--
-- DEFERRABLE INITIALLY DEFERRED. Be precise about what that buys, because
-- the first version of this comment was wrong and cost a production outage.
--
-- It buys ONE thing: within a single transaction, the detail row and its
-- references may be written in either order, and the check runs once at
-- COMMIT when both are present.
--
-- It does NOT buy anything across separate requests. PostgREST gives every
-- HTTP request its own transaction, so "deferred" defers only to the end of
-- that one request. A client that POSTs the detail row and then POSTs the
-- references is making two transactions, and this trigger fires at the end
-- of the first one, sees zero references, and rejects it. That is exactly
-- what happened on 2026-09-17: every household registration was refused
-- until SowHandPage was reordered to write references first.
--
-- So the client contract is: write the references BEFORE the detail row, or
-- write both inside one transaction via an RPC. Do not assume deferral
-- rescues a client that writes them in separate calls in the wrong order.
--
-- The same applies in reverse to trg_hand_reference_delete_guard below:
-- replacing a household listing's references must INSERT the new set before
-- DELETING the old one, or the delete's own commit sees a household listing
-- with zero references and is refused.
--
-- It reads `is_professional`, not the category list: that column is already
-- derived from the category by trg_hand_seed_details_group, so there is one
-- definition of "household" rather than two that can drift apart.
--
-- Not covered by the snapshot rule in CLAUDE.md: this adds a constraint and
-- changes no member data. Verified before writing: 1 detail row exists, 0
-- are household, 0 would violate.

create or replace function public.hand_household_requires_reference()
returns trigger
language plpgsql
as $$
declare
  v_product_id uuid;
  v_is_professional boolean;
  v_refs integer;
begin
  -- The row this check is about. On DELETE of a reference it is OLD.
  v_product_id := coalesce(new.product_id, old.product_id);

  select d.is_professional into v_is_professional
    from public.hand_seed_details d
   where d.product_id = v_product_id;

  -- The detail row can be gone by commit time (listing deleted in the same
  -- transaction). Nothing to enforce then.
  if v_is_professional is null then
    return null;
  end if;

  if v_is_professional then
    return null;
  end if;

  select count(*) into v_refs
    from public.hand_seed_references r
   where r.product_id = v_product_id;

  if v_refs = 0 then
    raise exception
      'a household service must list at least one reference'
      using errcode = 'check_violation',
            detail  = format('hand_seed_details.product_id=%s has no hand_seed_references row', v_product_id),
            hint    = 'Add at least one referee before saving a household listing.';
  end if;

  return null;
end;
$$;

comment on function public.hand_household_requires_reference() is
  'Deferred check: a non-professional (household) hand listing must have at '
  'least one hand_seed_references row at COMMIT. Deferred because the detail '
  'row is written before its references.';

-- On the detail row: catches an insert that never adds references, and a
-- category change from professional to household on an unreferenced row.
drop trigger if exists trg_hand_household_needs_reference on public.hand_seed_details;
create constraint trigger trg_hand_household_needs_reference
  after insert or update of service_category, is_professional
  on public.hand_seed_details
  deferrable initially deferred
  for each row
  execute function public.hand_household_requires_reference();

-- On the references: catches deleting the last reference off a household
-- listing, which would otherwise leave it in the state this forbids.
drop trigger if exists trg_hand_reference_delete_guard on public.hand_seed_references;
create constraint trigger trg_hand_reference_delete_guard
  after delete
  on public.hand_seed_references
  deferrable initially deferred
  for each row
  execute function public.hand_household_requires_reference();

notify pgrst, 'reload schema';
