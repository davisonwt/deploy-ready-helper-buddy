-- Owners may remove their own Wandering role.
--
-- ALREADY APPLIED on 2026-09-22 via the Management API; this file records
-- it, because this project's migration ledger is drifted and `db push`
-- is not the route used here.
--
-- wandering_roles had INSERT, SELECT and UPDATE policies for the owner
-- but no DELETE policy at all, and no UI, RPC or edge function removed a
-- role either. A member who unlocked a role could never withdraw it.
--
-- The shape of the gap is what made it dangerous: a delete from the
-- owner's own session returned NO error and removed 0 rows. Any teardown
-- written the obvious way would report success and delete nothing --
-- the same "green gets trusted" failure as a spec that skips silently.
--
-- Approved by the user on 2026-09-22 so the live specs can create the
-- role they need and remove it again. products.wandering_role is plain
-- text, not a foreign key, so nothing cascades.
create policy "Owner can delete own wandering_roles"
  on public.wandering_roles for delete
  to authenticated
  using (auth.uid() = user_id);
