-- S2G-run "places" (Grove Station, Wandering Hearts, Companions Village,
-- Scripture Study) open on their front/gate image first, full-frame, with
-- a tap-anywhere/"Enter" pill into the interior -- Back from the interior
-- returns to the front instead of leaving the stall. Every other stall
-- (personal stalls, Tribal Gardens cards) keeps opening straight into the
-- interior, unchanged (default false).
--
-- Per-stall flag, not a route change: src/pages/StallVisitPage.tsx reads
-- this column and renders src/components/stalls/StallFrontGate.tsx before
-- StallInteriorView when true, same /stall/:username URL throughout.
--
-- My Tribe (/my-tribe, MyTribePage.tsx) already has its own gate/village
-- ("entered" state, "Back to gate") -- it isn't a `stalls` row at all, so
-- it needs no flag here and no code change; it already does exactly this.

alter table public.stalls add column if not exists enter_via_front boolean not null default false;

update public.stalls set enter_via_front = true
where user_id in (
  'e9758e23-fba4-4778-8e58-4fd8e5550a72', -- Grove Station
  '54ba45c3-382b-4cc2-9bb7-c1f895c3c119', -- Wandering Hearts
  'b385c0c2-5e41-4058-b4e1-8afdc7c93f0c', -- Companions Village
  '50f485b8-8aa0-462f-a01d-9c2f18d2105e'  -- Scripture Study
);

-- --- Proof --------------------------------------------------------------------
SELECT p.username, s.name, s.enter_via_front
FROM public.stalls s JOIN public.profiles p ON p.user_id = s.user_id
WHERE s.enter_via_front = true
ORDER BY p.username;
